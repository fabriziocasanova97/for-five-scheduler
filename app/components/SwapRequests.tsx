// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SwapRequests({ storeId }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState('');

  useEffect(() => {
    fetchRequests();
  }, [storeId]);

  const fetchRequests = async () => {
    // Only fetch items waiting for manager approval
    const { data: rawShifts, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('store_id', storeId)
      .eq('swap_status', 'pending_approval');

    if (error) {
      console.error("Error fetching swaps:", error);
      setLoading(false);
      return;
    }

    if (!rawShifts || rawShifts.length === 0) {
      setRequests([]);
      setLoading(false);
      return;
    }

    // Resolve Names
    const userIds = new Set();
    rawShifts.forEach(s => {
      if (s.user_id) userIds.add(s.user_id);
      if (s.swap_candidate_id) userIds.add(s.swap_candidate_id);
    });

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', Array.from(userIds));

    const namesMap = {};
    profiles?.forEach(p => namesMap[p.id] = p.full_name);

    const finalData = rawShifts.map(s => ({
      ...s,
      owner_name: namesMap[s.user_id] || 'Unknown',
      candidate_name: namesMap[s.swap_candidate_id] || 'Unknown'
    }));

    setRequests(finalData);
    setLoading(false);
  };

  const handleApprove = async (shift) => {
    if (!confirm("Approve this swap? The schedule will update immediately.")) return;
    setProcessing(shift.id);

    // 1. Swap the user_id
    // 2. Reset status to normal ('none')
    const { error } = await supabase
      .from('shifts')
      .update({
        user_id: shift.swap_candidate_id, 
        swap_status: 'none',
        swap_candidate_id: null
      })
      .eq('id', shift.id);

    if (error) alert("Error approving: " + error.message);
    else window.location.reload();
  };

  // --- CHANGED: DENY LOGIC ---
  const handleDeny = async (shift) => {
    if (!confirm("Deny this request?")) return;
    setProcessing(shift.id);

    // Instead of resetting to 'none', we set to 'denied'.
    // This allows us to show the "Swap Rejected" error to the Barista.
    const { error } = await supabase
      .from('shifts')
      .update({
        swap_status: 'denied',     // <--- The Sticky Error Flag
        swap_candidate_id: null    // Clear the candidate who was rejected
      })
      .eq('id', shift.id);

    if (error) alert("Error denying: " + error.message);
    else {
      // Remove from this list locally (it's no longer 'pending')
      setRequests(prev => prev.filter(r => r.id !== shift.id));
      setProcessing('');
    }
  };

  // CLEANUP: If empty or loading, show NOTHING.
  if (loading || requests.length === 0) return null;

  return (
    <div className="mb-6 bg-purple-50 border-2 border-purple-200 rounded-lg p-4 animate-in slide-in-from-top-2">
      <h3 className="text-purple-900 font-extrabold uppercase tracking-widest text-sm mb-3 flex items-center gap-2">
        <span className="text-lg">🔔</span> Pending Approvals
      </h3>

      <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {requests.map(req => {
           const dateStr = new Date(req.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
           const timeStr = `${new Date(req.start_time).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})} - ${new Date(req.end_time).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})}`;

           return (
             <div key={req.id} className="bg-white border border-purple-200 p-4 rounded shadow-sm flex flex-col gap-2">
               
               {/* Shift Info */}
               <div className="flex justify-between items-start border-b border-gray-100 pb-2 mb-1">
                 <div>
                   <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{dateStr}</span>
                   <div className="text-xs font-medium text-gray-400">{timeStr}</div>
                 </div>
               </div>

               {/* Who is swapping? */}
               <div className="flex items-center justify-between text-sm gap-2 bg-gray-50 p-2 rounded">
                 <div className="text-gray-900 font-bold truncate w-1/2 text-right text-xs">
                   {req.owner_name}
                 </div>
                 <div className="text-gray-400 text-[10px]">➔</div>
                 <div className="text-purple-700 font-bold truncate w-1/2 text-left text-xs">
                   {req.candidate_name}
                 </div>
               </div>

               {/* Buttons */}
               <div className="flex gap-2 mt-2">
                 <button
                   onClick={() => handleDeny(req)}
                   disabled={processing === req.id}
                   className="flex-1 py-2 border border-red-200 text-red-700 hover:bg-red-50 text-[10px] font-bold uppercase tracking-widest rounded transition-colors"
                 >
                   Deny
                 </button>
                 <button
                   onClick={() => handleApprove(req)}
                   disabled={processing === req.id}
                   className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold uppercase tracking-widest rounded transition-colors"
                 >
                   {processing === req.id ? '...' : 'Approve'}
                 </button>
               </div>
             </div>
           );
        })}
      </div>
    </div>
  );
}