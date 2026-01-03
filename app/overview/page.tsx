// @ts-nocheck
export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
// IMPORT THE SECURITY CHECK
import { isBoss } from '@/app/utils/roles';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const queryDate = resolvedSearchParams.date;

  // --- 0. SECURITY CHECK (NEW) ---
  const { data: { user } } = await supabase.auth.getUser();
  const amIBoss = isBoss(user?.email);

  if (!amIBoss) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-red-600 font-bold p-4 text-center">
        🚫 Access Denied: This report is for managers only.
      </div>
    );
  }
  
  // --- 1. DATE MATH (Find the week) ---
  const anchorDate = queryDate ? new Date(queryDate + 'T12:00:00') : new Date();
  const dayOfWeek = anchorDate.getDay();
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
  const currentMonday = new Date(anchorDate);
  currentMonday.setDate(anchorDate.getDate() + diffToMonday);
  currentMonday.setHours(0, 0, 0, 0);

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(currentMonday);
    d.setDate(currentMonday.getDate() + i);
    return {
      isoDate: d.toISOString().split('T')[0],
      label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
      shortName: d.toLocaleDateString('en-US', { weekday: 'short' })
    };
  });

  const nextWeek = new Date(currentMonday);
  nextWeek.setDate(currentMonday.getDate() + 7);
  const nextDateStr = nextWeek.toISOString().split('T')[0];

  const prevWeek = new Date(currentMonday);
  prevWeek.setDate(currentMonday.getDate() - 7);
  const prevDateStr = prevWeek.toISOString().split('T')[0];

  // --- 2. FETCH DATA ---
  const { data: stores } = await supabase.from('stores').select('*').order('name');
  
  // Fetch shifts for the entire week across ALL stores
  const weekStart = weekDays[0].isoDate;
  const weekEnd = new Date(weekDays[6].isoDate);
  weekEnd.setDate(weekEnd.getDate() + 1);
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  const { data: allShifts } = await supabase
    .from('shifts')
    .select('*, profiles(full_name, role)')
    .gte('start_time', weekStart)
    .lt('start_time', weekEndStr);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weekly Master Schedule</h1>
          <p className="text-gray-500">Overview across all locations</p>
        </div>
        
        <div className="flex gap-4">
          {/* Back Button */}
          <Link 
            href="/" 
            className="px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-100 text-black font-medium transition"
          >
            ← Back to Stores
          </Link>
          
          {/* Week Selector */}
          <div className="flex bg-white border border-gray-300 rounded-lg overflow-hidden text-black shadow-sm">
            <Link 
              href={`/overview?date=${prevDateStr}`} 
              className="px-3 py-2 hover:bg-gray-100 border-r border-gray-200 text-gray-700"
            >
              ←
            </Link>
            <span className="px-4 py-2 font-bold text-sm flex items-center text-gray-900">
              Week of {weekDays[0].isoDate}
            </span>
            <Link 
              href={`/overview?date=${nextDateStr}`} 
              className="px-3 py-2 hover:bg-gray-100 border-l border-gray-200 text-gray-700"
            >
              →
            </Link>
          </div>
        </div>
      </div>

      {/* MASTER GRID CONTAINER */}
      <div className="overflow-x-auto border rounded-lg shadow bg-white">
        <table className="w-full text-left border-collapse min-w-[1200px]">
          <thead>
            <tr>
              <th className="p-4 border-b border-r bg-gray-100 sticky left-0 z-10 w-48 text-sm font-bold text-gray-700">
                Store Location
              </th>
              {weekDays.map(day => (
                <th key={day.isoDate} className="p-2 border-b border-r bg-gray-50 text-center min-w-[140px]">
                  <div className="text-xs font-bold text-gray-500 uppercase">{day.shortName}</div>
                  <div className="text-xs text-gray-400">{day.isoDate.slice(5)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stores?.map(store => (
              <tr key={store.id} className="hover:bg-gray-50 group">
                {/* Store Name Column */}
                <td className="p-4 border-b border-r font-bold text-gray-800 bg-white sticky left-0 z-10 group-hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    {/* Color dot if you have colors, or just a default */}
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <Link href={`/store/${store.id}`} className="hover:underline text-sm">
                      {store.name}
                    </Link>
                  </div>
                </td>

                {/* Days Columns */}
                {weekDays.map(day => {
                  const shifts = allShifts?.filter(s => 
                    s.store_id === store.id && 
                    s.start_time.startsWith(day.isoDate)
                  );

                  // Sort by start time so Openers are at the top
                  shifts?.sort((a, b) => a.start_time.localeCompare(b.start_time));

                  return (
                    <td key={day.isoDate} className="p-1 border-b border-r align-top h-32 relative">
                      <div className="flex flex-col gap-1 h-full">
                        {shifts?.length === 0 && (
                           <div className="flex-1 flex items-center justify-center">
                             <span className="text-gray-300 text-xs">-</span>
                           </div>
                        )}
                        
                        {shifts?.map(shift => {
                          const isManager = shift.profiles?.role?.trim() === 'Manager';
                          
                          // Format Time: "6a - 2p"
                          const start = new Date(shift.start_time).toLocaleTimeString([], {hour: 'numeric', hour12: true}).replace(':00', '').toLowerCase();
                          const end = new Date(shift.end_time).toLocaleTimeString([], {hour: 'numeric', hour12: true}).replace(':00', '').toLowerCase();
                          
                          return (
                            <div 
                              key={shift.id} 
                              className={`text-[10px] p-1.5 rounded border mb-1 flex justify-between items-center ${
                                isManager 
                                  ? 'bg-purple-100 border-purple-300 text-purple-900 font-bold' 
                                  : 'bg-white border-gray-200 text-gray-600'
                              }`}
                            >
                              <div className="truncate font-bold max-w-[60px]">
                                {isManager && <span className="mr-1 text-purple-600">★</span>}
                                {shift.profiles?.full_name.split(' ')[0]}
                              </div>
                              <div className="text-[9px] opacity-75 whitespace-nowrap ml-1">
                                {start}-{end}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}