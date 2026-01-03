// @ts-nocheck
'use client';

import { createClient } from '@supabase/supabase-js';
import { useEffect, useState, use } from 'react'; // Added 'use' for unwrapping params
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
  // Unwrap params using React 'use' (Next.js 15 standard)
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

  // --- 2. FETCH DATA ---
  useEffect(() => {
    const initPage = async () => {
      // A. Check User (Boss Status)
      const { data: { user } } = await supabase.auth.getUser();
      setAmIBoss(isBoss(user?.email));

      // B. Fetch Store & Staff
      const { data: storeData } = await supabase.from('stores').select('*').eq('id', storeId).single();
      const { data: staffData } = await supabase.from('profiles').select('*').order('full_name');
      
      // C. Fetch Shifts
      const { data: shiftData } = await supabase
        .from('shifts')
        .select(`*, profiles ( full_name, role )`) 
        .eq('store_id', storeId);

      setStore(storeData);
      setStaffList(staffData || []);
      setShifts(shiftData || []);
      setLoading(false);
    };

    initPage();
  }, [storeId, queryDate]); // Re-run if store or date changes

  // --- 3. FILTERING ---
  const weekStartStr = weekDays[0].isoDate;
  const weekEndDate = new Date(weekDays[6].isoDate);
  weekEndDate.setDate(weekEndDate.getDate() + 1); 
  const weekEndStr = weekEndDate.toISOString().split('T')[0];

  const currentWeekShifts = shifts.filter(s => 
    s.start_time >= weekStartStr && s.start_time < weekEndStr
  );

  if (loading) return <div className="p-8 text-center text-gray-500">Loading schedule...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b px-8 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <Link href="/" className="text-sm text-gray-500 hover:text-black mb-1 block">
              ← Back to All Stores
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">{store?.name}</h1>
          </div>
          
          <div className="flex gap-2 items-center">
            <LogoutButton />
            {/* PASSING PERMISSION TO THE MODAL */}
            <AddShiftModal 
              storeId={storeId} 
              staffList={staffList} 
              weekDays={weekDays} 
              amIBoss={amIBoss} 
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between bg-gray-100 p-2 rounded-lg max-w-md">
            <Link href={`/store/${storeId}?date=${prevDateString}`} className="px-4 py-2 bg-white text-sm font-bold rounded shadow hover:bg-gray-50 text-gray-700">← Last Week</Link>
            <span className="font-bold text-gray-700">Week of {weekDays[0].dateLabel}</span>
            <Link href={`/store/${storeId}?date=${nextDateString}`} className="px-4 py-2 bg-white text-sm font-bold rounded shadow hover:bg-gray-50 text-gray-700">Next Week →</Link>
          </div>

          {/* SECURE LABOR SUMMARY COMPONENT */}
          <LaborSummary 
  shifts={currentWeekShifts} 
  amIBoss={amIBoss}  // <--- ADD THIS LINE
/>

        </div>
      </div>

      <div className="flex-1 p-8 overflow-x-auto">
        <div className="grid grid-cols-7 gap-4 min-w-[1000px]">
          {weekDays.map((day) => {
            const dayShifts = currentWeekShifts.filter(shift => shift.start_time.startsWith(day.isoDate));
            dayShifts.sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));
            const isToday = day.isoDate === new Date().toISOString().split('T')[0];

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