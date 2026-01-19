// @ts-nocheck
'use client';

import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';
import { isBoss } from '@/app/utils/roles';

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

// --- COMPONENT: LOGIN SCREEN ---
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      onLogin(); 
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link href="/">
            <h1 className="text-4xl font-extrabold text-black uppercase tracking-widest text-center hover:opacity-80 transition-opacity cursor-pointer">
              For Five
            </h1>
          </Link>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div className="relative">
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"} 
                required
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-black focus:border-black sm:text-sm pr-10"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-black focus:outline-none"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center font-bold">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold uppercase tracking-wider text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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