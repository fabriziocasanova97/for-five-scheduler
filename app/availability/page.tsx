// @ts-nocheck
'use client';

import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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
      <div className="max-w-3xl mx-auto px-6 pt-10 pb-4">
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
                className="appearance-none block w-full bg-white border border-gray-300 text-gray-900 py-3 px-4 pr-10 rounded-none leading-tight focus:outline-none focus:border-black font-bold uppercase tracking-wide text-sm"
              >
                {staffList.map(staff => (
                  <option key={staff.id} value={staff.id}>
                    {staff.full_name}
                  </option>
                ))}
              </select>
              {/* Custom Chevron Arrow */}
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

        {/* --- NEW: GUIDELINES SECTION --- */}
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

      <main className="max-w-3xl mx-auto py-6 px-6">
        <div className="bg-white shadow-sm border border-gray-200">
          <ul className="divide-y divide-gray-100">
            {items.map((item) => (
              <li key={item.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                
                {/* Day Name & Toggle */}
                <div className="flex items-center justify-between sm:justify-start sm:w-48 gap-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      disabled={isLocked}
                      checked={item.is_available}
                      onChange={(e) => handleChange(item.id, 'is_available', e.target.checked)}
                      className="h-5 w-5 text-black focus:ring-black border-gray-300 rounded-none cursor-pointer disabled:opacity-50"
                    />
                    <span className={`text-sm font-bold uppercase tracking-widest ${item.is_available ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                      {item.day_of_week}
                    </span>
                  </div>
                </div>

                {/* Time Inputs */}
                {item.is_available ? (
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                      <label className="text-[10px] text-gray-400 uppercase font-bold mb-1">Start</label>
                      <input
                        type="time"
                        disabled={isLocked}
                        value={item.start_time || ''}
                        onChange={(e) => handleChange(item.id, 'start_time', e.target.value)}
                        className="block w-32 sm:text-sm border-gray-300 rounded-none focus:ring-black focus:border-black p-2 bg-gray-50"
                      />
                    </div>
                    <span className="text-gray-400 mt-5">-</span>
                    <div className="flex flex-col">
                      <label className="text-[10px] text-gray-400 uppercase font-bold mb-1">End</label>
                      <input
                        type="time"
                        disabled={isLocked}
                        value={item.end_time || ''}
                        onChange={(e) => handleChange(item.id, 'end_time', e.target.value)}
                        className="block w-32 sm:text-sm border-gray-300 rounded-none focus:ring-black focus:border-black p-2 bg-gray-50"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex justify-end sm:justify-center">
                    <span className="text-xs font-bold text-gray-300 uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-none">
                      Unavailable
                    </span>
                  </div>
                )}
              </li>
            ))}
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