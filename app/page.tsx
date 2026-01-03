'use client'; // <--- This is the magic switch

import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import LogoutButton from '@/app/components/LogoutButton';
import { isBoss } from '@/app/utils/roles';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initPage = async () => {
      // 1. Check who is logged in
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // 2. If it is the boss, fetch the store list
      if (user && isBoss(user.email)) {
        const { data: storeList } = await supabase.from('stores').select('*');
        setStores(storeList || []);
      }
      
      setLoading(false);
    };

    initPage();
  }, []);

  // --- LOADING STATE ---
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 animate-pulse">Checking Security...</p>
      </div>
    );
  }

  // --- ACCESS DENIED STATE ---
  const userIsBoss = isBoss(user?.email);
  if (!userIsBoss) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md border">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Restricted</h1>
          <p className="text-gray-600 mb-6">
            You do not have permission to view the Master Store List. <br/>
            <span className="text-xs text-gray-400 block mt-2">(Logged in as: {user?.email || 'Guest'})</span>
          </p>
          
          {/* If they are a guest (not logged in), show a Login button instead of Logout */}
          {!user ? (
            <Link 
              href="/login" 
              className="inline-block bg-blue-600 text-white font-bold py-2 px-6 rounded hover:bg-blue-700 transition"
            >
              Go to Login
            </Link>
          ) : (
            <LogoutButton />
          )}
        </div>
      </div>
    );
  }

  // --- BOSS DASHBOARD STATE ---
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">All Stores</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">Welcome, {user?.email}</span>
            <LogoutButton />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stores.map((store) => (
            <Link 
              key={store.id} 
              href={`/store/${store.id}`}
              className="block group"
            >
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-500 transition-all">
                <h2 className="text-xl font-bold text-gray-900 group-hover:text-blue-600">
                  {store.name}
                </h2>
                <p className="text-gray-500 mt-2 text-sm">
                  {store.location || 'No location set'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}