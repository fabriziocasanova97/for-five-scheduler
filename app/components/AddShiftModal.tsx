'use client'; 

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

// Setup Supabase (Client Side)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AddShiftModal({ storeId, staffList }: { storeId: string, staffList: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter(); // To refresh page after save

  // Form State
  const [userId, setUserId] = useState('');
  const [date, setDate] = useState('');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('17:00');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // --- TIMEZONE FIX ---
    const startObj = new Date(`${date}T${start}`);
    const endObj = new Date(`${date}T${end}`);

    const { error } = await supabase.from('shifts').insert({
      store_id: storeId,
      user_id: userId,
      start_time: startObj.toISOString(),
      end_time: endObj.toISOString()
    });
    // --------------------

    if (error) {
      alert('Error saving shift: ' + error.message);
    } else {
      setIsOpen(false); // Close modal
      router.refresh(); // Refresh the schedule
    }
    setLoading(false);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-black text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-800 transition shadow-lg"
      >
        + Add Shift
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-xl w-96 shadow-2xl border border-gray-200">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Add New Shift</h2>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              
              {/* Staff Select - Fixed Text Color */}
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-700">Staff Member</label>
                <select 
                  className="w-full border border-gray-300 p-2.5 rounded-lg text-black bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                >
                  <option value="" className="text-gray-500">-- Select Barista --</option>
                  {staffList.map((person) => (
                    <option key={person.id} value={person.id} className="text-black">
                      {person.full_name} ({person.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Input - Fixed Text Color */}
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-700">Date</label>
                <input 
                  type="date" 
                  className="w-full border border-gray-300 p-2.5 rounded-lg text-black bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  required 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              {/* Time Range - Fixed Text Color */}
              <div className="flex gap-4">
                <div className="w-1/2">
                  <label className="block text-sm font-bold mb-2 text-gray-700">Start</label>
                  <input 
                    type="time" 
                    className="w-full border border-gray-300 p-2.5 rounded-lg text-black bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                  />
                </div>
                <div className="w-1/2">
                  <label className="block text-sm font-bold mb-2 text-gray-700">End</label>
                  <input 
                    type="time" 
                    className="w-full border border-gray-300 p-2.5 rounded-lg text-black bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
                <button 
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-gray-600 font-medium hover:text-black hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
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