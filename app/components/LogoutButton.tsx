'use client';

import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const LogoutButton = () => {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login'); 
  };

  return (
    <button 
      onClick={handleLogout}
      className="text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded border border-red-200 transition-colors"
    >
      Sign Out
    </button>
  );
};

export default LogoutButton;