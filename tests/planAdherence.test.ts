
import { describe, test, expect } from 'vitest';
import { getPlanAchievedDelta } from '../domain/planAdherence';

describe('Plan Adherence Logic (Dynamic Scaling)', () => {
  const stepsTarget = 10000;
  const azmTarget = 30;
  const calorieTarget = 2000;

  test('Unlogged calories return undefined (N/A)', () => {
    const achieved = getPlanAchievedDelta({
      mode: 'fat-loss',
      plannedDailyDelta: -500,
      caloriesEaten: 0,
      calorieTarget,
      steps: 10000,
      stepsTarget,
      azm: 30,
      azmTarget
    });
    expect(achieved).toBe(undefined);
  });

  test('Perfect Day (Fat Loss) returns exactly -500', () => {
    const achieved = getPlanAchievedDelta({
      mode: 'fat-loss',
      plannedDailyDelta: -500,
      caloriesEaten: 2000,
      calorieTarget,
      steps: 10000,
      stepsTarget,
      azm: 30,
      azmTarget
    });
    expect(achieved).toBe(-500);
  });

  test('Under-eating (Fat Loss) increases deficit magnitude', () => {
    const achieved = getPlanAchievedDelta({
      mode: 'fat-loss',
      plannedDailyDelta: -500,
      caloriesEaten: 1500, // 500 under
      calorieTarget,
      steps: 10000,
      stepsTarget,
      azm: 30,
      azmTarget
    });
    // (2000 - (-500)) - 0 - 1500 = 2500 - 1500 = 1000
    // returns -1000
    expect(achieved).toBe(-1000);
  });

  test('Over-eating (Fat Loss) reduces deficit magnitude', () => {
    const achieved = getPlanAchievedDelta({
      mode: 'fat-loss',
      plannedDailyDelta: -500,
      caloriesEaten: 2500, // 500 over
      calorieTarget,
      steps: 10000,
      stepsTarget,
      azm: 30,
      azmTarget
    });
    expect(achieved).toBe(0);
  });

  test('Movement missed penalty reduces deficit magnitude', () => {
    const achieved = getPlanAchievedDelta({
      mode: 'fat-loss',
      plannedDailyDelta: -500,
      caloriesEaten: 2000,
      calorieTarget,
      steps: 0, // Zero movement
      stepsTarget,
      azm: 0,
      azmTarget
    });
    // TDEE = 2500. Penalty = 500. Burn = 2000. Cals = 2000. Achieved = 0.
    expect(achieved).toBe(0);
  });
});
