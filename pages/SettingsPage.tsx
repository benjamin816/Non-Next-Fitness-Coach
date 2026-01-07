
import React, { useState, useEffect, useRef } from 'react';
// Corrected import path for useStorage
import { useStorage } from '../components/StorageProvider';
import { UserProfile, GoalSettings, Sex, AdaptiveModel, GoalMode, ActivityStyle } from '../types';
import { 
  calculateBMR, calculateTDEEBase, calculateCalorieTarget, 
  getPlannedDailyDelta, cmToFeetInches, feetInchesToCm
} from '../domain/calculators';
import { 
  User, ShieldAlert, Download, Upload, AlertTriangle, 
  Trash2, Target, Settings as SettingsIcon, Zap, Info, ShieldCheck
} from 'lucide-react';
import { z } from 'https://esm.sh/zod@^3.24.2';

const profileSchema = z.object({
  age: z.number().min(16, "This app is for ages 16+."),
  weight: z.number().min(100, "Min 100lb").max(600, "Max 600lb")
});

interface SettingsPageProps {
  onReset: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onReset }) => {
  const storage = useStorage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [goals, setGoals] = useState<GoalSettings | null>(null);
  const [adaptive, setAdaptive] = useState<AdaptiveModel | null>(null);
  const [showResetModal, setShowResetModal] = useState(0); 
  const [showOverrideWarning, setShowOverrideWarning] = useState(false);
  const [resetInput, setResetInput] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      const [p, g, a] = await Promise.all([
        storage.getUserProfile(),
        storage.getGoalSettings(),
        storage.getAdaptiveModel()
      ]);
      setProfile(p);
      setGoals(g);
      setAdaptive(a);
    };
    fetchData();
  }, [storage]);

  if (!profile || !goals || !adaptive) return null;

  const handleExport = async () => {
    const data = {
      profile, goals, adaptive,
      logs: await storage.getDailyLogs(1000),
      sessions: await storage.getWorkoutSessions(1000),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitness-coach-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.profile || !data.goals) throw new Error("Invalid format");
      await storage.resetAllData();
      await storage.setUserProfile(data.profile);
      await storage.setGoalSettings(data.goals);
      if (data.adaptive) await storage.setAdaptiveModel(data.adaptive);
      if (data.logs) {
        for (const log of data.logs) await storage.upsertDailyLog(log);
      }
      alert("Success! App will reload.");
      window.location.reload();
    } catch (err) {
      alert("Import failed.");
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    setErrors({});
    const updated = { ...profile, ...updates, updatedAt: Date.now() };
    setProfile(updated);
    await storage.setUserProfile(updated);
  };

  const updateGoals = async (updates: Partial<GoalSettings>) => {
    setSavingGoal(true);
    const updated = { ...goals, ...updates, updatedAt: Date.now() };
    setGoals(updated);
    await storage.setGoalSettings(updated);
    setTimeout(() => setSavingGoal(false), 500);
  };

  const updateBias = async (newBias: number) => {
    const updated = { ...adaptive, tdeeBias: newBias };
    setAdaptive(updated);
    await storage.setAdaptiveModel(updated);
  };

  const { feet, inches } = cmToFeetInches(profile.heightCm);

  return (
    <div className="space-y-8 pb-10">
      <header>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-gray-500">Customize your goals and manage your local data.</p>
      </header>

      {/* Primary Goal Config */}
      <section className="bg-white p-6 rounded-2xl border shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Target className="text-blue-600" size={20} />
            <h3 className="text-lg font-bold">Goals & Activity</h3>
          </div>
          {savingGoal && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase">Coach Mode</label>
            <select 
              value={goals.mode} 
              onChange={(e) => updateGoals({ mode: e.target.value as GoalMode })}
              className="w-full bg-gray-50 border rounded-xl p-3 font-medium outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="fat-loss">Fat Loss</option>
              <option value="maintenance">Maintenance</option>
              <option value="muscle-gain">Muscle Gain</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase">Activity Style</label>
            <select 
              value={goals.activityStyle} 
              onChange={(e) => updateGoals({ activityStyle: e.target.value as ActivityStyle })}
              className="w-full bg-gray-50 border rounded-xl p-3 font-medium outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low-cardio">Low-cardio (8k steps)</option>
              <option value="standard">Standard (9k steps)</option>
              <option value="high-activity">High-activity (10k steps)</option>
            </select>
          </div>
        </div>
      </section>

      {/* EXPERT CONTROLS */}
      <section className="bg-white p-6 rounded-2xl border shadow-sm space-y-4 border-orange-100 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="text-orange-500" size={20} />
            <h3 className="text-lg font-bold">Expert Calorie Override</h3>
          </div>
        </div>
        
        <div className="bg-orange-50 p-4 rounded-xl flex items-start space-x-3">
          <ShieldAlert className="text-orange-600 flex-shrink-0" size={20} />
          <p className="text-xs text-orange-800 leading-relaxed">
            Changing the <strong>TDEE Bias</strong> manually overrides the Coach's automatic calculations. 
            It is best to let the machine adjust itself on the Progress screen.
          </p>
        </div>

        {!showOverrideWarning ? (
          <button 
            onClick={() => setShowOverrideWarning(true)}
            className="text-xs font-bold text-blue-600 flex items-center space-x-1 py-1"
          >
            <span>I want to manually override my target</span>
          </button>
        ) : (
          <div className="space-y-4 pt-2 animate-in slide-in-from-top-2">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">TDEE Bias Offset (kcal)</label>
                <div className="flex items-center space-x-2 mt-1">
                  <input 
                    type="range" 
                    min="-500" 
                    max="500" 
                    step="25"
                    value={adaptive.tdeeBias}
                    onChange={(e) => updateBias(parseInt(e.target.value))}
                    className="flex-grow accent-orange-500"
                  />
                  <span className="w-16 text-center font-mono font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded">
                    {adaptive.tdeeBias > 0 ? '+' : ''}{adaptive.tdeeBias}
                  </span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setShowOverrideWarning(false)}
              className="w-full py-2 bg-gray-100 text-gray-500 text-xs font-bold rounded-lg"
            >
              Lock Manual Overrides
            </button>
          </div>
        )}
      </section>

      {/* Biological Profile */}
      <section className="bg-white p-6 rounded-2xl border shadow-sm space-y-6">
        <div className="flex items-center space-x-2">
          <User className="text-blue-600" size={20} />
          <h3 className="text-lg font-bold">Profile</h3>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase">Sex</label>
            <p className="p-3 bg-gray-100 rounded-xl text-gray-500 font-bold uppercase text-sm">{profile.sex}</p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase">Age</label>
            <input 
              type="number" 
              value={profile.ageYears} 
              onChange={(e) => updateProfile({ ageYears: parseInt(e.target.value) || profile.ageYears })}
              className="w-full bg-gray-50 border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      {/* Data Management */}
      <section className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
        <h3 className="text-lg font-bold">Storage</h3>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={handleExport} className="flex items-center justify-center space-x-2 p-3 bg-gray-50 border rounded-xl hover:bg-gray-100">
            <Download size={16} className="text-blue-600" />
            <span className="text-sm font-bold">Export</span>
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center space-x-2 p-3 bg-gray-50 border rounded-xl hover:bg-gray-100">
            <Upload size={16} className="text-blue-600" />
            <span className="text-sm font-bold">Import</span>
            <input type="file" ref={fileInputRef} onChange={handleImportFile} className="hidden" accept="application/json" />
          </button>
        </div>
        <button 
          onClick={() => setShowResetModal(1)}
          className="w-full py-3 text-red-600 text-xs font-bold border-2 border-dashed border-red-100 rounded-xl mt-4"
        >
          Reset All App Data
        </button>
      </section>

      {/* Reset Modal Overlay */}
      {showResetModal > 0 && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-sm w-full p-8 text-center space-y-6 animate-in zoom-in-95 duration-200">
            <AlertTriangle className="mx-auto text-red-500" size={48} />
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Wipe Data?</h3>
              <p className="text-gray-500 text-sm">This deletes all weights, logs, and workout history forever.</p>
            </div>
            <div className="space-y-3">
              <input 
                type="text" 
                placeholder="Type RESET"
                value={resetInput}
                onChange={(e) => setResetInput(e.target.value.toUpperCase())}
                className="w-full p-3 border-2 rounded-xl text-center font-mono font-bold uppercase"
              />
              <div className="flex space-x-3">
                <button onClick={() => setShowResetModal(0)} className="flex-1 py-3 font-bold text-gray-400">Cancel</button>
                <button 
                  disabled={resetInput !== 'RESET'}
                  onClick={async () => { await storage.resetAllData(); onReset(); }}
                  className={`flex-1 py-3 font-bold rounded-xl text-white ${resetInput === 'RESET' ? 'bg-red-600' : 'bg-gray-200'}`}
                >Confirm</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
