// @ts-nocheck
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import NotificationBell from './NotificationBell';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState({ fullName: '', role: '', initial: '' });
  const [isManager, setIsManager] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false); 
  
  // --- NEXT SHIFT STATE ---
  const [nextShift, setNextShift] = useState(null);

  // --- MARKETPLACE ALERT STATE ---
  const [hasOpenings, setHasOpenings] = useState(false);

  useEffect(() => {
    setMounted(true);

    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        await fetchProfileAndRole(user.id);
        checkMarketplace(); 
        fetchNextShift(user.id); 
      }
    };

    getUser();

    // Poll every 60 seconds
    const interval = setInterval(() => {
        checkMarketplace();
        if (user) fetchNextShift(user.id);
    }, 60000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserProfile({ fullName: '', role: '', initial: '' });
        setIsManager(false);
        setHasOpenings(false);
        setNextShift(null);
        router.push('/'); 
      } else if (session?.user) {
        setUser(session.user);
        fetchProfileAndRole(session.user.id);
        checkMarketplace();
        fetchNextShift(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [router, user]); 

  // --- FETCH PROFILE DATA ---
  const fetchProfileAndRole = async (userId) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', userId)
      .single();
      
    const role = profile?.role?.trim() || 'Staff';
    const fullName = profile?.full_name || 'Team Member';
    const initial = fullName.charAt(0).toUpperCase();

    setUserProfile({ fullName, role, initial });

    if (role === 'Manager' || role === 'Operations') {
      setIsManager(true);
    }
  };

  // --- FETCH NEXT SHIFT ---
  const fetchNextShift = async (userId) => {
    const now = new Date().toISOString();
    const { data } = await supabase
      .from('shifts')
      .select('start_time')
      .eq('user_id', userId)
      .gte('start_time', now)
      .order('start_time', { ascending: true })
      .limit(1)
      .single();

    if (data) {
        const dateObj = new Date(data.start_time);
        const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const timeStr = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        setNextShift(`${dateStr} • ${timeStr}`);
    } else {
        setNextShift(null);
    }
  };

  // --- CHECK FOR OPEN SHIFTS ---
  const checkMarketplace = async () => {
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);

    const { data } = await supabase
      .from('shifts')
      .select('id')
      .or('user_id.is.null,swap_status.eq.offered') 
      .gte('start_time', now.toISOString())
      .lte('start_time', nextWeek.toISOString())
      .limit(1); 
    
    if (data && data.length > 0) {
      setHasOpenings(true);
    } else {
      setHasOpenings(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (!mounted || !user) return null;

  return (
    <>
      <header className="bg-black text-white py-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          
          {/* LOGO */}
          <Link href="/" className="text-xl font-extrabold uppercase tracking-[0.2em] hover:opacity-80 transition-opacity z-50">
            For Five
          </Link>

          {/* DESKTOP NAV */}
          <div className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-widest">
            
            <Link href="/" className="hover:text-gray-300 transition-colors">
              Locations
            </Link>
            
            <Link href="/marketplace" className="hover:text-gray-300 transition-colors flex items-center gap-1.5">
              Open Shifts
              {hasOpenings && (
                <span className="block h-2 w-2 rounded-full bg-red-600 ring-1 ring-black" title="Open Shifts Available" />
              )}
            </Link>

            <Link href="/availability" className="hover:text-gray-300 transition-colors">
              Availability
            </Link>

            {isManager && (
              <Link href="/overview" className="hover:text-gray-300 transition-colors">
                Master View
              </Link>
            )}

            {isManager && (
              <Link href="/staff" className="hover:text-gray-300 transition-colors">
                Staff
              </Link>
            )}

            <div className="border-l border-gray-800 pl-6">
              <NotificationBell />
            </div>

            {/* USER AVATAR & DROPDOWN */}
            <div className="relative ml-4">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none"
              >
                <div className="w-9 h-9 bg-gray-800 border border-gray-700 rounded-md flex items-center justify-center text-xs font-bold tracking-wide text-white">
                    {userProfile.initial || user?.email?.[0].toUpperCase()}
                </div>
              </button>

              {isMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>
                  <div className="absolute right-0 mt-3 w-64 bg-white text-black rounded-sm border-2 border-black shadow-2xl z-50 animate-in fade-in slide-in-from-top-1 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                      <p className="text-sm font-extrabold uppercase tracking-wide truncate">
                          {userProfile.fullName}
                      </p>
                    </div>
                    <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-1.5">
                          Next Shift
                        </p>
                        {nextShift ? (
                          <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                              <p className="text-xs font-bold text-gray-900">{nextShift}</p>
                          </div>
                        ) : (
                          <p className="text-[10px] italic text-gray-400">No upcoming shifts scheduled.</p>
                        )}
                    </div>
                    <div className="py-1">
                        <button 
                          onClick={handleSignOut}
                          className="w-full text-left px-5 py-3 text-xs font-bold uppercase hover:bg-gray-100 transition-colors text-red-600 flex items-center justify-between"
                        >
                          Sign Out
                          <span className="text-gray-300">→</span>
                        </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* MOBILE MENU TOGGLE (Animated Burger) */}
          <div className="md:hidden flex items-center gap-4 z-50">
            <NotificationBell />
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-white relative focus:outline-none p-2">
              <span className="sr-only">Open Menu</span>
              <div className="space-y-1.5 relative w-6 h-4">
                 <span className={`block w-6 h-0.5 bg-white transition-transform duration-300 ${isMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
                 <span className={`block w-6 h-0.5 bg-white transition-opacity duration-300 ${isMenuOpen ? 'opacity-0' : ''}`}></span>
                 <span className={`block w-6 h-0.5 bg-white transition-transform duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-2.5' : ''}`}></span>
              </div>
              {!isMenuOpen && hasOpenings && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-600 border border-black" />
              )}
            </button>
          </div>

        </div>

        {/* --- MOBILE GLASSMORPHISM MENU (Option 3) --- */}
        {/* We use 'absolute top-full' so it pushes content or overlays depending on z-index. 
            Here we overlay with z-40. */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-black/95 backdrop-blur-xl border-t border-white/10 shadow-2xl animate-in slide-in-from-top-4 duration-200 z-40">
             
             {/* LINKS SECTION */}
             <div className="flex flex-col p-6 space-y-6">
                <Link href="/" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold uppercase tracking-widest text-white hover:text-gray-300">
                  Locations
                </Link>
                
                <Link href="/marketplace" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold uppercase tracking-widest text-white hover:text-gray-300 flex items-center justify-between">
                  Open Shifts
                  {hasOpenings && (
                    <span className="text-[10px] font-bold bg-red-600 text-white px-2 py-0.5 rounded-full">Active</span>
                  )}
                </Link>
                
                <Link href="/availability" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold uppercase tracking-widest text-white hover:text-gray-300">
                  Availability
                </Link>

                {isManager && (
                  <>
                    <Link href="/overview" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold uppercase tracking-widest text-gray-400 hover:text-white">
                      Master View
                    </Link>
                    <Link href="/staff" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold uppercase tracking-widest text-gray-400 hover:text-white">
                      Staff
                    </Link>
                  </>
                )}
             </div>

             {/* DASHBOARD FOOTER SECTION */}
             <div className="bg-neutral-900/50 border-t border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Signed in as</p>
                    <p className="text-sm font-bold text-white mt-0.5">{userProfile.fullName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Next Shift</p>
                    <p className="text-sm font-bold text-green-400 mt-0.5">{nextShift || 'None'}</p>
                  </div>
                </div>

                <button 
                  onClick={handleSignOut} 
                  className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold uppercase tracking-widest text-red-500 transition-colors rounded-sm"
                >
                  Sign Out
                </button>
             </div>
          </div>
        )}
      </header>
      
      {/* Backdrop for outside click (optional but good for UX) */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/20 md:hidden" 
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </>
  );
}