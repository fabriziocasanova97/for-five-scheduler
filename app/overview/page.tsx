// @ts-nocheck
'use client';

import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { isBoss } from '@/app/utils/roles';

// --- ROW DOT COLORS (Just for the Store Name column) ---
const ROW_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 
  'bg-orange-500', 'bg-cyan-500', 'bg-rose-500', 'bg-indigo-500'
];

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function OverviewContent() {
  const searchParams = useSearchParams();
  const queryDate = searchParams.get('date');

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [stores, setStores] = useState([]);
  const [shifts, setShifts] = useState([]);
  
  // --- DATE MATH ---
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

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const amIBoss = isBoss(user?.email);

      if (!amIBoss) {
        setAuthorized(false);
        setLoading(false);
        return;
      }
      setAuthorized(true);

      const { data: storesData } = await supabase.from('stores').select('*').order('name');
      setStores(storesData || []);

      const weekStart = weekDays[0].isoDate;
      const weekEnd = new Date(weekDays[6].isoDate);
      weekEnd.setDate(weekEnd.getDate() + 1);
      const weekEndStr = weekEnd.toISOString().split('T')[0];

      const { data: shiftsData } = await supabase
        .from('shifts')
        .select('*, profiles(full_name, role)')
        .gte('start_time', weekStart)
        .lt('start_time', weekEndStr);
      
      setShifts(shiftsData || []);
      setLoading(false);
    };

    fetchData();
  }, [queryDate]);

  // --- HELPER: GET COLOR BASED ON TIME ---
  const getShiftStyle = (shift) => {
    const isManager = ['Manager', 'Operations'].includes(shift.profiles?.role?.trim());
    
    // 1. MANAGER (Purple + Star) - Overrides everything
    if (isManager) {
      return 'bg-purple-100 border-purple-300 text-purple-900 font-bold';
    }

    // 2. TIME BASED LOGIC
    const dateObj = new Date(shift.start_time);
    const hour = dateObj.getHours(); // 0 to 23
    const minutes = dateObj.getMinutes();
    const decimalTime = hour + (minutes / 60);

    // Opening (Before 7:00 AM) -> Green
    if (decimalTime < 7) {
      return 'bg-emerald-50 border-emerald-200 text-emerald-900';
    }
    // Mid (7:00 AM to 9:59 AM) -> Blue
    else if (decimalTime < 10) {
      return 'bg-blue-50 border-blue-200 text-blue-900';
    }
    // Closing (10:00 AM or later) -> Orange
    else {
      return 'bg-orange-50 border-orange-200 text-orange-900';
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading Master Schedule...</div>;
  if (!authorized) return <div className="p-4 text-center text-red-600 font-bold">🚫 Access Denied</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* HEADER - CLEAN & MINIMAL */}
      <div className="bg-white border-b px-4 py-4 sticky left-0 right-0 top-0 z-30">
        <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-end">
          
          {/* Top Left: Back Link + Title */}
          <div className="flex flex-col gap-1">
            <Link href="/" className="text-xs font-bold text-gray-500 hover:text-black mb-1 inline-flex items-center gap-1 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
              Back to All Stores
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">Master Schedule</h1>
            <p className="text-sm text-gray-500">Overview across all locations</p>
          </div>
          
          {/* Bottom Right: Week Controls (Minimal Arrows) */}
          <div className="flex items-center gap-4 w-full md:w-auto mt-2 md:mt-0">
            <Link 
              href={`/overview?date=${prevDateStr}`} 
              className="p-2 rounded-full hover:bg-gray-100 text-gray-800 transition-colors"
              aria-label="Previous Week"
            >
              {/* Bold Chevron Left */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </Link>

            <span className="font-bold text-sm text-gray-900 whitespace-nowrap">
              Week of {weekDays[0].isoDate.slice(5)}
            </span>

            <Link 
              href={`/overview?date=${nextDateStr}`} 
              className="p-2 rounded-full hover:bg-gray-100 text-gray-800 transition-colors"
              aria-label="Next Week"
            >
              {/* Bold Chevron Right */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          </div>

        </div>
      </div>

      {/* MASTER GRID */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="bg-white border rounded-lg shadow min-w-[1000px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="p-4 border-b border-r bg-gray-100 sticky left-0 z-20 w-48 text-sm font-bold text-gray-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Store Location</th>
                {weekDays.map(day => (
                  <th key={day.isoDate} className="p-2 border-b border-r bg-gray-50 text-center min-w-[130px]">
                    <div className="text-xs font-bold text-gray-500 uppercase">{day.shortName}</div>
                    <div className="text-xs text-gray-400">{day.isoDate.slice(5)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stores.map((store, index) => {
                const rowDotColor = ROW_COLORS[index % ROW_COLORS.length];

                return (
                  <tr key={store.id} className="hover:bg-gray-50 group">
                    {/* Sticky Store Name */}
                    <td className="p-4 border-b border-r font-bold text-gray-800 bg-white sticky left-0 z-20 group-hover:bg-gray-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${rowDotColor}`}></div>
                        <Link href={`/store/${store.id}`} className="hover:underline text-sm truncate block max-w-[140px]">
                          {store.name}
                        </Link>
                      </div>
                    </td>

                    {/* Shifts */}
                    {weekDays.map(day => {
                      const dayShifts = shifts.filter(s => s.store_id === store.id && s.start_time.startsWith(day.isoDate));
                      dayShifts.sort((a, b) => a.start_time.localeCompare(b.start_time));

                      return (
                        <td key={day.isoDate} className="p-1 border-b border-r align-top h-24 min-h-[100px]">
                          <div className="flex flex-col gap-1 h-full">
                            {dayShifts.length === 0 && <div className="flex-1 flex items-center justify-center"><span className="text-gray-200 text-lg">·</span></div>}
                            
                            {dayShifts.map(shift => {
                              const isManager = ['Manager', 'Operations'].includes(shift.profiles?.role?.trim());
                              const start = new Date(shift.start_time).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit', hour12: true}).toLowerCase();
                              const end = new Date(shift.end_time).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit', hour12: true}).toLowerCase();
                              
                              const cardStyle = getShiftStyle(shift);

                              return (
                                <div 
                                  key={shift.id} 
                                  className={`text-[10px] p-1.5 rounded border mb-1 flex flex-col ${cardStyle} shadow-sm`}
                                >
                                  <div className="font-bold truncate w-full">
                                    {isManager && <span className="mr-1 text-purple-600">★</span>}
                                    {shift.profiles?.full_name?.split(' ')[0]}
                                  </div>
                                  <div className="text-[9px] opacity-75">{start} - {end}</div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OverviewContent />
    </Suspense>
  );
}