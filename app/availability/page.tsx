// @ts-nocheck
'use client';

import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// --- HELPER: CONVERT TO TITLE CASE ---
const toTitleCase = (str: string) => {
  if (!str) return '';
  return str.toLowerCase().split(' ').map(word => {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
};

export default function AvailabilityPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Manager Mode State
  const [amIBoss, setAmIBoss] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [targetUserId, setTargetUserId] = useState(''); 

  // --- DEADLINE LOGIC ---
  const today = new Date().getDay(); 
  const isDayLocked = today === 4 || today === 5 || today === 6 || today === 0;
  const isLocked = isDayLocked && !amIBoss;

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (targetUserId) {
      fetchAvailability(targetUserId);
    }
  }, [targetUserId]);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role?.trim();
    const isManager = role === 'Manager' || role === 'Operations';
    setAmIBoss(isManager);

    if (isManager) {
      const { data: staff } = await supabase.from('profiles').select('*').order('full_name');
      setStaffList(staff || []);
    }

    setTargetUserId(user.id);
  };

  const fetchAvailability = async (userId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('availability')
      .select('*')
      .eq('user_id', userId);

    const sorted = (data || []).sort((a, b) => {
      return DAYS_ORDER.indexOf(a.day_of_week) - DAYS_ORDER.indexOf(b.day_of_week);
    });

    setItems(sorted);
    setLoading(false);
  };

  const handleChange = (id, field, value) => {
    if (isLocked) return; 
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  // --- TOGGLE ALL DAY FUNCTION ---
  const handleSetAllDay = (id) => {
    if (isLocked) return;
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;

      // Check if it is currently set to All Day
      const isCurrentlyAllDay = item.start_time === '00:00' && item.end_time === '23:59';

      if (isCurrentlyAllDay) {
        // If ON, turn OFF (clear times)
        return { ...item, start_time: '', end_time: '' };
      } else {
        // If OFF (or partial), turn ON All Day
        return { ...item, start_time: '00:00', end_time: '23:59' };
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    
    const { error } = await supabase
      .from('availability')
      .upsert(items.map(item => ({
        id: item.id,
        user_id: targetUserId, 
        day_of_week: item.day_of_week,
        is_available: item.is_available,
        start_time: item.start_time || null,
        end_time: item.end_time || null
      })));

    setSaving(false);
    if (error) alert('Error saving: ' + error.message);
    else alert('Availability updated successfully!');
  };

  if (loading && !items.length) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* HEADER SECTION (Centered & Consistent Width) */}
      <div className="max-w-5xl mx-auto px-6 pt-10 pb-4">
        <h1 className="text-3xl font-extrabold text-gray-900 uppercase tracking-widest">
          {amIBoss ? 'Team Availability' : 'My Availability'}
        </h1>
        <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">
           {amIBoss ? 'Manage Weekly Patterns' : 'Standard Weekly Pattern'}
        </p>

        {/* --- MANAGER DROPDOWN --- */}
        {amIBoss && (
          <div className="mt-8 mb-4 max-w-sm">
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
              Viewing Availability For:
            </label>
            <div className="relative">
              <select
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="appearance-none block w-full bg-white border border-gray-300 text-gray-900 py-3 px-4 pr-10 rounded-none leading-tight focus:outline-none focus:border-black font-bold tracking-wide text-sm"
              >
                {staffList.map(staff => (
                  <option key={staff.id} value={staff.id}>
                    {toTitleCase(staff.full_name)}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-900">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 italic">
              * Manager override active
            </p>
          </div>
        )}

        {/* --- GUIDELINES SECTION --- */}
        {!amIBoss && (
          <div className="mt-8 p-6 bg-white border border-gray-200 shadow-sm">
             <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-4 border-b border-gray-100 pb-2">
               Please Read Before Submitting
             </h3>
             <ul className="space-y-4">
               <li className="flex gap-4 items-start">
                 <span className="text-black font-bold text-xs mt-0.5">01</span>
                 <p className="text-xs text-gray-600 font-medium leading-relaxed">
                   This form is for your <strong className="text-black">permanent schedule</strong>. If you need a specific date off, please text your Manager directly.
                 </p>
               </li>
               <li className="flex gap-4 items-start">
                 <span className="text-black font-bold text-xs mt-0.5">02</span>
                 <p className="text-xs text-gray-600 font-medium leading-relaxed">
                   Only limit your hours if you <strong className="text-black">absolutely CANNOT</strong> be at work. Otherwise, mark yourself fully available.
                 </p>
               </li>
             </ul>
          </div>
        )}

        {/* --- LOCKED BANNER --- */}
        {isLocked && (
          <div className="mt-8 bg-amber-50 border-l-4 border-amber-500 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-amber-500 text-xl">🔒</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-bold text-amber-700 uppercase tracking-wide">
                  Editing Locked
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  Availability submissions close on Wednesday. Please contact your manager for changes.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MAIN SECTION (Centered & Consistent Width) */}
      <main className="max-w-5xl mx-auto py-6 px-6">
        <div className="bg-white shadow-sm border border-gray-200">
          <ul className="divide-y divide-gray-100">
            {items.map((item) => {
              const isAllDay = item.start_time === '00:00' && item.end_time === '23:59';
              
              return (
                <li 
                  key={item.id} 
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${item.is_available ? 'bg-white hover:bg-gray-50' : 'bg-gray-50'}`}
                >
                  
                  {/* Day Name & Custom Checkbox */}
                  <div className="flex items-center justify-between sm:justify-start sm:w-48 gap-4">
                    <div className="flex items-center gap-3">
                      
                      <button
                        onClick={() => handleChange(item.id, 'is_available', !item.is_available)}
                        disabled={isLocked}
                        className={`flex-shrink-0 w-5 h-5 border flex items-center justify-center transition-colors disabled:opacity-50 ${
                          item.is_available 
                            ? 'bg-black border-black text-white' 
                            : 'bg-white border-gray-300 hover:border-gray-400'
                        }`}
                        title={item.is_available ? "Mark Unavailable" : "Mark Available"}
                      >
                         {item.is_available && <span className="text-xs font-bold leading-none">✓</span>}
                      </button>

                      <span className={`text-[14px] font-bold tracking-widest ${item.is_available ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                        {item.day_of_week}
                      </span>
                    </div>
                  </div>

                  {/* Time Inputs */}
                  {item.is_available ? (
                    <div className="flex items-end gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          <label className="text-[9px] text-gray-400 uppercase font-bold mb-1">Start</label>
                          <input
                            type="time"
                            disabled={isLocked}
                            value={item.start_time || ''}
                            onChange={(e) => handleChange(item.id, 'start_time', e.target.value)}
                            className="block w-28 text-sm text-black border-gray-300 rounded-none focus:ring-black focus:border-black p-2 bg-white shadow-sm"
                          />
                        </div>
                        <span className="text-gray-300 mb-2">-</span>
                        <div className="flex flex-col">
                          <label className="text-[9px] text-gray-400 uppercase font-bold mb-1">End</label>
                          <input
                            type="time"
                            disabled={isLocked}
                            value={item.end_time || ''}
                            onChange={(e) => handleChange(item.id, 'end_time', e.target.value)}
                            className="block w-28 text-sm text-black border-gray-300 rounded-none focus:ring-black focus:border-black p-2 bg-white shadow-sm"
                          />
                        </div>
                      </div>

                      {/* ALL DAY BUTTON */}
                      <button
                        onClick={() => handleSetAllDay(item.id)}
                        disabled={isLocked}
                        className={`mb-[1px] px-3 py-2 text-[10px] font-bold tracking-wider border transition-all h-[38px] ${
                          isAllDay 
                            ? 'bg-black text-white border-black' 
                            : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                        }`}
                        title={isAllDay ? "Clear Times" : "Set to 00:00 - 23:59"}
                      >
                        {isAllDay ? 'All Day ✓' : 'All Day'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 flex justify-start sm:justify-end">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border border-gray-200 bg-white px-3 py-1">
                        Unavailable
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isLocked || saving}
            className="w-full sm:w-auto bg-black text-white px-8 py-3 text-sm font-bold uppercase tracking-widest hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-none shadow-sm"
          >
            {saving ? 'Saving...' : isLocked ? 'Locked' : 'Save Changes'}
          </button>
        </div>
      </main>
    </div>
  );
}