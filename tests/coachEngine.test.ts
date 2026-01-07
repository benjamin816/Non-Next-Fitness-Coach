
// Fixed: Explicitly import testing primitives to satisfy TypeScript environment.
import { describe, test, expect } from 'vitest';
import { getCoachBarMessage, CoachState } from '../domain/coachEngine';

const defaultTargets = { calories: 2000, steps: 10000, azm: 30 };

describe('Coach Engine', () => {
  test('Initial State: Nothing logged at all', () => {
    const state: CoachState = {
      currentHour: 12,
      weightLogged: false,
      caloriesEntered: false,
      stepsEntered: false,
      azmEntered: false,
      caloriesEaten: 0,
      steps: 0,
      azm: 0,
      targets: defaultTargets
    };
    expect(getCoachBarMessage(state)).toBe("Please Begin by logging your weight.");
  });

  test('Initial State: Only weight logged', () => {
    const state: CoachState = {
      currentHour: 12,
      weightLogged: true,
      caloriesEntered: false,
      stepsEntered: false,
      azmEntered: false,
      caloriesEaten: 0,
      steps: 0,
      azm: 0,
      targets: defaultTargets
    };
    expect(getCoachBarMessage(state)).toBe("Begin logging your day to start!");
  });

  test('Morning weight reminder (6:00-9:59 AM) - Priority if weight missing', () => {
    const state: CoachState = {
      currentHour: 8,
      weightLogged: false,
      caloriesEntered: true, // Should take priority over 'Log your weight' in priority action list
      stepsEntered: false,
      azmEntered: false,
      caloriesEaten: 500,
      steps: 0,
      azm: 0,
      targets: defaultTargets
    };
    expect(getCoachBarMessage(state)).toBe("Don’t forget to log your weight.");
  });

  test('Evening weight reminder (After 6 PM, movement done)', () => {
    const state: CoachState = {
      currentHour: 19,
      weightLogged: false,
      caloriesEntered: true,
      stepsEntered: true,
      azmEntered: true,
      caloriesEaten: 1500,
      steps: 10000,
      azm: 30,
      targets: defaultTargets
    };
    expect(getCoachBarMessage(state)).toBe("Everything’s done — log your weight if you want a complete day.");
  });

  test('Full completion praise', () => {
    const state: CoachState = {
      currentHour: 20,
      weightLogged: true,
      caloriesEntered: true,
      stepsEntered: true,
      azmEntered: true,
      caloriesEaten: 1900,
      steps: 11000,
      azm: 40,
      targets: defaultTargets
    };
    expect(getCoachBarMessage(state)).toBe("You nailed today! Great job.");
  });

  test('Calorie 75% warning', () => {
    const state: CoachState = {
      currentHour: 14,
      weightLogged: true,
      caloriesEntered: true,
      stepsEntered: true,
      azmEntered: true,
      caloriesEaten: 1600, // 80%
      steps: 5000,
      azm: 10,
      targets: defaultTargets
    };
    expect(getCoachBarMessage(state)).toBe("Careful—you're at 75% of your calorie target.");
  });

  test('Movement complete guidance (Under target)', () => {
    const state: CoachState = {
      currentHour: 15,
      weightLogged: true,
      caloriesEntered: true,
      stepsEntered: true,
      azmEntered: true,
      caloriesEaten: 1200,
      steps: 11000,
      azm: 35,
      targets: defaultTargets
    };
    expect(getCoachBarMessage(state)).toBe("Movement complete. Nice work keeping calories under target.");
  });

  test('Movement complete guidance (Over target)', () => {
    const state: CoachState = {
      currentHour: 15,
      weightLogged: true,
      caloriesEntered: true,
      stepsEntered: true,
      azmEntered: true,
      caloriesEaten: 2500,
      steps: 11000,
      azm: 35,
      targets: defaultTargets
    };
    expect(getCoachBarMessage(state)).toBe("Movement complete. Now keep calories under target tomorrow.");
  });

  test('Next best action priority', () => {
    const base: CoachState = {
      currentHour: 12,
      weightLogged: true, // Started with weight
      caloriesEntered: false,
      stepsEntered: false,
      azmEntered: false,
      caloriesEaten: 0,
      steps: 0,
      azm: 0,
      targets: defaultTargets
    };

    // Since weight is logged, we check next priorities
    expect(getCoachBarMessage(base)).toBe("Begin logging your day to start!"); // Specific state rule
    
    const partial: CoachState = { ...base, caloriesEntered: true };
    expect(getCoachBarMessage(partial)).toBe("Log your steps.");
    
    const morePartial: CoachState = { ...partial, stepsEntered: true };
    expect(getCoachBarMessage(morePartial)).toBe("Log your AZM.");
  });
});
