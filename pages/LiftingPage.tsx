
import React, { useState, useEffect } from 'react';
// Corrected import path for useStorage
import { useStorage } from '../components/StorageProvider';
import { 
  Program, ProgramWorkout, ProgramExercise, ActiveProgramState, 
  WorkoutSession, ExerciseEntry, UserProfile, GoalSettings, DailyLog
} from '../types';
import { generateHeuristicProgram } from '../domain/training/generator';
import { getExerciseMetadata } from '../domain/training/catalog';
import { getStartingWeightSuggestion, calculateNextTarget, ProgressionTarget } from '../domain/training/progression';
import { 
  Dumbbell, Play, Info, Sparkles, ChevronRight, 
  Check, X, ArrowLeft, Save, TrendingUp, List, AlertCircle, Zap, CalendarCheck
} from 'lucide-react';

const LiftingPage: React.FC = () => {
  const storage = useStorage();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [goals, setGoals] = useState<GoalSettings | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [activeState, setActiveState] = useState<ActiveProgramState | null>(null);
  const [todayLog, setTodayLog] = useState<DailyLog | null>(null);
  const [lastSession, setLastSession] = useState<WorkoutSession | null>(null);
  
  // UI State
  const [view, setView] = useState<'list' | 'logging'>('list');
  const [previewProgram, setPreviewProgram] = useState<Program | null>(null);
  const [previewData, setPreviewData] = useState<{ workouts: ProgramWorkout[], exercises: Record<string, ProgramExercise[]> } | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [generated, setGenerated] = useState<{ program: Program, workouts: ProgramWorkout[], exercises: ProgramExercise[] } | null>(null);

  // AI Builder Form State
  const [genEquipment, setGenEquipment] = useState({ db: true, barbell: false, bench: true, pullup: false });
  const [genExperience, setGenExperience] = useState<'beginner' | 'intermediate'>('beginner');
  const [genNotes, setGenNotes] = useState('');
  
  // Logging State
  const [currentWorkout, setCurrentWorkout] = useState<{
    workout: ProgramWorkout;
    exercises: ProgramExercise[];
    logs: Record<string, { weight: number, reps: number, hitFailure: boolean }[]>;
    targets: Record<string, ProgressionTarget>;
  } | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const init = async () => {
      const [p, g, progs, state, log, sessions] = await Promise.all([
        storage.getUserProfile(),
        storage.getGoalSettings(),
        storage.getPrograms(),
        storage.getActiveProgramState(),
        storage.getDailyLogByDate(todayStr),
        storage.getWorkoutSessions(1)
      ]);
      setProfile(p);
      setGoals(g);
      setPrograms(progs);
      setActiveState(state);
      setTodayLog(log);
      setLastSession(sessions[0] || null);
    };
    init();
  }, [storage, todayStr, view]);

  useEffect(() => {
    const loadPreview = async () => {
      if (previewProgram) {
        const workouts = await storage.getProgramWorkouts(previewProgram.id);
        const exerciseMap: Record<string, ProgramExercise[]> = {};
        for (const w of workouts) {
          exerciseMap[w.id] = await storage.getProgramExercises(w.id);
        }
        setPreviewData({ workouts, exercises: exerciseMap });
      } else {
        setPreviewData(null);
      }
    };
    loadPreview();
  }, [previewProgram, storage]);

  const handleSelectProgram = (p: Program) => {
    setPreviewProgram(p);
  };

  const handleConfirmStartProgram = async (programId: string) => {
    const newState: ActiveProgramState = {
      id: 'active',
      activeProgramId: programId,
      startDateISO: new Date().toISOString().split('T')[0],
      currentWeekNumber: 1,
      cycleMode: 'deterministic',
      updatedAt: Date.now()
    };
    await storage.setActiveProgramState(newState);
    setActiveState(newState);
    setPreviewProgram(null);
  };

  const targetDays = goals?.activityStyle === 'low-cardio' ? 1 : goals?.activityStyle === 'standard' ? 2 : 3;

  const handleStartWorkout = async () => {
    if (!activeState || !activeProgram || !profile) return;
    
    const workouts = await storage.getProgramWorkouts(activeProgram.id);
    const recentSessions = await storage.getWorkoutSessions(10);
    
    let nextDayLabel = 'A';
    if (recentSessions.length > 0 && recentSessions[0].programId === activeProgram.id) {
      nextDayLabel = recentSessions[0].dayLabel === 'A' ? 'B' : 'A';
    }
    
    const workout = workouts.find(w => w.dayLabel === nextDayLabel) || workouts[0];
    const exercises = await storage.getProgramExercises(workout.id);
    
    const initialLogs: Record<string, { weight: number, reps: number, hitFailure: boolean }[]> = {};
    const targets: Record<string, ProgressionTarget> = {};

    for (const ex of exercises) {
      const history = await storage.getRecentExerciseEntries(ex.exerciseKey);
      const target = calculateNextTarget(ex, history);
      targets[ex.id] = target;

      const initialWeight = target.weight ?? (history.length > 0 ? history[0].weight : getStartingWeightSuggestion(profile, ex.exerciseKey)) ?? 0;
      initialLogs[ex.id] = Array.from({ length: ex.sets }, () => ({ 
        weight: initialWeight, 
        reps: target.reps, 
        hitFailure: false 
      }));
    }

    setCurrentWorkout({ workout, exercises, logs: initialLogs, targets });
    setView('logging');
  };

  const handleSaveWorkout = async () => {
    if (!currentWorkout || !activeProgram) return;

    const sessionId = crypto.randomUUID();
    const session: WorkoutSession = {
      id: sessionId,
      dateISO: todayStr,
      programId: activeProgram.id,
      dayLabel: currentWorkout.workout.dayLabel,
      createdAt: Date.now()
    };

    const entries: ExerciseEntry[] = [];
    (Object.entries(currentWorkout.logs) as [string, { weight: number, reps: number, hitFailure: boolean }[]][]).forEach(([exId, sets]) => {
      const exercise = currentWorkout.exercises.find(e => e.id === exId);
      if (!exercise) return;
      sets.forEach((set, idx) => {
        if (set.reps > 0) {
          entries.push({
            id: crypto.randomUUID(),
            sessionId,
            exerciseKey: exercise.exerciseKey,
            setIndex: idx,
            reps: set.reps,
            weight: set.weight,
            hitFailure: set.hitFailure,
            createdAt: Date.now()
          });
        }
      });
    });

    await storage.saveWorkoutSession(session, entries);
    const log = await storage.getDailyLogByDate(todayStr);
    const updatedLog: DailyLog = log ? { ...log, workoutDone: true, updatedAt: Date.now() } : {
      dateISO: todayStr,
      calories: 0,
      steps: 0,
      azm: 0,
      workoutDone: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await storage.upsertDailyLog(updatedLog);

    setView('list');
    setCurrentWorkout(null);
  };

  const activeProgram = programs.find(p => p.id === activeState?.activeProgramId);
  const workoutDoneToday = todayLog?.workoutDone || (lastSession?.dateISO === todayStr);

  if (view === 'logging' && currentWorkout) {
    return (
      <div className="space-y-6 animate-in slide-in-from-right duration-300">
        <header className="flex items-center space-x-4">
          <button onClick={() => setView('list')} className="p-2 bg-white border rounded-full shadow-sm">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold">Session {currentWorkout.workout.dayLabel}</h2>
            <p className="text-sm text-gray-500">{activeProgram?.name}</p>
          </div>
        </header>

        <div className="space-y-4">
          {currentWorkout.exercises.map((ex) => {
            const meta = getExerciseMetadata(ex.exerciseKey);
            const target = currentWorkout.targets[ex.id];
            
            return (
              <div key={ex.id} className="bg-white p-4 rounded-2xl border shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{meta.name}</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        {ex.sets} Sets
                      </span>
                      {target && (
                        <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                          <TrendingUp size={10} /> Target: {target.weight ? `${target.weight}lb ` : ''}{target.reps} {meta.loadType === 'distance_time' ? 'sec' : 'reps'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {currentWorkout.logs[ex.id].map((set, setIdx) => (
                    <div key={setIdx} className="flex items-center gap-3">
                      <span className="w-8 text-[10px] font-bold text-gray-300 uppercase shrink-0 text-center">Set {setIdx + 1}</span>
                      
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        {(meta.loadType === 'external_weight' || meta.loadType === 'weighted_bodyweight') && (
                          <div className="relative">
                            <input 
                              type="number" 
                              placeholder="lb"
                              value={set.weight || ''}
                              onChange={(e) => {
                                const newLogs = { ...currentWorkout.logs };
                                newLogs[ex.id][setIdx].weight = parseFloat(e.target.value) || 0;
                                setCurrentWorkout({ ...currentWorkout, logs: newLogs });
                              }}
                              className="w-full bg-gray-50 border rounded-xl p-2.5 text-center text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="absolute right-2 top-2.5 text-[10px] text-gray-400 font-bold uppercase pointer-events-none">lb</span>
                          </div>
                        )}
                        <div className={`relative ${meta.loadType === 'bodyweight' || meta.loadType === 'distance_time' ? 'col-span-2' : ''}`}>
                          <input 
                            type="number" 
                            placeholder={meta.loadType === 'distance_time' ? 'sec' : 'reps'}
                            value={set.reps || ''}
                            onChange={(e) => {
                              const newLogs = { ...currentWorkout.logs };
                              newLogs[ex.id][setIdx].reps = parseInt(e.target.value) || 0;
                              setCurrentWorkout({ ...currentWorkout, logs: newLogs });
                            }}
                            className="w-full bg-gray-50 border rounded-xl p-2.5 text-center text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="absolute right-2 top-2.5 text-[10px] text-gray-400 font-bold uppercase pointer-events-none">
                            {meta.loadType === 'distance_time' ? 'sec' : 'reps'}
                          </span>
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          const newLogs = { ...currentWorkout.logs };
                          newLogs[ex.id][setIdx].hitFailure = !newLogs[ex.id][setIdx].hitFailure;
                          setCurrentWorkout({ ...currentWorkout, logs: newLogs });
                        }}
                        className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors border-2 ${set.hitFailure ? 'bg-red-50 border-red-200 text-red-600' : 'bg-gray-50 border-gray-100 text-gray-300'}`}
                        title="Reached failure?"
                      >
                        <Zap size={18} fill={set.hitFailure ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <button 
          onClick={handleSaveWorkout}
          className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl flex items-center justify-center space-x-2 sticky bottom-4 z-10 hover:bg-blue-700 active:scale-[0.98] transition-all"
        >
          <Save size={20} />
          <span>Save Completed Session</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold">Lifting</h2>
          <p className="text-gray-500">Plan: {targetDays} sessions per week.</p>
        </div>
        <button 
          onClick={() => setShowGenerator(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center space-x-2 shadow-lg hover:bg-blue-700 transition"
        >
          <Sparkles size={18} />
          <span className="font-bold text-sm">AI Builder</span>
        </button>
      </header>

      {activeState && activeProgram ? (
        <section className={`p-6 rounded-3xl text-white shadow-xl relative overflow-hidden transition-all duration-500 ${workoutDoneToday ? 'bg-emerald-600' : 'bg-gradient-to-br from-blue-600 to-indigo-700'}`}>
          <Dumbbell size={140} className={`absolute -right-8 -bottom-8 opacity-20 rotate-12 ${workoutDoneToday ? 'text-emerald-400' : 'text-blue-400'}`} />
          <div className="relative z-10 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold tracking-tight">{activeProgram.name}</h3>
                <div className="flex items-center gap-2 text-blue-100 text-sm mt-1">
                   {workoutDoneToday ? <CalendarCheck size={14} /> : <TrendingUp size={14} />}
                   <span>{workoutDoneToday ? `Session ${lastSession?.dayLabel} Complete` : `Week ${activeState.currentWeekNumber} Progression`}</span>
                </div>
              </div>
            </div>
            
            {workoutDoneToday ? (
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                <p className="text-sm font-medium">Great work! You've logged your workout for today. Rest up and come back tomorrow for your next session.</p>
              </div>
            ) : (
              <button 
                onClick={handleStartWorkout}
                className="w-full bg-white text-blue-700 font-bold py-4 rounded-2xl flex items-center justify-center space-x-2 hover:bg-blue-50 active:scale-[0.98] transition-all shadow-sm"
              >
                <Play size={20} fill="currentColor" />
                <span>Continue Training</span>
              </button>
            )}
          </div>
        </section>
      ) : (
        <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-gray-200 text-center space-y-4">
          <Dumbbell size={48} className="mx-auto text-gray-200" />
          <p className="text-gray-500 font-medium">Choose a program below to start your lifting journey.</p>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-bold">Library</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {programs.map(p => (
            <div 
              key={p.id} 
              onClick={() => handleSelectProgram(p)}
              className="bg-white p-5 rounded-2xl border shadow-sm flex items-center justify-between hover:border-blue-400 transition-all cursor-pointer group"
            >
              <div>
                <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{p.name}</h4>
                <p className="text-xs text-gray-400 font-medium">{p.lengthWeeks} weeks • Adaptive targets</p>
              </div>
              <div className={`p-2 rounded-full ${activeState?.activeProgramId === p.id ? 'bg-green-100 text-green-600' : 'bg-gray-50 text-gray-300 group-hover:text-blue-400'}`}>
                {activeState?.activeProgramId === p.id ? <Check size={18} /> : <ChevronRight size={18} />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Builder Modal */}
      {showGenerator && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg text-left space-y-8 shadow-2xl animate-in zoom-in-95 duration-200 my-auto">
            <div className="flex items-center space-x-4">
               <div className="bg-blue-600 p-3 rounded-2xl text-white">
                  <Sparkles size={24} />
               </div>
               <div>
                  <h3 className="text-2xl font-bold tracking-tight">AI Program Builder</h3>
                  <p className="text-gray-500 text-sm">Design your perfect 8-week routine.</p>
               </div>
            </div>

            <div className="space-y-6">
              {/* Equipment */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Available Equipment</p>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(genEquipment).map(([key, value]) => (
                    <button 
                      key={key}
                      onClick={() => setGenEquipment({...genEquipment, [key]: !value})}
                      className={`flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all font-bold text-sm ${value ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-400'}`}
                    >
                      <span className="capitalize">{key === 'db' ? 'Dumbbells' : key}</span>
                      {value ? <Check size={16} /> : <div className="w-4 h-4 rounded-full border border-gray-200" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Experience */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Training Experience</p>
                <div className="flex bg-gray-100 p-1.5 rounded-2xl">
                  {(['beginner', 'intermediate'] as const).map(level => (
                    <button
                      key={level}
                      onClick={() => setGenExperience(level)}
                      className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${genExperience === level ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500'}`}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* User Notes */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Anything you want to see? (Optional)</p>
                <textarea 
                  value={genNotes}
                  onChange={(e) => setGenNotes(e.target.value)}
                  placeholder="e.g. Focus on arms, keep sessions under 20 mins, no jumping..."
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-sm font-medium outline-none focus:border-blue-500 transition-colors h-24 resize-none"
                />
              </div>
            </div>

            <div className="flex space-x-4 pt-2">
              <button onClick={() => setShowGenerator(false)} className="flex-1 py-4 font-bold text-gray-400 rounded-2xl hover:bg-gray-50">Cancel</button>
              <button 
                onClick={() => {
                  if (profile && goals) {
                    const res = generateHeuristicProgram(profile, goals.mode, { 
                      equipment: genEquipment, 
                      experience: genExperience,
                      userNotes: genNotes
                    });
                    setGenerated(res);
                    setShowGenerator(false);
                  }
                }} 
                className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-[0.98] transition-all"
              >Design Routine</button>
            </div>
          </div>
        </div>
      )}

      {/* Generated Preview Modal */}
      {generated && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] max-w-sm w-full overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="p-8 bg-blue-600 text-white text-center">
              <h3 className="text-2xl font-bold tracking-tight">Plan Ready</h3>
              <p className="text-blue-100 text-sm mt-1">Custom 8-week cycle generated</p>
            </div>
            <div className="p-6 space-y-5 max-h-[50vh] overflow-y-auto">
              {generated.workouts.map(w => (
                <div key={w.id} className="text-left space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Day {w.dayLabel} Workout</p>
                  <div className="bg-gray-50 p-4 rounded-2xl space-y-2 border">
                    {generated.exercises.filter(ex => ex.workoutId === w.id).map(ex => (
                      <div key={ex.id} className="flex justify-between items-center border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                        <span className="text-sm font-bold text-gray-700">{getExerciseMetadata(ex.exerciseKey).name}</span>
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">{ex.sets} sets</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 flex space-x-3 bg-gray-50 border-t">
              <button onClick={() => setGenerated(null)} className="flex-1 py-4 font-bold text-gray-400">Discard</button>
              <button 
                onClick={async () => {
                  await storage.saveCustomProgram(generated.program, generated.workouts, generated.exercises);
                  setPrograms([...programs, generated.program]);
                  setGenerated(null);
                }} 
                className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg"
              >Save Routine</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Program Modal */}
      {previewProgram && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl md:rounded-3xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-xl font-bold">{previewProgram.name}</h3>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">{previewProgram.lengthWeeks} Weeks • {previewProgram.source}</p>
              </div>
              <button onClick={() => setPreviewProgram(null)} className="p-2 hover:bg-gray-200 rounded-full transition">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 flex-grow">
               {!previewData ? (
                 <div className="flex justify-center py-10"><div className="animate-spin h-6 w-6 border-2 border-blue-600 rounded-full border-b-transparent"></div></div>
               ) : (
                 <div className="space-y-6">
                   {previewData.workouts.map(w => (
                     <div key={w.id} className="space-y-3">
                       <h4 className="font-bold text-xs text-blue-600 uppercase tracking-widest flex items-center gap-2">
                         <List size={14} /> Workout Day {w.dayLabel}
                       </h4>
                       <div className="bg-gray-50 border rounded-2xl divide-y overflow-hidden">
                         {previewData.exercises[w.id]?.map(ex => {
                            const meta = getExerciseMetadata(ex.exerciseKey);
                            return (
                              <div key={ex.id} className="p-4 flex justify-between items-center bg-white">
                                <div>
                                  <p className="text-sm font-bold text-gray-900">{meta.name}</p>
                                  <p className="text-[10px] text-gray-400 font-bold uppercase">{meta.loadType.replace('_', ' ')}</p>
                                </div>
                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                                  {ex.sets} sets
                                </span>
                              </div>
                            );
                         })}
                       </div>
                     </div>
                   ))}

                   <div className="bg-blue-50 p-5 rounded-2xl space-y-2 border border-blue-100">
                      <div className="flex items-center gap-2 text-blue-800 font-bold text-xs uppercase">
                        <Zap size={14} className="text-blue-600" />
                        <span>Progression Engine</span>
                      </div>
                      <p className="text-xs text-blue-700 leading-relaxed">
                        This program automatically calculates your <strong>starting weights</strong> and updates your targets every session based on your performance and effort level.
                      </p>
                   </div>
                 </div>
               )}
            </div>

            <div className="p-6 bg-gray-50 border-t space-y-3">
              <button 
                onClick={() => handleConfirmStartProgram(previewProgram.id)}
                className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg flex items-center justify-center space-x-2 hover:bg-blue-700 active:scale-[0.98] transition-all"
              >
                <Check size={20} />
                <span>Start Program</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiftingPage;
