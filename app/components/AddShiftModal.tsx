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

  // --- AVAILABILITY & STATS STATE ---
  const [availabilityList, setAvailabilityList] = useState<any[]>([]);
  const [availabilityWarning, setAvailabilityWarning] = useState<string | null>(null);
  
  // Smart Sorting Data
  const [weeklyHours, setWeeklyHours] = useState<Record<string, number>>({});
  const [workingLocations, setWorkingLocations] = useState<Record<string, string>>({});
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    if (preSelectedDate) setDate(preSelectedDate);
  }, [preSelectedDate]);

  // 1. FETCH AVAILABILITY RULES
  useEffect(() => {
    const fetchAvailability = async () => {
      const { data } = await supabase.from('availability').select('*');
      if (data) setAvailabilityList(data);
    };
    if (isOpen) fetchAvailability();
  }, [isOpen]);

  // 2. FETCH WEEKLY STATS & LOCATIONS
  useEffect(() => {
    const fetchStats = async () => {
      if (!isOpen || !date) return;
      setStatsLoading(true);

      // A. Calculate Week Range
      const current = new Date(date);
      const day = current.getDay(); 
      const diff = current.getDate() - day + (day === 0 ? -6 : 1); 
      const monday = new Date(current);
      monday.setDate(diff);
      monday.setHours(0,0,0,0);
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23,59,59,999);

      // B. Fetch Shifts (NOW INCLUDING STORE NAME)
      const { data: shifts } = await supabase
        .from('shifts')
        .select('user_id, start_time, end_time, stores(name)') 
        .gte('start_time', monday.toISOString())
        .lte('start_time', sunday.toISOString());

      if (!shifts) {
        setStatsLoading(false);
        return;
      }

      // C. Process Data
      const hoursMap: Record<string, number> = {};
      const locationMap: Record<string, string> = {}; 

      shifts.forEach(shift => {
        if (!shift.user_id) return;

        // Add to Total Hours
        const start = new Date(shift.start_time).getTime();
        const end = new Date(shift.end_time).getTime();
        const duration = (end - start) / (1000 * 60 * 60); 
        hoursMap[shift.user_id] = (hoursMap[shift.user_id] || 0) + duration;

        // Check if working TODAY -> Save Store Name
        if (shift.start_time.startsWith(date)) {
          locationMap[shift.user_id] = shift.stores?.name || 'Unknown Location';
        }
      });

      setWeeklyHours(hoursMap);
      setWorkingLocations(locationMap);
      setStatsLoading(false);
    };

    fetchStats();
  }, [isOpen, date]);


  // 3. CHECK SPECIFIC CONFLICTS
  useEffect(() => {
    if (!employeeId || !date) {
      setAvailabilityWarning(null);
      return;
    }

    const dateObj = new Date(date + 'T12:00:00'); 
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

    const rule = availabilityList.find(r => 
      r.user_id === employeeId && 
      r.day_of_week === dayName
    );

    // Check Availability Rule
    if (rule && !rule.is_available) {
      setAvailabilityWarning(`${dayName}: Marked as unavailable`);
      return;
    }

    // Check Time Boundaries
    if (rule && rule.is_available && rule.start_time && rule.end_time) {
      const shiftStart = startTime;
      const shiftEnd = endTime;
      const availStart = rule.start_time.slice(0, 5); 
      const availEnd = rule.end_time.slice(0, 5);     

      if (shiftStart < availStart) {
        setAvailabilityWarning(`Starts too early! Available from ${formatTime12(availStart)}`);
        return;
      }
      if (shiftEnd > availEnd) {
        setAvailabilityWarning(`Ends too late! Available until ${formatTime12(availEnd)}`);
        return;
      }
    }

    // Check Overtime Warning
    const currentHours = weeklyHours[employeeId] || 0;
    const s = parseInt(startTime.split(':')[0]);
    const e = parseInt(endTime.split(':')[0]);
    const thisShiftLen = e - s;
    if (currentHours + thisShiftLen > 40) {
      setAvailabilityWarning(`⚠️ Overtime Risk: Will exceed 40hrs (${(currentHours + thisShiftLen).toFixed(1)}h)`);
      return;
    }

    setAvailabilityWarning(null);

  }, [employeeId, date, startTime, endTime, availabilityList, weeklyHours]); 

  const formatTime12 = (time24: string) => {
    const [h, m] = time24.split(':');
    let hours = parseInt(h);
    const suffix = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${m} ${suffix}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const startObj = new Date(`${date}T${startTime}`);
    const endObj = new Date(`${date}T${endTime}`);
    
    if (endObj <= startObj) {
      setError('End time must be after start time.');
      setLoading(false);
      return;
    }

    const startIso = startObj.toISOString();
    const endIso = endObj.toISOString();

    // Check Existing Shifts Conflict
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
          setError(`CONFLICT: Already working at ${storeName}`);
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
      setError(insertError.message);
      setLoading(false);
    } else {
      setLoading(false);
      onShiftAdded(); 
      onClose(); 
    }
  };

  // --- SMART SORTING (UPDATED) ---
  const availableStaff = [];
  const busyStaff = [];

  staffList.forEach(staff => {
    const workingAt = workingLocations[staff.id];
    
    const dateObj = new Date(date + 'T12:00:00'); 
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const rule = availabilityList.find(r => r.user_id === staff.id && r.day_of_week === dayName);
    const isUnavailable = rule && !rule.is_available;

    if (workingAt) {
      busyStaff.push({ ...staff, reason: `At ${workingAt}` });
    } else if (isUnavailable) {
      busyStaff.push({ ...staff, reason: 'Unavailable' });
    } else {
      availableStaff.push(staff);
    }
  });

  availableStaff.sort((a, b) => (weeklyHours[a.id] || 0) - (weeklyHours[b.id] || 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      <div className="relative bg-white w-full max-w-md p-8 shadow-2xl transform transition-all border border-gray-200">
        
        <div className="mb-8 text-center border-b-2 border-black pb-4">
          <h2 className="text-2xl font-extrabold uppercase tracking-widest text-black">
            Add Shift
          </h2>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-bold uppercase tracking-wide">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* DATE SELECT */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
              Shift Date
            </label>
            <select
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm p-3 focus:ring-black focus:border-black rounded-none outline-none appearance-none font-bold"
              required
            >
              {weekDays && weekDays.map((day) => (
                <option key={day.isoDate} value={day.isoDate}>
                  {day.name} {day.dateLabel}
                </option>
              ))}
            </select>
          </div>

          {/* SMART EMPLOYEE SELECT */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
              Select Staff {statsLoading && '(Updating...)'}
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
              
              {/* UPDATED: MINIMALIST LABELS */}
              <optgroup label="✓ AVAILABLE">
                {availableStaff.map((staff) => {
                  const hrs = weeklyHours[staff.id] || 0;
                  const risk = hrs > 35 ? '(!)' : ''; // Replaced yellow emoji with text alert
                  return (
                    <option key={staff.id} value={staff.id}>
                      {staff.full_name} ({hrs.toFixed(0)}h) {risk}
                    </option>
                  );
                })}
              </optgroup>

              <optgroup label="✕ UNAVAILABLE">
                {busyStaff.map((staff) => (
                  <option key={staff.id} value={staff.id} disabled>
                    {staff.full_name} ({staff.reason})
                  </option>
                ))}
              </optgroup>

            </select>
          </div>

          {availabilityWarning && (
            <div className="p-3 bg-red-50 border-l-4 border-red-500 animate-in fade-in slide-in-from-top-1">
               <p className="text-xs font-bold text-red-700 uppercase tracking-wide">
                 ⚠️ Warning
               </p>
               <p className="text-xs text-red-600 mt-1 font-medium">
                 {availabilityWarning}
               </p>
            </div>
          )}

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

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
              Note (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Bring keys..."
              className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm p-3 focus:ring-black focus:border-black rounded-none outline-none"
            />
          </div>

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