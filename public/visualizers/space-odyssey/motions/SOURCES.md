# Space Odyssey dancer motion data

`index.js` contains 2D joint tracks converted from the [CMU Graphics Lab Motion Capture Database](https://mocap.cs.cmu.edu/). The source BVH files are from [Bruce Hahne's BVH conversion of the CMU database](https://github.com/una-dinosauria/cmu-mocap). CMU permits use of the motion data in commercial products, but does not permit selling the motion data itself. The BVH conversion's [READMEFIRST](https://github.com/una-dinosauria/cmu-mocap/blob/master/READMEFIRST.txt) adds no restrictions to the original data. This project uses the data to animate a visualizer; it does not distribute the original BVH files.

| UI style | Source clip | Segment | Description |
| --- | --- | --- | --- |
| 街舞脚步 | [85_04.bvh](https://github.com/una-dinosauria/cmu-mocap/blob/master/data/085/85_04.bvh) | 2.4–4.0 s | CMU `FancyFootWork`; used as shuffle-like footwork, not a literal Melbourne Shuffle performance |
| 跳跃舞 | [85_01.bvh](https://github.com/una-dinosauria/cmu-mocap/blob/master/data/085/85_01.bvh) | 2.2–3.6 s | CMU `JumpTwist`; an upright jumping segment |
| 太空步 | [90_32.bvh](https://github.com/una-dinosauria/cmu-mocap/blob/master/data/090/90_32.bvh) | 2.7–5.1 s | CMU `moonwalk` |

Regenerate from the three source BVH files with `node scripts/convert-dancer-bvh.mjs /path/to/downloaded/bvh/files`. The converter samples 30 frames per second, solves the BVH hierarchy, projects 16 joints into 2D, and normalizes height. Runtime playback interpolates the tracks, loops over four musical beats, and blends the loop seam.
