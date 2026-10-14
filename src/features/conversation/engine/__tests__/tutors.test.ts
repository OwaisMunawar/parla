import { isAppError } from '@/core/errors/AppError';

import { encodeEvent } from '../../lib/turnStream';
import { type TutorTurnRequest } from '../../lib/tutorContract';
import { createScriptedTutor } from '../scriptedTutor';
import { createServerTutor, type StreamingFetch } from '../serverTutor';

const request: TutorTurnRequest & { turnIndex: number } = {
  language: 'es',
  level: 'A1',
  scenario: { id: 'cafe', title: 'Order at a café', goal: 'Order.', tutorRole: 'Barista' },
  history: [],
  learnerText: 'quiero una café',
  turnIndex: 0,
};

const turn = {
  reply: 'Claro',
  translation: 'Sure',
  corrections: [],
  newVocabulary: [],
  cefrEstimate: 'A1',
  done: false,
};

function response(body: string, { ok = true, status = 200, stream = true } = {}) {
  const bytes = new TextEncoder().encode(body);
  return {
    ok,
    status,
    text: async () => body,
    body: stream
      ? new ReadableStream<Uint8Array>({
          start(controller) {
            for (let i = 0; i < bytes.length; i += 9) controller.enqueue(bytes.slice(i, i + 9));
            controller.close();
          },
        })
      : null,
  };
}

describe('scripted tutor', () => {
  it('streams a partial then returns the scripted turn', async () => {
    const tutor = createScriptedTutor({ latencyMs: 2 });
    const partials: string[] = [];
    const reply = await tutor.reply(request, {
      onPartial: (p) => p.reply && partials.push(p.reply),
    });
    expect(reply.corrections[0]?.corrected).toBe('un café');
    expect(partials).toHaveLength(1);
  });

  it('rejects unknown scenarios and honours cancellation', async () => {
    const tutor = createScriptedTutor({ latencyMs: 50 });
    await expect(
      tutor.reply({ ...request, scenario: { ...request.scenario, id: 'nope' } }),
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    const aborted = new AbortController();
    aborted.abort();
    await expect(tutor.reply(request, { signal: aborted.signal })).rejects.toMatchObject({
      code: 'CANCELLED',
    });
    const later = new AbortController();
    const pending = tutor.reply(request, { signal: later.signal });
    later.abort();
    await expect(pending).rejects.toMatchObject({ code: 'CANCELLED' });
  });
});

describe('server tutor', () => {
  const make = (fetch: StreamingFetch) =>
    createServerTutor({ baseUrl: 'http://tutor.test//', fetch });

  it('posts the turn without the scripted-only fields and reads the stream', async () => {
    const fetch = jest.fn<ReturnType<StreamingFetch>, Parameters<StreamingFetch>>(async () =>
      response(
        encodeEvent({ type: 'partial', reply: 'Cla' }) +
          encodeEvent({ type: 'final', turn: turn as never }),
      ),
    );
    const partials: string[] = [];
    const reply = await make(fetch).reply(request, {
      onPartial: (p) => p.reply && partials.push(p.reply),
    });
    expect(reply.reply).toBe('Claro');
    expect(partials).toEqual(['Cla']);
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe('http://tutor.test/v1/turn');
    expect(JSON.parse(init.body)).not.toHaveProperty('turnIndex');
  });

  it('reads a buffered body when streaming is unavailable', async () => {
    const tutor = make(async () =>
      response(encodeEvent({ type: 'final', turn: turn as never }), { stream: false }),
    );
    expect((await tutor.reply(request)).translation).toBe('Sure');
  });

  it('maps failures to coded errors', async () => {
    await expect(
      make(async () => response('', { ok: false, status: 502 })).reply(request),
    ).rejects.toMatchObject({
      code: 'TUTOR_FAILED',
    });
    await expect(
      make(async () => response(encodeEvent({ type: 'error', message: 'quota' }))).reply(request),
    ).rejects.toMatchObject({
      code: 'TUTOR_FAILED',
      message: 'quota',
    });
    await expect(
      make(async () => response('{"type":"partial"}\n')).reply(request),
    ).rejects.toMatchObject({
      code: 'TUTOR_INVALID_OUTPUT',
    });
    await expect(
      make(async () => {
        throw new TypeError('Network request failed');
      }).reply(request),
    ).rejects.toMatchObject({ code: 'TUTOR_UNAVAILABLE' });

    const controller = new AbortController();
    controller.abort();
    const error = await make(async () => {
      throw new Error('aborted');
    })
      .reply(request, { signal: controller.signal })
      .catch((e: unknown) => e);
    expect(isAppError(error, 'CANCELLED')).toBe(true);
  });
});
