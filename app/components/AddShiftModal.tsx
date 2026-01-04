// @ts-nocheck
'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AddShiftModal({ storeId, staffList, weekDays, amIBoss = false }) {
  
  // --- SECURITY CHECK ---
  if (!amIBoss) return null;

  const [isOpen, setIsOpen] = useState(false);
  
  // Safe default: Check if weekDays exists
  const defaultDate = (weekDays && weekDays.length > 0) ? weekDays[0].isoDate : '';

  const [staffId, setStaffId] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [loading, setLoading] = useState(false);

  // Update date if week changes
  const handleOpen = () => {
    setIsOpen(true);
    if (!date && weekDays && weekDays.length > 0) {
        setDate(weekDays[0].isoDate);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!staffId || !date) return;
    
    setLoading(true);

    // Convert Local Time to UTC
    const startDate = new Date(`${date}T${startTime}:00`);
    const endDate = new Date(`${date}T${endTime}:00`);
    
    const { error } = await supabase.from('shifts').insert({
      store_id: storeId,
      // ---------------------------------------------------------
      // CRITICAL FIX: The database column is 'user_id'
      // We map the variable 'staffId' to the column 'user_id'
      // ---------------------------------------------------------
      user_id: staffId, 
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString()
    });

    if (error) {
      alert(error.message);
    } else {
      setIsOpen(false);
      // FORCE REFRESH: This ensures the shift appears instantly
      window.location.reload(); 
      setStaffId('');
    }
    setLoading(false);
  };

  return (
    <>
      <button 
        onClick={handleOpen}
        className="bg-black text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-800 transition shadow-md"
      >
        + Add Shift
      </button>

      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4 text-gray-900">Add New Shift</h2>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              
              {/* STAFF SELECTOR */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Staff Member</label>
                <select 
                  className="w-full border p-3 rounded-lg bg-gray-50 font-medium text-gray-900" 
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  required
                >
                  <option value="">-- Select Staff --</option>
                  {staffList.map(person => (
                    <option key={person.id} value={person.id}>
                      {person.full_name} ({person.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* DATE SELECTOR */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                <select 
                  className="w-full border p-3 rounded-lg bg-gray-50 font-medium text-gray-900"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                >
                  {weekDays.map(day => (
                    <option key={day.isoDate} value={day.isoDate}>
                      {day.name}, {day.dateLabel}
                    </option>
                  ))}
                </select>
              </div>

              {/* TIME SELECTORS */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Time</label>
                  <input type="time" className="w-full border p-3 rounded-lg bg-gray-50 text-gray-900" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Time</label>
                  <input type="time" className="w-full border p-3 rounded-lg bg-gray-50 text-gray-900" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
                </div>
              </div>

              {/* BUTTONS */}
              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => setIsOpen(false)} className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-lg">{loading ? 'Saving...' : 'Save Shift'}</button>
              </div>

            </form>
          </div>
        </div>
      )}
    </>
  );
}