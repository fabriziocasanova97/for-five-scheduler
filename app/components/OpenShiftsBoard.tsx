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

    const { data } = await supabase
      .from('shifts')
      .select('*, stores(name)')
      .is('user_id', null)
      .gte('start_time', todayIso)
      .order('start_time', { ascending: true });

    if (data) setOpenShifts(data);
    setLoading(false);
  };

  const handleClaim = async (shiftId, startTimeStr, endTimeStr) => {
    if (!confirm('Are you sure you want to claim this shift?')) return;
    setProcessing(shiftId);

    // Double Check Check
    const { data: check } = await supabase
      .from('shifts')
      .select('user_id')
      .eq('id', shiftId)
      .single();

    if (check?.user_id) {
      alert("Too slow! Someone else just claimed this shift.");
      setProcessing('');
      fetchOpenShifts();
      return;
    }

    // Conflict Check
    const { data: conflicts } = await supabase
      .from('shifts')
      .select('id')
      .eq('user_id', myId)
      .lt('start_time', endTimeStr)
      .gt('end_time', startTimeStr);

    if (conflicts && conflicts.length > 0) {
      alert("You cannot claim this shift because you are already working at another location during this time.");
      setProcessing('');
      return;
    }

    // Claim
    const { error } = await supabase
      .from('shifts')
      .update({ user_id: myId })
      .eq('id', shiftId);

    if (error) {
      alert("Error claiming shift");
    } else {
      setOpenShifts(prev => prev.filter(s => s.id !== shiftId));
      alert("Shift claimed! It is now on your schedule.");
      window.location.reload(); 
    }
    setProcessing('');
  };

  if (loading) return null; // Silent loading
  if (openShifts.length === 0) return null;

  return (
    // CHANGED: border-red-100 -> border-blue-200, bg-red-50 -> bg-blue-50
    <div className="mb-8 border-2 border-blue-200 bg-blue-50/50 rounded-lg overflow-hidden transition-all">
      
      {/* HEADER - NOW CLICKABLE */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        // CHANGED: bg-red-100 -> bg-blue-100, border-red-200 -> border-blue-200
        className="bg-blue-100 px-4 py-3 border-b border-blue-200 flex justify-between items-center cursor-pointer hover:bg-blue-200 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl animate-pulse"></span> 
          <div>
            {/* CHANGED: text-red-900 -> text-blue-900 (Navy) */}
            <h3 className="text-blue-900 font-extrabold uppercase tracking-widest text-sm">
              Open Shifts Available
            </h3>
            {/* Added mt-1 here for better distribution */}
            {/* CHANGED: text-red-600 -> text-blue-800 */}
            <p className="text-[10px] font-bold text-blue-800 mt-1">
              {openShifts.length} Shift{openShifts.length !== 1 ? 's' : ''} waiting for coverage
            </p>
          </div>
        </div>

        {/* ARROW ICON */}
        {/* CHANGED: text-red-500 -> text-blue-600 */}
        <button className="text-blue-600 focus:outline-none">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            strokeWidth={2.5} 
            stroke="currentColor" 
            className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      </div>

      {/* EXPANDABLE GRID */}
      {isExpanded && (
        <div className="p-4 grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 animate-in slide-in-from-top-2 duration-200">
          {openShifts.map(shift => {
            const dateObj = new Date(shift.start_time);
            const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
            const timeStr = `${dateObj.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})} - ${new Date(shift.end_time).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})}`;

            return (
              // CHANGED: border-red-200 -> border-blue-200
              <div key={shift.id} className="bg-white border border-blue-200 p-4 rounded shadow-sm hover:shadow-md transition-shadow flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{dateStr}</p>
                    <p className="font-extrabold text-gray-900">{shift.stores?.name}</p>
                  </div>
                  {shift.note && (
                     <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded italic">
                       "{shift.note}"
                     </span>
                  )}
                </div>
                
                <div className="text-sm font-medium text-gray-700">
                  {timeStr}
                </div>

                <button 
                  onClick={(e) => {
                    e.stopPropagation(); // Stop click from closing the dropdown
                    handleClaim(shift.id, shift.start_time, shift.end_time);
                  }}
                  disabled={processing === shift.id}
                  // CHANGED: bg-red-600 -> bg-blue-900 (Solid Navy Button)
                  className="mt-2 w-full bg-blue-900 hover:bg-blue-800 text-white font-bold uppercase tracking-widest text-xs py-3 rounded transition-colors disabled:opacity-50"
                >
                  {processing === shift.id ? 'Claiming...' : 'Claim Shift'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}