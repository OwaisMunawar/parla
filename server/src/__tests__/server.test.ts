import { MockLanguageModelV4 } from 'ai/test';

import {
  createServerTutor,
  type StreamingFetch,
} from '../../../src/features/conversation/engine/serverTutor';
import {
  type TutorReply,
  type TutorTurnRequest,
} from '../../../src/features/conversation/lib/tutorContract';
import {
  createEventDecoder,
  type TurnEvent,
} from '../../../src/features/conversation/lib/turnStream';
import { loadConfig } from '../config';
import { startTutorServer, type TutorServer } from '../server';
import { buildInstructions, groundCorrections } from '../tutor';

const turn: TutorReply = {
  reply: '¡Claro! ¿Lo quieres grande o pequeño?',
  translation: 'Sure! Large or small?',
  corrections: [
    {
      original: 'una café',
      corrected: 'un café',
      explanation: 'Café is masculine.',
      type: 'gender',
    },
    // Not in the learner line: must be dropped.
    { original: 'la leche', corrected: 'el leche', explanation: 'Invented.', type: 'gender' },
  ],
  newVocabulary: [{ term: 'grande', meaning: 'large' }],
  cefrEstimate: 'A1',
  done: false,
};

const request: TutorTurnRequest = {
  language: 'es',
  level: 'A1',
  scenario: {
    id: 'cafe',
    title: 'Order at a café',
    goal: 'Order a coffee.',
    tutorRole: 'A barista',
  },
  history: [{ role: 'tutor', text: '¿Qué te pongo?' }],
  learnerText: 'quiero una café con leche',
};

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 20, text: 20, reasoning: undefined },
};

/** Streams the JSON in small slices, the way a provider would. */
function streamingModel(text: string) {
  const slices = text.match(/.{1,12}/gs) ?? [];
  return new MockLanguageModelV4({
    doStream: async () => ({
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue({ type: 'stream-start', warnings: [] });
          controller.enqueue({ type: 'text-start', id: 't' });
          for (const delta of slices) controller.enqueue({ type: 'text-delta', id: 't', delta });
          controller.enqueue({ type: 'text-end', id: 't' });
          controller.enqueue({
            type: 'finish',
            finishReason: { unified: 'stop', raw: undefined },
            usage,
          });
          controller.close();
        },
      }),
    }),
  });
}

function failingModel() {
  return new MockLanguageModelV4({
    doStream: async () => {
      throw new Error('provider down');
    },
  });
}

async function events(response: Response): Promise<TurnEvent[]> {
  const decoder = createEventDecoder();
  return [...decoder.push(await response.text()), ...decoder.end()];
}

describe('tutor server', () => {
  let server: TutorServer;
  afterEach(async () => server?.close());

  const post = (body: unknown) =>
    fetch(`${server.url}/v1/turn`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });

  it('streams partial replies and a grounded final turn', async () => {
    server = await startTutorServer({ port: 0, model: streamingModel(JSON.stringify(turn)) });
    const response = await post(request);
    expect(response.headers.get('content-type')).toContain('application/x-ndjson');
    const received = await events(response);

    const partials = received.filter((e) => e.type === 'partial');
    expect(partials.length).toBeGreaterThan(1);
    const final = received.at(-1);
    expect(final?.type).toBe('final');
    if (final?.type !== 'final') return;
    expect(final.turn.reply).toBe(turn.reply);
    expect(final.turn.corrections.map((c) => c.corrected)).toEqual(['un café']);
  });

  it('turns model failures and schema drift into an error event', async () => {
    server = await startTutorServer({ port: 0, model: failingModel() });
    expect((await events(await post(request))).at(-1)?.type).toBe('error');
    await server.close();

    server = await startTutorServer({ port: 0, model: streamingModel('{"reply": 3}') });
    expect((await events(await post(request))).at(-1)?.type).toBe('error');
  });

  it('rejects bad requests before calling the model', async () => {
    const model = streamingModel(JSON.stringify(turn));
    server = await startTutorServer({ port: 0, model });
    expect((await post('{nope')).status).toBe(400);
    expect((await post({ ...request, language: 'de' })).status).toBe(400);
    expect((await post({ ...request, learnerText: 'x'.repeat(40_000) })).status).toBe(413);
    expect((await fetch(`${server.url}/v1/other`)).status).toBe(404);
    expect(await (await fetch(`${server.url}/health`)).json()).toEqual({ ok: true });
    expect(model.doStreamCalls).toHaveLength(0);
  });

  it('serves the app tutor end to end', async () => {
    server = await startTutorServer({ port: 0, model: streamingModel(JSON.stringify(turn)) });
    const tutor = createServerTutor({
      baseUrl: `${server.url}/`,
      fetch: fetch as unknown as StreamingFetch,
    });
    const partials: string[] = [];
    const result = await tutor.reply(
      { ...request, turnIndex: 0 },
      { onPartial: (p) => p.reply && partials.push(p.reply) },
    );
    expect(tutor.kind).toBe('server');
    expect(result.corrections).toHaveLength(1);
    expect(partials.length).toBeGreaterThan(0);
  });
});

describe('prompt and grounding', () => {
  it('builds instructions from the scenario and level', () => {
    const text = buildInstructions(request);
    expect(text).toContain('Spanish speaking tutor');
    expect(text).toContain('A barista');
    expect(text).toContain('CEFR A1');
  });

  it('drops corrections that are not in the learner line or change nothing', () => {
    const grounded = groundCorrections(
      {
        ...turn,
        corrections: [
          ...turn.corrections,
          { original: 'leche', corrected: 'Leche', explanation: 'Case only.', type: 'grammar' },
        ],
      },
      request.learnerText,
    );
    expect(grounded.corrections.map((c) => c.original)).toEqual(['una café']);
  });
});

describe('config', () => {
  it('uses a gateway model id by default', () => {
    const config = loadConfig({});
    expect(config).toMatchObject({ port: 8787, model: 'openai/gpt-5-mini' });
  });

  it('switches to an OpenAI-compatible endpoint when a base URL is set', () => {
    const config = loadConfig({
      PORT: '9000',
      TUTOR_MODEL: 'llama3.2',
      TUTOR_BASE_URL: 'http://localhost:11434/v1',
    });
    expect(config.port).toBe(9000);
    expect(config.modelLabel).toBe('llama3.2 @ localhost:11434');
    expect(typeof config.model).toBe('object');
  });

  it('rejects a malformed port', () => {
    expect(() => loadConfig({ PORT: 'eighty' })).toThrow();
  });
});
