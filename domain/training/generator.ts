
import { Program, ProgramWorkout, ProgramExercise, UserProfile, GoalMode } from '../../types';

export interface GeneratorOptions {
  equipment: { db: boolean; barbell: boolean; bench: boolean; pullup: boolean };
  experience: 'beginner' | 'intermediate';
  userNotes?: string;
}

export function generateHeuristicProgram(
  profile: UserProfile,
  mode: GoalMode,
  options: GeneratorOptions
): { program: Program; workouts: ProgramWorkout[]; exercises: ProgramExercise[] } {
  const { equipment, experience, userNotes } = options;
  const progId = crypto.randomUUID();
  
  // Deterministic name based on goal and primary equipment
  const primaryEquip = equipment.barbell ? 'Barbell' : 'Dumbbell';
  const program: Program = {
    id: progId,
    name: `Custom ${mode.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')} (${primaryEquip})`,
    source: 'generated',
    lengthWeeks: 8,
    daysPerWeek: 3,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const workouts: ProgramWorkout[] = [];
  const exercises: ProgramExercise[] = [];

  const labels: ('A' | 'B')[] = ['A', 'B'];
  
  labels.forEach((label) => {
    const wId = crypto.randomUUID();
    workouts.push({ id: wId, programId: progId, dayLabel: label, orderIndex: label === 'A' ? 0 : 1 });

    // Build exercise list based on equipment
    const setTarget = experience === 'beginner' ? 3 : 4;
    
    if (label === 'A') {
      // Leg focus
      const squatEx = equipment.barbell ? 'Barbell Squat' : 'Goblet Squat (DB)';
      exercises.push({ id: crypto.randomUUID(), workoutId: wId, exerciseKey: squatEx, sets: setTarget, repMin: 8, repMax: 10, isOptional: false, orderIndex: 0 });
      
      // Push focus
      const pushEx = equipment.bench ? (equipment.barbell ? 'Barbell Bench Press' : 'DB Bench Press') : 'Push-ups';
      exercises.push({ id: crypto.randomUUID(), workoutId: wId, exerciseKey: pushEx, sets: setTarget, repMin: 8, repMax: 10, isOptional: false, orderIndex: 1 });
      
      // Pull focus
      const pullEx = equipment.pullup ? 'Pull-ups' : 'One-Arm DB Row';
      exercises.push({ id: crypto.randomUUID(), workoutId: wId, exerciseKey: pullEx, sets: setTarget, repMin: 8, repMax: 12, isOptional: false, orderIndex: 2 });

      // Core
      exercises.push({ id: crypto.randomUUID(), workoutId: wId, exerciseKey: 'Plank', sets: 2, repMin: 30, repMax: 60, isOptional: true, orderIndex: 3 });
    } else {
      // Hinge focus
      const hingeEx = equipment.barbell ? 'Barbell Romanian Deadlift' : 'Romanian Deadlift (DB)';
      exercises.push({ id: crypto.randomUUID(), workoutId: wId, exerciseKey: hingeEx, sets: setTarget, repMin: 8, repMax: 10, isOptional: false, orderIndex: 0 });
      
      // Vertical Push
      const overheadEx = equipment.barbell ? 'Barbell Overhead Press' : 'DB Overhead Press';
      exercises.push({ id: crypto.randomUUID(), workoutId: wId, exerciseKey: overheadEx, sets: setTarget, repMin: 8, repMax: 10, isOptional: false, orderIndex: 1 });
      
      // Accessory
      const accessoryEx = equipment.db ? 'DB Curl' : 'Step-ups';
      exercises.push({ id: crypto.randomUUID(), workoutId: wId, exerciseKey: accessoryEx, sets: 3, repMin: 10, repMax: 12, isOptional: false, orderIndex: 2 });

      // Secondary Core
      exercises.push({ id: crypto.randomUUID(), workoutId: wId, exerciseKey: 'Dead Bug', sets: 2, repMin: 10, repMax: 15, isOptional: true, orderIndex: 3 });
    }
  });

  return { program, workouts, exercises };
}
