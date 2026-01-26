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
  const [isManager, setIsManager] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false); 
  
  // --- MARKETPLACE ALERT STATE ---
  const [hasOpenings, setHasOpenings] = useState(false);

  useEffect(() => {
    setMounted(true);

    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        checkRole(user.id);
        checkMarketplace(); 
      }
    };

    getUser();

    // Poll every 60 seconds
    const interval = setInterval(checkMarketplace, 60000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsManager(false);
        setHasOpenings(false);
        router.push('/'); 
      } else if (session?.user) {
        setUser(session.user);
        checkRole(session.user.id);
        checkMarketplace();
      }
    });

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [router]);

  const checkRole = async (userId) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
      
    const role = profile?.role?.trim();
    if (role === 'Manager' || role === 'Operations') {
      setIsManager(true);
    }
  };

  // --- CHECK FOR OPEN SHIFTS (Next 7 Days) ---
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
    <header className="bg-black text-white py-4 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        
        {/* LOGO */}
        <Link href="/" className="text-xl font-extrabold uppercase tracking-[0.2em] hover:opacity-80 transition-opacity">
          For Five <span className="text-gray-500 text-xs tracking-normal normal-case align-middle ml-2"></span>
        </Link>

        {/* DESKTOP NAV */}
        <div className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-widest">
          
          <Link href="/" className="hover:text-gray-300 transition-colors">
            Locations
          </Link>
          
          {/* --- SHIFT BOARD LINK (With Static Dot) --- */}
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

          {/* NOTIFICATIONS - NOW VISIBLE TO EVERYONE */}
          <div className="border-l border-gray-800 pl-6">
             <NotificationBell />
          </div>

          {/* USER AVATAR */}
          <div className="relative ml-4">
             <button 
               onClick={() => setIsMenuOpen(!isMenuOpen)}
               className="flex items-center gap-2 hover:text-gray-300 transition-colors focus:outline-none"
             >
               <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-[10px]">
                  {user?.email?.[0].toUpperCase()}
               </div>
             </button>

             {isMenuOpen && (
               <>
                 <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>
                 <div className="absolute right-0 mt-2 w-48 bg-white text-black rounded shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-1">
                   <div className="px-4 py-2 border-b border-gray-100 mb-1">
                     <p className="text-[10px] text-gray-400">Signed in as</p>
                     <p className="text-xs font-bold truncate">{user?.email}</p>
                   </div>
                   <button 
                     onClick={handleSignOut}
                     className="w-full text-left px-4 py-2 text-xs font-bold uppercase hover:bg-gray-100 transition-colors text-red-600"
                   >
                     Sign Out
                   </button>
                 </div>
               </>
             )}
          </div>
        </div>

        {/* MOBILE MENU ICON */}
        <div className="md:hidden flex items-center gap-4">
           {/* MOBILE NOTIFICATIONS - VISIBLE TO EVERYONE */}
           <NotificationBell />
           
           <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-white relative">
             ☰
             {/* Mobile Dot */}
             {!isMenuOpen && hasOpenings && (
                <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-600 border border-black" />
             )}
           </button>
        </div>

      </div>

      {/* MOBILE DROPDOWN */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-black border-t border-gray-800 p-4 flex flex-col gap-4 shadow-xl">
           <Link href="/" onClick={() => setIsMenuOpen(false)} className="text-sm font-bold uppercase tracking-widest">Locations</Link>
           
           <Link href="/marketplace" onClick={() => setIsMenuOpen(false)} className="text-sm font-bold uppercase tracking-widest flex items-center justify-between">
             Open Shifts
             {hasOpenings && (
               <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full">New Openings</span>
             )}
           </Link>
           
           <Link href="/availability" onClick={() => setIsMenuOpen(false)} className="text-sm font-bold uppercase tracking-widest">Availability</Link>
           
           {isManager && <Link href="/overview" onClick={() => setIsMenuOpen(false)} className="text-sm font-bold uppercase tracking-widest">Master View</Link>}
           
           {isManager && <Link href="/staff" onClick={() => setIsMenuOpen(false)} className="text-sm font-bold uppercase tracking-widest">Staff</Link>}
           
           <button onClick={handleSignOut} className="text-left text-sm font-bold uppercase tracking-widest text-red-500">Sign Out</button>
        </div>
      )}

    </header>
  );
}