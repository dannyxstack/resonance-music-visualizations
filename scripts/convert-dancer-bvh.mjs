// Convert selected CMU/Bruce Hahne BVH clips to compact, camera-facing joint tracks.
// Usage: node scripts/convert-dancer-bvh.mjs SOURCE_DIRECTORY
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const sourceDirectory = resolve(process.argv[2] || '.');
const outputDirectory = resolve('public/visualizers/space-odyssey/motions');
const clips = [
  { id: 'shuffle', file: '85_04.bvh', source: 'CMU subject 85 trial 04, FancyFootWork', start: 2.4, duration: 1.6, yaw: 0.28 },
  { id: 'jump', file: '85_01.bvh', source: 'CMU subject 85 trial 01, JumpTwist', start: 2.2, duration: 1.4, yaw: 0.22 },
  { id: 'moonwalk', file: '90_32.bvh', source: 'CMU subject 90 trial 32, moonwalk', start: 2.7, duration: 2.4, yaw: 0.82 },
];
const jointNames = [
  'Hips', 'Spine1', 'Neck1', 'Head',
  'LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm', 'RightForeArm', 'RightHand',
  'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot',
];
const jointOrder = Object.fromEntries(jointNames.map((name, index) => [name, index]));
const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const multiply = (a, b) => [
  a[0] * b[0] + a[1] * b[3] + a[2] * b[6], a[0] * b[1] + a[1] * b[4] + a[2] * b[7], a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
  a[3] * b[0] + a[4] * b[3] + a[5] * b[6], a[3] * b[1] + a[4] * b[4] + a[5] * b[7], a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
  a[6] * b[0] + a[7] * b[3] + a[8] * b[6], a[6] * b[1] + a[7] * b[4] + a[8] * b[7], a[6] * b[2] + a[7] * b[5] + a[8] * b[8],
];
const rotate = (r, v) => [r[0] * v[0] + r[1] * v[1] + r[2] * v[2], r[3] * v[0] + r[4] * v[1] + r[5] * v[2], r[6] * v[0] + r[7] * v[1] + r[8] * v[2]];
function axisRotation(axis, radians) {
  const c = Math.cos(radians), s = Math.sin(radians);
  if (axis === 'X') return [1, 0, 0, 0, c, -s, 0, s, c];
  if (axis === 'Y') return [c, 0, s, 0, 1, 0, -s, 0, c];
  return [c, -s, 0, s, c, 0, 0, 0, 1];
}

export function parseBvh(source) {
  const [hierarchy, motion] = source.replaceAll('\r', '').split(/\nMOTION\n/);
  if (!motion) throw new Error('BVH motion section missing');
  const tokens = hierarchy.match(/\{|\}|[^\s{}]+/g) || [];
  let cursor = 0, channelCount = 0;
  const next = () => tokens[cursor++];
  const expect = word => { if (next() !== word) throw new Error(`Expected ${word} in BVH hierarchy`); };
  expect('HIERARCHY');
  function node(parent = null) {
    const kind = next();
    if (!['ROOT', 'JOINT', 'End'].includes(kind)) throw new Error(`Unknown BVH node: ${kind}`);
    if (kind === 'End') expect('Site');
    const name = kind === 'End' ? `${parent.name}End` : next();
    expect('{');
    const result = { name, parent, offset: [0, 0, 0], channels: [], channelStart: 0, children: [] };
    while (tokens[cursor] !== '}') {
      const key = tokens[cursor];
      if (key === 'OFFSET') { next(); result.offset = [Number(next()), Number(next()), Number(next())]; }
      else if (key === 'CHANNELS') {
        next(); const count = Number(next()); result.channelStart = channelCount;
        result.channels = Array.from({ length: count }, next); channelCount += count;
      } else result.children.push(node(result));
    }
    expect('}');
    return result;
  }
  const root = node();
  const lines = motion.trim().split('\n');
  const frameCount = Number(lines[0].match(/^Frames:\s*(\d+)/)?.[1]);
  const frameTime = Number(lines[1].match(/^Frame Time:\s*([\d.]+)/)?.[1]);
  if (!frameCount || !frameTime || lines.length - 2 < frameCount) throw new Error('Invalid BVH frames');
  const frames = lines.slice(2, 2 + frameCount).map(line => {
    const values = line.trim().split(/\s+/).map(Number);
    if (values.length !== channelCount || values.some(value => !Number.isFinite(value))) throw new Error('Invalid BVH channel values');
    return values;
  });
  return { root, frames, frameTime };
}

