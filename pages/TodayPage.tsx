
import React, { useState, useEffect } from 'react';
import { useStorage } from '../components/StorageProvider';
import { DailyLog, UserProfile, GoalSettings, AdaptiveModel, WorkoutSession } from '../types';
import { 
  calculateBMR, 
  calculateTDEEBase, 
  calculateCalorieTarget, 
  getPlannedDailyDelta
} from '../domain/calculators';
import { getPlanAchievedDelta, getPlanStatusLabel } from '../domain/planAdherence';
import { ACTIVITY_TARGETS } from '../constants';
import { 
  Flame, Footprints, Timer, Weight, Trophy, Sparkles, 
  RefreshCcw, ChevronLeft, ChevronRight, Edit3, Check, X, Trash2, AlertCircle 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import CoachBar from '../components/CoachBar';

const TodayPage: React.FC = () => {
  const storage = useStorage();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [goals, setGoals] = useState<GoalSettings | null>(null);
  const [adaptive, setAdaptive] = useState<AdaptiveModel | null>(null);
  const [log, setLog] = useState<DailyLog | null>(null);
  const [weeklySessions, setWeeklySessions] = useState<WorkoutSession[]>([]);
  const [historicalAvgWeight, setHistoricalAvgWeight] = useState<number>(0);
  const [dataReady, setDataReady] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Navigation & History State
  const todayStr = new Date().toISOString().split('T')[0];
  const [viewingDateISO, setViewingDateISO] = useState(todayStr);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0); // 0: Idle, 1: Confirming

  // Temporary edit buffer
  const [editBuffer, setEditBuffer] = useState<DailyLog | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day;
      const startOfWeek = new Date(now.setDate(diff));
      startOfWeek.setHours(0, 0, 0, 0);
      const startOfWeekISO = startOfWeek.toISOString().split('T')[0];

      const [p, g, a, l, allLogs, allSessions] = await Promise.all([
        storage.getUserProfile(),
        storage.getGoalSettings(),
        storage.getAdaptiveModel(),
        storage.getDailyLogByDate(viewingDateISO),
        storage.getDailyLogs(60),
        storage.getWorkoutSessions(50)
      ]);
      
      setProfile(p);
      setGoals(g);
      setAdaptive(a);
      
      const currentLog = l || {
        dateISO: viewingDateISO,
        calories: 0,
        steps: 0,
        azm: 0,
        workoutDone: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      setLog(currentLog);
      setEditBuffer(currentLog);

      const currentWeekSessions = allSessions.filter(s => s.dateISO >= startOfWeekISO);
      setWeeklySessions(currentWeekSessions);

      const logsBeforeToday = allLogs.filter(item => item.dateISO !== todayStr);
      const weightEntriesBeforeToday = logsBeforeToday.filter(item => item.weightLb !== undefined && item.weightLb > 0);
      const last7WeightLogs = weightEntriesBeforeToday.slice(0, 7);
      
      let historicalAvg = p?.startingWeightLb || 0;
      if (last7WeightLogs.length > 0) {
        historicalAvg = last7WeightLogs.reduce((sum, curr) => sum + (curr.weightLb || 0), 0) / last7WeightLogs.length;
      }
      setHistoricalAvgWeight(historicalAvg);
      setDataReady(true);
      setIsEditMode(false);
      setDeleteStep(0);
    };
    fetchData();
  }, [storage, viewingDateISO, todayStr]);

  if (!dataReady || !profile || !goals || !adaptive || !log || !editBuffer) return null;

  const isToday = viewingDateISO === todayStr;
  const bmr = calculateBMR(profile, historicalAvgWeight);
  const tdeeBase = calculateTDEEBase(bmr, goals.activityStyle);
  const calorieTarget = calculateCalorieTarget(tdeeBase, adaptive.tdeeBias, goals.mode, goals.goalRate);
  const plannedDailyDelta = getPlannedDailyDelta(goals.mode, goals.goalRate);
  
  const stepTarget = ACTIVITY_TARGETS[goals.activityStyle].steps;
  const azmTarget = ACTIVITY_TARGETS[goals.activityStyle].azm;

  const workoutTargetMap = { 'low-cardio': 1, 'standard': 2, 'high-activity': 3 };
  const workoutGoal = workoutTargetMap[goals.activityStyle];

  const currentDisplayedLog = isEditMode ? editBuffer : log;

  const achievedDelta = getPlanAchievedDelta({
    mode: goals.mode,
    plannedDailyDelta: plannedDailyDelta,
    caloriesEaten: currentDisplayedLog.calories,
    calorieTarget,
    steps: currentDisplayedLog.steps,
    stepsTarget: stepTarget,
    azm: currentDisplayedLog.azm,
    azmTarget: azmTarget
  });

  const changeDate = (offset: number) => {
    const d = new Date(viewingDateISO);
    d.setDate(d.getDate() + offset);
    const newDateISO = d.toISOString().split('T')[0];
    
    // Constraint: Can't go past today, and only up to 7 days back
    const todayDate = new Date(todayStr);
    const diffTime = Math.abs(todayDate.getTime() - d.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (d > todayDate) return;
    if (diffDays > 7 && d < todayDate) return;

    setViewingDateISO(newDateISO);
  };

  const handleUpdate = (updates: Partial<DailyLog>) => {
    const updated = { ...editBuffer, ...updates, updatedAt: Date.now() };
    setEditBuffer(updated);
    // If it's today, we auto-save for convenience
    if (isToday) {
      autoSave(updated);
    }
  };

  const autoSave = async (updated: DailyLog) => {
    setSaving(true);
    await storage.upsertDailyLog(updated);
    setLog(updated);
    setTimeout(() => setSaving(false), 500);
  };

  const saveEdits = async () => {
    setSaving(true);
    await storage.upsertDailyLog(editBuffer);
    setLog(editBuffer);
    setIsEditMode(false);
    setTimeout(() => setSaving(false), 500);
  };

  const cancelEdits = () => {
    setEditBuffer(log);
    setIsEditMode(false);
  };

  const handleDelete = async () => {
    if (deleteStep === 0) {
      setDeleteStep(1);
    } else {
      await storage.deleteDailyLog(viewingDateISO);
      const emptyLog = {
        dateISO: viewingDateISO,
        calories: 0,
        steps: 0,
        azm: 0,
        workoutDone: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      setLog(emptyLog);
      setEditBuffer(emptyLog);
      setDeleteStep(0);
      setIsEditMode(false);
    }
  };

  const coachState = {
    currentHour: new Date().getHours(),
    weightLogged: !!(currentDisplayedLog.weightLb && currentDisplayedLog.weightLb > 0),
    caloriesEntered: currentDisplayedLog.calories > 0,
    stepsEntered: currentDisplayedLog.steps > 0,
    azmEntered: currentDisplayedLog.azm > 0,
    caloriesEaten: currentDisplayedLog.calories,
    steps: currentDisplayedLog.steps,
    azm: currentDisplayedLog.azm,
    targets: { calories: calorieTarget, steps: stepTarget, azm: azmTarget }
  };

  const formattedDate = new Date(viewingDateISO).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const isGoalReached = () => {
    if (historicalAvgWeight <= 0) return false;
    if (goals.mode === 'fat-loss' && goals.targetWeightLb) return historicalAvgWeight <= goals.targetWeightLb;
    if (goals.mode === 'muscle-gain' && goals.targetWeightLb) return historicalAvgWeight >= goals.targetWeightLb;
    return false;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Date Navigation Header */}
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => changeDate(-1)} 
              className="p-2 bg-white border rounded-full shadow-sm hover:bg-gray-50 transition active:scale-90"
              title="Previous Day"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex flex-col items-center min-w-[120px]">
              <h2 className="text-xl font-bold">{isToday ? "Today" : formattedDate}</h2>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{viewingDateISO}</span>
            </div>
            <button 
              onClick={() => changeDate(1)} 
              disabled={isToday}
              className={`p-2 border rounded-full shadow-sm transition active:scale-90 ${isToday ? 'bg-gray-100 text-gray-300' : 'bg-white text-gray-900 hover:bg-gray-50'}`}
              title="Next Day"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          
          {!isToday && !isEditMode && (
             <button 
               onClick={() => setIsEditMode(true)}
               className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm shadow-md hover:bg-blue-700 transition"
             >
               <Edit3 size={16} /> Edit
             </button>
          )}

          {isEditMode && (
            <div className="flex items-center gap-2">
              <button 
                onClick={cancelEdits}
                className="bg-gray-100 text-gray-500 px-4 py-2 rounded-xl font-bold text-sm hover:bg-gray-200 transition"
              >
                <X size={16} />
              </button>
              <button 
                onClick={saveEdits}
                className="bg-green-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm shadow-md hover:bg-green-700 transition"
              >
                <Check size={16} /> Save
              </button>
            </div>
          )}
        </div>
      </header>

      {isGoalReached() && isToday && (
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden animate-in fade-in duration-500">
          <Sparkles className="absolute right-[-10px] top-[-10px] w-24 h-24 opacity-20 rotate-12" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2"><Trophy size={24} /> Goal Hit!</h3>
              <p className="text-yellow-50">You've reached your target. Ready for a new phase?</p>
            </div>
            <Link to="/settings" className="bg-white text-orange-600 px-6 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-yellow-50 transition shadow-md">
              <RefreshCcw size={18} /> Update Goal
            </Link>
          </div>
        </div>
      )}

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Coach Mode</p>
          <span className="text-sm font-bold text-blue-600 truncate">{goals.mode.replace('-', ' ').toUpperCase()}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Net {getPlanStatusLabel(goals.mode, achievedDelta)}</p>
          <div className="flex items-baseline gap-1">
            <span className={`text-xl font-bold ${achievedDelta === undefined ? 'text-gray-400' : (achievedDelta < 0 ? 'text-emerald-600' : 'text-red-600')}`}>
              {achievedDelta === undefined ? 'N/A' : Math.round(Math.abs(achievedDelta))}
            </span>
            <span className="text-xs text-gray-400">/ {Math.abs(plannedDailyDelta)}</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Calories</p>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-gray-900">{currentDisplayedLog.calories || 0}</span>
            <span className="text-xs text-gray-400">/ {calorieTarget}</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Movement</p>
          <span className="text-sm font-bold text-blue-600">
            {currentDisplayedLog.steps >= stepTarget && currentDisplayedLog.azm >= azmTarget ? "Met" : "In Progress"}
          </span>
        </div>
      </div>

      <CoachBar state={coachState} />

      {/* Log Input Fields */}
      <div className={`bg-white rounded-2xl border shadow-sm divide-y overflow-hidden transition-all ${isEditMode ? 'ring-2 ring-blue-400' : ''}`}>
        <div className="p-4 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-3">
            <Weight className="text-purple-600" size={20} />
            <div className="flex flex-col">
              <span className="font-bold text-sm">Weight (lb)</span>
              <span className="text-[10px] text-gray-400">Baseline: {historicalAvgWeight.toFixed(1)}</span>
            </div>
          </div>
          <input 
            type="number" 
            disabled={!isToday && !isEditMode}
            value={currentDisplayedLog.weightLb || ''}
            onChange={(e) => handleUpdate({ weightLb: parseFloat(e.target.value) || undefined })}
            className={`w-24 text-right bg-gray-50 border rounded-xl p-2.5 outline-none font-mono font-bold transition-all ${!isToday && !isEditMode ? 'opacity-50 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500'}`}
          />
        </div>

        <div className="p-4 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-3">
            <Flame className="text-orange-600" size={20} />
            <div className="flex flex-col">
              <span className="font-bold text-sm">Calories Eaten</span>
              <span className="text-[10px] text-gray-400">Target: {calorieTarget}</span>
            </div>
          </div>
          <input 
            type="number" 
            disabled={!isToday && !isEditMode}
            value={currentDisplayedLog.calories || ''}
            onChange={(e) => handleUpdate({ calories: parseInt(e.target.value) || 0 })}
            className={`w-24 text-right bg-gray-50 border rounded-xl p-2.5 outline-none font-mono font-bold transition-all ${!isToday && !isEditMode ? 'opacity-50 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500'}`}
          />
        </div>

        <div className="p-4 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-3">
            <Footprints className="text-blue-600" size={20} />
            <div className="flex flex-col">
              <span className="font-bold text-sm">Steps</span>
              <span className="text-[10px] text-blue-500 font-bold uppercase tracking-tight">Target: {stepTarget}</span>
            </div>
          </div>
          <input 
            type="number" 
            disabled={!isToday && !isEditMode}
            value={currentDisplayedLog.steps || ''}
            onChange={(e) => handleUpdate({ steps: parseInt(e.target.value) || 0 })}
            className={`w-24 text-right bg-gray-50 border rounded-xl p-2.5 outline-none font-mono font-bold transition-all ${!isToday && !isEditMode ? 'opacity-50 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500'}`}
          />
        </div>

        <div className="p-4 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-3">
            <Timer className="text-yellow-600" size={20} />
            <div className="flex flex-col">
              <span className="font-bold text-sm">AZM</span>
              <span className="text-[10px] text-yellow-600 font-bold uppercase tracking-tight">Target: {azmTarget}</span>
            </div>
          </div>
          <input 
            type="number" 
            disabled={!isToday && !isEditMode}
            value={currentDisplayedLog.azm || ''}
            onChange={(e) => handleUpdate({ azm: parseInt(e.target.value) || 0 })}
            className={`w-24 text-right bg-gray-50 border rounded-xl p-2.5 outline-none font-mono font-bold transition-all ${!isToday && !isEditMode ? 'opacity-50 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500'}`}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* Delete Row (Visible in history) */}
        {!isToday && isEditMode && (
          <div className="flex flex-col gap-2 p-4 bg-red-50 rounded-2xl border border-red-100 items-center animate-in slide-in-from-bottom-2">
            <p className="text-xs font-bold text-red-600 flex items-center gap-1">
              <AlertCircle size={14} /> Danger Zone
            </p>
            <button 
              onClick={handleDelete}
              className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${deleteStep === 0 ? 'bg-white text-red-600 border border-red-200' : 'bg-red-600 text-white shadow-lg'}`}
            >
              <Trash2 size={16} /> {deleteStep === 0 ? "Delete Log" : "Confirm Double Delete?"}
            </button>
            {deleteStep === 1 && (
              <button onClick={() => setDeleteStep(0)} className="text-[10px] font-bold text-gray-400 uppercase underline">Cancel Delete</button>
            )}
          </div>
        )}

        <div className="flex justify-between items-center px-2">
          <div className="flex items-center space-x-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {saving ? <div className="animate-spin h-3 w-3 border-2 border-blue-500 rounded-full border-b-transparent" /> : <div className="w-3 h-3 bg-green-500 rounded-full" />}
            <span>{saving ? 'Syncing...' : (isToday ? 'Live Sync' : 'History View')}</span>
          </div>
          <p className="text-[10px] text-gray-300 font-bold">Encrypted Local Database</p>
        </div>
      </div>
    </div>
  );
};

export default TodayPage;
