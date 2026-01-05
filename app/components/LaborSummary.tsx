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
        {/* Tiny Header */}
        <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 border-b border-gray-100 pb-1 inline-block">
            Weekly Hours Summary
        </h4>
        
        {/* Clean List */}
        <div className="flex flex-wrap gap-x-8 gap-y-3">
            {summary.map(([name, hours]) => {
                const isOvertime = hours > 40; // CHECK FOR OVERTIME

                return (
                    <div key={name} className="flex items-baseline gap-2 group cursor-default">
                        {/* Name - Red if > 40 */}
                        <span className={`text-sm font-bold uppercase transition-colors ${
                            isOvertime ? 'text-red-600' : 'text-gray-700 group-hover:text-black'
                        }`}>
                            {name}
                        </span>
                        
                        {/* Hours - Red if > 40 */}
                        <span className={`text-sm font-extrabold ${
                            isOvertime ? 'text-red-600' : 'text-black'
                        }`}>
                            {hours.toFixed(1)}
                        </span>
                        
                        <span className={`text-[10px] font-bold tracking-wider ${
                            isOvertime ? 'text-red-400' : 'text-gray-400'
                        }`}>
                            HRS
                        </span>
                    </div>
                );
            })}
        </div>
    </div>
  );
}