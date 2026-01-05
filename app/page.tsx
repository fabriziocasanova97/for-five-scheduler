// @ts-nocheck
'use client';

import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';
import LogoutButton from '@/app/components/LogoutButton';
import { isBoss } from '@/app/utils/roles';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- HELPER: Get Image Path ---
// This turns "Times Square" into "/stores/times-square.jpg"
const getStoreImage = (storeName: string) => {
  if (!storeName) return '';
  // 1. Lowercase: "Times Square" -> "times square"
  // 2. Replace spaces with hyphens: "times square" -> "times-square"
  // 3. Remove "For Five Coffee" if it's in the name to keep files simple
  const cleanName = storeName
    .toLowerCase()
    .replace('for five coffee ', '') 
    .trim()
    .replace(/\s+/g, '-'); 
    
  return `/stores/${cleanName}.jpg`;
};

function DashboardContent() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [amIBoss, setAmIBoss] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const bossStatus = isBoss(user?.email);
      setAmIBoss(bossStatus);

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        setUserRole(profile?.role || 'Staff');
      }

      const { data: storesData, error } = await supabase
        .from('stores')
        .select('*')
        .order('name');
      
      if (!error) setStores(storesData || []);
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* FOR FIVE STYLE HEADER */}
      <header className="bg-white py-8 md:py-12 text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 uppercase tracking-wider mb-2">
            Locations
          </h1>
          <p className="text-sm text-gray-500 uppercase tracking-widest mb-8 font-medium">
            Select a café to view schedules
          </p>
          
          <div className="flex justify-center gap-4">
            {amIBoss && (
              <Link 
                href="/overview"
                className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-sm hover:bg-gray-800 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                </svg>
                Master View
              </Link>
            )}
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* MAIN CONTENT - EDITORIAL GRID */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {stores.map((store) => (
            <Link 
              key={store.id} 
              href={`/store/${store.id}`}
              className="group block"
            >
              <div className="bg-white">
                {/* 1. The Image (Now Loads from /public/stores/...) */}
                <div className="aspect-w-16 aspect-h-9 mb-4 overflow-hidden bg-gray-200 relative">
                  <img 
                    src={getStoreImage(store.name)} 
                    alt={store.name}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500 ease-out"
                    onError={(e) => {
                      // Fallback if image isn't found: Show a nice grey box
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement.classList.add('flex', 'items-center', 'justify-center', 'text-gray-400', 'uppercase', 'text-sm', 'font-bold', 'tracking-widest');
                      e.currentTarget.parentElement.innerText = 'NO IMAGE';
                    }}
                  />
                </div>

                {/* 2. The Title & Underline */}
                <div className="pb-2 border-b border-gray-300 group-hover:border-gray-900 transition-colors">
                  <h3 className="text-lg font-bold text-gray-900 uppercase tracking-wider truncate">
                    {store.name}
                  </h3>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}