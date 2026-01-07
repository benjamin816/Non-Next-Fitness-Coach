
import { Sex, ActivityStyle, GoalMode, UserProfile, GoalSettings, DailyLog } from '../types';
import { ACTIVITY_MULTIPLIERS } from '../constants';

export const kgToLb = (kg: number) => kg * 2.20462;
export const lbToKg = (lb: number) => lb / 2.20462;
export const cmToIn = (cm: number) => cm / 2.54;
export const inToCm = (inches: number) => inches * 2.54;

export function feetInchesToCm(feet: number, inches: number): number {
  return Math.round((feet * 30.48) + (inches * 2.54));
}

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches: inches === 12 ? 0 : inches }; // Handle rounding to 12
}

export function calculateStrideMeters(heightCm: number, sex: Sex): number {
  const heightM = heightCm / 100;
  return sex === 'male' ? heightM * 0.415 : heightM * 0.413;
}

export function calculateDistanceMeters(steps: number, strideMeters: number): number {
  return steps * strideMeters;
}

export function metersToMiles(meters: number): number {
  return meters / 1609.34;
}

export function calculateBMR(profile: UserProfile, currentWeightLb: number): number {
  const kg = lbToKg(currentWeightLb);
  const cm = profile.heightCm;
  const age = profile.ageYears;
  
  if (profile.sex === 'male') {
    return 10 * kg + 6.25 * cm - 5 * age + 5;
  } else {
    return 10 * kg + 6.25 * cm - 5 * age - 161;
  }
}

export function calculateTDEEBase(bmr: number, activityStyle: ActivityStyle): number {
  return bmr * ACTIVITY_MULTIPLIERS[activityStyle];
}

export function getPlannedDailyDelta(mode: GoalMode, rate: number): number {
  if (mode === 'maintenance') return 0;
  if (mode === 'fat-loss') return - (rate * 500); // 3500 / 7 = 500
  if (mode === 'muscle-gain') return (rate * 500); 
  return 0;
}

export function calculateCalorieTarget(
  tdeeBase: number,
  tdeeBias: number,
  mode: GoalMode,
  rate: number
): number {
  const plannedDelta = getPlannedDailyDelta(mode, rate);
  const rawTarget = tdeeBase + tdeeBias + plannedDelta;
  // Round to nearest 50 kcal
  return Math.round(rawTarget / 50) * 50;
}

export function estimateBurn(
  weightLb: number,
  bmr: number,
  steps: number,
  strideMeters: number,
  azm: number
): number {
  const weightKg = lbToKg(weightLb);
  const miles = metersToMiles(calculateDistanceMeters(steps, strideMeters));
  
  const kcalSteps = 0.53 * weightLb * miles;
  const cardioMins = (0.2 * azm) / 2;
  const fatburnMins = azm - (2 * cardioMins);
  const kcalUpgrade = 0.0175 * weightKg * (fatburnMins + 4 * cardioMins);
  
  return Math.round(bmr + kcalSteps + kcalUpgrade);
}

export function getBurnRange(burn: number): [number, number] {
  return [Math.round(burn * 0.8), Math.round(burn * 1.2)];
}
