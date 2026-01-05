// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// We need weekDays passed in to show the dropdown correctly
export default function EditShiftModal({ shift, onClose, weekDays }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [error, setError] = useState(''); // Added Error State

  // 1. PRE-FILL LOGIC
  const startObj = new Date(shift.start_time);
  const endObj = new Date(shift.end_time);

  // Helper to format "HH:MM" (Local Time)
  const toTimeStr = (dateObj) => {
    return dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const [formData, setFormData] = useState({
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

  // 3. SAVE CHANGES (With Conflict Check)
  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Create Date objects from your Local Time inputs
    const startDate = new Date(`${formData.date}T${formData.start_time}:00`);
    const endDate = new Date(`${formData.date}T${formData.end_time}:00`);

    // Validation
    if (endDate <= startDate) {
      setError('End time must be after start time.');
      setLoading(false);
      return;
    }

    // Convert to UTC strings for the database
    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();

    // --- CONFLICT DETECTION (NEW) ---
    try {
      const { data: conflicts, error: conflictError } = await supabase
        .from('shifts')
        .select('*, stores(name)') 
        .eq('user_id', formData.user_id) // Check the user we are assigning
        .neq('id', shift.id) // <--- CRITICAL: Ignore the shift we are currently editing!
        .lt('start_time', endIso) 
        .gt('end_time', startIso); 

      if (conflictError) throw conflictError;

      if (conflicts && conflicts.length > 0) {
        const conflict = conflicts[0];
        const storeName = conflict.stores?.name || 'Unknown Location';
        
        const conflictStart = new Date(conflict.start_time).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'});
        const conflictEnd = new Date(conflict.end_time).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'});

        setError(`CONFLICT: This person is already working at ${storeName} (${conflictStart} - ${conflictEnd}).`);
        setLoading(false);
        return; // STOP EXECUTION
      }
    } catch (err) {
      console.error("Conflict check failed:", err);
    }
    // --- END CONFLICT DETECTION ---

    const { error: updateError } = await supabase
      .from('shifts')
      .update({
        user_id: formData.user_id,
        start_time: startIso,
        end_time: endIso
      })
      .eq('id', shift.id);

    if (updateError) {
      setError('Error updating: ' + updateError.message);
      setLoading(false);
    } else {
      window.location.reload();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* 1. BACKDROP */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"></div>

      {/* 2. MODAL CONTENT */}
      <div 
        className="relative bg-white w-full max-w-md p-8 shadow-2xl transform transition-all border border-gray-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-8 text-center border-b-2 border-black pb-4">
          <h2 className="text-2xl font-extrabold uppercase tracking-widest text-black">
            Edit Shift
          </h2>
        </div>

        {/* Error Message (Added) */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-bold uppercase tracking-wide">
            {error}
          </div>
        )}
        
        <form onSubmit={handleUpdate} className="space-y-6">
          
          {/* STAFF */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
              Staff Member
            </label>
            <select 
              className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm p-3 focus:ring-black focus:border-black rounded-none outline-none appearance-none"
              required
              value={formData.user_id}
              onChange={e => setFormData({...formData, user_id: e.target.value})}
            >
              {staffList.map(s => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>
          </div>

          {/* DATE - Dropdown List */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
              Date
            </label>
            <select
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm p-3 focus:ring-black focus:border-black rounded-none outline-none appearance-none"
              required
            >
               {weekDays && weekDays.map((day) => (
                <option key={day.isoDate} value={day.isoDate}>
                  {day.name} {day.dateLabel}
                </option>
              ))}
              {!weekDays && <option value={formData.date}>{formData.date}</option>}
            </select>
          </div>

          {/* TIME */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                Start Time
              </label>
              <input 
                type="time" 
                className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm p-3 focus:ring-black focus:border-black rounded-none outline-none"
                required
                value={formData.start_time}
                onChange={e => setFormData({...formData, start_time: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                End Time
              </label>
              <input 
                type="time" 
                className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm p-3 focus:ring-black focus:border-black rounded-none outline-none"
                required
                value={formData.end_time}
                onChange={e => setFormData({...formData, end_time: e.target.value})}
              />
            </div>
          </div>

          {/* BUTTONS */}
          <div className="flex gap-4 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-gray-300 text-gray-700 font-bold uppercase tracking-widest text-xs hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-black text-white font-bold uppercase tracking-widest text-xs hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Checking...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}