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
  
  // State to control the dropdown
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchOpenShifts();
  }, []);

  const fetchOpenShifts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setMyId(user.id);

    const today = new Date();
    today.setHours(0,0,0,0);
    const todayIso = today.toISOString();

    // UPDATED QUERY: Fetch Open Shifts OR Swap Offers
    // Also fetch profile name to see who is offering the swap
    const { data } = await supabase
      .from('shifts')
      .select('*, stores(name), profiles(full_name)') 
      .gte('start_time', todayIso)
      .or('user_id.is.null,swap_status.eq.offered') // <--- THE MAGIC FILTER
      .order('start_time', { ascending: true });

    if (data) setOpenShifts(data);
    setLoading(false);
  };

  const handleAction = async (shift) => {
    // 1. IS IT A SWAP REQUEST?
    if (shift.user_id) {
       await handleSwapRequest(shift);
       return;
    }

    // 2. IS IT A DIRECT CLAIM?
    await handleDirectClaim(shift);
  };

  // --- LOGIC A: REQUEST A SWAP (Requires Approval) ---
  const handleSwapRequest = async (shift) => {
    if (!confirm(`Request to swap shifts with ${shift.profiles?.full_name}? Manager approval required.`)) return;
    setProcessing(shift.id);

    // Conflict Check
    const hasConflict = await checkConflicts(shift.start_time, shift.end_time);
    if (hasConflict) {
      setProcessing('');
      return;
    }

    // Update DB: Set Candidate & Change Status
    const { error } = await supabase
      .from('shifts')
      .update({ 
        swap_candidate_id: myId,
        swap_status: 'pending_approval' // Hides it from the board
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

  // --- LOGIC B: DIRECT CLAIM (Instant) ---
  const handleDirectClaim = async (shift) => {
    if (!confirm('Are you sure you want to claim this shift?')) return;
    setProcessing(shift.id);

    // Double Check it's still free
    const { data: check } = await supabase.from('shifts').select('user_id').eq('id', shift.id).single();
    if (check?.user_id) {
      alert("Too slow! Someone else just claimed this shift.");
      fetchOpenShifts();
      setProcessing('');
      return;
    }

    // Conflict Check
    const hasConflict = await checkConflicts(shift.start_time, shift.end_time);
    if (hasConflict) {
      setProcessing('');
      return;
    }

    // Claim it
    const { error } = await supabase.from('shifts').update({ user_id: myId }).eq('id', shift.id);

    if (error) {
      alert("Error claiming shift");
    } else {
      setOpenShifts(prev => prev.filter(s => s.id !== shift.id));
      alert("Shift claimed! It is now on your schedule.");
      window.location.reload(); 
    }
    setProcessing('');
  };

  // Helper: Shared Conflict Logic
  const checkConflicts = async (startStr, endStr) => {
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
  
  // Filter out my own swap offers from the view (I can't swap with myself)
  const availableShifts = openShifts.filter(s => s.user_id !== myId);

  if (availableShifts.length === 0) return null;

  return (
    <div className="mb-8 border-2 border-blue-200 bg-blue-50/50 rounded-lg overflow-hidden transition-all">
      
      {/* HEADER */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-blue-100 px-4 py-3 border-b border-blue-200 flex justify-between items-center cursor-pointer hover:bg-blue-200 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl animate-pulse"></span> 
          <div>
            <h3 className="text-blue-900 font-extrabold uppercase tracking-widest text-sm">
              Open Shifts & Swaps
            </h3>
            <p className="text-[10px] font-bold text-blue-800 mt-1">
              {availableShifts.length} Shift{availableShifts.length !== 1 ? 's' : ''} available
            </p>
          </div>
        </div>

        <button className="text-blue-600 focus:outline-none">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      </div>

      {/* GRID */}
      {isExpanded && (
        <div className="p-4 grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 animate-in slide-in-from-top-2 duration-200">
          {availableShifts.map(shift => {
            const dateObj = new Date(shift.start_time);
            const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
            const timeStr = `${dateObj.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})} - ${new Date(shift.end_time).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})}`;
            
            const isSwap = !!shift.user_id; // If it has a user, it's a swap offer

            return (
              <div key={shift.id} className="bg-white border border-blue-200 p-4 rounded shadow-sm hover:shadow-md transition-shadow flex flex-col gap-2 relative">
                
                {/* SWAP BADGE */}
                {isSwap && (
                  <div className="absolute top-2 right-2">
                    <span className="text-[9px] font-extrabold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 uppercase tracking-widest">
                      Swap Offer
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-start pr-12">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{dateStr}</p>
                    <p className="font-extrabold text-gray-900">{shift.stores?.name}</p>
                    {isSwap && (
                      <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                        FROM: {shift.profiles?.full_name}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="text-sm font-medium text-gray-700">
                  {timeStr}
                </div>

                {shift.note && (
                   <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded italic">
                     "{shift.note}"
                   </span>
                )}

                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction(shift);
                  }}
                  disabled={processing === shift.id}
                  className={`mt-2 w-full font-bold uppercase tracking-widest text-xs py-3 rounded transition-colors disabled:opacity-50 text-white ${isSwap ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-900 hover:bg-blue-800'}`}
                >
                  {processing === shift.id ? 'Processing...' : (isSwap ? 'Request Swap' : 'Claim Shift')}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}