export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function Home() {
  const { data: stores } = await supabase.from('stores').select('*').order('name');

  return (
    <main className="min-h-screen p-10 bg-gray-50">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-black">For Five - Operations</h1>
          <p className="text-gray-500">Select a store to view schedule</p>
        </div>

        <div className="flex gap-3">
          {/* MASTER VIEW BUTTON */}
          <Link 
            href="/overview"
            className="bg-black text-white px-5 py-3 rounded-xl font-bold hover:bg-gray-800 transition shadow-lg flex items-center gap-2"
          >
            📅 Master View
          </Link>
          
          {/* MANAGE TEAM BUTTON */}
          <Link 
            href="/team"
            className="bg-white border-2 border-gray-200 text-gray-700 px-5 py-3 rounded-xl font-bold hover:border-black hover:text-black transition flex items-center gap-2"
          >
            👥 Manage Team
          </Link>
        </div>
      </div>
      
      {/* STORES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stores?.map((store) => (
          <Link href={`/store/${store.id}`} key={store.id}>
            <div 
              className="p-6 rounded-xl shadow-lg border-2 hover:scale-105 transition-transform cursor-pointer h-full"
              style={{ backgroundColor: 'white', borderColor: store.color }}
            >
              <h2 className="text-xl font-bold text-gray-800">{store.name}</h2>
              <p className="text-gray-500 text-sm mt-2">Click to View Schedule →</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}