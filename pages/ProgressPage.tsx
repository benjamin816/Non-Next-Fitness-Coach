
import React, { useState, useEffect } from 'react';
import { useStorage } from '../components/StorageProvider';
import { DailyLog, UserProfile, GoalSettings, AdaptiveModel } from '../types';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, Legend, ReferenceLine 
} from 'recharts';
import { 
  calculateBMR, 
  calculateTDEEBase, 
  calculateCalorieTarget, 
  getPlannedDailyDelta 
} from '../domain/calculators';
import { getPlanAchievedDelta } from '../domain/planAdherence';
import { ACTIVITY_TARGETS } from '../constants';
import { RefreshCw, Info, ArrowUpRight, ArrowDownRight, Sparkles, Flame, Footprints, Timer, TrendingDown, Zap } from 'lucide-react';

const ProgressPage: React.FC = () => {
  const storage = useStorage();
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [goals, setGoals] = useState<GoalSettings | null>(null);
  const [adaptive, setAdaptive] = useState<AdaptiveModel | null>(null);
  const [autoUpdateMessage, setAutoUpdateMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [l, p, g, a] = await Promise.all([
        storage.getDailyLogs(90),
        storage.getUserProfile(),
        storage.getGoalSettings(),
        storage.getAdaptiveModel()
      ]);
      const sortedLogs = l.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
      setLogs(sortedLogs);
      setProfile(p);
      setGoals(g);
      setAdaptive(a);

      // --- AUTOMATIC REALITY CHECK ---
      if (p && g && a && sortedLogs.length >= 14) {
        const currentWeekLogs = sortedLogs.slice(-7);
        const prevWeekLogs = sortedLogs.slice(-14, -7);

        const getAvgWeight = (weekLogs: DailyLog[]) => {
          const valid = weekLogs.filter(lw => (lw.weightLb || 0) > 0);
          return valid.length >= 4 ? valid.reduce((sum, lw) => sum + (lw.weightLb || 0), 0) / valid.length : null;
        };

        const currAvg = getAvgWeight(currentWeekLogs);
        const prevAvg = getAvgWeight(prevWeekLogs);
        const adherenceMet = currentWeekLogs.filter(lw => lw.calories > 0).length >= 5;

        const lastCal = a.lastCalibrationDate ? new Date(a.lastCalibrationDate).getTime() : 0;
        const isDue = (Date.now() - lastCal) > (7 * 24 * 60 * 60 * 1000);

        if (currAvg !== null && prevAvg !== null && adherenceMet && isDue) {
          const actualWeekChange = currAvg - prevAvg;
          const plannedDailyDelta = getPlannedDailyDelta(g.mode, g.goalRate);
          const plannedWeekChange = (plannedDailyDelta * 7) / 3500;
          
          const gap = actualWeekChange - plannedWeekChange;
          let adjustment = 0;

          if (gap > 0.15) {
            adjustment = -75;
          } else if (gap < -0.15) {
            adjustment = 75;
          }

          if (adjustment !== 0) {
            const newBias = Math.min(Math.max(a.tdeeBias + adjustment, -500), 500);
            const updated: AdaptiveModel = {
              ...a,
              tdeeBias: newBias,
              lastCalibrationDate: new Date().toISOString()
            };
            await storage.setAdaptiveModel(updated);
            setAdaptive(updated);
            setAutoUpdateMessage(`Coach Update: Calorie targets adjusted by ${adjustment > 0 ? '+' : ''}${adjustment}kcal based on your ${actualWeekChange.toFixed(2)}lb actual change.`);
          }
        }
      }
    };
    fetchData();
  }, [storage]);

  if (!profile || !goals || !adaptive || logs.length === 0) return (
    <div className="text-center py-20 flex flex-col items-center space-y-4">
      <div className="animate-spin-slow bg-blue-100 p-3 rounded-full">
        <RefreshCw size={24} className="text-blue-600" />
      </div>
      <p className="text-gray-500 font-medium">Analyzing your journey...</p>
    </div>
  );

  const stepTarget = ACTIVITY_TARGETS[goals.activityStyle].steps;
  const azmTarget = ACTIVITY_TARGETS[goals.activityStyle].azm;
  const plannedDailyDelta = getPlannedDailyDelta(goals.mode, goals.goalRate);

  // Calculate Rolling Averages
  const getRollingAvg = (array: any[], index: number, key: string, window: number = 7) => {
    const start = Math.max(0, index - window + 1);
    const subset = array.slice(start, index + 1);
    const sum = subset.reduce((acc, curr) => acc + (curr[key] || 0), 0);
    return subset.length > 0 ? sum / subset.length : null;
  };

  const chartData = logs.map((log, idx, arr) => {
    const weight = log.weightLb || undefined;
    const bmr = calculateBMR(profile, weight || profile.startingWeightLb);
    const tdeeBase = calculateTDEEBase(bmr, goals.activityStyle);
    const calorieTarget = calculateCalorieTarget(tdeeBase, adaptive.tdeeBias, goals.mode, goals.goalRate);
    const achievedDelta = getPlanAchievedDelta({
      mode: goals.mode,
      plannedDailyDelta,
      caloriesEaten: log.calories,
      calorieTarget,
      steps: log.steps,
      stepsTarget: stepTarget,
      azm: log.azm,
      azmTarget: azmTarget
    }) || 0;

    const entry = {
      date: log.dateISO,
      weight,
      calories: log.calories > 0 ? log.calories : null,
      target: calorieTarget,
      delta: achievedDelta,
      steps: log.steps,
      azm: log.azm
    };

    return {
      ...entry,
      rollingWeight: getRollingAvg(arr.map(l => ({ ...l, val: l.weightLb || null })), idx, 'val'),
      rollingCals: getRollingAvg(arr.map(l => ({ ...l, val: l.calories || null })), idx, 'val'),
      rollingDelta: getRollingAvg(arr.map(l => ({ ...l, val: achievedDelta })), idx, 'val'),
      rollingSteps: getRollingAvg(arr.map(l => ({ ...l, val: l.steps || null })), idx, 'val'),
      rollingAzm: getRollingAvg(arr.map(l => ({ ...l, val: l.azm || null })), idx, 'val'),
    };
  });

  const currentWeekLogs = logs.slice(-7);
  const getAvgWeight = (weekLogs: DailyLog[]) => {
    const valid = weekLogs.filter(l => (l.weightLb || 0) > 0);
    return valid.length > 0 ? valid.reduce((sum, l) => sum + (l.weightLb || 0), 0) / valid.length : null;
  };
  const currAvg = getAvgWeight(currentWeekLogs);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-xl shadow-xl text-xs space-y-1">
          <p className="font-bold text-gray-900 border-b pb-1 mb-1">{label}</p>
          {payload.map((p: any, i: number) => (
            <div key={i} className="flex justify-between gap-4">
              <span style={{ color: p.color || p.stroke }} className="font-medium">{p.name}:</span>
              <span className="font-mono font-bold text-gray-900">{Math.round(p.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      <header className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Progress & Trends</h2>
          <p className="text-gray-500">Visualizing your 7-day rolling averages.</p>
        </div>
        <div className="bg-blue-50 px-3 py-1 rounded-full border border-blue-100 flex items-center space-x-2">
          <RefreshCw size={14} className="text-blue-500 animate-spin-slow" />
          <span className="text-[10px] font-bold text-blue-700 uppercase">Adaptive Engine Active</span>
        </div>
      </header>

      {autoUpdateMessage && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 rounded-2xl text-white shadow-xl flex items-center space-x-4 animate-in slide-in-from-top duration-700">
          <div className="bg-white/20 p-2 rounded-full">
            <Sparkles size={20} />
          </div>
          <p className="text-sm font-medium">{autoUpdateMessage}</p>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Rolling Weight</p>
          <p className="text-xl font-bold">{currAvg ? currAvg.toFixed(1) : '---'} <span className="text-xs font-normal text-gray-400">lb</span></p>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Adaptive Bias</p>
          <div className="flex items-center space-x-1">
            {adaptive.tdeeBias !== 0 && (adaptive.tdeeBias > 0 ? <ArrowUpRight size={16} className="text-blue-500" /> : <ArrowDownRight size={16} className="text-blue-500" />)}
            <p className="text-xl font-bold text-blue-600">{adaptive.tdeeBias > 0 ? `+${adaptive.tdeeBias}` : adaptive.tdeeBias} <span className="text-xs font-normal text-gray-400">kcal</span></p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Avg Steps</p>
          <p className="text-xl font-bold text-blue-600">{chartData[chartData.length - 1]?.rollingSteps?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '---'}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Avg AZM</p>
          <p className="text-xl font-bold text-amber-600">{chartData[chartData.length - 1]?.rollingAzm?.toFixed(0) || '---'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Weight Trend */}
        <section className="bg-white p-6 rounded-2xl border shadow-sm">
          <h3 className="text-sm font-bold mb-6 flex items-center space-x-2 text-gray-900">
            <TrendingDown size={18} className="text-blue-600" />
            <span>Bodyweight (Rolling)</span>
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" hide />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="rollingWeight" name="Rolling Weight" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorWeight)" connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Energy Consumption Trend */}
        <section className="bg-white p-6 rounded-2xl border shadow-sm">
          <h3 className="text-sm font-bold mb-6 flex items-center space-x-2 text-gray-900">
            <Flame size={18} className="text-orange-600" />
            <span>Daily Calories vs Target</span>
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" hide />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="rollingCals" name="Rolling Intake" stroke="#f97316" strokeWidth={3} dot={false} connectNulls />
                <Line type="stepAfter" dataKey="target" name="Daily Target" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Energy Balance (Deficit) */}
        <section className="bg-white p-6 rounded-2xl border shadow-sm lg:col-span-2">
          <h3 className="text-sm font-bold mb-6 flex items-center space-x-2 text-gray-900">
            <Zap size={18} className="text-emerald-600" />
            <span>Net Energy Balance (Deficit Trend)</span>
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorDelta" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" hide />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="#e2e8f0" strokeWidth={2} />
                <ReferenceLine y={plannedDailyDelta} label={{ value: 'Plan', position: 'right', fill: '#94a3b8', fontSize: 10 }} stroke="#94a3b8" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="rollingDelta" name="Rolling Deficit" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorDelta)" connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Steps Trend */}
        <section className="bg-white p-6 rounded-2xl border shadow-sm">
          <h3 className="text-sm font-bold mb-6 flex items-center space-x-2 text-gray-900">
            <Footprints size={18} className="text-blue-500" />
            <span>Rolling Steps Trend</span>
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" hide />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={stepTarget} stroke="#3b82f6" strokeDasharray="3 3" strokeOpacity={0.5} />
                <Line type="monotone" dataKey="rollingSteps" name="7d Steps Avg" stroke="#3b82f6" strokeWidth={3} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* AZM Trend */}
        <section className="bg-white p-6 rounded-2xl border shadow-sm">
          <h3 className="text-sm font-bold mb-6 flex items-center space-x-2 text-gray-900">
            <Timer size={18} className="text-amber-500" />
            <span>Rolling AZM Trend</span>
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" hide />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={azmTarget} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.5} />
                <Line type="monotone" dataKey="rollingAzm" name="7d AZM Avg" stroke="#f59e0b" strokeWidth={3} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

      </div>

      <div className="bg-gray-50 p-6 rounded-2xl border border-dashed flex items-start space-x-4">
        <div className="bg-white p-3 rounded-xl border shadow-sm">
          <RefreshCw size={20} className="text-blue-500" />
        </div>
        <div>
          <h4 className="font-bold text-sm text-gray-900">Adaptive Insights</h4>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            The charts above reveal your <strong>metabolic momentum</strong>. 
            If your rolling deficit is consistent but weight isn't moving as planned, the coach uses this 
            trend data to update your baseline TDEE.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProgressPage;
