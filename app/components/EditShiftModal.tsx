'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function EditShiftModal({ shift, staffList, weekDays }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form State
  const [staffId, setStaffId] = useState(shift.user_id);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const handleOpen = () => {
    // 1. EXTRACT DATA FROM CURRENT SHIFT
    const startObj = new Date(shift.start_time);
    const endObj = new Date(shift.end_time);

    // Get YYYY-MM-DD
    const isoDate = startObj.toISOString().split('T')[0];
    
    // Get HH:MM (Local Time)
    const startStr = startObj.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' });
    const endStr = endObj.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' });

    setDate(isoDate);
    setStartTime(startStr);
    setEndTime(endStr);
    setStaffId(shift.user_id); 
    setIsOpen(true);
  };

  const handleUpdate = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    // 2. CONVERT BACK TO UTC
    const startDate = new Date(`${date}T${startTime}:00`);
    const endDate = new Date(`${date}T${endTime}:00`);
    
    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();

    const { error } = await supabase
      .from('shifts')
      .update({
        user_id: staffId,
        start_time: startIso,
        end_time: endIso
      })
      .eq('id', shift.id);

    if (error) {
      alert('Error updating: ' + error.message);
    } else {
      setIsOpen(false);
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <>
      <button 
        onClick={handleOpen}
        className="text-gray-400 hover:text-blue-600 transition-colors p-1"
        title="Edit Shift"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 cursor-default" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Edit Shift</h2>
            
            <form onSubmit={handleUpdate} className="flex flex-col gap-4">
              
              {/* STAFF */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Staff</label>
                <select 
                  className="w-full border p-3 rounded-lg bg-gray-50 font-medium text-gray-900"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  required
                >
                  {staffList.map((person: any) => (
                    <option key={person.id} value={person.id}>
                      {person.full_name} ({person.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* DATE */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                <select 
                  className="w-full border p-3 rounded-lg bg-gray-50 font-medium text-gray-900"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                >
                  {weekDays.map((day: any) => (
                    <option key={day.isoDate} value={day.isoDate}>
                      {day.name}, {day.dateLabel}
                    </option>
                  ))}
                </select>
              </div>

              {/* TIMES */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start</label>
                  <input 
                    type="time" 
                    className="w-full border p-3 rounded-lg bg-gray-50 text-gray-900"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required 
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End</label>
                  <input 
                    type="time" 
                    className="w-full border p-3 rounded-lg bg-gray-50 text-gray-900"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required 
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg"
                >
                  {loading ? 'Saving...' : 'Update Shift'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </>
  );
}