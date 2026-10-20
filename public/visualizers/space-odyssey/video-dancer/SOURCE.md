Source: user-provided pixabay-75551.mp4, https://pixabay.com/videos/girl-dancer-party-dancing-75551/
Source licensing: Pixabay Content License; retain the source reference when reusing.
Derived transparent masks, 24 fps, 380 frames. Fixed crop 480x912 at (656,112), downscaled to 240x456; 64 frames per 8x8 atlas. RGB is white; alpha is clamped (source red - 12) / 225. The complete source dance loops at its original speed; the loop boundary is a cut, not a claimed seamless loop. Audio is excluded.

Regenerate from repository root (requires ffmpeg):

```sh
ffmpeg -v error -i pixabay-75551.mp4 -an -vf "fps=24,crop=480:912:656:112,scale=240:456,format=rgba,geq=r=255:g=255:b=255:a='clip((r(X,Y)-12)/225*255,0,255)',tile=8x8:color=black@0" -fps_mode passthrough public/visualizers/space-odyssey/video-dancer/atlas-%02d.png
```
