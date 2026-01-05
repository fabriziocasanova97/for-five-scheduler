// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface AddShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  staffList: any[];
  weekDays: any[];
  amIBoss: boolean;
  preSelectedDate?: string;
  onShiftAdded: () => void;
}

export default function AddShiftModal({
  isOpen,
  onClose,
  storeId,
  staffList,
  weekDays,
  preSelectedDate,
  onShiftAdded
}: AddShiftModalProps) {
  
  // FORM STATE
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState(preSelectedDate || (weekDays && weekDays[0]?.isoDate) || '');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (preSelectedDate) setDate(preSelectedDate);
  }, [preSelectedDate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // --- TIMEZONE FIX START ---
    const startObj = new Date(`${date}T${startTime}`);
    const endObj = new Date(`${date}T${endTime}`);

    // 2. Validate
    if (!employeeId) {
      setError('Please select an employee.');
      setLoading(false);
      return;
    }
    if (endObj <= startObj) {
      setError('End time must be after start time.');
      setLoading(false);
      return;
    }

    // 3. Convert to UTC Strings for Supabase
    const startIso = startObj.toISOString();
    const endIso = endObj.toISOString();
    // --- TIMEZONE FIX END ---

    // --- STEP 4: CONFLICT DETECTION (NEW) ---
    // 
    try {
      const { data: conflicts, error: conflictError } = await supabase
        .from('shifts')
        .select('*, stores(name)') // Fetch store name to show where they are working
        .eq('user_id', employeeId)
        .lt('start_time', endIso) // Existing shift starts before new shift ends
        .gt('end_time', startIso); // Existing shift ends after new shift starts

      if (conflictError) throw conflictError;

      // If we found a conflict...
      if (conflicts && conflicts.length > 0) {
        const conflict = conflicts[0];
        const storeName = conflict.stores?.name || 'Unknown Location';
        
        // Format time for the error message
        const conflictStart = new Date(conflict.start_time).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'});
        const conflictEnd = new Date(conflict.end_time).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'});

        setError(`CONFLICT: This person is already working at ${storeName} (${conflictStart} - ${conflictEnd}).`);
        setLoading(false);
        return; // STOP EXECUTION HERE
      }
    } catch (err) {
      console.error("Conflict check failed:", err);
      // We don't stop strictly on technical error, but usually safer to alert
    }
    // --- END CONFLICT DETECTION ---

    const { error: insertError } = await supabase
      .from('shifts')
      .insert([
        {
          store_id: storeId,
          user_id: employeeId, 
          start_time: startIso,
          end_time: endIso,
        },
      ]);

    if (insertError) {
      console.error("Insert Error:", insertError);
      setError(insertError.message);
      setLoading(false);
    } else {
      setLoading(false);
      onShiftAdded(); 
      onClose(); 
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      
      {/* 1. BACKDROP */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* 2. MODAL CONTENT */}
      <div className="relative bg-white w-full max-w-md p-8 shadow-2xl transform transition-all border border-gray-200">
        
        {/* Header */}
        <div className="mb-8 text-center border-b-2 border-black pb-4">
          <h2 className="text-2xl font-extrabold uppercase tracking-widest text-black">
            Add Shift
          </h2>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-bold uppercase tracking-wide">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Employee Select */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
              Select Staff
            </label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm p-3 focus:ring-black focus:border-black rounded-none outline-none appearance-none"
              required
            >
              <option value="">-- Choose Employee --</option>
              {staffList.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Select */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
              Shift Date
            </label>
            <select
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm p-3 focus:ring-black focus:border-black rounded-none outline-none appearance-none"
              required
            >
              {weekDays && weekDays.map((day) => (
                <option key={day.isoDate} value={day.isoDate}>
                  {day.name} {day.dateLabel}
                </option>
              ))}
            </select>
          </div>

          {/* Time Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm p-3 focus:ring-black focus:border-black rounded-none outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm p-3 focus:ring-black focus:border-black rounded-none outline-none"
                required
              />
            </div>
          </div>

          {/* Actions */}
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
              {loading ? 'Checking...' : 'Save Shift'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}