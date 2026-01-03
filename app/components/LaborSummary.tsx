'use client';

import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

// --- CONFIGURATION ---
// REPLACE THESE WITH THE REAL BOSS EMAILS
const BOSS_EMAILS = [
  'boss@example.com',
  'manager@test.com',
  'owner@coffee.com'
];

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LaborSummary({ shifts }: { shifts: any[] }) {
  const [isBoss, setIsBoss] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email && BOSS_EMAILS.includes(user.email)) {
        setIsBoss(true);
      }
      setLoading(false);
    };
    checkUser();
  }, []);

  if (loading) return null; // Don't show anything while checking
  if (!isBoss) return null; // If not a boss, HIDE completely

  // --- CALCULATE HOURS ---
  const laborSummary: Record<string, number> = {};
  shifts.forEach((shift) => {
    const name = shift.profiles?.full_name || 'Unknown';
    const start = new Date(shift.start_time).getTime();
    const end = new Date(shift.end_time).getTime();
    const hours = (end - start) / (1000 * 60 * 60);
    if (laborSummary[name]) {
        laborSummary[name] += hours;
    } else {
        laborSummary[name] = hours;
    }
  });

  if (Object.keys(laborSummary).length === 0) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <h3 className="text-sm font-bold text-blue-800 uppercase mb-2">Weekly Staff Hours (Manager View)</h3>
      <div className="flex flex-wrap gap-3">
        {Object.entries(laborSummary).map(([name, hours]) => (
          <div key={name} className={`px-3 py-1 rounded border text-sm font-bold flex items-center gap-2 ${hours > 40 ? 'bg-red-100 text-red-700 border-red-300' : 'bg-white text-gray-700 border-gray-200'}`}>
            <span>{name}</span>
            <span className={`px-1.5 py-0.5 rounded text-xs ${hours > 40 ? 'bg-red-600 text-white' : 'bg-blue-100 text-blue-800'}`}>{hours.toFixed(1)}h</span>
          </div>
        ))}
      </div>
    </div>
  );
}