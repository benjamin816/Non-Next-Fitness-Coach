
export type Sex = 'male' | 'female';
export type ActivityStyle = 'low-cardio' | 'standard' | 'high-activity';
export type GoalMode = 'fat-loss' | 'maintenance' | 'muscle-gain';

export type LoadType = 'external_weight' | 'bodyweight' | 'assisted' | 'weighted_bodyweight' | 'distance_time';

export interface UserProfile {
  id: string;
  sex: Sex;
  ageYears: number;
  heightCm: number;
  startingWeightLb: number;
  timezone: string;
  createdAt: number;
  updatedAt: number;
}

export interface GoalSettings {
  id: string;
  mode: GoalMode;
  goalRate: number; // lb/week
  activityStyle: ActivityStyle;
  targetWeightLb?: number; // For fat-loss or muscle-gain
  targetWeightCustomized: boolean; // Flag to prevent overwriting user-set values
  targetPhaseWeeks?: number; // For maintenance
  startDateISO: string;
  updatedAt: number;
}

export interface AdaptiveModel {
  id: string;
  tdeeBias: number;
  lastCalibrationDate?: string;
}

export interface DailyLog {
  dateISO: string; // YYYY-MM-DD
  weightLb?: number;
  calories: number;
  steps: number;
  azm: number;
  workoutDone: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Program {
  id: string;
  name: string;
  source: 'builtin' | 'custom' | 'generated';
  lengthWeeks: number;
  daysPerWeek: number;
  createdAt: number;
  updatedAt: number;
}

export interface ProgramWorkout {
  id: string;
  programId: string;
  dayLabel: 'A' | 'B' | 'C' | 'D';
  orderIndex: number;
}

export interface ProgramExercise {
  id: string;
  workoutId: string;
  exerciseKey: string;
  sets: number;
  repMin: number;
  repMax: number;
  isOptional: boolean;
  orderIndex: number;
}

export interface ActiveProgramState {
  id: string;
  activeProgramId: string;
  startDateISO: string;
  currentWeekNumber: number;
  cycleMode: 'deterministic' | 'random';
  updatedAt: number;
}

export interface WorkoutSession {
  id: string;
  dateISO: string;
  programId: string;
  dayLabel: string;
  createdAt: number;
}

export interface ExerciseEntry {
  id: string;
  sessionId: string;
  exerciseKey: string;
  setIndex: number;
  reps: number;
  weight?: number;
  hitFailure: boolean;
  createdAt: number;
}

export interface StorageProvider {
  getUserProfile(): Promise<UserProfile | null>;
  setUserProfile(profile: UserProfile): Promise<void>;
  getGoalSettings(): Promise<GoalSettings | null>;
  setGoalSettings(settings: GoalSettings): Promise<void>;
  getAdaptiveModel(): Promise<AdaptiveModel>;
  setAdaptiveModel(model: AdaptiveModel): Promise<void>;
  getDailyLogs(limit?: number): Promise<DailyLog[]>;
  getDailyLogByDate(date: string): Promise<DailyLog | null>;
  upsertDailyLog(log: DailyLog): Promise<void>;
  resetAllData(): Promise<void>;
  // Programs & Lifting
  getPrograms(): Promise<Program[]>;
  getProgramWorkouts(programId: string): Promise<ProgramWorkout[]>;
  getProgramExercises(workoutId: string): Promise<ProgramExercise[]>;
  saveCustomProgram(program: Program, workouts: ProgramWorkout[], exercises: ProgramExercise[]): Promise<void>;
  getActiveProgramState(): Promise<ActiveProgramState | null>;
  setActiveProgramState(state: ActiveProgramState): Promise<void>;
  saveWorkoutSession(session: WorkoutSession, entries: ExerciseEntry[]): Promise<void>;
  getWorkoutSessions(limit?: number): Promise<WorkoutSession[]>;
  getExerciseEntries(sessionId: string): Promise<ExerciseEntry[]>;
  getRecentExerciseEntries(exerciseKey: string, limit?: number): Promise<ExerciseEntry[]>;
}
