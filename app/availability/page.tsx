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

  // --- SMART TOGGLE (Handle "On/Off" logic) ---
  const handleToggleAvailability = (id, currentStatus) => {
    if (isLocked) return;
    
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;

      if (!currentStatus) {
        // If turning ON: Default to All Day immediately
        return { ...item, is_available: true, start_time: '00:00', end_time: '23:59' };
      } else {
        // If turning OFF: Clear times
        return { ...item, is_available: false, start_time: '', end_time: '' };
      }
    }));
  };

  // --- SET ALL DAY FUNCTION ---
  const handleSetAllDay = (id) => {
    if (isLocked) return;
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, start_time: '00:00', end_time: '23:59' } : item
    ));
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
    <div className="min-h-screen bg-gray-50 pb-24"> {/* Added pb-24 for footer space */}
      
      {/* HEADER SECTION */}
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

      {/* MAIN SECTION */}
      <main className="max-w-5xl mx-auto py-2 px-6">
        <div className="bg-white shadow-sm border border-gray-200">
          <ul className="divide-y divide-gray-100">
            {items.map((item) => {
              const isAllDay = item.start_time === '00:00' && item.end_time === '23:59';
              
              return (
                <li 
                  key={item.id} 
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all 
                    ${item.is_available 
                      ? 'bg-white p-5' // Standard padding for active
                      : 'bg-gray-50 p-3 opacity-60 hover:opacity-100' // Collapsed & Dimmed for inactive
                    }`}
                >
                  
                  {/* LEFT: Day Name */}
                  <div className="flex items-center gap-4">
                    <span className={`text-[14px] font-bold tracking-widest ${item.is_available ? 'text-gray-900' : 'text-gray-400'}`}>
                      {item.day_of_week}
                    </span>
                  </div>

                  {/* CENTER: Time Logic */}
                  <div className="flex-1 flex justify-start sm:justify-end sm:pr-8">
                    {item.is_available ? (
                      <div className="flex items-center gap-4">
                        {isAllDay ? (
                          // MODE A: All Day Display
                          <div className="flex items-center gap-3">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 tracking-wide">
                              All Day
                            </span>
                            <button 
                                onClick={() => handleChange(item.id, 'start_time', '09:00')} // Dummy trigger to break all-day
                                disabled={isLocked}
                                className="text-[10px] font-bold text-gray-400 underline hover:text-black uppercase tracking-widest"
                            >
                                Edit Hours
                            </button>
                          </div>
                        ) : (
                          // MODE B: Specific Time Inputs
                          <div className="flex items-end gap-3 flex-wrap animate-in fade-in zoom-in-95 duration-200">
                             <div className="flex items-center gap-2">
                                <div className="flex flex-col">
                                  <label className="text-[9px] text-gray-400 uppercase font-bold mb-1">Start</label>
                                  <input
                                    type="time"
                                    disabled={isLocked}
                                    value={item.start_time || ''}
                                    onChange={(e) => handleChange(item.id, 'start_time', e.target.value)}
                                    className="block w-24 text-sm text-black border-gray-300 rounded-none focus:ring-black focus:border-black p-1.5 bg-white shadow-sm"
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
                                    className="block w-24 text-sm text-black border-gray-300 rounded-none focus:ring-black focus:border-black p-1.5 bg-white shadow-sm"
                                  />
                                </div>
                              </div>
                              <button
                                onClick={() => handleSetAllDay(item.id)}
                                disabled={isLocked}
                                className="mb-[1px] h-[34px] px-3 text-[10px] font-bold bg-gray-100 text-gray-500 hover:bg-black hover:text-white transition-colors"
                              >
                                SET ALL DAY
                              </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                        Unavailable
                      </span>
                    )}
                  </div>

                  {/* RIGHT: Toggle Switch */}
                  <div className="flex items-center">
                    <button
                      onClick={() => handleToggleAvailability(item.id, item.is_available)}
                      disabled={isLocked}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        item.is_available ? 'bg-black' : 'bg-gray-200'
                      } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''} rounded-full`}
                      role="switch"
                      aria-checked={item.is_available}
                    >
                      <span className="sr-only">Use setting</span>
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          item.is_available ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                </li>
              );
            })}
          </ul>
        </div>
      </main>

      {/* STICKY FOOTER SAVE BUTTON */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50">
        <div className="max-w-5xl mx-auto flex justify-end">
             <button
                onClick={handleSave}
                disabled={isLocked || saving}
                className="w-full sm:w-auto bg-black text-white px-10 py-3 text-sm font-bold uppercase tracking-widest hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                {saving ? 'Saving...' : isLocked ? 'Locked' : 'Save Changes'}
              </button>
        </div>
      </div>

    </div>
  );
}