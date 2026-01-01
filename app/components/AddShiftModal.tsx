'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type DayInfo = {
  isoDate: string;
  name: string;
  dateLabel: string;
};

type Props = {
  storeId: string;
  staffList: any[];
  weekDays: DayInfo[]; 
};

export default function AddShiftModal({ storeId, staffList, weekDays }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  // Form State
  const [staffId, setStaffId] = useState('');
  
  // Default to the first day of the view (Monday)
  const [date, setDate] = useState(weekDays[0]?.isoDate || '');
  
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [loading, setLoading] = useState(false);

  // Update date if week changes
  const handleOpen = () => {
    setIsOpen(true);
    // Ensure we default to the current view's Monday if not set
    if (!date || !weekDays.find(d => d.isoDate === date)) {
        setDate(weekDays[0].isoDate);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId || !date) return;
    
    setLoading(true);

    // Combine Date + Time
    const startIso = `${date}T${startTime}:00`;
    const endIso = `${date}T${endTime}:00`;

    const { error } = await supabase.from('shifts').insert({
      store_id: storeId,
      profile_id: staffId,
      start_time: startIso,
      end_time: endIso
    });

    if (error) {
      alert(error.message);
    } else {
      setIsOpen(false);
      router.refresh();
      // Optional: Reset form
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md">
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
                  <input 
                    type="time" 
                    className="w-full border p-3 rounded-lg bg-gray-50 text-gray-900"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required 
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Time</label>
                  <input 
                    type="time" 
                    className="w-full border p-3 rounded-lg bg-gray-50 text-gray-900"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required 
                  />
                </div>
              </div>

              {/* BUTTONS */}
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
                  className="flex-1 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-lg disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Shift'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </>
  );
}