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

// Added 'amIBoss' to the props below
export default function ShiftCard({ shift, staffList, weekDays, amIBoss = false }: any) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const role = shift.profiles?.role || '';
  const isManager = role.trim() === 'Manager';

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this shift?')) return;
    setIsDeleting(true);
    const { error } = await supabase.from('shifts').delete().eq('id', shift.id);
    if (error) {
      alert(error.message);
      setIsDeleting(false);
    } else {
      router.refresh();
    }
  };

  if (isDeleting) return <div className="text-xs text-gray-400">Deleting...</div>;

  const cardStyle = isManager 
    ? "bg-purple-50 border-purple-500 shadow-sm" 
    : "bg-white border-blue-500 shadow";

  return (
    <div className={`p-3 rounded border-l-4 relative group transition-all hover:shadow-md ${cardStyle}`}>
      
      {/* ACTION BUTTONS CONTAINER - LOCKED FOR NON-BOSSES */}
      {amIBoss && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded px-1 z-10 shadow-sm border">
          
          {/* 1. EDIT BUTTON */}
          <EditShiftModal shift={shift} staffList={staffList} weekDays={weekDays} />

          {/* 2. DELETE BUTTON */}
          <button 
            onClick={handleDelete}
            className="text-gray-400 hover:text-red-600 transition-colors p-1"
            title="Delete Shift"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 pr-12">
        <p className={`font-bold text-sm ${isManager ? 'text-purple-900' : 'text-gray-800'}`}>
          {shift.profiles?.full_name || 'Unknown'}
        </p>
        {isManager && <span className="bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">MGR</span>}
      </div>
      
      <p className={`text-xs mt-1 ${isManager ? 'text-purple-700' : 'text-gray-500'}`}>
        {new Date(shift.start_time).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})} - 
        {new Date(shift.end_time).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})}
      </p>
    </div>
  );
}