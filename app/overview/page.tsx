// @ts-nocheck
'use client';

import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { isBoss } from '@/app/utils/roles';

// --- ROW DOT COLORS ---
const ROW_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 
  'bg-orange-500', 'bg-cyan-500', 'bg-rose-500', 'bg-indigo-500'
];

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- HELPER: FORCE LOCAL DATE STRING (YYYY-MM-DD) ---
const getLocalISOString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

  const todayIso = getLocalISOString(new Date());

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(currentMonday);
    d.setDate(currentMonday.getDate() + i);
    return {
      isoDate: getLocalISOString(d),
      label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
      shortName: d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
    };
  });

  const nextWeek = new Date(currentMonday);
  nextWeek.setDate(currentMonday.getDate() + 7);
  const nextDateStr = getLocalISOString(nextWeek);

  const prevWeek = new Date(currentMonday);
  prevWeek.setDate(currentMonday.getDate() - 7);
  const prevDateStr = getLocalISOString(prevWeek);

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
      
      // FIX: Add 2 extra buffer days to the fetch query.
      // This ensures we catch Sunday night shifts that exist in UTC 'Monday morning'.
      const bufferEnd = new Date(weekEnd);
      bufferEnd.setDate(bufferEnd.getDate() + 2);
      const fetchEndStr = getLocalISOString(bufferEnd);

      // --- BULLETPROOF FETCH ---
      const { data: rawShifts, error: shiftError } = await supabase
        .from('shifts')
        .select('*') 
        .gte('start_time', weekStart)
        .lt('start_time', fetchEndStr); // Using the buffered end date

      if (shiftError) console.error("Shift Error:", shiftError);
      
      const shiftsFound = rawShifts || [];

      // 2. Fetch Profiles separately
      const userIds = [...new Set(shiftsFound.map(s => s.user_id).filter(id => id))];
      let profilesMap = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .in('id', userIds);
          
        profilesData?.forEach(p => {
          profilesMap[p.id] = p;
        });
      }

      // 3. Combine
      const finalShifts = shiftsFound.map(shift => ({
        ...shift,
        profiles: shift.user_id ? profilesMap[shift.user_id] : null
      }));
      
      setShifts(finalShifts);
      setLoading(false);
    };

    fetchData();
  }, [queryDate]);

  // --- COLOR LOGIC ---
  const getShiftStyle = (shift) => {
    if (!shift.user_id) {
       // CHANGED: Red -> Navy Blue
       return 'bg-blue-50 border-2 border-dashed border-blue-400 text-blue-900';
    }

    const role = shift.profiles?.role?.trim();
    const isManager = role === 'Manager' || role === 'Operations';

    if (isManager) return 'bg-white border-2 border-purple-600 text-gray-900';

    const dateObj = new Date(shift.start_time);
    const hour = dateObj.getHours(); 

    if (hour < 7) return 'bg-white border-2 border-emerald-500 text-gray-900'; 
    if (hour < 10) return 'bg-white border-2 border-blue-500 text-gray-900'; 
    return 'bg-white border-2 border-orange-500 text-gray-900'; 
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white text-sm font-bold uppercase tracking-widest">Loading...</div>;
  if (!authorized) return <div className="p-12 text-center text-red-600 font-bold uppercase tracking-widest">🚫 Access Denied</div>;

  return (
    <div className="h-screen overflow-hidden bg-white flex flex-col font-sans text-gray-900">
      
      {/* HEADER SECTION */}
      <div className="bg-white border-b border-gray-200 px-6 py-6 shadow-sm flex-shrink-0 z-50 relative">
        <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-end max-w-[1800px] mx-auto">
          
          <div className="flex flex-col gap-1">
            <Link href="/" className="text-xs font-bold text-gray-400 hover:text-black uppercase tracking-widest mb-2 transition-colors">
              ← Back to Locations
            </Link>
            <h1 className="text-3xl font-extrabold text-black uppercase tracking-widest">Master View</h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">All Locations Overview</p>
          </div>
          
          <div className="flex items-center gap-6">
            <Link href={`/overview?date=${prevDateStr}`} className="p-2 group">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-400 group-hover:text-black transition-colors">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </Link>

            <span className="text-xs font-bold uppercase tracking-widest text-gray-500 whitespace-nowrap">
              Week of {weekDays[0].isoDate.slice(5)}
            </span>

            <Link href={`/overview?date=${nextDateStr}`} className="p-2 group">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-400 group-hover:text-black transition-colors">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          </div>

        </div>
      </div>

      {/* MASTER GRID */}
      <div className="flex-1 overflow-auto bg-white relative">
        <div className="max-w-[1800px] mx-auto mt-4"> 
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="p-4 border-b border-t border-r border-l border-gray-200 bg-white sticky left-0 top-0 z-50 w-40 text-xs font-extrabold text-black uppercase tracking-widest shadow-[4px_4px_10px_-4px_rgba(0,0,0,0.1)]">
                  Store Location
                </th>
                
                {weekDays.map((day) => {
                   const isToday = day.isoDate === todayIso;
                   return (
                    <th key={day.isoDate} className={`p-3 border-b border-t border-r border-gray-200 text-center min-w-[140px] sticky top-0 z-40 ${isToday ? 'bg-blue-600 text-white' : 'bg-black text-white'}`}>
                      <div className={`text-xs font-extrabold tracking-widest uppercase mb-1 ${isToday ? 'text-blue-100' : 'text-gray-400'}`}>
                        {day.shortName}
                      </div>
                      <div className="text-sm font-bold">
                        {day.isoDate.slice(5)}
                      </div>
                    </th>
                   );
                })}
              </tr>
            </thead>
            <tbody>
              {stores.map((store, index) => {
                const rowDotColor = ROW_COLORS[index % ROW_COLORS.length];

                return (
                  <tr key={store.id} className="group transition-colors hover:bg-gray-50">
                    <td className="p-4 border-b border-r border-l border-gray-200 bg-white sticky left-0 z-20 group-hover:bg-gray-50 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${rowDotColor} flex-shrink-0`}></div>
                        <Link href={`/store/${store.id}`} className="font-bold text-sm text-gray-900 uppercase tracking-wide hover:text-black hover:underline truncate">
                          {store.name}
                        </Link>
                      </div>
                    </td>

                    {weekDays.map(day => {
                      // --- FILTER LOGIC ---
                      const dayShifts = shifts.filter(s => {
                         const shiftDate = new Date(s.start_time);
                         const shiftIso = getLocalISOString(shiftDate);
                         return s.store_id === store.id && shiftIso === day.isoDate;
                      });
                      
                      dayShifts.sort((a, b) => a.start_time.localeCompare(b.start_time));
                      const isToday = day.isoDate === todayIso;

                      return (
                        <td key={day.isoDate} className={`p-2 border-b border-r border-gray-200 align-top min-h-[120px] transition-colors ${isToday ? 'bg-blue-50/30' : ''}`}>
                          <div className="flex flex-col gap-2 h-full">
                            {dayShifts.length === 0 ? (
                               <div className="flex-1 flex items-center justify-center">
                                 <span className="text-gray-200 text-xl font-light">·</span>
                               </div>
                            ) : (
                              dayShifts.map(shift => {
                                const role = shift.profiles?.role?.trim();
                                const isManager = role === 'Manager' || role === 'Operations';
                                const start = new Date(shift.start_time).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'});
                                const end = new Date(shift.end_time).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'});
                                
                                const isOpenShift = !shift.user_id;
                                const cardStyle = getShiftStyle(shift);

                                return (
                                  <Link 
                                    key={shift.id} 
                                    href={`/store/${store.id}`} 
                                    className={`text-xs p-2 rounded flex flex-col hover:brightness-95 transition-all cursor-pointer ${cardStyle}`}
                                  >
                                    <div className="font-bold uppercase tracking-wide truncate w-full flex items-center gap-1">
                                      {isOpenShift ? (
                                        // CHANGED: Red -> Navy Blue
                                        <span className="text-blue-700 font-extrabold tracking-widest text-[10px]">
                                          ● OPEN
                                        </span>
                                      ) : (
                                        <>
                                          {isManager && (
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-purple-600 flex-shrink-0">
                                              <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                                            </svg>
                                          )}
                                          {shift.profiles?.full_name?.split(' ')[0]}
                                        </>
                                      )}
                                    </div>

                                    <div className="text-[10px] font-medium opacity-80 mt-0.5 tracking-tight">
                                      {start} - {end}
                                    </div>

                                    {shift?.note && (
                                       // CHANGED: Red -> Navy Blue
                                       <div className={`mt-1 text-[9px] font-semibold italic border-t pt-0.5 leading-tight break-words ${isOpenShift ? 'text-blue-800 border-blue-200' : 'text-gray-500 border-gray-200/50'}`}>
                                         {shift.note}
                                       </div>
                                    )}

                                  </Link>
                                );
                              })
                            )}
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