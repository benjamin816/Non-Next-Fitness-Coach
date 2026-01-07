
import React from 'react';
import { Sparkles, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { getCoachBarMessage, CoachState } from '../domain/coachEngine';

interface CoachBarProps {
  state: CoachState;
}

const CoachBar: React.FC<CoachBarProps> = ({ state }) => {
  const message = getCoachBarMessage(state);
  
  // Decide color/icon based on message content for visual variety
  const isPraise = message.includes("nailed") || message.includes("Great job");
  const isWarning = message.includes("Careful") || message.includes("behind");
  const isAction = message.includes("Log your") || message.includes("Don’t forget");
  const isSuccess = message.includes("complete") || message.includes("Yay");

  let bgColor = "bg-blue-50 border-blue-200 text-blue-800";
  let Icon = Info;

  if (isPraise) {
    bgColor = "bg-green-50 border-green-200 text-green-800";
    Icon = CheckCircle2;
  } else if (isWarning) {
    bgColor = "bg-orange-50 border-orange-200 text-orange-800";
    Icon = AlertCircle;
  } else if (isSuccess) {
    bgColor = "bg-green-50 border-green-200 text-green-800";
    Icon = Sparkles;
  } else if (isAction) {
    bgColor = "bg-blue-50 border-blue-200 text-blue-800";
    Icon = Info;
  }

  return (
    <div className={`p-4 rounded-xl border flex items-center space-x-3 transition-all duration-300 shadow-sm ${bgColor}`}>
      <Icon className="flex-shrink-0" size={20} />
      <p className="font-semibold text-sm md:text-base leading-tight">
        {message}
      </p>
    </div>
  );
};

export default CoachBar;
