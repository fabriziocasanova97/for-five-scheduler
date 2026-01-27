// @ts-nocheck
'use client';

import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';
import { isBoss } from '@/app/utils/roles';

// 👇 NEW: Import the dedicated component
import LoginScreen from '@/app/components/LoginScreen'; 

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const getStoreImage = (storeName: string) => {
  if (!storeName) return '';
  const cleanName = storeName.toLowerCase().replace('for five coffee ', '').trim().replace(/\s+/g, '-'); 
  return `/stores/${cleanName}.jpg`;
};

// --- SHIFT VISIBILITY LOGIC ---
const isShiftVisible = (shiftIsoDate: string, amIBoss: boolean) => {
  if (amIBoss) return true; 

  const shiftDate = new Date(shiftIsoDate);
  const now = new Date();
  const currentDay = now.getDay(); 
  const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - distanceToMonday);
  thisMonday.setHours(0, 0, 0, 0);

  const nextMonday = new Date(thisMonday);
  nextMonday.setDate(thisMonday.getDate() + 7);

  if (shiftDate < nextMonday) return true;

  const thisSundayCutoff = new Date(nextMonday);
  thisSundayCutoff.setDate(nextMonday.getDate() - 1); 
  thisSundayCutoff.setHours(16, 0, 0, 0); 

  return now >= thisSundayCutoff;
};

// --- COMPONENT: DASHBOARD CONTENT ---
function DashboardContent({ sessionKey }: { sessionKey: number }) {
  const [stores, setStores] = useState([]);
  const [myShifts, setMyShifts] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [amIBoss, setAmIBoss] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const bossStatus = isBoss(user?.email);
      setAmIBoss(bossStatus);

      // 1. FETCH UPCOMING SHIFTS
      const now = new Date().toISOString();
      const { data: shiftsData } = await supabase
        .from('shifts')
        .select('*, stores(name)')
        .eq('user_id', user.id)
        .gt('start_time', now)
        .order('start_time', { ascending: true })
        .limit(10); 

      // --- APPLY SUNDAY 4PM FILTER ---
      const visibleShifts = (shiftsData || []).filter(shift => 
        isShiftVisible(shift.start_time, bossStatus)
      );

      setMyShifts(visibleShifts.slice(0, 5));

      // 2. FETCH STORES
      if (bossStatus) {
        const { data: allStores } = await supabase.from('stores').select('*').order('name');
        setStores(allStores || []);
      } else {
        const { data: userHistory } = await supabase.from('shifts').select('store_id').eq('user_id', user.id);
        const myStoreIds = [...new Set(userHistory?.map(s => s.store_id) || [])];

        if (myStoreIds.length > 0) {
          const { data: myStores } = await supabase.from('stores').select('*').in('id', myStoreIds).order('name');
          setStores(myStores || []);
        } else {
          setStores([]);
        }
      }
      
      setLoading(false);
    };
    fetchData();
  }, []);

  // --- FORMATTERS ---
  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  const nextShift = myShifts[0];
  const laterShifts = myShifts.slice(1);

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      
      {/* --- SECTION 1: MY SCHEDULE --- */}
      <div className="bg-white border-b border-gray-200 pt-8 pb-10">
        <div className="max-w-7xl mx-auto px-6">
          
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
            My Schedule
          </h2>

          {/* DRAFT MODE WARNING (Boss Only) */}
          {amIBoss && (
            <div className="mb-4 text-[10px] text-gray-400 uppercase tracking-wider font-bold">
               * You see all shifts. Staff only see next week after Sun 4PM.
            </div>
          )}

          {/* NEXT UP CARD */}
          {nextShift ? (
            <div className="bg-black text-white p-6 shadow-xl mb-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <span className="text-6xl font-black uppercase">Next</span>
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Next Shift</p>
              <h3 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight mb-2">
                {nextShift.stores?.name}
              </h3>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm font-medium">
                <div className="flex items-center gap-2">
                  <span>📅 {formatDate(nextShift.start_time)}</span>
                </div>
                <div className="flex items-center gap-2">
                   <span>⏰ {formatTime(nextShift.start_time)} - {formatTime(nextShift.end_time)}</span>
                </div>
              </div>
            </div>
          ) : (
             <div className="bg-gray-100 p-6 border border-gray-200 text-center mb-6">
                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">No upcoming shifts visible</p>
                <p className="text-[10px] text-gray-400 mt-1 uppercase">Next week releases Sunday @ 4PM</p>
             </div>
          )}

          {/* UPCOMING LIST */}
          {laterShifts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {laterShifts.map((shift: any) => (
                <div key={shift.id} className="border border-gray-200 p-4 bg-gray-50 hover:bg-white transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {formatDate(shift.start_time)}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-black uppercase tracking-tight leading-none mb-1">
                    {shift.stores?.name}
                  </h4>
                  <p className="text-xs font-medium text-gray-600">
                    {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- SECTION 2: LOCATIONS GRID --- */}
      <div className="max-w-7xl mx-auto px-6 pt-10 pb-4">
        <h1 className="text-3xl font-extrabold text-gray-900 uppercase tracking-widest">
          {amIBoss ? 'All Locations' : 'My Locations'}
        </h1>
        <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">
           {amIBoss ? 'Select a store to view schedule' : 'Stores you are scheduled at'}
        </p>
      </div>

      <main className="max-w-7xl mx-auto py-6 px-6">
        
        {/* EMPTY STATE */}
        {stores.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-4xl mb-4">☕️</div>
            <h3 className="text-lg font-bold text-gray-900 uppercase tracking-wider">No Locations Found</h3>
            <p className="text-gray-500 mt-2">You haven't been scheduled at any locations yet.</p>
          </div>
        )}

        {/* GRID OF STORES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16">
          {stores.map((store: any) => (
            <Link key={store.id} href={`/store/${store.id}`} className="group block">
              
              <div className="aspect-w-16 aspect-h-9 mb-4 overflow-hidden bg-gray-100 shadow-sm border border-gray-100">
                <img 
                  src={getStoreImage(store.name)} 
                  alt={store.name}
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out grayscale-[10%] group-hover:grayscale-0"
                  onError={(e) => {
                    (e.currentTarget as any).style.display = 'none';
                    e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center', 'text-gray-400', 'uppercase', 'text-sm', 'font-bold', 'tracking-widest');
                    if(e.currentTarget.parentElement) e.currentTarget.parentElement.innerText = 'NO IMAGE';
                  }}
                />
              </div>

              <div className="border-b border-gray-300 pb-2 group-hover:border-black transition-colors duration-300">
                <div className="flex justify-between items-end">
                  <div className="overflow-hidden">
                    <h3 className="text-xl font-bold text-gray-900 uppercase tracking-wider truncate group-hover:text-black leading-none">
                      {store.name}
                    </h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1 truncate">
                       {store.address}
                    </p>
                  </div>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-lg ml-4 mb-0.5">
                    →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

// --- MAIN PAGE CONTROLLER ---
export default function Page() {
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [key, setKey] = useState(0); 

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isLoading) return null; 

  if (!session) {
    return <LoginScreen onLogin={() => setKey(k => k + 1)} />;
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardContent sessionKey={key} />
    </Suspense>
  );
}