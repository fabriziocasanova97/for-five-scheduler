// @ts-nocheck
'use client';

export default function LaborSummary({ shifts, amIBoss = false }) {
  
  // 1. SECURITY CHECK: Only Bosses see this list
  if (!amIBoss) return null;

  // 2. Calculate Hours Per Person
  const staffHours = {};

  shifts.forEach(shift => {
    const name = shift.profiles?.full_name || 'Unknown';
    const start = new Date(shift.start_time);
    const end = new Date(shift.end_time);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    if (!staffHours[name]) {
      staffHours[name] = 0;
    }
    staffHours[name] += hours;
  });

  // Sort them: People with the most hours go to the top
  const report = Object.entries(staffHours).sort((a: any, b: any) => b[1] - a[1]);

  return (
    <div className="bg-white p-4 rounded-lg border shadow-sm w-full max-w-sm">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide border-b pb-2 mb-2">
        Weekly Hours Summary
      </h3>
      
      <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-2">
        {report.map(([name, hours]: any) => (
          <div key={name} className="flex justify-between items-center text-sm">
            <span className="text-gray-700 font-medium">{name}</span>
            <span className="text-gray-900 font-bold bg-gray-100 px-2 py-0.5 rounded text-xs">
              {hours.toFixed(1)} hrs
            </span>
          </div>
        ))}

        {report.length === 0 && (
          <p className="text-gray-400 text-xs italic">No shifts scheduled yet.</p>
        )}
      </div>
    </div>
  );
}