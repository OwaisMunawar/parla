import { AppError } from '@/core/errors/AppError';

import { createSpeakingAttempt } from '../../../features/pronunciation/engine/speakingAttempt';
import { withBundledClips, withFallback } from '../clipRecognizer';
import { type NativeRecognitionRequest, type NativeRecognizer } from '../nativeRecognizer';
import { createScriptedRecognizer } from '../scriptedRecognizer';
import { createSilentSpeaker } from '../Speaker';
import { type RecognitionListener, type SpeechRecognizer } from '../SpeechRecognizer';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function listener(): RecognitionListener & { events: string[] } {
  const events: string[] = [];
  return {
    events,
    onVolume: () => events.push('volume'),
    onInterim: (t) => events.push(`interim:${t}`),
    onFinal: (r) => events.push(`final:${r.transcript}`),
    onError: (e) => events.push(`error:${e.code}`),
    onEnd: () => events.push('end'),
  };
}

describe('scripted recogniser', () => {
  it('hears the expected text word by word, then ends', async () => {
    const recognizer = createScriptedRecognizer({ wordMs: 0 });
    expect(await recognizer.prepare('es-ES')).toEqual({ available: true, kind: 'scripted' });
    expect(await recognizer.requestPermission()).toBe(true);
    const l = listener();
    recognizer.start({ locale: 'es-ES', expected: 'hola amigo' }, l);
    for (let i = 0; i < 5; i++) await flush();
    expect(l.events.filter((e) => !e.startsWith('volume'))).toEqual([
      'interim:hola',
      'interim:hola amigo',
      'final:hola amigo',
      'end',
    ]);
  });

  it('stops early with what it has, aborts silently and errors on nothing to say', async () => {
    const recognizer = createScriptedRecognizer({ wordMs: 1000 });
    const stopped = listener();
    recognizer.start({ locale: 'es-ES', expected: 'uno dos' }, stopped).stop();
    expect(stopped.events).toEqual(['final:uno dos', 'end']);

    const aborted = listener();
    const session = recognizer.start({ locale: 'es-ES', expected: 'uno' }, aborted);
    session.abort();
    session.abort();
    expect(aborted.events).toEqual(['end']);

    const empty = listener();
    recognizer.start({ locale: 'es-ES' }, empty).stop();
    expect(empty.events).toEqual(['error:SPEECH_NO_MATCH', 'end']);
  });
});

function fakeNative(available = true) {
  const starts: { audioUri?: string }[] = [];
  const stops: number[] = [];
  const native: NativeRecognizer = {
    kind: 'on-device',
    prepare: async () => ({ available, kind: 'on-device' }),
    requestPermission: async () => true,
    start(request: NativeRecognitionRequest, l: RecognitionListener) {
      starts.push({ audioUri: request.audioUri });
      return {
        stop: () => {
          stops.push(1);
          l.onFinal({ transcript: request.expected ?? '', confidence: 1, words: [] });
        },
        abort: () => l.onEnd?.(),
      };
    },
  };
  return { native, starts, stops };
}

describe('bundled clips', () => {
  it('feeds the clip to the native recogniser and ignores early release', async () => {
    const { native, starts, stops } = fakeNative();
    const recognizer = withBundledClips(native, async (text) =>
      text === 'hola' ? 'file:///hola.wav' : null,
    );
    expect(recognizer.kind).toBe('on-device');
    expect((await recognizer.prepare('es-ES')).available).toBe(true);
    expect(await recognizer.requestPermission()).toBe(true);

    const session = recognizer.start({ locale: 'es-ES', expected: 'hola' }, listener());
    await flush();
    session.stop();
    expect(starts).toEqual([{ audioUri: 'file:///hola.wav' }]);
    expect(stops).toEqual([]);
  });

  it('uses the microphone without a clip, honouring a release that came first', async () => {
    const { native, starts, stops } = fakeNative();
    const recognizer = withBundledClips(native, async () => null);
    const session = recognizer.start({ locale: 'es-ES', expected: 'adios' }, listener());
    session.stop();
    await flush();
    expect(starts).toEqual([{ audioUri: undefined }]);
    expect(stops).toEqual([1]);
  });

  it('reports a clip that fails to load and can be aborted before starting', async () => {
    const { native, starts } = fakeNative();
    const failing = withBundledClips(native, async () => {
      throw new Error('asset missing');
    });
    const l = listener();
    failing.start({ locale: 'es-ES', expected: 'x' }, l);
    await flush();
    expect(l.events).toEqual(['error:SPEECH_FAILED', 'end']);

    const slow = withBundledClips(native, async () => 'file:///x.wav');
    slow.start({ locale: 'es-ES', expected: 'x' }, listener()).abort();
    await flush();
    expect(starts).toHaveLength(0);
  });
});

