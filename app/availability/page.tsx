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
  
  // DEADLINE LOGIC
  // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  const today = new Date().getDay();
  // If today is Thu(4), Fri(5), Sat(6) or Sun(0), it is LOCKED.
  const isLocked = today === 4 || today === 5 || today === 6 || today === 0;

  useEffect(() => {
    fetchAvailability();
  }, []);

  const fetchAvailability = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('availability')
      .select('*')
      .eq('user_id', user.id);

    // Sort by Mon-Sun
    const sorted = (data || []).sort((a, b) => {
      return DAYS_ORDER.indexOf(a.day_of_week) - DAYS_ORDER.indexOf(b.day_of_week);
    });

    setItems(sorted);
    setLoading(false);
  };

  const handleChange = (id, field, value) => {
    if (isLocked) return; // Stop edits if locked
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    
    // Upsert all rows
    const { error } = await supabase
      .from('availability')
      .upsert(items.map(item => ({
        id: item.id,
        user_id: item.user_id,
        day_of_week: item.day_of_week,
        is_available: item.is_available,
        start_time: item.start_time || null,
        end_time: item.end_time || null
      })));

    setSaving(false);
    if (error) alert('Error saving: ' + error.message);
    else alert('Availability updated successfully!');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 pt-10 pb-4">
        <h1 className="text-3xl font-extrabold text-gray-900 uppercase tracking-widest">
          My Availability
        </h1>
        <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">
           Standard Weekly Pattern
        </p>

        {isLocked && (
          <div className="mt-4 bg-amber-50 border-l-4 border-amber-500 p-4">
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
        <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200">
          <ul className="divide-y divide-gray-200">
            {items.map((item) => (
              <li key={item.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:bg-gray-50 transition-colors">
                
                {/* Day Name & Toggle */}
                <div className="flex items-center justify-between sm:justify-start sm:w-48 gap-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      disabled={isLocked}
                      checked={item.is_available}
                      onChange={(e) => handleChange(item.id, 'is_available', e.target.checked)}
                      className="h-5 w-5 text-black focus:ring-black border-gray-300 rounded cursor-pointer disabled:opacity-50"
                    />
                    <span className={`text-sm font-bold uppercase tracking-widest ${item.is_available ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                      {item.day_of_week}
                    </span>
                  </div>
                </div>

                {/* Time Inputs (Only show if available) */}
                {item.is_available ? (
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                      <label className="text-[10px] text-gray-400 uppercase font-bold mb-1">Start</label>
                      <input
                        type="time"
                        disabled={isLocked}
                        value={item.start_time || ''}
                        onChange={(e) => handleChange(item.id, 'start_time', e.target.value)}
                        className="block w-32 sm:text-sm border-gray-300 rounded-md focus:ring-black focus:border-black p-2 bg-gray-50"
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
                        className="block w-32 sm:text-sm border-gray-300 rounded-md focus:ring-black focus:border-black p-2 bg-gray-50"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex justify-end sm:justify-center">
                    <span className="text-xs font-bold text-gray-300 uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full">
                      Unavailable
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isLocked || saving}
            className="w-full sm:w-auto bg-black text-white px-6 py-3 text-sm font-bold uppercase tracking-widest hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving ? 'Saving...' : isLocked ? 'Locked' : 'Save Changes'}
          </button>
        </div>
      </main>
    </div>
  );
}