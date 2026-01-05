// @ts-nocheck
'use client';

import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import LogoutButton from './components/LogoutButton';
import LoginScreen from './components/LoginScreen';

// --- CONFIGURATION ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CARD_COLORS = [
  'border-blue-500',    // Store 1
  'border-emerald-500', // Store 2
  'border-purple-500',  // Store 3
  'border-orange-500',  // Store 4
  'border-cyan-500',    // Store 5
  'border-rose-500',    // Store 6
  'border-indigo-500',  // Store 7
];
// ---------------------

export default function Home() {
  const [user, setUser] = useState(null);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [amIBoss, setAmIBoss] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // 1. Get User
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      // 2. Only fetch data if a user is actually logged in
      if (user?.email) {
        
        // --- NEW ROLE LOGIC ---
        // Fetch the user's profile to see their Role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        // STRICT RULE: Only 'Operations' are Bosses.
        // Managers and Baristas are Read-Only.
        const userRole = profile?.role || 'Barista';
        const isOperations = userRole === 'Operations';
        
        setAmIBoss(isOperations);
        // ----------------------

        // Get Stores ordered by name
        const { data: storesData } = await supabase.from('stores').select('*').order('name');
        setStores(storesData || []);
      }
      
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  }

  // --- THE GATEKEEPER ---
  // If we are done loading and there is NO user, show the Login Screen.
  if (!user) {
    return <LoginScreen />;
  }

  // If there IS a user, show the Dashboard.
  return (
    <div className="min-h-screen bg-white flex flex-col items-center py-12 px-4">
      
      {/* HEADER WITH LOGOUT */}
      <div className="w-full max-w-4xl flex justify-end mb-8">
        <LogoutButton />
      </div>

      <div className="max-w-4xl w-full">
        <div className="flex justify-between items-center mb-8 border-b pb-4">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Stores
          </h1>

          {/* MASTER VIEW BUTTON - ONLY FOR OPERATIONS */}
          {/* MASTER VIEW BUTTON - REDESIGNED */}
          {amIBoss && (
            <Link 
              href="/overview"
              className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-sm hover:bg-gray-800 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              {/* Simple Grid Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
              </svg>
              Master View
            </Link>
          )}
        
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {stores.map((store, index) => {
            const colorClass = CARD_COLORS[index % CARD_COLORS.length];
            
            return (
              <Link 
                key={store.id} 
                href={`/store/${store.id}`}
                className={`group block p-6 bg-white border-2 rounded-xl hover:shadow-md transition-all duration-200 ${colorClass}`}
              >
                <h2 className="text-xl font-bold text-gray-900 group-hover:opacity-80">
                  {store.name}
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  {store.location}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}