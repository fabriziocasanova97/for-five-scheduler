// @ts-nocheck
'use client';

import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';
import { isBoss } from '@/app/utils/roles';

// 1. Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const getStoreImage = (storeName: string) => {
  if (!storeName) return '';
  const cleanName = storeName.toLowerCase().replace('for five coffee ', '').trim().replace(/\s+/g, '-'); 
  return `/stores/${cleanName}.jpg`;
};

// --- COMPONENT: LOGIN SCREEN ---
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
          <h1 className="text-4xl font-extrabold text-black uppercase tracking-widest">
            For Five
          </h1>
          <p className="mt-2 text-sm text-gray-500 uppercase tracking-wide">
            Schedule Management
          </p>
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
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
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
  const [loading, setLoading] = useState(true);
  const [amIBoss, setAmIBoss] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true); 
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Check if Operations/Boss
      const bossStatus = isBoss(user?.email);
      setAmIBoss(bossStatus);

      let dataToSet = [];

      if (bossStatus) {
        // SCENARIO A: BOSS (Operations)
        // Fetch ALL stores
        const { data: allStores } = await supabase
          .from('stores')
          .select('*')
          .order('name');
        dataToSet = allStores || [];
      } else {
        // SCENARIO B: STAFF / BARISTA
        // 1. Find all shifts for this user to see which stores they belong to
        const { data: myShifts } = await supabase
          .from('shifts')
          .select('store_id')
          .eq('user_id', user?.id);
        
        // 2. Extract unique Store IDs from their shifts
        // (Using Set to remove duplicates)
        const myStoreIds = [...new Set(myShifts?.map(s => s.store_id) || [])];

        if (myStoreIds.length > 0) {
          // 3. Fetch details only for those stores
          const { data: myStores } = await supabase
            .from('stores')
            .select('*')
            .in('id', myStoreIds)
            .order('name');
          dataToSet = myStores || [];
        } else {
          // User has no shifts yet -> No stores visible
          dataToSet = [];
        }
      }

      setStores(dataToSet);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload(); 
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-white py-8 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-6">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 uppercase tracking-wider mb-2">
              Locations
            </h1>
            <p className="text-sm text-gray-500 uppercase tracking-widest font-medium">
              {amIBoss ? 'Select store to view schedules' : 'My Assigned Locations'}
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 w-full">
            {mounted && amIBoss && (
              <Link 
                href="/overview"
                className="flex items-center gap-2 bg-black text-white px-5 py-2.5 text-sm font-bold uppercase tracking-wider shadow-sm hover:bg-gray-800 transition-all"
              >
                Master View
              </Link>
            )}

            <button
              onMouseDown={handleLogout} 
              className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-5 py-2.5 text-sm font-bold uppercase tracking-wider shadow-sm hover:bg-gray-100 hover:text-black hover:border-black transition-all cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        
        {/* EMPTY STATE - For new hires with no shifts yet */}
        {stores.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-4xl mb-4">☕️</div>
            <h3 className="text-lg font-bold text-gray-900 uppercase tracking-wider">No Locations Found</h3>
            <p className="text-gray-500 mt-2">You haven't been scheduled at any locations yet.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16">
          {stores.map((store: any) => (
            <Link key={store.id} href={`/store/${store.id}`} className="group block">
              
              {/* 1. Image */}
              <div className="aspect-w-16 aspect-h-9 mb-4 overflow-hidden bg-gray-100">
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

              {/* 2. Text & Line */}
              <div className="border-b border-gray-300 pb-2 group-hover:border-black transition-colors duration-300">
                <div className="flex justify-between items-end">
                  <h3 className="text-xl font-bold text-gray-900 uppercase tracking-wider truncate group-hover:text-black">
                    {store.name}
                  </h3>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-lg">
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