// @ts-nocheck
'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CopyWeekButton({ storeId, currentMonday }) {
  const [loading, setLoading] = useState(false);

  const handleCopy = async () => {
    if (!confirm('Are you sure you want to copy all shifts from LAST WEEK to this week?')) {
      return;
    }

    setLoading(true);

    try {
      // 1. Calculate "Last Week" Date Range
      const lastWeekStart = new Date(currentMonday);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      
      const lastWeekEnd = new Date(currentMonday);
      
      // 2. Fetch shifts from that previous week
      const { data: oldShifts, error: fetchError } = await supabase
        .from('shifts')
        .select('*')
        .eq('store_id', storeId)
        .gte('start_time', lastWeekStart.toISOString())
        .lt('start_time', lastWeekEnd.toISOString());

      if (fetchError) throw fetchError;

      if (!oldShifts || oldShifts.length === 0) {
        alert('No shifts found in the previous week to copy!');
        setLoading(false);
        return;
      }

      // 3. Prepare new shifts
      const newShifts = oldShifts.map(shift => {
        const oldStart = new Date(shift.start_time);
        const oldEnd = new Date(shift.end_time);

        const newStart = new Date(oldStart.getTime() + (7 * 24 * 60 * 60 * 1000));
        const newEnd = new Date(oldEnd.getTime() + (7 * 24 * 60 * 60 * 1000));

        return {
          store_id: shift.store_id,
          user_id: shift.user_id, 
          start_time: newStart.toISOString(),
          end_time: newEnd.toISOString()
        };
      });

      // 4. Insert them
      const { error: insertError } = await supabase
        .from('shifts')
        .insert(newShifts);

      if (insertError) throw insertError;

      window.location.reload(); 

    } catch (err) {
      alert('Error copying week: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCopy}
      disabled={loading}
      className="border-2 border-black bg-white text-black text-xs font-bold uppercase tracking-wider px-5 py-2.5 hover:bg-gray-100 transition-all disabled:opacity-50 whitespace-nowrap"
    >
      {loading ? 'Copying...' : 'Copy Last Week'}
    </button>
  );
}