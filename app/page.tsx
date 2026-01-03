// @ts-nocheck
'use client';

import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import LogoutButton from './components/LogoutButton';
import { isBoss } from './utils/roles';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const [user, setUser] = useState(null);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [amIBoss, setAmIBoss] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // 1. Ask the BROWSER who is logged in
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      // 2. Check Permissions immediately
      if (user?.email) {
        setAmIBoss(isBoss(user.email));
      }

      // 3. Get Stores
      const { data: storesData } = await supabase.from('stores').select('*').order('name');
      setStores(storesData || []);
      
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      
      {/* HEADER WITH LOGOUT */}
      <div className="w-full max-w-4xl flex justify-end mb-4">
        <LogoutButton />
      </div>

      <div className="max-w-4xl w-full">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            Your Stores
          </h1>

          {/* MASTER VIEW BUTTON (Only visible if you are Boss) */}
          {amIBoss && (
            <Link 
              href="/overview"
              className="bg-purple-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-purple-700 shadow-md transition"
            >
              👑 Master View
            </Link>
          )}
        </div>

        {/* RED BOX REMOVED FROM HERE */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stores.map((store) => (
            <Link 
              key={store.id} 
              href={`/store/${store.id}`}
              className="group relative block bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
            >
              <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center">
                <span className="text-5xl">🏪</span>
              </div>
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {store.name}
                </h2>
                <p className="text-gray-500 mt-2 flex items-center gap-2">
                  📍 {store.location}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}