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

export default function ShiftCard({ shift, amIBoss, weekDays, currentUserId, onDelete }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [processing, setProcessing] = useState(false);

  // --- ACTIONS ---
  
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this shift?')) return;
    
    await supabase.from('shifts').delete().eq('id', shift.id);
    
    // Call the parent refresh function instead of reloading the page
    if (onDelete) onDelete();
    else window.location.reload(); 
  };

  // --- SWAP HANDLERS ---
  const handleOfferSwap = async () => {
    if (!confirm("Offer this shift for swap? It will become visible for others to pick up.")) return;
    setProcessing(true);
    
    const { error } = await supabase
      .from('shifts')
      .update({ swap_status: 'offered' })
      .eq('id', shift.id);

    if (error) {
      alert(error.message);
      setProcessing(false);
    } else {
      if (onDelete) onDelete(); // Refresh Parent
      else window.location.reload();
    }
  };

  const handleCancelOffer = async () => {
    setProcessing(true);
    const { error } = await supabase
      .from('shifts')
      .update({ swap_status: 'none', swap_candidate_id: null }) // Reset everything
      .eq('id', shift.id);

    if (error) {
       alert(error.message);
       setProcessing(false);
    } else {
       if (onDelete) onDelete(); // Refresh Parent
       else window.location.reload();
    }
  };

  // --- STYLE LOGIC ---
  const getShiftStyle = (shift) => {
    // If it is offered for swap, highlight it slightly
    if (shift.swap_status === 'offered') {
       return 'bg-amber-50 border-2 border-dashed border-amber-400 text-amber-900';
    }

    if (!shift.user_id) {
      return 'bg-blue-50 border-2 border-dashed border-blue-400 text-blue-900';
    }
    const role = shift.profiles?.role?.trim();
    if (role === 'Manager' || role === 'Operations') {
      return 'bg-white border-2 border-purple-600 text-gray-900';
    }
    const date = new Date(shift.start_time);
    const hour = date.getHours(); 
    if (hour < 7) return 'bg-white border-2 border-emerald-500 text-gray-900'; 
    if (hour < 10) return 'bg-white border-2 border-blue-500 text-gray-900'; 
    return 'bg-white border-2 border-orange-500 text-gray-900'; 
  };

  const styleClass = getShiftStyle(shift);
  
  const role = shift.profiles?.role?.trim();
  const isManager = role === 'Manager' || role === 'Operations';
  const isOpenShift = !shift.user_id;
  
  // --- SWAP HELPERS ---
  // We use the prop passed from parent (currentUserId) for instant check
  const isMyShift = currentUserId === shift.user_id;
  const isOffered = shift.swap_status === 'offered';
  const isPending = shift.swap_status === 'pending_approval';

  return (
    <>
      <div className={`p-2 rounded mb-2 relative group transition-all ${styleClass}`}>
        
        {/* BOSS CONTROL PANEL (Pencil/Trash) */}
        {amIBoss && (
          <div className="absolute top-1 right-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex gap-1 bg-white/90 border border-gray-200 rounded px-1 backdrop-blur-sm z-10">
             <button 
               onClick={() => setIsEditing(true)} 
               className="text-gray-500 hover:text-blue-600 transition-colors p-1 hover:scale-110"
             >
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                 <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
               </svg>
             </button>
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

        {/* OWNER SWAP CONTROLS (Icons) */}
        {!amIBoss && isMyShift && (
          <div className="absolute top-1 right-1 z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex gap-1 bg-white/90 border border-gray-200 rounded px-1 backdrop-blur-sm">
             {/* If NO swap active, show OFFER icon (Cycle Arrows) */}
             {!isOffered && !isPending && (
               <button 
                 onClick={handleOfferSwap}
                 disabled={processing}
                 title="Offer Shift for Swap"
                 className="text-gray-500 hover:text-amber-600 transition-colors p-1 hover:scale-110 disabled:opacity-50"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                 </svg>
               </button>
             )}

             {/* If OFFERED, show CANCEL icon (X mark) */}
             {isOffered && (
               <button 
                 onClick={handleCancelOffer}
                 disabled={processing}
                 title="Cancel Offer"
                 className="text-amber-600 hover:text-red-600 transition-colors p-1 hover:scale-110 disabled:opacity-50"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                 </svg>
               </button>
             )}
          </div>
        )}

        {/* Name & Role */}
        <div className="font-bold text-sm flex items-center gap-1">
          {isOpenShift ? (
            <span className="text-blue-700 uppercase tracking-widest text-[10px]">
              ● Open Shift
            </span>
          ) : (
            <>
              {isManager && (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-purple-600">
                  <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                </svg>
              )}
              <span className="truncate">
                {shift.profiles?.full_name?.split(' ')[0] || 'Unknown'}
              </span>
            </>
          )}
        </div>

        {/* SWAP STATUS INDICATORS */}
        {isOffered && (
          <div className="mb-1">
             <span className="text-[10px] font-extrabold text-amber-600 uppercase tracking-widest">
               ● Swap Offered
             </span>
          </div>
        )}
        
        {isPending && (
          <div className="mb-1">
             <span className="text-[10px] font-extrabold text-purple-600 uppercase tracking-widest">
               ● Approval Pending
             </span>
          </div>
        )}

        {/* Time */}
        <div 
          className="text-xs opacity-90 font-medium"
          suppressHydrationWarning={true}
        >
          {new Date(shift.start_time).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})} - 
          {new Date(shift.end_time).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})}
        </div>

        {/* Note Display */}
        {shift.note && (
           <div className={`mt-1 text-[12px] font-semibold italic border-t pt-1 leading-tight break-words ${isOpenShift ? 'text-blue-800 border-blue-200' : 'text-gray-500 border-gray-200/50'}`}>
             "{shift.note}"
           </div>
        )}

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