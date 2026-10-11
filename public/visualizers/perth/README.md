# Music Wave Vision Under Thunder

A browser-based music visualizer that maps audio energy onto a city skyline. Building windows light up like spectrum bars, stars move slowly through the night, and lightning flashes in response to the selected rhythm band.

## Features

- Local audio file playback through the Web Audio API.
- Canvas-rendered skyline, colored stars, lightning, dim window-light reflections in the water, and idle waveform.
- City image backdrop with configurable building window regions.
- Building hover labels based on the configured `imageBuildings` rectangles.
- Bass, Mid, and Treble meters.
- Bass/Mid/Treble frequency analysis with selectable energy methods for meters and city buildings.
- Adjustable lightning visibility, brightness, and frequency.
- Adjustable star visibility, count, and movement speed.
- Shooting stars with an independent frequency control.
- Offline beat detection for a named building.
- Adjustable background brightness.
- Selectable lightning rhythm source: Bass, Mid, or Treble.
- Collapsible advanced settings panel.
- Spacebar playback toggle after an audio file is selected.

## Run

This project has no build step and no package dependencies.

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:4173/index.html
```

You can also open `index.html` directly, but using a local server is more reliable across browsers.

## Basic Use

1. Click the music-note icon to choose a local audio file.
2. After the file is chosen, focus automatically moves to the play button.
3. Press Enter, click the play icon, or press Space to play/pause.
4. Click the image icon to choose another city skyline image.
5. Use the settings chevron to expand or collapse advanced controls.

## Controls

- `Lightning Brightness`: controls bolt glow and flash intensity.
- `Lightning`: shows or hides lightning. When disabled, no bolts or flash overlay are drawn.
- `Lightning Frequency`: controls how often lightning appears. The center is `1x`; each step left halves the frequency, and each step right doubles it.
- `Base Background Brightness`: controls the non-lightning brightness of the skyline and sky.
- `Water Reflections`: shows or hides the added building-light reflections below the waterline. Each reflection keeps its source window's horizontal position.
- `Stars`: shows or hides the moving star field.
- `Star Count`: controls how many stars are drawn.
- `Star Speed`: controls the very slow left-to-right star movement. All stars move with a wide speed spread, 50% twinkle, and 50% use pink, purple, or warm yellow nebula tones.
- `Shooting Stars`: shows or hides meteors that travel from upper right to lower left, independently of the music.
- `Meteor Frequency`: sets an approximate interval of 2–15 seconds between meteors.
- `City Scene Energy Method`: chooses how the skyline buildings respond to live frequency energy, analyzed beats, and the offline low-frequency envelope.
- `Sky Title`: shows or hides the animated title in the sky.
- `Sky Title Text`: changes the sky title text. The default is `Music Wave Visualization With Skyline`.
- `Sky Title Rhythm`: chooses which beat track controls title color speed and subtle brightness.
- `Beat Buildings`: maps several detected beat tracks to buildings by `imageBuildings` `name`. Leave a building name empty to disable that track.
- `Detect Beats`: estimates BPM and beat offset for Main, Kick, Backbeat, and Hats tracks from the chosen audio file.
- Beat track `BPM` and `Offset`: allow manual correction after detection.
- `Lightning Rhythm`: chooses whether Bass, Mid, or Treble drives lightning.

## Audio Analysis

The live frequency analysis uses three ranges:

- Bass: `35-250Hz`
- Mid: `250-2600Hz`
- Treble: `2600-12000Hz`

Each range is averaged and smoothed. The city scene energy selector then combines live energy with the analyzed beat or low-frequency envelope according to the selected method. Each building receives its own live frequency slice.

## Sky Title

The sky title is drawn on the canvas, above the skyline. Its white stroke and shadow stay fixed, while the inner fill uses a 720px repeating hue pattern: every 2px advances one hue step, so all 360 hue values complete one cycle.

The fill pattern moves from right to left. Its speed is scaled from `1` to `8` by the selected beat track pulse, and its brightness changes subtly with the same pulse.

## Star Performance

Stars are drawn as lightweight colored points. Only the twinkling foreground stars receive a small glow or cross flare, because applying canvas shadow blur to every star each frame is expensive and can cause stutter. Building hover labels are disabled during playback to avoid per-frame hit testing while music is running.

## City Building Mapping

The city image is drawn from `city-skyline.gpt.png` by default. The `imageBuildings` array in `app.js` defines where building windows should be drawn.

Each object uses image-relative coordinates:

```js
{ name: "7", x: 0.348, y: 0.818, width: 0.099, height: 0.34, cols: 8, rows: 16 }
```

Meaning:

- `name`: stable building identifier used by `Beat Buildings`.
- `x`: left edge of the building, as a fraction of image width.
- `y`: bottom edge of the building, as a fraction of image height.
- `width`: building width, as a fraction of image width.
- `height`: building height, as a fraction of image height.
- `cols`: number of window columns.
- `rows`: number of window rows.

Internally, the top edge is calculated as:

```js
topY = y - height
```

You can replace numeric names with your own labels, for example:

```js
{ name: "BHP", x: 0.348, y: 0.818, width: 0.099, height: 0.34, cols: 8, rows: 16 }
```

Then enter `BHP` in one of the `Beat Buildings` name fields and click `Detect Beats`.

Moving the pointer over a configured building rectangle while playback is stopped shows that building's `name`. This hover label uses the `imageBuildings` render region, not image recognition, and is disabled during playback for performance.

## Beat Detection

The beat detector runs after an audio file is selected and `Detect Beats` is clicked. It:

- decodes the selected audio file locally in the browser,
- renders several filtered versions offline,
- builds onset-style energy envelopes,
- estimates BPM with autocorrelation,
- estimates an initial beat offset from the strongest early beat grid,
- fills four editable beat tracks:
  - `Main`: low-frequency and mid-frequency combined pulse.
  - `Kick`: low-frequency drum pulse.
  - `Backbeat`: mid-frequency attack pulse for snare, claps, or rhythmic instruments.
  - `Hats`: high-frequency pulse for hi-hats, shakers, and bright percussion.

The detected BPM and offset can be manually adjusted per track. A track only renders when its building name is filled in. Matching buildings receive a pulse on that track while playback runs.

## Files

- `index.html`: page structure and controls.
- `styles.css`: layout, controls, responsive behavior, and icon styling.
- `app.js`: audio analysis, animation, skyline mapping, stars, lightning, and playback.
- `city-skyline.gpt.png`: default city skyline image.
- `rules.md`: UI maintenance rules for the collapsible controls.

## UI Rules

The main control bar should only keep always-needed controls visible:

- title
- audio picker
- city image picker
- play/pause
- settings collapse button

Advanced settings belong inside `#advancedControls`, including range sliders, radio groups, and future checkboxes. See `rules.md` for the maintained rule list.

## Notes

- The app runs fully in the browser.
- Audio files remain local to the user’s machine.
- Some visual timing depends on browser rendering performance.
