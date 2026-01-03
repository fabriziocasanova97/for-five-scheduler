// @ts-nocheck
'use client';

// notice we added 'amIBoss' here vvv
export default function LaborSummary({ shifts, amIBoss = false }) {
  
  // 1. SECURITY CHECK: If I don't have the "Boss Badge", hide myself.
  if (!amIBoss) return null;

  // 2. Calculate Totals
  const totalHours = shifts.reduce((sum, shift) => {
    const start = new Date(shift.start_time);
    const end = new Date(shift.end_time);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return sum + hours;
  }, 0);

  // Example Rate: $15/hr
  const estimatedCost = totalHours * 15;

  return (
    <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-col gap-1 min-w-[200px]">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
        Est. Labor Cost
      </h3>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-900">
          ${estimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span className="text-sm text-gray-500 font-medium">
          ({totalHours.toFixed(1)} hrs)
        </span>
      </div>
      <p className="text-[10px] text-gray-400 mt-1">
        Based on $15/hr avg
      </p>
    </div>
  );
}