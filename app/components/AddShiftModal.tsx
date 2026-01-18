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
  const [note, setNote] = useState(''); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- NEW: AVAILABILITY STATE ---
  const [availabilityList, setAvailabilityList] = useState<any[]>([]);
  const [availabilityWarning, setAvailabilityWarning] = useState<string | null>(null);

  useEffect(() => {
    if (preSelectedDate) setDate(preSelectedDate);
  }, [preSelectedDate]);

  // --- NEW: FETCH AVAILABILITY RULES ---
  useEffect(() => {
    const fetchAvailability = async () => {
      const { data } = await supabase.from('availability').select('*');
      if (data) setAvailabilityList(data);
    };
    if (isOpen) fetchAvailability();
  }, [isOpen]);

  // --- NEW: CHECK AVAILABILITY ---
  useEffect(() => {
    if (!employeeId || !date) {
      setAvailabilityWarning(null);
      return;
    }

    // Convert selected Date to Day Name (e.g., "Monday")
    const dateObj = new Date(date + 'T12:00:00'); 
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

    // Find rule
    const rule = availabilityList.find(r => 
      r.user_id === employeeId && 
      r.day_of_week === dayName
    );

    if (rule && !rule.is_available) {
      // UPDATED MESSAGE HERE
      setAvailabilityWarning(`${dayName}: Marked as unavailable`);
    } else {
      setAvailabilityWarning(null);
    }
  }, [employeeId, date, availabilityList]);


  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // --- TIMEZONE FIX START ---
    const startObj = new Date(`${date}T${startTime}`);
    const endObj = new Date(`${date}T${endTime}`);
    
    if (endObj <= startObj) {
      setError('End time must be after start time.');
      setLoading(false);
      return;
    }

    const startIso = startObj.toISOString();
    const endIso = endObj.toISOString();
    // --- TIMEZONE FIX END ---

    // --- CONFLICT DETECTION (EXISTING) ---
    if (employeeId) {
      try {
        const { data: conflicts, error: conflictError } = await supabase
          .from('shifts')
          .select('*, stores(name)') 
          .eq('user_id', employeeId)
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
          return; 
        }
      } catch (err) {
        console.error("Conflict check failed:", err);
      }
    }

    const { error: insertError } = await supabase
      .from('shifts')
      .insert([
        {
          store_id: storeId,
          user_id: employeeId || null, 
          start_time: startIso,
          end_time: endIso,
          note: note.trim() || null,
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
              className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm p-3 focus:ring-black focus:border-black rounded-none outline-none appearance-none font-bold"
              required={false}
            >
              <option value="" className="text-blue-600 font-extrabold">
              OPEN SHIFT
              </option>
              
              <option disabled>-------------------</option>

              {staffList.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* --- NEW: AVAILABILITY WARNING --- */}
          {availabilityWarning && (
            <div className="p-3 bg-red-50 border-l-4 border-red-500 animate-in fade-in slide-in-from-top-1">
               <p className="text-xs font-bold text-red-700 uppercase tracking-wide">
                 Unavailable
               </p>
               <p className="text-xs text-red-600 mt-1">
                 {availabilityWarning}
               </p>
            </div>
          )}

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

          {/* Note Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
              Note (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Bring keys, do inventory..."
              className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm p-3 focus:ring-black focus:border-black rounded-none outline-none"
            />
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
              className={`flex-1 py-3 text-white font-bold uppercase tracking-widest text-xs transition-colors disabled:opacity-50 ${availabilityWarning ? 'bg-red-600 hover:bg-red-700' : 'bg-black hover:bg-gray-800'}`}
            >
              {loading ? 'Checking...' : (availabilityWarning ? 'Override & Save' : (employeeId ? 'Save Shift' : 'Create Open Shift'))}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}