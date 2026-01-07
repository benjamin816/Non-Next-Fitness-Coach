
import { Program, ProgramWorkout, ProgramExercise } from './types';

export const DEFAULT_TIMEZONE = 'America/New_York';

export const ACTIVITY_MULTIPLIERS = {
  'low-cardio': 1.35,
  'standard': 1.45,
  'high-activity': 1.55,
};

export const ACTIVITY_TARGETS = {
  'low-cardio': { steps: 8000, azm: 20 },
  'standard': { steps: 9000, azm: 30 },
  'high-activity': { steps: 10000, azm: 40 },
};

export const PACING_START_HOUR = 6;
export const PACING_END_HOUR = 22;

export const BUILTIN_PROGRAMS: {
  program: Omit<Program, 'id' | 'createdAt' | 'updatedAt'>;
  workouts: Array<{
    dayLabel: 'A' | 'B';
    exercises: Array<Omit<ProgramExercise, 'id' | 'workoutId' | 'orderIndex'>>;
  }>;
}[] = [
  {
    program: {
      name: 'Foundation Strength',
      source: 'builtin',
      lengthWeeks: 12,
      daysPerWeek: 3,
    },
    workouts: [
      {
        dayLabel: 'A',
        exercises: [
          { exerciseKey: 'Goblet Squat (DB)', sets: 3, repMin: 8, repMax: 10, isOptional: false },
          { exerciseKey: 'DB Bench Press', sets: 3, repMin: 6, repMax: 8, isOptional: false },
          { exerciseKey: 'One-Arm DB Row', sets: 3, repMin: 8, repMax: 10, isOptional: false },
          { exerciseKey: 'Plank', sets: 2, repMin: 30, repMax: 45, isOptional: true },
        ],
      },
      {
        dayLabel: 'B',
        exercises: [
          { exerciseKey: 'Romanian Deadlift (DB)', sets: 3, repMin: 8, repMax: 8, isOptional: false },
          { exerciseKey: 'Overhead Press (DB)', sets: 3, repMin: 6, repMax: 8, isOptional: false },
          { exerciseKey: 'Push-ups', sets: 3, repMin: 8, repMax: 12, isOptional: false },
          { exerciseKey: 'DB Curl', sets: 2, repMin: 10, repMax: 12, isOptional: true },
        ],
      },
    ],
  },
  {
    program: {
      name: 'Hypertrophy Balance',
      source: 'builtin',
      lengthWeeks: 12,
      daysPerWeek: 3,
    },
    workouts: [
      {
        dayLabel: 'A',
        exercises: [
          { exerciseKey: 'Split Squat (DB)', sets: 3, repMin: 8, repMax: 12, isOptional: false },
          { exerciseKey: 'DB Bench Press', sets: 3, repMin: 8, repMax: 12, isOptional: false },
          { exerciseKey: 'Chest-Supported Row', sets: 3, repMin: 8, repMax: 12, isOptional: false },
          { exerciseKey: 'Lateral Raise', sets: 2, repMin: 12, repMax: 15, isOptional: true },
        ],
      },
      {
        dayLabel: 'B',
        exercises: [
          { exerciseKey: 'DB Romanian Deadlift', sets: 3, repMin: 8, repMax: 12, isOptional: false },
          { exerciseKey: 'Seated DB Press', sets: 3, repMin: 8, repMax: 12, isOptional: false },
          { exerciseKey: 'Incline DB Bench', sets: 3, repMin: 8, repMax: 12, isOptional: false },
          { exerciseKey: 'Triceps Extension', sets: 2, repMin: 10, repMax: 15, isOptional: true },
        ],
      },
    ],
  },
  {
    program: {
      name: 'Athletic / Conditioning',
      source: 'builtin',
      lengthWeeks: 8,
      daysPerWeek: 3,
    },
    workouts: [
      {
        dayLabel: 'A',
        exercises: [
          { exerciseKey: 'Goblet Squat', sets: 3, repMin: 10, repMax: 10, isOptional: false },
          { exerciseKey: 'Push-ups', sets: 3, repMin: 8, repMax: 15, isOptional: false },
          { exerciseKey: 'One-Arm DB Row', sets: 3, repMin: 10, repMax: 10, isOptional: false },
          { exerciseKey: 'Farmer Carry', sets: 3, repMin: 30, repMax: 60, isOptional: true },
        ],
      },
      {
        dayLabel: 'B',
        exercises: [
          { exerciseKey: 'Romanian Deadlift', sets: 3, repMin: 10, repMax: 10, isOptional: false },
          { exerciseKey: 'DB Overhead Press', sets: 3, repMin: 8, repMax: 10, isOptional: false },
          { exerciseKey: 'Step-ups', sets: 3, repMin: 10, repMax: 10, isOptional: false },
          { exerciseKey: 'Dead Bug', sets: 2, repMin: 10, repMax: 15, isOptional: true },
        ],
      },
    ],
  },
];
