
import { GoalMode } from '../types';

interface AdherenceParams {
  mode: GoalMode;
  plannedDailyDelta: number; // Positive for surplus (gain), negative for deficit (loss)
  caloriesEaten: number;
  calorieTarget: number;
  steps: number;
  stepsTarget: number;
  azm: number;
  azmTarget: number;
}

/**
 * Calculates the 'achieved' deficit or surplus based on plan adherence.
 * This ensures that a perfect day matches target, under-eating increases deficit,
 * and over-eating reduces it.
 */
export function getPlanAchievedDelta(params: AdherenceParams): number | undefined {
  const { 
    plannedDailyDelta, 
    caloriesEaten, 
    calorieTarget, 
    steps, 
    stepsTarget, 
    azm, 
    azmTarget 
  } = params;

  // 1. If no calories logged, we can't calculate a meaningful deficit.
  if (caloriesEaten === 0) {
    return undefined;
  }

  // 2. Derive Theoretical Burn (Total TDEE used for the plan)
  // Since TargetCalories = TDEE + plannedDailyDelta
  // TDEE = TargetCalories - plannedDailyDelta
  const theoreticalTotalBurn = calorieTarget - plannedDailyDelta;

  // 3. Movement Fraction (Average of steps and AZM progress, capped at 1.0)
  const stepsFrac = Math.min(steps / (stepsTarget || 1), 1);
  const azmFrac = Math.min(azm / (azmTarget || 1), 1);
  const movementFrac = (stepsFrac + azmFrac) / 2;

  // 4. Movement Penalty
  // If movement goals are missed, the "available" deficit from planned activity shrinks.
  // Penalty = abs(plannedDailyDelta) * (1 - movementFrac)
  const movementPenalty = Math.abs(plannedDailyDelta) * (1 - movementFrac);

  // 5. Final Achieved Delta
  // Deficit = (TheoreticalBurn - MovementPenalty) - CaloriesEaten
  // A positive result is a surplus, a negative result is a deficit.
  const achieved = (theoreticalTotalBurn - movementPenalty) - caloriesEaten;

  // Note: We return it in the same sign format as plannedDailyDelta:
  // Negative for deficit, positive for surplus.
  return -achieved; 
}

export function getPlanStatusLabel(mode: GoalMode, achievedDelta: number | undefined): string {
  if (achievedDelta === undefined) return 'Deficit';
  if (mode === 'maintenance') return 'Plan Balance';
  if (mode === 'fat-loss') return achievedDelta < 0 ? 'Deficit' : 'Surplus';
  if (mode === 'muscle-gain') return achievedDelta > 0 ? 'Surplus' : 'Deficit';
  return 'Delta';
}
