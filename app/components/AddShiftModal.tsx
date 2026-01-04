// @ts-nocheck
'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AddShiftModal({ storeId, staffList, weekDays, amIBoss }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Default to the first staff member if available
  const [formData, setFormData] = useState({
    user_id: '',
    date: weekDays[0].isoDate, // Default to Monday
    start_time: '09:00',
    end_time: '17:00'
  });

  const handleOpen = () => {
    // Reset form when opening
    setFormData({
      user_id: staffList.length > 0 ? staffList[0].id : '',
      date: weekDays[0].isoDate,
      start_time: '09:00',
      end_time: '17:00'
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Validate Inputs
      if (!formData.user_id) throw new Error("Please select a staff member");

      // 2. Create ISO Date Strings (combining Date + Time)
      const startDate = new Date(`${formData.date}T${formData.start_time}:00`);
      const endDate = new Date(`${formData.date}T${formData.end_time}:00`);

      // 3. Send to Supabase
      const { error } = await supabase.from('shifts').insert([
        {
          store_id: storeId,
          user_id: formData.user_id, // <--- IMPORTANT: Using user_id
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString()
        }
      ]);

      if (error) throw error;

      // 4. Success
      setIsOpen(false);
      window.location.reload(); // Force refresh to show new shift

    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // If not boss, don't show the button
  if (!amIBoss) return null;

  return (
    <>
      <button 
        onClick={handleOpen}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-sm transition whitespace-nowrap text-sm"
      >
        + Add Shift
      </button>

      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4 text-gray-900">Add New Shift</h2>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* STAFF SELECT */}
              <div>
                <label className="block text-sm font-bold text-gray-700">Staff Member</label>
                <select 
                  className="w-full border p-2 rounded bg-white text-gray-900"
                  value={formData.user_id}
                  onChange={e => setFormData({...formData, user_id: e.target.value})}
                  required
                >
                  {staffList.map(staff => (
                    <option key={staff.id} value={staff.id}>
                      {staff.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* DATE SELECT */}
              <div>
                <label className="block text-sm font-bold text-gray-700">Day</label>
                <select 
                  className="w-full border p-2 rounded bg-white text-gray-900"
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                >
                  {weekDays.map(day => (
                    <option key={day.isoDate} value={day.isoDate}>
                      {day.name} ({day.dateLabel})
                    </option>
                  ))}
                </select>
              </div>

              {/* TIME INPUTS */}
              <div className="flex gap-4">
                <div className="w-1/2">
                  <label className="block text-sm font-bold text-gray-700">Start</label>
                  <input 
                    type="time" 
                    className="w-full border p-2 rounded text-gray-900"
                    value={formData.start_time}
                    onChange={e => setFormData({...formData, start_time: e.target.value})}
                    required
                  />
                </div>
                <div className="w-1/2">
                  <label className="block text-sm font-bold text-gray-700">End</label>
                  <input 
                    type="time" 
                    className="w-full border p-2 rounded text-gray-900"
                    value={formData.end_time}
                    onChange={e => setFormData({...formData, end_time: e.target.value})}
                    required
                  />
                </div>
              </div>

              {/* ACTIONS */}
              <div className="flex justify-end gap-2 mt-4">
                <button 
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 disabled:opacity-50"
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