function frameJoints(root, channels) {
  const result = Array(jointNames.length);
  function visit(node, parentRotation = identity, parentPosition = [0, 0, 0]) {
    let localRotation = identity;
    const position = [...node.offset];
    node.channels.forEach((channel, index) => {
      const value = channels[node.channelStart + index];
      if (channel.endsWith('position')) position['XYZ'.indexOf(channel[0])] += value;
      else localRotation = multiply(localRotation, axisRotation(channel[0], value * Math.PI / 180));
    });
    const shifted = rotate(parentRotation, position);
    const worldPosition = parentPosition.map((value, index) => value + shifted[index]);
    const worldRotation = multiply(parentRotation, localRotation);
    const slot = jointOrder[node.name];
    if (slot !== undefined) result[slot] = worldPosition;
    node.children.forEach(child => visit(child, worldRotation, worldPosition));
  }
  visit(root);
  if (jointNames.some((_, index) => !result[index])) throw new Error('Required skeleton joints missing');
  return result;
}

function sampleFrame(bvh, seconds) {
  const position = Math.max(1, Math.min(bvh.frames.length - 1.001, seconds / bvh.frameTime)); // skip the conversion's T-pose
  const index = Math.floor(position), fraction = position - index;
  const a = frameJoints(bvh.root, bvh.frames[index]);
  const b = frameJoints(bvh.root, bvh.frames[index + 1]);
  return a.map((point, joint) => point.map((value, axis) => value + (b[joint][axis] - value) * fraction));
}

export function convertClip(bvh, spec) {
  const fps = 30, count = Math.round(spec.duration * fps);
  const sourceFrames = Array.from({ length: count }, (_, index) => sampleFrame(bvh, spec.start + index / fps));
  const ground = Math.min(...sourceFrames.map(frame => Math.min(frame[jointOrder.LeftFoot][1], frame[jointOrder.RightFoot][1])));
  const heights = sourceFrames.map(frame => frame[jointOrder.Head][1] - ground).sort((a, b) => a - b);
  const scale = heights[Math.floor(heights.length * .5)];
  if (!(scale > 1)) throw new Error('Invalid BVH body height');
  const cos = Math.cos(spec.yaw), sin = Math.sin(spec.yaw);
  const frames = sourceFrames.map(frame => {
    const root = frame[jointOrder.Hips];
    return frame.flatMap(point => [
      Math.round(((point[0] - root[0]) * cos + (point[2] - root[2]) * sin) / scale * 10000) / 10000,
      Math.round((point[1] - ground) / scale * 10000) / 10000,
    ]);
  });
  return { id: spec.id, fps, joints: jointNames, source: spec.source, frames };
}

if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href) {
  await mkdir(outputDirectory, { recursive: true });
  const convertedClips = {};
  for (const spec of clips) {
    const bvh = parseBvh(await readFile(resolve(sourceDirectory, spec.file), 'utf8'));
    const converted = convertClip(bvh, spec);
    convertedClips[spec.id] = converted;
    process.stdout.write(`${spec.id}: ${converted.frames.length} frames from ${spec.file}\n`);
  }
  await writeFile(resolve(outputDirectory, 'index.js'), `// Generated by scripts/convert-dancer-bvh.mjs from CMU motion capture.\nexport const dancerMotions = ${JSON.stringify(convertedClips)};\n`);
}
