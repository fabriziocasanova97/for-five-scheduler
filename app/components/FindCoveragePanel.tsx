'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface FindCoverageProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate: string; 
  weekDays: any[];     
}

export default function FindCoveragePanel({ isOpen, onClose, defaultDate, weekDays }: FindCoverageProps) {
  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const [availableStaff, setAvailableStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Reset to default when opening
  useEffect(() => {
    if (isOpen) {
      setSelectedDate(defaultDate);
    }
  }, [isOpen, defaultDate]);

  // Fetch when Date OR Open state changes
  useEffect(() => {
    if (isOpen && selectedDate) {
      fetchFreeAgents(selectedDate);
    }
  }, [isOpen, selectedDate]);

  const fetchFreeAgents = async (targetDate: string) => {
    setLoading(true);

    const { data: allStaff } = await supabase
      .from('profiles')
      .select('id, full_name, phone, role')
      .order('full_name');

    if (!allStaff) {
      setLoading(false);
      return;
    }

    const { data: busyShifts } = await supabase
      .from('shifts')
      .select('user_id, stores(name)') 
      .gte('start_time', `${targetDate}T00:00:00`)
      .lte('start_time', `${targetDate}T23:59:59`);

    const busyUserIds = new Set(busyShifts?.map(s => s.user_id));

    const dateObj = new Date(targetDate + 'T12:00:00');
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    
    const { data: availability } = await supabase
      .from('availability')
      .select('user_id, is_available')
      .eq('day_of_week', dayName);

    const availabilityMap: Record<string, boolean> = {};
    availability?.forEach(r => {
      availabilityMap[r.user_id] = r.is_available;
    });

    const candidates = allStaff.filter(staff => {
      if (busyUserIds.has(staff.id)) return false; 
      if (availabilityMap[staff.id] === false) return false; 
      return true;
    });

    setAvailableStaff(candidates);
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    // 1. OUTER CONTAINER: Handles the Background + Closing Logic
    <div 
      className="fixed inset-0 z-[60] flex justify-end bg-black/20 backdrop-blur-sm transition-opacity"
      onClick={onClose} 
    >
      
      {/* 2. INNER PANEL: Stops the click from bubbling up */}
      <div 
        className="w-full max-w-sm bg-white shadow-2xl h-full flex flex-col transform transition-transform animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()} 
      >
        
        {/* Header */}
        <div className="pt-6 px-6 pb-2 bg-gray-50 border-b border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-extrabold uppercase tracking-widest text-black">
                Find Coverage
              </h2>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mt-1">
                Who is free to work?
              </p>
            </div>
            <button 
              type="button" 
              onClick={onClose} 
              className="text-gray-400 hover:text-black p-1"
            >
              ✕
            </button>
          </div>

          {/* DAY PICKER */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
            {weekDays.map((day) => {
              const isSelected = day.isoDate === selectedDate;
              return (
                <button
                  key={day.isoDate}
                  type="button" 
                  onClick={() => setSelectedDate(day.isoDate)}
                  className={`flex-shrink-0 flex flex-col items-center justify-center w-14 h-14 border transition-all ${
                    isSelected 
                      ? 'bg-black border-black text-white shadow-md' 
                      : 'bg-white border-gray-200 text-gray-400 hover:border-gray-400 hover:text-black'
                  }`}
                >
                  <span className="text-[9px] font-bold uppercase tracking-widest">{day.name.slice(0, 3)}</span>
                  <span className="text-sm font-bold">{day.dateLabel.split('/')[1]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          {loading ? (
            <div className="text-center py-10 text-xs font-bold text-gray-400 uppercase tracking-widest">
              Checking {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' })}...
            </div>
          ) : availableStaff.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-2xl mb-2">😓</div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                No coverage found
              </p>
              <p className="text-[10px] text-gray-400 mt-1 uppercase">
                Everyone is working or unavailable on {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' })}.
              </p>
            </div>
          ) : (
            <>
               <div className="mb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                 {availableStaff.length} Available Staff on {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' })}
               </div>
               <div className="space-y-3">
                {availableStaff.map(staff => (
                  <div key={staff.id} className="group flex items-center justify-between p-3 border border-gray-100 hover:border-black transition-colors bg-white shadow-sm">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900 group-hover:text-black">
                        {staff.full_name}
                      </h3>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                        {staff.role || 'Staff'}
                      </p>
                    </div>

                    {staff.phone ? (
                      <a 
                        href={`tel:${staff.phone}`}
                        className="bg-black text-white text-[10px] font-bold uppercase tracking-widest px-3 py-2 hover:bg-gray-800 transition-colors"
                      >
                        Call
                      </a>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                        No #
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}