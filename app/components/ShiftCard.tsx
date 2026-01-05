// @ts-nocheck
'use client';

import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import EditShiftModal from './EditShiftModal';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// UPDATE: Accept 'weekDays' as a prop
export default function ShiftCard({ shift, amIBoss, weekDays }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this shift?')) return;
    
    await supabase.from('shifts').delete().eq('id', shift.id);
    
    window.location.reload(); 
  };

  // --- COLOR LOGIC (Preserved) ---
  const getShiftStyle = (startTimeStr: string) => {
    const date = new Date(startTimeStr);
    const hour = date.getHours(); 

    // 1. OPENERS (Start before 7:00am) -> Mint Green
    if (hour < 7) return 'bg-emerald-100 border-emerald-300 text-emerald-900'; 
    // 2. MORNING & MID (Start 7:00am - 9:59am) -> Blue
    if (hour < 10) return 'bg-blue-100 border-blue-300 text-blue-900'; 
    // 3. CLOSERS (Start 10:00am or later) -> Orange
    return 'bg-orange-100 border-orange-300 text-orange-900'; 
  };

  const styleClass = getShiftStyle(shift.start_time);
  
  const role = shift.profiles?.role?.trim();
  const isManager = role === 'Manager' || role === 'Operations';

  return (
    <>
      <div className={`p-2 rounded border mb-2 shadow-sm relative group ${styleClass}`}>
        
        {/* BOSS CONTROL PANEL */}
        {amIBoss && (
          <div className="absolute top-1 right-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex gap-1 bg-white/60 rounded px-1 backdrop-blur-sm shadow-sm z-10">
             
             {/* EDIT BUTTON */}
             <button 
               onClick={() => setIsEditing(true)} 
               className="text-gray-500 hover:text-blue-600 transition-colors p-1 hover:scale-110"
             >
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                 <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
               </svg>
             </button>
             
             {/* DELETE BUTTON */}
             <button 
               onClick={handleDelete} 
               className="text-gray-500 hover:text-red-600 transition-colors p-1 hover:scale-110"
             >
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                 <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
               </svg>
             </button>
          </div>
        )}

        {/* Name & Role */}
        <div className="font-bold text-sm flex items-center">
          {isManager && <span className="mr-1 text-yellow-600 text-lg leading-none pt-1">★</span>}
          <span className={isManager ? "ml-1" : ""}>
            {shift.profiles?.full_name?.split(' ')[0] || 'Unknown'}
          </span>
        </div>

        {/* Time */}
        <div 
          className="text-xs opacity-90 font-medium"
          suppressHydrationWarning={true}
        >
          {new Date(shift.start_time).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})} - 
          {new Date(shift.end_time).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})}
        </div>
      </div>

      {/* RENDER MODAL HERE (Passed weekDays down) */}
      {isEditing && (
        <EditShiftModal 
          shift={shift} 
          onClose={() => setIsEditing(false)} 
          weekDays={weekDays} 
        />
      )}
    </>
  );
}