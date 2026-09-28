# Bay Area Audio-Reactive Tech Ecosystem

An experimental browser-based music visualization prototype. Select a local MP3 or audio file, press Play, and the app maps real-time audio features onto a simplified Bay Area technology ecosystem.

```text
Local Audio
    -> Web Audio API
    -> AudioFeatures
    -> Audio DNA
    -> Visual Engine
    -> Map + Entities + Flows + Particles
```

## Concept

The visualization treats Bay Area technology companies as configurable nodes on a stylized map. Each node has its own Audio DNA: frequency band, motion type, response speed, intensity, and capital-flow behavior. The result is meant to feel like a restrained living ecosystem, not an equalizer.

## Local Development

```bash
npm install
npm run dev
```

Use `npm run build` for a production build and TypeScript check.

## Audio Privacy

Audio remains on the device. Selected files are loaded with `URL.createObjectURL(file)` and are never uploaded to a server.

## Tempo Analysis

When a user selects an audio file, the app also performs a local offline tempo pass before playback. The implementation lives in `src/audio/TempoAnalyzer.ts`.

Current method:

1. Read the selected file in the browser with `FileReader`.
2. Decode the MP3/audio data locally with `AudioContext.decodeAudioData`.
3. Split the decoded audio into short overlapping frames.
4. Mix all channels and calculate frame energy.
5. Build an onset envelope from positive energy increases between frames.
6. Normalize and locally sharpen the envelope to emphasize likely beat attacks.
7. Search the common tempo range, currently 70-180 BPM, using autocorrelation-style lag scoring.
8. Pick the strongest lag as the estimated beat interval and BPM.
9. Search beat phase offsets to estimate the first beat time.
10. Use the resulting beat grid for beat-synced actions such as `beatJump`, `beatSideStep`, `beatTilt`, and `beatShape`.

This is a lightweight MVP tempo detector, not a full DJ-grade beat tracker. It works best on songs with clear rhythmic onsets and steady tempo. Weak drums, long ambient intros, tempo changes, swing, or half-time/double-time ambiguity can produce imperfect BPM or first-beat estimates.

## Configuration

Company placement and brand assets live in `src/config/companies.ts`. Audio behavior lives in `src/config/audioDNA.ts`. Abstract network connections live in `src/config/connections.ts`. Global tuning values live in `src/config/visualization.ts`.

## Brand Assets

The app works without third-party logo files because every node has a fallback label. This prototype includes local SVG brand-like assets because the brief requested official logos for local prototyping. Replace them with authorized files and review official brand guidelines before public or commercial usage.

## Debug Mode

Press `D` to toggle the debug panel. It shows RMS, frequency-band energy, spectral flux, onset, beat state, FPS, and particle count.

## Roadmap

Future versions could support multiple scenes, richer entity models, alternate Audio DNA sets, and external data feeds. MVP scope intentionally avoids backend services, accounts, maps APIs, streaming integrations, and economic claims.
