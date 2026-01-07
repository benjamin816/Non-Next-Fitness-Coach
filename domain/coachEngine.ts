
import { PACING_START_HOUR, PACING_END_HOUR } from '../constants';

export interface CoachState {
  currentHour: number;
  weightLogged: boolean;
  caloriesEntered: boolean;
  stepsEntered: boolean;
  azmEntered: boolean;
  caloriesEaten: number;
  steps: number;
  azm: number;
  targets: {
    calories: number;
    steps: number;
    azm: number;
  };
}

export function getCoachBarMessage(state: CoachState): string {
  const {
    currentHour,
    weightLogged,
    caloriesEntered,
    stepsEntered,
    azmEntered,
    caloriesEaten,
    steps,
    azm,
    targets
  } = state;

  const nothingLogged = !weightLogged && !caloriesEntered && !stepsEntered && !azmEntered;
  const onlyWeightLogged = weightLogged && !caloriesEntered && !stepsEntered && !azmEntered;

  // 1. Initial State: Nothing logged at all
  if (nothingLogged) {
    return "Please Begin by logging your weight.";
  }

  // 2. Initial State: Only weight logged
  if (onlyWeightLogged) {
    return "Begin logging your day to start!";
  }

  // 3. Morning weight reminder window (6-10 AM) - Priority if weight missing
  if (currentHour >= 6 && currentHour < 10 && !weightLogged) {
    return "Don’t forget to log your weight.";
  }

  const calHit = caloriesEntered && caloriesEaten <= targets.calories;
  const stepsHit = stepsEntered && steps >= targets.steps;
  const azmHit = azmEntered && azm >= targets.azm;

  // 4. Evening weight reminder (After 6 PM, everything else done)
  if (currentHour >= 18 && calHit && stepsHit && azmHit && !weightLogged) {
    return "Everything’s done — log your weight if you want a complete day.";
  }

  // 5. Completion logic and final praise (Top completion state)
  if (caloriesEntered && stepsEntered && azmEntered && weightLogged && calHit && stepsHit && azmHit) {
    return "You nailed today! Great job.";
  }

  // 6. Movement complete guidance
  if (stepsHit && azmHit && caloriesEntered) {
    if (caloriesEaten > targets.calories) {
      return "Movement complete. Now keep calories under target tomorrow.";
    } else {
      return "Movement complete. Nice work keeping calories under target.";
    }
  }

  // 7. Threshold-based warnings (Calories 75%)
  if (caloriesEntered && caloriesEaten >= 0.75 * targets.calories && caloriesEaten < targets.calories) {
    return "Careful—you're at 75% of your calorie target.";
  }

  // 8. Close steps/azm encouragement (0.75 - 1.0 range)
  if (stepsEntered && steps >= 0.75 * targets.steps && steps < targets.steps) {
    return "You’re close—keep it up!";
  }
  if (azmEntered && azm >= 0.75 * targets.azm && azm < targets.azm) {
    return "You’re close—keep it up!";
  }

  // 9. Completion callouts for partial movement
  if (stepsHit) {
    if (azmEntered && azm < targets.azm) return "Yay! Steps complete. Now just work on AZM.";
    if (!azmEntered) return "Yay! Steps complete. Now just log AZM.";
  }
  if (azmHit) {
    if (stepsEntered && steps < targets.steps) return "Yay! AZM complete. Now just work on steps.";
    if (!stepsEntered) return "Yay! AZM complete. Now just log steps.";
  }

  // 10. Next-best-action priority (Guided completion)
  if (!caloriesEntered) return "Log your calories.";
  if (!stepsEntered) return "Log your steps.";
  if (!azmEntered) return "Log your AZM.";
  if (!weightLogged) return "Log your weight.";

  // 11. Pacing Summary (Fallback guidance)
  const dayFrac = Math.min(Math.max((currentHour - PACING_START_HOUR) / (PACING_END_HOUR - PACING_START_HOUR), 0), 1);
  
  const getPacing = (val: number, target: number) => {
    const frac = val / target;
    if (frac > dayFrac + 0.15) return "ahead";
    if (frac < dayFrac - 0.15) return "behind";
    return "on";
  };

  const cPace = getPacing(caloriesEaten, targets.calories);
  const sPace = getPacing(steps, targets.steps);
  const aPace = getPacing(azm, targets.azm);

  return `Cals ${cPace}, steps ${sPace}, AZM ${aPace} pace.`;
}
