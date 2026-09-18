import { test, expect } from '@playwright/test';
import { COURT, VIEWBOX, classifyBall, mirror, SPOT, OURS, FOREHAND_X }
  from '../src/app/court-geometry.js';

// Pure geometry — no browser needed, so run it once.
test.describe.configure({ mode: 'parallel' });

test('court carries real ITF dimensions', () => {
  expect(COURT.HALF_LENGTH * 2).toBeCloseTo(23.77, 3);
  expect(COURT.SINGLES_HALF * 2).toBeCloseTo(8.23, 3);
  expect(COURT.DOUBLES_HALF * 2).toBeCloseTo(10.97, 3);
  expect(COURT.SERVICE_LINE).toBeCloseTo(6.40, 3);
});

test('viewBox frames the whole court with run-off', () => {
  expect(VIEWBOX.w).toBeGreaterThan(COURT.DOUBLES_HALF * 2);
  expect(VIEWBOX.h).toBeGreaterThan(COURT.HALF_LENGTH * 2);
  expect(VIEWBOX.h / VIEWBOX.w).toBeGreaterThan(1.5); // portrait, suits a phone
});

test('our player is on the far side, facing the viewer', () => {
  expect(OURS).toBe(-1);
  expect(SPOT.ourBaseline().y).toBeCloseTo(-COURT.HALF_LENGTH, 6);
  expect(SPOT.theirBaseline().y).toBeCloseTo(COURT.HALF_LENGTH, 6);
  // He faces us, so his racket hand reads on our left.
  expect(FOREHAND_X).toBe(-1);
});

test('SPOT.at puts our half and theirs on opposite sides of the net', () => {
  expect(Math.sign(SPOT.at(0, 0.5, 'ours').y)).toBe(OURS);
  expect(Math.sign(SPOT.at(0, 0.5, 'theirs').y)).toBe(-OURS);
  expect(SPOT.at(0, 0, 'ours').y).toBeCloseTo(0, 9); // the net (may be -0)
});

// Wardlaw measures the ball against the PLAYER'S BODY, never the court lines.
test.describe('Wardlaw classification', () => {
  const near = (x) => ({ x, y: COURT.HALF_LENGTH - 2 });
  const far = (x) => ({ x, y: -COURT.HALF_LENGTH });

  test('a ball that crosses your centreline is an OUTSIDE ball', () => {
    // Standing at +2, dragged wide by a ball coming from the other side.
    expect(classifyBall(far(-3.4), near(3.2), 2)).toBe('outside');
    expect(classifyBall(far(3.4), near(-3.2), -2)).toBe('outside');
  });

  test('a ball that stays on one side of you is an INSIDE ball', () => {
    // Standing at +2, the ball arrives at +3 having come from +3.4: never crosses.
    expect(classifyBall(far(3.4), near(3), 2)).toBe('inside');
    expect(classifyBall(far(-3.4), near(-3), -2)).toBe('inside');
  });

  test('the same ball flips class depending on where you stand', () => {
    const from = far(-3.4), to = near(1.5);
    expect(classifyBall(from, to, 0.5)).toBe('outside'); // it crossed you
    expect(classifyBall(from, to, 2.5)).toBe('inside');  // it never reached you
  });

  test('a ball straight into your body is an INSIDE ball', () => {
    expect(classifyBall(far(2.6), near(1.5), 1.5)).toBe('inside');
  });

  test('classification survives mirroring for a left-hander', () => {
    const from = far(3.4), to = near(3), centre = 2;
    expect(classifyBall(mirror(from), mirror(to), -centre))
      .toBe(classifyBall(from, to, centre));
  });
});

test('SPOT helpers stay inside the singles court', () => {
  for (const t of [-1, -0.5, 0, 0.5, 1]) {
    expect(Math.abs(SPOT.ourBaseline(t).x)).toBeLessThanOrEqual(COURT.SINGLES_HALF + 1e-9);
    expect(SPOT.theirBaseline(t).y).toBeCloseTo(-OURS * COURT.HALF_LENGTH, 6);
  }
});
