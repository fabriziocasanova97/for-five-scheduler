// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function OpenShiftsBoard() {
  const [openShifts, setOpenShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState('');
  const [processing, setProcessing] = useState('');

  useEffect(() => {
    fetchOpenShifts();
  }, []);

  const fetchOpenShifts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setMyId(user.id);

    const today = new Date();
    today.setHours(0,0,0,0);
    const todayIso = today.toISOString();

    // 1. Fetch EVERYTHING (Open Shifts OR Swap Offers)
    const { data } = await supabase
      .from('shifts')
      .select('*, stores(name), profiles(full_name)') 
      .gte('start_time', todayIso)
      .or('user_id.is.null,swap_status.eq.offered')
      .order('start_time', { ascending: true });

    if (data) {
      // 2. Filter in JavaScript
      const visibleShifts = data.filter(s => s.swap_status !== 'pending_approval');
      setOpenShifts(visibleShifts);
    }
    setLoading(false);
  };

  const handleAction = async (shift: any) => {
    if (shift.user_id) {
       await handleSwapRequest(shift);
    } else {
       await handleDirectClaim(shift);
    }
  };

  const handleSwapRequest = async (shift: any) => {
    if (!confirm(`Request to swap shifts with ${shift.profiles?.full_name}? Manager approval required.`)) return;
    setProcessing(shift.id);

    const hasConflict = await checkConflicts(shift.start_time, shift.end_time);
    if (hasConflict) {
      setProcessing('');
      return;
    }

    const { error } = await supabase
      .from('shifts')
      .update({ 
        swap_candidate_id: myId,
        swap_status: 'pending_approval' 
      })
      .eq('id', shift.id);

    if (error) {
      alert("Error sending request");
    } else {
      setOpenShifts(prev => prev.filter(s => s.id !== shift.id));
      alert("Request sent! Your manager will review it.");
    }
    setProcessing('');
  };

  // --- CLAIM REQUEST LOGIC ---
  const handleDirectClaim = async (shift: any) => {
    if (!confirm('Request to claim this shift? It will require manager approval.')) return;
    setProcessing(shift.id);

    // 1. Check if it's still available
    const { data: check } = await supabase
        .from('shifts')
        .select('user_id, swap_status')
        .eq('id', shift.id)
        .single();
    
    if (check?.user_id) {
      alert("Too slow! Someone else just claimed this shift.");
      fetchOpenShifts();
      setProcessing('');
      return;
    }
    if (check?.swap_status === 'pending_approval') {
        alert("Someone else has already requested this shift.");
        fetchOpenShifts();
        setProcessing('');
        return;
    }

    // 2. Conflict Check
    const hasConflict = await checkConflicts(shift.start_time, shift.end_time);
    if (hasConflict) {
      setProcessing('');
      return;
    }

    // 3. Send Request (Candidate + Pending Status)
    const { error } = await supabase
        .from('shifts')
        .update({ 
            swap_candidate_id: myId,    
            swap_status: 'pending_approval' 
            // user_id stays NULL until approved
        })
        .eq('id', shift.id);

    if (error) {
      alert("Error claiming shift");
    } else {
      setOpenShifts(prev => prev.filter(s => s.id !== shift.id));
      alert("Claim request sent! You will be notified when approved.");
    }
    setProcessing('');
  };

  const checkConflicts = async (startStr: string, endStr: string) => {
    const { data: conflicts } = await supabase
      .from('shifts')
      .select('id, stores(name)')
      .eq('user_id', myId)
      .lt('start_time', endStr)
      .gt('end_time', startStr);

    if (conflicts && conflicts.length > 0) {
      alert(`Conflict! You are already working at ${conflicts[0].stores?.name} at this time.`);
      return true;
    }
    return false;
  };

  if (loading) return null; 
  
  const availableShifts = openShifts.filter(s => s.user_id !== myId);

  // CHANGED: Removed the outer border/shadow wrapper and the inner header.
  // The cards now sit directly on the page background.
  return (
    <div className="mb-8">
      
      {/* CONTENT */}
      {availableShifts.length === 0 ? (
        <div className="p-12 text-center bg-white rounded shadow-sm border border-gray-100">
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">
            No open shifts available
          </p>
        </div>
      ) : (
        /* Removed p-4 to align perfectly with the page margins */
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {availableShifts.map((shift: any) => {
            const dateObj = new Date(shift.start_time);
            const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const timeStr = `${dateObj.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})} - ${new Date(shift.end_time).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})}`;
            
            const isSwap = !!shift.user_id; 

            return (
              <div 
                key={shift.id} 
                className={`bg-white p-5 rounded shadow-sm hover:shadow-md transition-all flex flex-col gap-2 relative border-l-4 ${isSwap ? 'border-l-amber-500' : 'border-l-blue-600'}`}
              >
                
                {/* TYPE BADGE */}
                <div className="absolute top-4 right-4">
                   {isSwap ? (
                     <span className="text-[9px] font-extrabold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100 uppercase tracking-widest">
                       Swap
                     </span>
                   ) : (
                     <span className="text-[9px] font-extrabold text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 uppercase tracking-widest">
                       Open
                     </span>
                   )}
                </div>

                <div className="pr-12">
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{dateStr}</p>
                   <p className="font-extrabold text-gray-900 text-xl leading-tight">{shift.stores?.name}</p>
                   {isSwap && (
                      <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">
                        From: {shift.profiles?.full_name}
                      </p>
                   )}
                </div>
                
                <div className="text-sm font-medium text-gray-700 mt-1">
                  {timeStr}
                </div>

                {shift.note && (
                   <div className="bg-gray-50 border border-gray-100 p-2 rounded text-[10px] italic text-gray-500 mt-2">
                     "{shift.note}"
                   </div>
                )}

                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction(shift);
                  }}
                  disabled={processing === shift.id}
                  className={`mt-4 w-full font-bold uppercase tracking-widest text-[10px] py-3 rounded transition-colors disabled:opacity-50 text-white ${isSwap ? 'bg-amber-600 hover:bg-amber-700' : 'bg-black hover:bg-gray-800'}`}
                >
                  {processing === shift.id ? 'Processing...' : (isSwap ? 'Request to Swap' : 'Request to Claim')}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}