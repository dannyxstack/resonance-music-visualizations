import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLocalAudio, toPcmWav, audioErrorMessage } from '../public/visualizers/perth/local-audio.js';

class TestAudio extends EventTarget {
  constructor(outcomes) { super(); this.outcomes = [...outcomes]; this.urls = []; }
  load() {
    this.urls.push(this.src);
    const outcome = this.outcomes.shift();
    if (!outcome) return;
    queueMicrotask(() => {
      this.error = outcome === 'error' ? { code: 4 } : null;
      this.readyState = outcome === 'error' ? 0 : 4;
      this.dispatchEvent(new Event(outcome === 'error' ? 'error' : 'canplay'));
    });
  }
}
const file = () => new File(['test audio bytes'], 'test.m4a', { type: 'application/octet-stream' });
const buffer = {
  numberOfChannels: 2, sampleRate: 44100, length: 3,
  getChannelData: i => i === 0 ? new Float32Array([-1, 0, 1]) : new Float32Array([1, .5, -1]),
};

test('playback readiness waits for canplay, and native success avoids decoding', async () => {
  const audio = new TestAudio([]);
  let ready = false;
  const loaded = loadLocalAudio(audio, file(), { signal: new AbortController().signal, getContext: () => assert.fail('Native source must not be decoded') }).then(url => { ready = true; return url; });
  await Promise.resolve();
  assert.equal(ready, false);
  const source = await fetch(audio.src).then(r => r.blob());
  assert.equal(source.type, 'audio/mp4');
  audio.readyState = 4;
  audio.dispatchEvent(new Event('canplay'));
  const url = await loaded;
  assert.equal(ready, true);
  URL.revokeObjectURL(url);
});

test('media-source rejection falls back to decoded PCM and frees the failed URL', async () => {
  const audio = new TestAudio(['error', 'ready']);
  let fallback = false;
  const url = await loadLocalAudio(audio, file(), {
    signal: new AbortController().signal,
    getContext: () => ({ decodeAudioData: async () => buffer }),
    onFallback: () => { fallback = true; },
  });
  assert.equal(fallback, true);
  assert.equal(audio.urls.length, 2);
  await assert.rejects(fetch(audio.urls[0]));
  const wav = await fetch(url).then(r => r.blob());
  assert.equal(wav.type, 'audio/wav');
  assert.equal(wav.size, 56);
  URL.revokeObjectURL(url);
});

test('unsupported codec reports a handled error and releases its URL', async () => {
  const audio = new TestAudio(['error']);
  await assert.rejects(loadLocalAudio(audio, file(), {
    signal: new AbortController().signal,
    getContext: () => ({ decodeAudioData: async () => { throw new Error('Unknown codec'); } }),
  }), { name: 'NotSupportedError' });
  await assert.rejects(fetch(audio.urls[0]));
  assert.match(audioErrorMessage({ name: 'NotSupportedError' }), /无法解码/);
  assert.match(audioErrorMessage({ name: 'NotAllowedError' }), /再次点击/);
});

test('changing a file during decoding cannot overwrite the newer source', async () => {
  const audio = new TestAudio(['error', 'ready']);
  const selection = new AbortController();
  let resolveDecode;
  let decodeStarted;
  const started = new Promise(resolve => { decodeStarted = resolve; });
  const old = loadLocalAudio(audio, file(), {
    signal: selection.signal,
    getContext: () => ({ decodeAudioData: () => { decodeStarted(); return new Promise(resolve => { resolveDecode = resolve; }); } }),
  });
  const rejected = assert.rejects(old, { name: 'AbortError' });
  await started;
  selection.abort();
  const newUrl = await loadLocalAudio(audio, file(), { signal: new AbortController().signal, getContext: () => assert.fail('Second file should load normally') });
  resolveDecode(buffer);
  await rejected;
  assert.equal(audio.src, newUrl);
  assert.equal(audio.urls.length, 2);
  URL.revokeObjectURL(newUrl);
});

test('cancelling native load rejects without waiting for a late media event', async () => {
  const audio = new TestAudio([]);
  const selection = new AbortController();
  const loaded = loadLocalAudio(audio, file(), { signal: selection.signal, getContext: () => assert.fail('Cancelled source must not decode') });
  const rejected = assert.rejects(loaded, { name: 'AbortError' });
  selection.abort();
  await rejected;
  await assert.rejects(fetch(audio.urls[0]));
});

test('PCM WAV follows RIFF sizes, sample rate and stereo interleaving', async () => {
  const bytes = await toPcmWav(buffer).arrayBuffer();
  const view = new DataView(bytes);
  assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), 'RIFF');
  assert.equal(view.getUint32(4, true), bytes.byteLength - 8);
  assert.equal(view.getUint16(22, true), 2);
  assert.equal(view.getUint32(24, true), 44100);
  assert.deepEqual(Array.from({ length: 6 }, (_, i) => view.getInt16(44 + i * 2, true)), [-32768, 32767, 0, 16384, 32767, -32768]);
});
