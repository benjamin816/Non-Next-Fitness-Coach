
import React, { useState } from 'react';
// Corrected import path for useStorage
import { useStorage } from '../components/StorageProvider';
import { UserProfile, GoalSettings, Sex, ActivityStyle, GoalMode } from '../types';
import { DEFAULT_TIMEZONE } from '../constants';
import { feetInchesToCm } from '../domain/calculators';
import { z } from 'https://esm.sh/zod@^3.24.2';

const profileSchema = z.object({
  age: z.number().min(16, "This app is for ages 16+."),
  weight: z.number().min(100, "Please enter a weight between 100 and 250 lb.").max(250, "Please enter a weight between 100 and 250 lb.")
});

interface OnboardingPageProps {
  onComplete: (profile: UserProfile) => void;
}

const OnboardingPage: React.FC<OnboardingPageProps> = ({ onComplete }) => {
  const storage = useStorage();
  const [step, setStep] = useState(1);
  const [sex, setSex] = useState<Sex>('male');
  const [age, setAge] = useState(25); // Default updated to 25
  const [heightFt, setHeightFt] = useState(5);
  const [heightIn, setHeightIn] = useState(9);
  const [weight, setWeight] = useState(165); // Default updated to 165
  const [mode, setMode] = useState<GoalMode>('fat-loss');
  const [rate, setRate] = useState(1.0);
  const [activity, setActivity] = useState<ActivityStyle>('standard');
  const [targetWeight, setTargetWeight] = useState<number | undefined>(undefined);
  const [targetWeightCustomized, setTargetWeightCustomized] = useState(false);
  const [maintWeeks, setMaintWeeks] = useState(12);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep = () => {
    setErrors({});
    if (step === 1) {
      const result = profileSchema.pick({ age: true }).safeParse({ age });
      if (!result.success) {
        setErrors(result.error.flatten().fieldErrors as any);
        return false;
      }
    }
    if (step === 2) {
      const result = profileSchema.pick({ weight: true }).safeParse({ weight });
      if (!result.success) {
        setErrors(result.error.flatten().fieldErrors as any);
        return false;
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep()) {
      if (step === 2) {
        if (!targetWeightCustomized) {
          if (mode === 'fat-loss') setTargetWeight(weight - 15);
          else if (mode === 'muscle-gain') setTargetWeight(weight + 15);
        }
      }
      setStep(step + 1);
    }
  };

  const handleFinish = async () => {
    const heightCm = feetInchesToCm(heightFt, heightIn);
    const todayISO = new Date().toISOString().split('T')[0];
    
    const profile: UserProfile = {
      id: 'me',
      sex,
      ageYears: age,
      heightCm,
      startingWeightLb: weight,
      timezone: DEFAULT_TIMEZONE,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    const goals: GoalSettings = {
      id: 'current',
      mode,
      goalRate: rate,
      activityStyle: activity,
      targetWeightLb: mode === 'maintenance' ? undefined : (targetWeight || (mode === 'fat-loss' ? weight - 15 : weight + 15)),
      targetWeightCustomized,
      targetPhaseWeeks: mode === 'maintenance' ? maintWeeks : undefined,
      startDateISO: todayISO,
      updatedAt: Date.now()
    };

    await storage.setUserProfile(profile);
    await storage.setGoalSettings(goals);
    await storage.getAdaptiveModel(); 
    onComplete(profile);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border">
        <h1 className="text-3xl font-bold text-blue-600 mb-2">Welcome!</h1>
        <p className="text-gray-500 mb-8">Let's set up your profile to calculate your targets.</p>

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sex</label>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setSex('male')}
                  className={`py-3 px-4 rounded-xl border font-medium ${sex === 'male' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
                >Male</button>
                <button 
                  onClick={() => setSex('female')}
                  className={`py-3 px-4 rounded-xl border font-medium ${sex === 'female' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
                >Female</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Age (Years)</label>
              <input type="number" value={age} onChange={(e) => setAge(parseInt(e.target.value) || 0)} className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none ${errors.age ? 'border-red-500' : ''}`} />
              {errors.age && <p className="text-red-500 text-xs mt-1">{errors.age}</p>}
            </div>
            <button onClick={handleNextStep} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition">Next</button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Height</label>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <input 
                    type="number" 
                    value={heightFt} 
                    onChange={(e) => setHeightFt(parseInt(e.target.value) || 0)} 
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none pr-10" 
                  />
                  <span className="absolute right-3 top-3.5 text-gray-400 text-sm">ft</span>
                </div>
                <div className="relative">
                  <input 
                    type="number" 
                    value={heightIn} 
                    onChange={(e) => setHeightIn(parseInt(e.target.value) || 0)} 
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none pr-10" 
                  />
                  <span className="absolute right-3 top-3.5 text-gray-400 text-sm">in</span>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Weight (lb)</label>
              <input type="number" value={weight} onChange={(e) => setWeight(parseInt(e.target.value) || 0)} className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none ${errors.weight ? 'border-red-500' : ''}`} />
              {errors.weight && <p className="text-red-500 text-xs mt-1">{errors.weight}</p>}
            </div>
            <div className="flex space-x-3">
              <button onClick={() => setStep(1)} className="w-1/3 py-4 bg-gray-100 text-gray-700 rounded-xl font-bold">Back</button>
              <button onClick={handleNextStep} className="w-2/3 py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition">Next</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Goal Mode</label>
              <select value={mode} onChange={(e) => {
                const newMode = e.target.value as GoalMode;
                setMode(newMode);
                if (!targetWeightCustomized) {
                  if (newMode === 'fat-loss') setTargetWeight(weight - 15);
                  else if (newMode === 'muscle-gain') setTargetWeight(weight + 15);
                  else setTargetWeight(undefined);
                }
              }} className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="fat-loss">Fat Loss</option>
                <option value="maintenance">Maintenance</option>
                <option value="muscle-gain">Muscle Gain</option>
              </select>
            </div>

            {mode === 'maintenance' ? (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-xl text-blue-800 text-sm text-center">
                  Goal: Maintain within ±5 lb of current weight.
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cycle Duration (Weeks)</label>
                  <input type="number" value={maintWeeks} onChange={(e) => setMaintWeeks(parseInt(e.target.value) || 0)} className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Target Weight (lb)</label>
                  <input 
                    type="number" 
                    value={targetWeight || ''} 
                    onChange={(e) => {
                      setTargetWeight(parseInt(e.target.value) || 0);
                      setTargetWeightCustomized(true);
                    }} 
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                  {!targetWeightCustomized && <p className="text-[10px] text-blue-500 mt-1">Default suggested based on mode.</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rate of Change (lb/week)</label>
                  <input type="number" step="0.25" value={rate} onChange={(e) => setRate(parseFloat(e.target.value) || 0)} className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </>
            )}

             <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Activity Style</label>
              <select value={activity} onChange={(e) => setActivity(e.target.value as ActivityStyle)} className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="low-cardio">Low-cardio (8k steps)</option>
                <option value="standard">Standard (9k steps)</option>
                <option value="high-activity">High-activity (10k steps)</option>
              </select>
            </div>
            <div className="flex space-x-3">
              <button onClick={() => setStep(2)} className="w-1/3 py-4 bg-gray-100 text-gray-700 rounded-xl font-bold">Back</button>
              <button onClick={handleFinish} className="w-2/3 py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition">Get Started</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingPage;
