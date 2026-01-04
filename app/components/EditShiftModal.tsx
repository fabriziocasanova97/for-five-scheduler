// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function EditShiftModal({ shift, onClose }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState([]);

  // 1. PRE-FILL LOGIC
  const startObj = new Date(shift.start_time);
  const endObj = new Date(shift.end_time);

  // Helper to format "HH:MM" (Local Time)
  const toTimeStr = (dateObj) => {
    return dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const [formData, setFormData] = useState({
    // FIX: Use user_id (matching your database), fall back to profile_id if needed
    user_id: shift.user_id || shift.profile_id, 
    date: startObj.toISOString().split('T')[0], // YYYY-MM-DD
    start_time: toTimeStr(startObj),
    end_time: toTimeStr(endObj)
  });

  // 2. GET STAFF LIST
  useEffect(() => {
    const fetchStaff = async () => {
      const { data } = await supabase.from('profiles').select('*').order('full_name');
      setStaffList(data || []);
    };
    fetchStaff();
  }, []);

  // 3. SAVE CHANGES (With Timezone Fix)
  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Create Date objects from your Local Time inputs
    const startDate = new Date(`${formData.date}T${formData.start_time}:00`);
    const endDate = new Date(`${formData.date}T${formData.end_time}:00`);

    // Convert them to UTC strings for the database
    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();

    const { error } = await supabase
      .from('shifts')
      .update({
        user_id: formData.user_id, // <--- FIX: Correct column name
        start_time: startIso,
        end_time: endIso
      })
      .eq('id', shift.id);

    setLoading(false);

    if (error) {
      alert('Error updating: ' + error.message);
    } else {
      // FIX: Force a hard reload so the change appears instantly
      window.location.reload();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white p-6 rounded-lg w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4 text-gray-900">Edit Shift ✏️</h2>
        
        <form onSubmit={handleUpdate} className="flex flex-col gap-4">
          
          {/* STAFF */}
          <div>
            <label className="block text-sm font-bold text-gray-700">Staff Member</label>
            <select 
              className="w-full border p-2 rounded text-gray-900 bg-white"
              required
              value={formData.user_id} // <--- FIX: use user_id
              onChange={e => setFormData({...formData, user_id: e.target.value})}
            >
              {staffList.map(s => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>
          </div>

          {/* DATE */}
          <div>
            <label className="block text-sm font-bold text-gray-700">Date</label>
            <input 
              type="date" 
              className="w-full border p-2 rounded text-gray-900"
              required
              value={formData.date}
              onChange={e => setFormData({...formData, date: e.target.value})}
            />
          </div>

          {/* TIME */}
          <div className="flex gap-4">
            <div className="w-1/2">
              <label className="block text-sm font-bold text-gray-700">Start Time</label>
              <input 
                type="time" 
                className="w-full border p-2 rounded text-gray-900"
                required
                value={formData.start_time}
                onChange={e => setFormData({...formData, start_time: e.target.value})}
              />
            </div>
            <div className="w-1/2">
              <label className="block text-sm font-bold text-gray-700">End Time</label>
              <input 
                type="time" 
                className="w-full border p-2 rounded text-gray-900"
                required
                value={formData.end_time}
                onChange={e => setFormData({...formData, end_time: e.target.value})}
              />
            </div>
          </div>

          {/* BUTTONS */}
          <div className="flex justify-end gap-2 mt-4">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}