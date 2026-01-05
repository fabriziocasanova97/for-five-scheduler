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
          {amIBoss && (
            <Link 
              href="/overview"
              className="text-sm font-medium text-purple-600 hover:text-purple-800 transition"
            >
              Master View →
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