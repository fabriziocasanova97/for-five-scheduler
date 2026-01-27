// @ts-nocheck
'use client';

import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { isBoss } from '@/app/utils/roles';
import MasterGrid from '@/app/components/MasterGrid'; 

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- ROW DOT COLORS ---
const ROW_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 
  'bg-orange-500', 'bg-cyan-500', 'bg-rose-500', 'bg-indigo-500'
];

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
  const [visibleStoreIds, setVisibleStoreIds] = useState<string[]>([]);

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
      const allStores = storesData || [];
      setStores(allStores);
      setVisibleStoreIds(allStores.map((s: any) => s.id));

      const weekStart = weekDays[0].isoDate;
      const weekEnd = new Date(weekDays[6].isoDate);
      weekEnd.setDate(weekEnd.getDate() + 1);
      
      const bufferEnd = new Date(weekEnd);
      bufferEnd.setDate(bufferEnd.getDate() + 2);
      const fetchEndStr = getLocalISOString(bufferEnd);

      const { data: rawShifts, error: shiftError } = await supabase
        .from('shifts')
        .select('*') 
        .gte('start_time', weekStart)
        .lt('start_time', fetchEndStr); 

      if (shiftError) console.error("Shift Error:", shiftError);
      
      const shiftsFound = rawShifts || [];

      const userIds = [...new Set(shiftsFound.map(s => s.user_id).filter(id => id))];
      let profilesMap: any = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .in('id', userIds);
          
        profilesData?.forEach(p => {
          profilesMap[p.id] = p;
        });
      }

      const finalShifts = shiftsFound.map(shift => ({
        ...shift,
        profiles: shift.user_id ? profilesMap[shift.user_id] : null
      }));
      
      setShifts(finalShifts);
      setLoading(false);
    };

    fetchData();
  }, [queryDate]);

  const toggleStore = (id: string) => {
    setVisibleStoreIds(prev => 
      prev.includes(id) 
        ? prev.filter(storeId => storeId !== id) 
        : [...prev, id]
    );
  };

  const selectAll = () => setVisibleStoreIds(stores.map((s: any) => s.id));
  const clearAll = () => setVisibleStoreIds([]);

  const filteredStores = stores.filter((s: any) => visibleStoreIds.includes(s.id));

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white text-sm font-bold uppercase tracking-widest">Loading...</div>;
  if (!authorized) return <div className="p-12 text-center text-red-600 font-bold uppercase tracking-widest">🚫 Access Denied</div>;

  return (
    <div className="h-screen overflow-hidden bg-white flex flex-col font-sans text-gray-900">
      
      {/* HEADER SECTION */}
      <div className="bg-white border-b border-gray-200 px-6 py-6 shadow-sm flex-shrink-0 z-50 relative">
        <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-end max-w-[1250px] mx-auto">
          
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

      {/* --- FILTER BAR (ALIGNED) --- */}
      <div className="border-b border-gray-200 bg-gray-50/50 flex-shrink-0 z-40">
        <div className="max-w-[1250px] mx-auto flex h-14">
            
            {/* Left Column (Aligns with Store Name Column: w-40) */}
            <div className="w-40 flex-shrink-0 border-r border-gray-300 flex items-center justify-center gap-3 px-4 bg-gray-100/50">
                <button 
                  onClick={selectAll}
                  className="text-[10px] font-extrabold uppercase tracking-widest text-black hover:text-gray-600 transition-colors"
                >
                  All
                </button>
                <span className="text-gray-300">|</span>
                <button 
                  onClick={clearAll}
                  className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 hover:text-red-600 transition-colors"
                >
                  Clear
                </button>
            </div>

            {/* Right Column (Aligns with Dates: Flex-1) */}
            <div className="flex-1 flex items-center gap-2 px-4 overflow-x-auto scrollbar-hide">
                {stores.map((store: any, index: number) => {
                    const isVisible = visibleStoreIds.includes(store.id);
                    const dotColorClass = ROW_COLORS[index % ROW_COLORS.length];

                    return (
                        <button
                            key={store.id}
                            onClick={() => toggleStore(store.id)}
                            className={`
                                flex items-center gap-2 px-3 py-1.5 rounded-sm border text-[10px] font-bold uppercase tracking-widest transition-all duration-200 flex-shrink-0
                                ${isVisible 
                                    ? 'bg-black border-black text-white shadow-sm' 
                                    : 'bg-white border-gray-300 text-gray-400 hover:border-black hover:text-black'
                                }
                            `}
                        >
                            <div className={`w-1.5 h-1.5 rounded-full ${dotColorClass} ${isVisible ? 'ring-1 ring-white' : ''}`} />
                            <span>{store.name}</span>
                        </button>
                    );
                })}
            </div>
        </div>
      </div>

      {/* RENDER THE GRID */}
      <MasterGrid 
        stores={filteredStores} 
        shifts={shifts} 
        weekDays={weekDays} 
        todayIso={todayIso} 
      />
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