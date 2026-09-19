import test from 'node:test';
import assert from 'node:assert/strict';
import { fitFrontCamera } from '../camera-fit.mjs';

function corners({ min, max }) {
  return [min[0], max[0]].flatMap(x => [min[1], max[1]].flatMap(y =>
    [min[2], max[2]].map(z => [x, y, z])));
}

// Independent perspective projection: camera rotation is identity, looking
// along -Z. Convert camera-space coordinates to normalized viewport values.
function project(point, camera, aspect, fov = 28) {
  const eyeDepth = camera.position[2] - point[2];
  const focalLength = 1 / Math.tan(fov * Math.PI / 360);
  return [
    (1 + (point[0] - camera.position[0]) * focalLength / (eyeDepth * aspect)) / 2,
    (1 - (point[1] - camera.position[1]) * focalLength / eyeDepth) / 2,
    eyeDepth,
  ];
}

const box = { min: [-12, -6, -4], max: [16, 9, 3] };
const targetFrame = { left: 175 / 1536, right: 1225 / 1536, top: 110 / 1024, bottom: 840 / 1024 };
const scenarios = [
  { name: 'target landscape framing', aspect: 1536 / 1024, frame: targetFrame },
  { name: 'portrait framing', aspect: 0.5, frame: targetFrame },
  { name: 'wide landscape framing', aspect: 3, frame: targetFrame },
  { name: 'frame wholly left and above center', aspect: 1.5, frame: { left: 0.04, right: 0.42, top: 0.05, bottom: 0.45 } },
  { name: 'frame wholly right and below center', aspect: 0.7, frame: { left: 0.6, right: 0.96, top: 0.62, bottom: 0.95 } },
  { name: 'deep geometry', aspect: 1.5, frame: targetFrame, box: { min: [-12, -6, -800], max: [16, 9, 300] } },
  { name: 'deep geometry in side frame', aspect: 1.5, frame: { left: 0.02, right: 0.3, top: 0.2, bottom: 0.8 }, box: { min: [-12, -6, -800], max: [16, 9, 300] } },
];

for (const scenario of scenarios) {
  test(scenario.name, () => {
    const bounds = scenario.box ?? box;
    const camera = fitFrontCamera(bounds, scenario);
    const points = corners(bounds).map(point => project(point, camera, scenario.aspect));
    const epsilon = 1e-12;
    for (const [x, y, depth] of points) {
      assert.ok(x >= scenario.frame.left - epsilon && x <= scenario.frame.right + epsilon, `x ${x}`);
      assert.ok(y >= scenario.frame.top - epsilon && y <= scenario.frame.bottom + epsilon, `y ${y}`);
      assert.ok(depth > camera.near && depth < camera.far, `depth ${depth}`);
    }
    assert.equal(camera.position[0], camera.target[0]);
    assert.equal(camera.position[1], camera.target[1]);
    assert.equal(camera.distance, camera.position[2] - camera.target[2]);
    assert.equal(camera.target[2], (bounds.min[2] + bounds.max[2]) / 2);
    // An exact minimum fit must use both opposing edges in at least one axis.
    const xs = points.map(point => point[0]);
    const ys = points.map(point => point[1]);
    assert.ok(
      Math.abs(Math.min(...xs) - scenario.frame.left) < epsilon &&
      Math.abs(Math.max(...xs) - scenario.frame.right) < epsilon ||
      Math.abs(Math.min(...ys) - scenario.frame.top) < epsilon &&
      Math.abs(Math.max(...ys) - scenario.frame.bottom) < epsilon,
    );
  });
}

test('a reserved area on the right displaces the camera rightward', () => {
  const camera = fitFrontCamera({ min: [-2, -1, -1], max: [2, 1, 1] },
    { aspect: 1.5, frame: { left: 0.1, right: 0.6, top: 0.1, bottom: 0.9 } });
  assert.ok(camera.position[0] > 0);
});

test('known planar fit honors supplied vertical FOV and aspect', () => {
  const camera = fitFrontCamera({ min: [-2, -1, 0], max: [2, 1, 0] }, { aspect: 2, fov: 90 });
  assert.ok(Math.abs(camera.distance - 1) < 1e-12);
  assert.deepEqual(camera.target, [0, 0, 0]);
  assert.ok(camera.near < 1 && camera.far > 1);
});

test('point bounds retain a positive viewing distance and clip interval', () => {
  const camera = fitFrontCamera({ min: [1, 2, 3], max: [1, 2, 3] }, { aspect: 1 });
  assert.ok(camera.distance > 0 && camera.near > 0 && camera.far > camera.near);
});

test('invalid bounds and projection inputs fail explicitly', () => {
  for (const bounds of [null, {}, { min: [0, 0], max: [1, 1, 1] },
    { min: [0, NaN, 0], max: [1, 1, 1] }, { min: [0, 0, 0], max: [1, Infinity, 1] },
    { min: [2, 0, 0], max: [1, 1, 1] }]) {
    assert.throws(() => fitFrontCamera(bounds, { aspect: 1 }));
  }
  for (const options of [{}, { aspect: 0 }, { aspect: -1 }, { aspect: Infinity },
    { aspect: 1, fov: 0 }, { aspect: 1, fov: 180 }, { aspect: 1, fov: NaN },
    { aspect: 1, frame: null }, { aspect: 1, frame: {} },
    { aspect: 1, frame: { left: -0.1, right: 1, top: 0, bottom: 1 } },
    { aspect: 1, frame: { left: 0.5, right: 0.5, top: 0, bottom: 1 } },
    { aspect: 1, frame: { left: 0, right: 1, top: 1, bottom: 0 } }]) {
    assert.throws(() => fitFrontCamera(box, options));
  }
});

