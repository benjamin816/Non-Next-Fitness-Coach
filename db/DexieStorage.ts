
import { Dexie } from 'dexie';
import type { Table } from 'dexie';
import { 
  UserProfile, GoalSettings, AdaptiveModel, DailyLog, 
  Program, ProgramWorkout, ProgramExercise, ActiveProgramState,
  WorkoutSession, ExerciseEntry, StorageProvider
} from '../types';
import { BUILTIN_PROGRAMS } from '../constants';

class FitnessCoachDB extends Dexie {
  userProfile!: Table<UserProfile>;
  goalSettings!: Table<GoalSettings>;
  adaptiveModel!: Table<AdaptiveModel>;
  dailyLogs!: Table<DailyLog>;
  programs!: Table<Program>;
  programWorkouts!: Table<ProgramWorkout>;
  programExercises!: Table<ProgramExercise>;
  activeProgramState!: Table<ActiveProgramState>;
  workoutSessions!: Table<WorkoutSession>;
  exerciseEntries!: Table<ExerciseEntry>;

  constructor() {
    super('FitnessCoachDB');
    (this as any).version(2).stores({
      userProfile: 'id',
      goalSettings: 'id',
      adaptiveModel: 'id',
      dailyLogs: 'dateISO',
      programs: 'id, source',
      programWorkouts: 'id, programId',
      programExercises: 'id, workoutId',
      activeProgramState: 'id',
      workoutSessions: 'id, dateISO, programId',
      exerciseEntries: 'id, sessionId, exerciseKey, createdAt'
    });
  }
}

const db = new FitnessCoachDB();

export class LocalIndexedDbProvider implements StorageProvider {
  async getUserProfile(): Promise<UserProfile | null> {
    const profiles = await db.userProfile.toArray();
    return profiles[0] || null;
  }

  async setUserProfile(profile: UserProfile): Promise<void> {
    await db.userProfile.put(profile);
  }

  async getGoalSettings(): Promise<GoalSettings | null> {
    const settings = await db.goalSettings.toArray();
    return settings[0] || null;
  }

  async setGoalSettings(settings: GoalSettings): Promise<void> {
    await db.goalSettings.put(settings);
  }

  async getAdaptiveModel(): Promise<AdaptiveModel> {
    const models = await db.adaptiveModel.toArray();
    if (models.length === 0) {
      const defaultModel: AdaptiveModel = { id: 'default', tdeeBias: 0 };
      await db.adaptiveModel.add(defaultModel);
      return defaultModel;
    }
    return models[0];
  }

  async setAdaptiveModel(model: AdaptiveModel): Promise<void> {
    await db.adaptiveModel.put(model);
  }

  async getDailyLogs(limit: number = 365): Promise<DailyLog[]> {
    return db.dailyLogs.orderBy('dateISO').reverse().limit(limit).toArray();
  }

  async getDailyLogByDate(date: string): Promise<DailyLog | null> {
    return (await db.dailyLogs.get(date)) || null;
  }

  async upsertDailyLog(log: DailyLog): Promise<void> {
    await db.dailyLogs.put(log);
  }

  async resetAllData(): Promise<void> {
    await Promise.all([
      db.userProfile.clear(),
      db.goalSettings.clear(),
      db.adaptiveModel.clear(),
      db.dailyLogs.clear(),
      db.programs.clear(),
      db.programWorkouts.clear(),
      db.programExercises.clear(),
      db.activeProgramState.clear(),
      db.workoutSessions.clear(),
      db.exerciseEntries.clear()
    ]);
    await this.seedBuiltinPrograms();
  }

  async getPrograms(): Promise<Program[]> {
    const all = await db.programs.toArray();
    if (all.length === 0) {
      await this.seedBuiltinPrograms();
      return db.programs.toArray();
    }
    return all;
  }

  private async seedBuiltinPrograms(): Promise<void> {
    for (const item of BUILTIN_PROGRAMS) {
      const progId = crypto.randomUUID();
      await db.programs.add({
        ...item.program,
        id: progId,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      for (const w of item.workouts) {
        const wId = crypto.randomUUID();
        await db.programWorkouts.add({
          id: wId,
          programId: progId,
          dayLabel: w.dayLabel,
          orderIndex: 0
        });
        for (const [idx, ex] of w.exercises.entries()) {
          await db.programExercises.add({
            ...ex,
            id: crypto.randomUUID(),
            workoutId: wId,
            orderIndex: idx
          });
        }
      }
    }
  }

  async getProgramWorkouts(programId: string): Promise<ProgramWorkout[]> {
    return db.programWorkouts.where('programId').equals(programId).toArray();
  }

  async getProgramExercises(workoutId: string): Promise<ProgramExercise[]> {
    return db.programExercises.where('workoutId').equals(workoutId).toArray();
  }

  async saveCustomProgram(program: Program, workouts: ProgramWorkout[], exercises: ProgramExercise[]): Promise<void> {
    await db.programs.put(program);
    await db.programWorkouts.bulkPut(workouts);
    await db.programExercises.bulkPut(exercises);
  }

  async getActiveProgramState(): Promise<ActiveProgramState | null> {
    const states = await db.activeProgramState.toArray();
    return states[0] || null;
  }

  async setActiveProgramState(state: ActiveProgramState): Promise<void> {
    await db.activeProgramState.put(state);
  }

  async saveWorkoutSession(session: WorkoutSession, entries: ExerciseEntry[]): Promise<void> {
    await db.workoutSessions.put(session);
    await db.exerciseEntries.bulkPut(entries);
  }

  async getWorkoutSessions(limit: number = 100): Promise<WorkoutSession[]> {
    return db.workoutSessions.orderBy('dateISO').reverse().limit(limit).toArray();
  }

  async getExerciseEntries(sessionId: string): Promise<ExerciseEntry[]> {
    return db.exerciseEntries.where('sessionId').equals(sessionId).toArray();
  }

  async getRecentExerciseEntries(exerciseKey: string, limit: number = 20): Promise<ExerciseEntry[]> {
    return db.exerciseEntries
      .where('exerciseKey').equals(exerciseKey)
      .reverse()
      .limit(limit)
      .toArray();
  }
}