describe('fallback', () => {
  it('switches to the scripted recogniser where the platform has none', async () => {
    const recognizer = withFallback(
      fakeNative(false).native,
      createScriptedRecognizer({ wordMs: 0 }),
    );
    expect((await recognizer.prepare('es-ES')).kind).toBe('scripted');
    expect(recognizer.kind).toBe('scripted');
    expect(await recognizer.requestPermission()).toBe(true);

    const throwing: SpeechRecognizer = {
      ...fakeNative().native,
      prepare: async () => {
        throw new Error('module missing');
      },
    };
    expect((await withFallback(throwing, createScriptedRecognizer()).prepare('es-ES')).kind).toBe(
      'scripted',
    );

    const real = withFallback(fakeNative(true).native, createScriptedRecognizer());
    expect((await real.prepare('es-ES')).kind).toBe('on-device');
    const l = listener();
    real.start({ locale: 'es-ES', expected: 'hola' }, l).stop();
    expect(l.events).toContain('final:hola');
  });
});

describe('speaking attempt', () => {
  it('scores what the recogniser heard against the sentence', async () => {
    const attempt = createSpeakingAttempt(createScriptedRecognizer({ wordMs: 0 }));
    await attempt.prepare('es-ES');
    const result = await attempt.start('Hola amigo', 'es-ES');
    expect(result?.overall).toBeGreaterThan(90);
    expect(attempt.state.get()).toMatchObject({
      phase: 'scored',
      heard: 'Hola amigo',
      attempts: 1,
      recognizer: 'scripted',
    });
    attempt.reset();
    expect(attempt.state.get()).toMatchObject({ phase: 'idle', result: null, attempts: 1 });
    attempt.dispose();
  });

  it('reports denied permission and recogniser errors', async () => {
    const denied: SpeechRecognizer = {
      ...createScriptedRecognizer(),
      requestPermission: async () => false,
    };
    const attempt = createSpeakingAttempt(denied);
    expect(await attempt.start('hola', 'es-ES')).toBeNull();
    expect(attempt.state.get().error?.code).toBe('SPEECH_PERMISSION_DENIED');

    const broken: SpeechRecognizer = {
      ...createScriptedRecognizer(),
      start: (_r, l) => {
        l.onError(new AppError('SPEECH_UNAVAILABLE', 'no'));
        return { stop: () => undefined, abort: () => undefined };
      },
    };
    const failing = createSpeakingAttempt(broken);
    expect(await failing.start('hola', 'es-ES')).toBeNull();
    expect(failing.state.get()).toMatchObject({
      phase: 'idle',
      error: expect.objectContaining({ code: 'SPEECH_UNAVAILABLE' }),
    });
    failing.stop();
  });

  it('ignores a second start while listening', async () => {
    const attempt = createSpeakingAttempt(createScriptedRecognizer({ wordMs: 5 }));
    const first = attempt.start('uno dos', 'es-ES');
    await flush();
    expect(await attempt.start('tres', 'es-ES')).toBeNull();
    attempt.stop();
    expect((await first)?.words).toHaveLength(2);
  });
});

describe('silent speaker', () => {
  it('records lines and completes immediately', () => {
    const speaker = createSilentSpeaker();
    const done = jest.fn();
    speaker.speak('hola', 'es-ES', { onDone: done });
    speaker.stop();
    expect(speaker.spoken).toEqual(['hola']);
    expect(done).toHaveBeenCalled();
  });
});
