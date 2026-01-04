// @ts-nocheck
'use client';

import CopyWeekButton from '@/app/components/CopyWeekButton';
import { createClient } from '@supabase/supabase-js';
import { useEffect, useState, use } from 'react'; 
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AddShiftModal from '@/app/components/AddShiftModal';
import ShiftCard from '@/app/components/ShiftCard';
import LaborSummary from '@/app/components/LaborSummary'; 
import LogoutButton from '@/app/components/LogoutButton';
import { isBoss } from '@/app/utils/roles';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function StorePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const storeId = resolvedParams.id;
  
  const searchParams = useSearchParams();
  const queryDate = searchParams.get('date');

  // --- STATE ---
  const [store, setStore] = useState<any>(null);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [amIBoss, setAmIBoss] = useState(false);
  const [loading, setLoading] = useState(true);

  // --- 1. CALCULATE DATES ---
  const anchorDate = queryDate ? new Date(queryDate + 'T12:00:00') : new Date();
  
  const dayOfWeek = anchorDate.getDay(); 
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek; 
  const currentMonday = new Date(anchorDate);
  currentMonday.setDate(anchorDate.getDate() + diffToMonday);
  currentMonday.setHours(0, 0, 0, 0);

  // Navigation Links
  const prevWeek = new Date(currentMonday);
  prevWeek.setDate(currentMonday.getDate() - 7);
  const prevDateString = prevWeek.toISOString().split('T')[0];

  const nextWeek = new Date(currentMonday);
  nextWeek.setDate(currentMonday.getDate() + 7);
  const nextDateString = nextWeek.toISOString().split('T')[0];

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(currentMonday);
    d.setDate(currentMonday.getDate() + i);
    return {
      name: d.toLocaleDateString('en-US', { weekday: 'long' }),
      dateLabel: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      isoDate: d.toISOString().split('T')[0],
    };
  });

  // --- 2. FETCH DATA (OPTIMIZED & SECURE) ---
  useEffect(() => {
    const initPage = async () => {
      // A. Check User (Boss Status)
      const { data: { user } } = await supabase.auth.getUser();
      const bossStatus = isBoss(user?.email);
      setAmIBoss(bossStatus);

      // B. Fetch Store & Staff
      const { data: storeData } = await supabase.from('stores').select('*').eq('id', storeId).single();
      const { data: staffData } = await supabase.from('profiles').select('*').order('full_name');
      
      // C. Smart Fetching
      const fetchStart = new Date(currentMonday);
      fetchStart.setDate(fetchStart.getDate() - 1); // -1 day buffer
      const fetchEnd = new Date(currentMonday);
      fetchEnd.setDate(fetchEnd.getDate() + 8);     // +1 day buffer

      const { data: shiftData } = await supabase
        .from('shifts')
        .select(`*, profiles ( full_name, role )`) 
        .eq('store_id', storeId)
        .gte('start_time', fetchStart.toISOString()) 
        .lte('start_time', fetchEnd.toISOString());

      setStore(storeData);
      setStaffList(staffData || []);
      setShifts(shiftData || []);
      setLoading(false);
    };

    initPage();
  }, [storeId, queryDate]); 

  // --- 3. FILTERING ---
  const weekStartStr = weekDays[0].isoDate;
  const weekEndDate = new Date(weekDays[6].isoDate);
  weekEndDate.setDate(weekEndDate.getDate() + 1); 
  const weekEndStr = weekEndDate.toISOString().split('T')[0];

  const currentWeekShifts = shifts.filter(s => 
    s.start_time >= weekStartStr && s.start_time < weekEndStr
  );

  // HELPER: Calculate if a specific day is "Today" (Local Time)
  const isDateToday = (isoDate: string) => {
    const now = new Date();
    const localTodayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    return isoDate === localTodayStr;
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading schedule...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b px-4 md:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <Link href="/" className="text-sm text-gray-500 hover:text-black mb-1 block">
              ← Back to All Stores
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{store?.name}</h1>
          </div>
          
          <div className="flex gap-2 items-center w-full md:w-auto justify-between md:justify-end flex-wrap">
            <LogoutButton />
            
            {/* COPY BUTTON (Only for Boss) */}
            {amIBoss && (
              <CopyWeekButton 
                storeId={storeId} 
                currentMonday={currentMonday} 
              />
            )}

            <AddShiftModal 
              storeId={storeId} 
              staffList={staffList} 
              weekDays={weekDays} 
              amIBoss={amIBoss} 
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* NAVIGATION BAR - THE "STEERING WHEEL" */}
          <div className="flex items-center justify-between bg-gray-100 p-2 rounded-lg w-full md:max-w-md">
            
            {/* PREV BUTTON: Only show if Boss */}
            {amIBoss ? (
              <Link href={`/store/${storeId}?date=${prevDateString}`} className="px-3 py-2 bg-white text-xs md:text-sm font-bold rounded shadow hover:bg-gray-50 text-gray-700">
                ← Last Week
              </Link>
            ) : (
              <div className="w-16"></div> 
            )}

            <span className="font-bold text-gray-700 text-sm md:text-base">
              Week of {weekDays[0].dateLabel}
            </span>

            {/* NEXT BUTTON: Only show if Boss */}
            {amIBoss ? (
              <Link href={`/store/${storeId}?date=${nextDateString}`} className="px-3 py-2 bg-white text-xs md:text-sm font-bold rounded shadow hover:bg-gray-50 text-gray-700">
                Next Week →
              </Link>
            ) : (
              <div className="w-16"></div> 
            )}
          </div>

          <LaborSummary 
            shifts={currentWeekShifts} 
            amIBoss={amIBoss} 
          />
        </div>
      </div>

      <div className="flex-1 p-4 md:p-8">
        
        {/* === MOBILE VIEW (List) === */}
        <div className="md:hidden flex flex-col gap-6">
          {weekDays.map((day) => {
            const dayShifts = currentWeekShifts.filter(shift => shift.start_time.startsWith(day.isoDate));
            dayShifts.sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));
            const isToday = isDateToday(day.isoDate);

            return (
              <div key={day.isoDate} className={`rounded-lg border overflow-hidden ${isToday ? 'ring-2 ring-blue-500' : 'bg-white'}`}>
                <div className={`p-3 border-b flex justify-between items-center ${isToday ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                  <span className="font-bold text-lg">{day.name}</span>
                  <span className={`text-sm ${isToday ? 'text-blue-100' : 'text-gray-500'}`}>{day.dateLabel}</span>
                </div>
                <div className="p-3 bg-white min-h-[100px]">
                  {dayShifts.length === 0 ? (
                    <p className="text-gray-400 text-sm italic">No shifts scheduled</p>
                  ) : (
                    <div className="space-y-3">
                      {dayShifts.map((shift) => (
                        <ShiftCard 
                          key={shift.id} 
                          shift={shift} 
                          staffList={staffList} 
                          weekDays={weekDays}
                          amIBoss={amIBoss} 
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* === DESKTOP VIEW (Grid) === */}
        <div className="hidden md:grid grid-cols-7 gap-4 min-w-[1000px]">
          {weekDays.map((day) => {
            const dayShifts = currentWeekShifts.filter(shift => shift.start_time.startsWith(day.isoDate));
            dayShifts.sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));
            const isToday = isDateToday(day.isoDate);

            return (
              <div key={day.isoDate} className="flex flex-col h-full">
                <div className={`p-3 rounded-t-lg border border-b-0 text-center ${isToday ? 'bg-blue-600 text-white border-blue-600' : 'bg-white'}`}>
                  <p className={`font-bold ${isToday ? 'text-white' : 'text-gray-800'}`}>{day.name}</p>
                  <p className={`text-xs ${isToday ? 'text-blue-100' : 'text-gray-400'}`}>{day.dateLabel}</p>
                </div>
                <div className="bg-gray-100 flex-1 border rounded-b-lg p-2 min-h-[500px] flex flex-col">
                  <div className="space-y-2 flex-1">
                    {dayShifts.map((shift) => (
                      <ShiftCard 
                        key={shift.id} 
                        shift={shift} 
                        staffList={staffList} 
                        weekDays={weekDays}
                        amIBoss={amIBoss} 
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}