// @ts-nocheck
'use client';

import { useMemo } from 'react';

interface LaborSummaryProps {
  shifts: any[];
  amIBoss: boolean;
}

export default function LaborSummary({ shifts, amIBoss }: LaborSummaryProps) {
  
  // Calculate total hours per person
  const summary = useMemo(() => {
    const stats: Record<string, number> = {};
    
    shifts.forEach(shift => {
        const name = shift.profiles?.full_name || 'Unassigned';
        const start = new Date(shift.start_time);
        const end = new Date(shift.end_time);
        
        const durationMs = end.getTime() - start.getTime();
        const hours = durationMs / (1000 * 60 * 60);
        
        stats[name] = (stats[name] || 0) + hours;
    });

    return Object.entries(stats).sort((a, b) => a[0].localeCompare(b[0]));
  }, [shifts]);

  if (!amIBoss || summary.length === 0) return null;

  return (
    <div className="w-full mt-4 mb-8">
        {/* Header - Full Width Line */}
        <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 border-b border-gray-200 pb-1 block w-full">
            Weekly Hours Summary
        </h4>
        
        {/* Clean List */}
        <div className="flex flex-wrap gap-x-8 gap-y-3">
            {summary.map(([name, hours]) => {
                const isOvertime = hours > 40; 

                return (
                    <div key={name} className="flex items-center gap-2 group cursor-default">
                        {/* Name - Standard Color */}
                        <div className="flex items-center gap-1">
                            <span className="text-sm font-bold uppercase text-gray-700 group-hover:text-black transition-colors">
                                {name}
                            </span>
                            
                            {/* Alert Icon (Only if Overtime) */}
                            {isOvertime && (
                                <span title="Over 40 Hours" className="text-amber-500">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                                  </svg>
                                </span>
                            )}
                        </div>
                        
                        {/* Hours */}
                        <div className="flex items-baseline gap-0.5">
                            <span className="text-sm font-extrabold text-black">
                                {hours.toFixed(1)}
                            </span>
                            
                            <span className="text-[10px] font-bold tracking-wider text-gray-400">
                                HRS
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
  );
}