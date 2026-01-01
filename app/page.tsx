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
      <h1 className="text-3xl font-bold mb-8 text-black">For Five - Operations</h1>
      
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
<Link 
  href="/team" 
  className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-50 ml-4"
>
  Manage Team →
</Link>