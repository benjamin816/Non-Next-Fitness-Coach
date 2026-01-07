
import { LoadType } from '../../types';

export interface ExerciseMetadata {
  key: string;
  name: string;
  loadType: LoadType;
}

export const EXERCISE_CATALOG: Record<string, ExerciseMetadata> = {
  'Goblet Squat (DB)': { key: 'Goblet Squat (DB)', name: 'Goblet Squat', loadType: 'external_weight' },
  'Goblet Squat': { key: 'Goblet Squat', name: 'Goblet Squat', loadType: 'external_weight' },
  'DB Bench Press': { key: 'DB Bench Press', name: 'DB Bench Press', loadType: 'external_weight' },
  'One-Arm DB Row': { key: 'One-Arm DB Row', name: 'One-Arm DB Row', loadType: 'external_weight' },
  'Plank': { key: 'Plank', name: 'Plank', loadType: 'distance_time' },
  'Romanian Deadlift (DB)': { key: 'Romanian Deadlift (DB)', name: 'Romanian Deadlift', loadType: 'external_weight' },
  'DB Romanian Deadlift': { key: 'DB Romanian Deadlift', name: 'Romanian Deadlift', loadType: 'external_weight' },
  'Romanian Deadlift': { key: 'Romanian Deadlift', name: 'Romanian Deadlift', loadType: 'external_weight' },
  'Overhead Press (DB)': { key: 'Overhead Press (DB)', name: 'Overhead Press', loadType: 'external_weight' },
  'DB Overhead Press': { key: 'DB Overhead Press', name: 'Overhead Press', loadType: 'external_weight' },
  'Seated DB Press': { key: 'Seated DB Press', name: 'Seated DB Press', loadType: 'external_weight' },
  'Push-ups': { key: 'Push-ups', name: 'Push-ups', loadType: 'bodyweight' },
  'DB Curl': { key: 'DB Curl', name: 'DB Curl', loadType: 'external_weight' },
  'Split Squat (DB)': { key: 'Split Squat (DB)', name: 'Split Squat', loadType: 'external_weight' },
  'Split Squat': { key: 'Split Squat', name: 'Split Squat', loadType: 'external_weight' },
  'Chest-Supported Row': { key: 'Chest-Supported Row', name: 'Chest-Supported Row', loadType: 'external_weight' },
  'Lateral Raise': { key: 'Lateral Raise', name: 'Lateral Raise', loadType: 'external_weight' },
  'Incline DB Bench': { key: 'Incline DB Bench', name: 'Incline DB Bench', loadType: 'external_weight' },
  'Triceps Extension': { key: 'Triceps Extension', name: 'Triceps Extension', loadType: 'external_weight' },
  'Farmer Carry': { key: 'Farmer Carry', name: 'Farmer Carry', loadType: 'external_weight' },
  'Step-ups': { key: 'Step-ups', name: 'Step-ups', loadType: 'bodyweight' },
  'Dead Bug': { key: 'Dead Bug', name: 'Dead Bug', loadType: 'bodyweight' },
};

export function getExerciseMetadata(key: string): ExerciseMetadata {
  return EXERCISE_CATALOG[key] || { key, name: key, loadType: 'external_weight' };
}
