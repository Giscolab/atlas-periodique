import test from 'node:test';
import assert from 'node:assert/strict';
import { createElementTour } from '../element-tour.mjs';

function observe(options = {}) {
  const selections = [];
  const states = [];
  const tour = createElementTour({
    ...options,
    onSelect: z => selections.push(z),
    onState: state => states.push({ ...state }),
  });
  return { tour, selections, states };
}

test('automatic tour presents every one of the 118 elements in atomic-number order', () => {
  const { tour, selections } = observe();
  assert.deepEqual(tour.snapshot(), { status: 'idle', current: 1, duration: 3, elapsed: 0 });
  tour.start();
  for (let z = 2; z <= 118; z++) {
    tour.update(1);
    tour.update(1);
    assert.equal(tour.snapshot().current, z - 1);
    tour.update(1);
    assert.equal(tour.snapshot().current, z);
  }
  assert.deepEqual(selections, Array.from({ length: 118 }, (_, index) => index + 1));
  assert.equal(tour.snapshot().status, 'playing');
});

test('last element remains visible for the full duration and restart starts at hydrogen', () => {
  const { tour, selections, states } = observe({ total: 3, duration: 4 });
  tour.start();
  tour.update(4);
  tour.update(4);
  tour.update(3.9);
  assert.equal(tour.snapshot().status, 'playing');
  assert.equal(tour.snapshot().current, 3);
  tour.update(0.2);
  assert.equal(tour.snapshot().status, 'finished');
  assert.equal(tour.snapshot().current, 3);
  tour.update(100);
  assert.deepEqual(selections, [1, 2, 3]);
  assert.ok(states.some(state => state.status === 'finished' && state.current === 3));
  tour.start();
  assert.deepEqual(selections, [1, 2, 3, 1]);
  assert.equal(tour.snapshot().elapsed, 0);
  assert.equal(tour.snapshot().status, 'playing');
});

test('pause preserves reading time and resume does not skip the current element', () => {
  const { tour, selections } = observe({ total: 4, duration: 3 });
  tour.start();
  tour.update(3);
  tour.update(2);
  tour.pause();
  assert.deepEqual(tour.snapshot(), { status: 'paused', current: 2, duration: 3, elapsed: 2 });
  tour.update(120);
  assert.equal(tour.snapshot().elapsed, 2);
  const beforeResume = selections.length;
  tour.start();
  assert.equal(tour.snapshot().current, 2);
  assert.equal(tour.snapshot().elapsed, 2);
  assert.ok(selections.slice(beforeResume).every(z => z === 2));
  tour.update(0.5);
  assert.equal(tour.snapshot().current, 2);
  tour.update(0.5);
  assert.equal(tour.snapshot().current, 3);
});

test('stop cancels the tour and delayed animation updates cannot select another element', () => {
  const { tour, selections } = observe();
  tour.start();
  tour.update(3);
  tour.stop();
  const selectionCount = selections.length;
  assert.deepEqual(tour.snapshot(), { status: 'idle', current: 1, duration: 3, elapsed: 0 });
  tour.update(300);
  tour.update(3);
  assert.equal(selections.length, selectionCount);
  assert.equal(tour.snapshot().status, 'idle');
});

test('manual previous and next pause playback and clamp at the two ends', () => {
  const { tour, selections } = observe({ total: 3 });
  tour.start();
  tour.update(1.2);
  tour.step(-1);
  assert.deepEqual(tour.snapshot(), { status: 'paused', current: 1, duration: 3, elapsed: 0 });
  tour.step(1);
  tour.step(1);
  tour.step(1);
  tour.step(1);
  assert.equal(tour.snapshot().current, 3);
  assert.equal(tour.snapshot().status, 'paused');
  tour.update(100);
  assert.equal(tour.snapshot().current, 3);
  tour.step(-1);
  tour.step(-1);
  tour.step(-1);
  assert.equal(tour.snapshot().current, 1);
  assert.deepEqual(selections, [1, 1, 2, 3, 3, 3, 2, 1, 1]);
});

test('changing speed grants the current element a full interval at the new speed', () => {
  const { tour } = observe({ duration: 5 });
  tour.start();
  tour.update(4.8);
  tour.setDuration(1.5);
  assert.equal(tour.snapshot().elapsed, 0);
  assert.equal(tour.snapshot().duration, 1.5);
  assert.equal(tour.snapshot().status, 'playing');
  tour.update(1.4);
  assert.equal(tour.snapshot().current, 1);
  tour.update(0.2);
  assert.equal(tour.snapshot().current, 2);
});

test('a long frame advances once and gives the next element a fresh interval', () => {
  const { tour, selections } = observe();
  tour.start();
  tour.update(600);
  assert.deepEqual(selections, [1, 2]);
  assert.equal(tour.snapshot().elapsed, 0);
  tour.update(0);
  tour.update(2.9);
  assert.equal(tour.snapshot().current, 2);
  tour.update(0.2);
  assert.deepEqual(selections, [1, 2, 3]);
});

test('single-element tour still waits for the reading duration before finishing', () => {
  const { tour, selections } = observe({ total: 1, duration: 2 });
  tour.start();
  tour.update(1.9);
  assert.equal(tour.snapshot().status, 'playing');
  tour.update(0.2);
  assert.equal(tour.snapshot().status, 'finished');
  assert.deepEqual(selections, [1]);
});

test('invalid duration and element counts are rejected', () => {
  for (const duration of [0, -1, NaN, Infinity, -Infinity]) {
    assert.throws(() => createElementTour({ duration }), RangeError);
  }
  for (const total of [0, -1, 1.5, NaN, Infinity, -Infinity]) {
    assert.throws(() => createElementTour({ total }), RangeError);
  }
  const { tour } = observe();
  tour.start();
  tour.update(1);
  const before = tour.snapshot();
  for (const duration of [0, -1, NaN, Infinity, -Infinity]) {
    assert.throws(() => tour.setDuration(duration), RangeError);
    assert.deepEqual(tour.snapshot(), before);
  }
});

test('invalid frame deltas do not corrupt playback or change the selected element', () => {
  const { tour, selections } = observe();
  tour.start();
  tour.update(1);
  const before = tour.snapshot();
  for (const delta of [-1, NaN, Infinity, -Infinity]) {
    assert.doesNotThrow(() => tour.update(delta));
    assert.deepEqual(tour.snapshot(), before);
  }
  assert.deepEqual(selections, [1]);
  tour.update(2);
  assert.deepEqual(selections, [1, 2]);
});
