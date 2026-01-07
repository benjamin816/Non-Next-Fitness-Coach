
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
import { Flame, Footprints, Timer, Weight, Trophy, Sparkles, RefreshCcw, Target, Zap, Dumbbell } from 'lucide-react';
import Link from 'next/link'; // Changed to next/link
import CoachBar from '../components/CoachBar';

const TodayPage: React.FC = () => {
  const storage = useStorage();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [goals, setGoals] = useState<GoalSettings | null>(null);
  const [adaptive, setAdaptive] = useState<AdaptiveModel | null>(null);
  const [log, setLog] = useState<DailyLog | null>(null);
  const [weeklySessions, setWeeklySessions] = useState<WorkoutSession[]>([]);
  const [stableWeight, setStableWeight] = useState<number>(0);
  const [historicalAvgWeight, setHistoricalAvgWeight] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [dataReady, setDataReady] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

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
        storage.getDailyLogByDate(todayStr),
        storage.getDailyLogs(60),
        storage.getWorkoutSessions(50)
      ]);
      
      setProfile(p);
      setGoals(g);
      setAdaptive(a);
      setLog(l || {
        dateISO: todayStr,
        calories: 0,
        steps: 0,
        azm: 0,
        workoutDone: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

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
      const fallback = weightEntriesBeforeToday[0]?.weightLb || p?.startingWeightLb || 0;
      setStableWeight(fallback);
      setDataReady(true);
    };
    fetchData();
  }, [storage, todayStr]);

  if (!dataReady || !profile || !goals || !adaptive || !log) return null;

  const bmr = calculateBMR(profile, historicalAvgWeight);
  const tdeeBase = calculateTDEEBase(bmr, goals.activityStyle);
  const calorieTarget = calculateCalorieTarget(tdeeBase, adaptive.tdeeBias, goals.mode, goals.goalRate);
  const plannedDailyDelta = getPlannedDailyDelta(goals.mode, goals.goalRate);
  
  const stepTarget = ACTIVITY_TARGETS[goals.activityStyle].steps;
  const azmTarget = ACTIVITY_TARGETS[goals.activityStyle].azm;

  const workoutTargetMap = {
    'low-cardio': 1,
    'standard': 2,
    'high-activity': 3
  };
  const workoutGoal = workoutTargetMap[goals.activityStyle];

  const achievedDelta = getPlanAchievedDelta({
    mode: goals.mode,
    plannedDailyDelta: plannedDailyDelta,
    caloriesEaten: log.calories,
    calorieTarget,
    steps: log.steps,
    stepsTarget: stepTarget,
    azm: log.azm,
    azmTarget: azmTarget
  });

  const updateLog = async (updates: Partial<DailyLog>) => {
    const updated = { ...log, ...updates, updatedAt: Date.now() };
    setLog(updated);
    setSaving(true);
    await storage.upsertDailyLog(updated);
    setTimeout(() => setSaving(false), 500);
  };

  const isGoalReached = () => {
    if (historicalAvgWeight <= 0) return false;
    if (goals.mode === 'fat-loss' && goals.targetWeightLb) {
      return historicalAvgWeight <= goals.targetWeightLb;
    }
    if (goals.mode === 'muscle-gain' && goals.targetWeightLb) {
      return historicalAvgWeight >= goals.targetWeightLb;
    }
    return false;
  };

  const coachState = {
    currentHour: new Date().getHours(),
    weightLogged: !!(log.weightLb && log.weightLb > 0),
    caloriesEntered: log.calories > 0,
    stepsEntered: log.steps > 0,
    azmEntered: log.azm > 0,
    caloriesEaten: log.calories,
    steps: log.steps,
    azm: log.azm,
    targets: {
      calories: calorieTarget,
      steps: stepTarget,
      azm: azmTarget
    }
  };

  const getModeLabel = () => {
    const parts = goals.mode.split('-');
    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold">Today, {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</h2>
        <p className="text-gray-500">Manual entry coaching for your health journey.</p>
      </header>

      {isGoalReached() && (
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
          <Sparkles className="absolute right-[-10px] top-[-10px] w-24 h-24 opacity-20 rotate-12" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Trophy size={24} /> Goal Accomplished!
              </h3>
              <p className="text-yellow-50">You've hit your target weight. Ready for the next phase?</p>
            </div>
            <Link 
              href="/settings" 
              className="bg-white text-orange-600 px-6 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-yellow-50 transition shadow-md"
            >
              <RefreshCcw size={18} /> Update Goal
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Current Goal</p>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-blue-600 truncate">{getModeLabel()}</span>
            <span className="text-[10px] text-gray-400">
              {goals.mode === 'maintenance' ? 'Stable' : `${goals.goalRate} lb/week`}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Calories Intake</p>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-gray-900">{log.calories || 0}</span>
            <span className="text-xs text-gray-400">/ {calorieTarget}</span>
          </div>
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
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Workouts This Week</p>
          <div className="flex items-baseline gap-1">
            <span className={`text-xl font-bold ${weeklySessions.length >= workoutGoal ? 'text-blue-600' : 'text-gray-900'}`}>
              {weeklySessions.length}
            </span>
            <span className="text-xs text-gray-400">/ {workoutGoal}</span>
          </div>
        </div>
      </div>

      <CoachBar state={coachState} />

      <div className="bg-white rounded-xl border shadow-sm divide-y">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Weight className="text-purple-600" size={20} />
            <div className="flex flex-col">
              <span className="font-medium">Weight (lb)</span>
              <span className="text-[10px] text-gray-400">Current Avg: {historicalAvgWeight.toFixed(1)}lb</span>
            </div>
          </div>
          <input 
            type="number" 
            placeholder=""
            value={log.weightLb || ''}
            onChange={(e) => updateLog({ weightLb: parseFloat(e.target.value) || undefined })}
            className="w-24 text-right bg-gray-50 border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
          />
        </div>

        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Flame className="text-orange-600" size={20} />
            <div className="flex flex-col">
              <span className="font-medium">Calories Eaten</span>
              <span className="text-[10px] text-gray-400">Goal: stay under {calorieTarget}</span>
            </div>
          </div>
          <input 
            type="number" 
            value={log.calories || ''}
            onChange={(e) => updateLog({ calories: parseInt(e.target.value) || 0 })}
            className="w-24 text-right bg-gray-50 border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
          />
        </div>

        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Footprints className="text-blue-600" size={20} />
            <div className="flex flex-col">
              <span className="font-medium">Steps</span>
              <span className="text-[10px] text-blue-500 font-bold uppercase tracking-tight">Goal: {stepTarget}</span>
            </div>
          </div>
          <input 
            type="number" 
            value={log.steps || ''}
            onChange={(e) => updateLog({ steps: parseInt(e.target.value) || 0 })}
            className="w-24 text-right bg-gray-50 border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold"
          />
        </div>

        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Timer className="text-yellow-600" size={20} />
            <div className="flex flex-col">
              <span className="font-medium">AZM</span>
              <span className="text-[10px] text-yellow-600 font-bold uppercase tracking-tight">Goal: {azmTarget}</span>
            </div>
          </div>
          <input 
            type="number" 
            value={log.azm || ''}
            onChange={(e) => updateLog({ azm: parseInt(e.target.value) || 0 })}
            className="w-24 text-right bg-gray-50 border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold"
          />
        </div>
      </div>

      <div className="flex justify-end items-center space-x-2 text-xs text-gray-400">
        {saving ? <span className="animate-pulse">Saving changes...</span> : <span>All data local and secure</span>}
      </div>
    </div>
  );
};

export default TodayPage;
