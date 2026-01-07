
import { UserProfile, ExerciseEntry, ProgramExercise, LoadType } from '../../types';
import { getExerciseMetadata } from './catalog';

export interface ProgressionTarget {
  weight?: number;
  reps: number;
  isSuggestion: boolean;
}

/**
 * Deterministic starting weight heuristic
 */
export function getStartingWeightSuggestion(
  profile: UserProfile, 
  exerciseKey: string
): number {
  const metadata = getExerciseMetadata(exerciseKey);
  if (metadata.loadType !== 'external_weight' && metadata.loadType !== 'weighted_bodyweight') return 0;

  const weight = profile.startingWeightLb;
  const isMale = profile.sex === 'male';
  
  // Very conservative multipliers of bodyweight for beginner baseline
  let multiplier = 0.1; 
  
  if (exerciseKey.includes('Squat') || exerciseKey.includes('Deadlift')) {
    multiplier = isMale ? 0.25 : 0.15;
  } else if (exerciseKey.includes('Bench') || exerciseKey.includes('Row')) {
    multiplier = isMale ? 0.15 : 0.10;
  } else if (exerciseKey.includes('Press')) {
    multiplier = isMale ? 0.10 : 0.05;
  }

  const suggestion = Math.round((weight * multiplier) / 5) * 5;
  return Math.max(suggestion, 5); // Minimum 5lb DBs
}

/**
 * Progression logic for next session
 */
export function calculateNextTarget(
  exercise: ProgramExercise,
  history: ExerciseEntry[]
): ProgressionTarget {
  const metadata = getExerciseMetadata(exercise.exerciseKey);
  
  if (history.length === 0) {
    return { reps: exercise.repMin, isSuggestion: true };
  }

  // Group history by sets for the most recent session
  const lastSession = history.sort((a, b) => b.createdAt - a.createdAt).slice(0, exercise.sets);
  
  const allSetsMetMax = lastSession.every(s => s.reps >= exercise.repMax);
  const anySetFailed = lastSession.some(s => s.hitFailure);
  const multipleSetsBelowMin = lastSession.filter(s => s.reps < exercise.repMin).length >= 2;
  
  const lastWeight = lastSession[0].weight || 0;
  const lastReps = lastSession[0].reps;

  if (metadata.loadType === 'external_weight' || metadata.loadType === 'weighted_bodyweight') {
    // 1. Progress: All hit max and no failure on last sets -> Increase
    if (allSetsMetMax && !anySetFailed) {
      return { weight: lastWeight + 5, reps: exercise.repMin, isSuggestion: false };
    }
    // 2. Reduce: Too heavy
    if (multipleSetsBelowMin) {
      return { weight: Math.max(lastWeight - 5, 5), reps: exercise.repMin, isSuggestion: false };
    }
    // 3. Keep: Within range and reached failure or just missed top end
    return { weight: lastWeight, reps: Math.min(lastReps + 1, exercise.repMax), isSuggestion: false };
  }

  if (metadata.loadType === 'bodyweight') {
    if (allSetsMetMax) {
      return { reps: exercise.repMax, isSuggestion: false }; // Cap at repMax for now
    }
    return { reps: Math.min(lastReps + 1, exercise.repMax), isSuggestion: false };
  }

  if (metadata.loadType === 'distance_time') {
    return { reps: allSetsMetMax ? lastReps + 5 : lastReps, isSuggestion: false };
  }

  return { reps: exercise.repMin, isSuggestion: true };
}
