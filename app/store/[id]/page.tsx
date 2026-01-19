// @ts-nocheck
'use client';

import { createClient } from '@supabase/supabase-js';
import { use, useEffect, useState } from 'react'; 
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

// Components
import AddShiftModal from '@/app/components/AddShiftModal';
import ShiftCard from '@/app/components/ShiftCard';
import CopyWeekButton from '@/app/components/CopyWeekButton';
import LaborSummary from '@/app/components/LaborSummary';
import StoreNote from '@/app/components/StoreNote'; 
import SwapRequests from '@/app/components/SwapRequests';
import FindCoveragePanel from '@/app/components/FindCoveragePanel';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- HELPER: FORCE LOCAL DATE STRING (YYYY-MM-DD) ---
const getLocalISOString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function StorePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const storeId = resolvedParams.id;
  
  const searchParams = useSearchParams();
  const queryDate = searchParams.get('date');

  // --- STATE ---
  const [store, setStore] = useState<any>(null);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  
  // Roles
  const [amIBoss, setAmIBoss] = useState(false); 
  const [currentUserRole, setCurrentUserRole] = useState(''); 
  
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDateForShift, setSelectedDateForShift] = useState('');

  // Coverage Panel State
  const [isCoverageOpen, setIsCoverageOpen] = useState(false);

  // --- 1. DATE LOGIC ---
  const anchorDate = queryDate ? new Date(queryDate + 'T12:00:00') : new Date();
  const dayOfWeek = anchorDate.getDay(); 
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek; 
  const currentMonday = new Date(anchorDate);
  currentMonday.setDate(anchorDate.getDate() + diffToMonday);
  currentMonday.setHours(0, 0, 0, 0);

  const prevWeek = new Date(currentMonday);
  prevWeek.setDate(currentMonday.getDate() - 7);
  const prevDateString = getLocalISOString(prevWeek);

  const nextWeek = new Date(currentMonday);
  nextWeek.setDate(currentMonday.getDate() + 7);
  const nextDateString = getLocalISOString(nextWeek);

  const todayIso = getLocalISOString(new Date());

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(currentMonday);
    d.setDate(currentMonday.getDate() + i);
    return {
      name: d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase(),
      dateLabel: d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
      isoDate: getLocalISOString(d),
    };
  });

  const weekStartStr = weekDays[0].isoDate;
  const weekEndDate = new Date(weekDays[6].isoDate);
  weekEndDate.setDate(weekEndDate.getDate() + 1); 
  const weekEndStr = getLocalISOString(weekEndDate);

  const currentWeekShifts = shifts.filter(s => 
    s.start_time >= weekStartStr && s.start_time < weekEndStr
  );

  // --- 2. OPTIMIZED FETCH DATA (PARALLEL REQUESTS) ---
  const fetchData = async () => {
    // 1. Get User (Must happen first for Auth/Roles)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      const role = profile?.role ? profile.role.trim() : '';
      setAmIBoss(role === 'Manager' || role === 'Operations'); 
      setCurrentUserRole(role); 
    }

    // 2. PREPARE REQUESTS (Start them all at once)
    const fetchStart = new Date(currentMonday);
    fetchStart.setDate(fetchStart.getDate() - 1);
    const fetchEnd = new Date(currentMonday);
    fetchEnd.setDate(fetchEnd.getDate() + 8);

    const storePromise = supabase.from('stores').select('*').eq('id', storeId).single();
    const staffPromise = supabase.from('profiles').select('*').order('full_name');
    const shiftsPromise = supabase
      .from('shifts')
      .select(`*, profiles ( full_name, role )`) 
      .eq('store_id', storeId)
      .gte('start_time', fetchStart.toISOString()) 
      .lte('start_time', fetchEnd.toISOString());

    // 3. AWAIT ALL (Wait for the slowest one, effectively running in parallel)
    const [storeRes, staffRes, shiftsRes] = await Promise.all([
      storePromise,
      staffPromise,
      shiftsPromise
    ]);

    // 4. UPDATE STATE (Note: We do NOT set loading=true at start, avoiding flicker)
    if (storeRes.data) setStore(storeRes.data);
    if (staffRes.data) setStaffList(staffRes.data);
    if (shiftsRes.data) setShifts(shiftsRes.data);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [storeId, queryDate]); 

  // --- 3. ACTIONS (UPDATED FOR SMOOTHNESS) ---
  const handleShiftAdded = async () => {
    // We await the data refresh so it happens before or during closing
    // Importantly, we do NOT trigger a full-screen loading spinner
    await fetchData(); 
    setIsModalOpen(false);
  };

  const openAddModal = (dateIso?: string) => {
    setSelectedDateForShift(dateIso || weekDays[0].isoDate);
    setIsModalOpen(true);
  };

  // --- 4. NAVIGATION PERMISSION LOGIC ---
  const canGoPrev = true;
  let canGoNext = false;

  if (loading) {
     canGoNext = false;
  } else if (amIBoss) {
     canGoNext = true;
  } else {
     const now = new Date();
     const currentDay = now.getDay();
     const distToMon = (currentDay === 0 ? -6 : 1) - currentDay;
     const realThisMonday = new Date(now);
     realThisMonday.setDate(now.getDate() + distToMon);
     realThisMonday.setHours(0,0,0,0);

     const realNextMonday = new Date(realThisMonday);
     realNextMonday.setDate(realThisMonday.getDate() + 7);

     if (nextWeek < realNextMonday) {
       canGoNext = true;
     } else if (nextWeek.getTime() === realNextMonday.getTime()) {
       const isSunday = currentDay === 0;
       const isAfter4PM = now.getHours() >= 16;
       canGoNext = isSunday && isAfter4PM;
     } else {
       canGoNext = false;
     }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      
      {/* --- HEADER SECTION --- */}
      <div className="max-w-7xl mx-auto px-4 pt-8 pb-6">
        
        {/* Navigation Row */}
        <div className="flex justify-between items-center mb-4">
            <Link href="/" className="text-xs font-bold text-gray-400 hover:text-black uppercase tracking-widest transition-colors">
                ← Locations
            </Link>

            <div className="flex items-center gap-4">
               {canGoPrev && (
                 <Link href={`/store/${storeId}?date=${prevDateString}`} className="group p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-400 group-hover:text-black transition-colors">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                    </svg>
                 </Link>
               )}
               
               <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
                 Week of {weekDays[0].dateLabel}
               </span>

               {canGoNext ? (
                 <Link href={`/store/${storeId}?date=${nextDateString}`} className="group p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-400 group-hover:text-black transition-colors">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                 </Link>
               ) : (
                 <div className="p-2 opacity-20 cursor-not-allowed">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-300">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                 </div>
               )}
            </div>
        </div>

        {/* Store Title & Controls */}
        <div className="border-b-2 border-black pb-4 mb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <h1 className="text-4xl md:text-5xl font-extrabold uppercase tracking-widest text-left">
              {store?.name}
            </h1>

            {amIBoss && (
              <div className="flex gap-2 mb-1">
                
                {/* --- COVERAGE BUTTON --- */}
                <button
                  onClick={() => setIsCoverageOpen(true)}
                  className="bg-white border border-gray-300 text-black text-xs font-bold uppercase tracking-wider px-4 py-2.5 hover:bg-gray-50 transition-all flex items-center gap-2"
                >
                  <span>🔎</span> Coverage
                </button>

                <CopyWeekButton 
                   storeId={storeId} 
                   currentMonday={currentMonday} 
                   onSuccess={fetchData} 
                />
                <button 
                  onClick={() => openAddModal()}
                  className="bg-black text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 hover:bg-gray-800 transition-all"
                >
                  + Add Shift
                </button>
              </div>
            )}
        </div>

        <StoreNote 
          storeId={storeId} 
          initialNote={store?.notes} 
          amIBoss={amIBoss}
        />

        {amIBoss && (
          <div className="mt-6 flex flex-col gap-6">
            <SwapRequests storeId={storeId} />
            <LaborSummary 
              shifts={currentWeekShifts} 
              amIBoss={amIBoss} 
            />
          </div>
        )}

      </div>

      {/* --- SCHEDULE GRID --- */}
      <main className="max-w-7xl mx-auto px-4 pb-12">
        {/* Mobile View */}
        <div className="md:hidden flex flex-col gap-6">
          {weekDays.map((day) => {
            const dayShifts = shifts.filter(s => s.start_time.startsWith(day.isoDate));
            dayShifts.sort((a, b) => a.start_time.localeCompare(b.start_time));
            const isToday = day.isoDate === todayIso;

            return (
              <div key={day.isoDate} className={`border border-gray-200 ${isToday ? 'ring-2 ring-blue-500' : ''}`}>
                <div className={`p-3 flex justify-between items-center ${isToday ? 'bg-blue-600 text-white' : 'bg-black text-white'}`}>
                  <span className="font-bold text-sm tracking-widest uppercase">{day.name}</span>
                  <span className={`text-sm ${isToday ? 'text-blue-100' : 'text-gray-400'}`}>{day.dateLabel}</span>
                </div>
                <div className="p-3 bg-white min-h-[100px] space-y-2">
                   {dayShifts.length === 0 ? (
                      <span className="text-gray-300 text-sm italic">No shifts</span>
                   ) : (
                      dayShifts.map(shift => (
                        <ShiftCard 
                          key={shift.id} 
                          shift={shift} 
                          staffList={staffList}
                          amIBoss={amIBoss}
                          weekDays={weekDays} 
                          onDelete={fetchData}
                        />
                      ))
                   )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop View */}
        <div className="hidden md:grid grid-cols-7 min-h-[600px] border-l border-gray-200 border-b border-gray-200">
          {weekDays.map((day) => {
            const dayShifts = shifts.filter(s => s.start_time.startsWith(day.isoDate));
            dayShifts.sort((a, b) => a.start_time.localeCompare(b.start_time));
            const isToday = day.isoDate === todayIso;

            return (
              <div 
                key={day.isoDate} 
                className={`flex flex-col border-r border-gray-200 transition-colors duration-300 ${
                  isToday ? 'bg-blue-50/20' : 'bg-white' 
                }`}
              >
                {/* Header */}
                <div className={`p-4 border-b border-gray-900 text-center ${
                  isToday ? 'bg-blue-600' : 'bg-black'
                }`}>
                  <div className={`text-xs font-extrabold tracking-widest uppercase mb-1 ${
                    isToday ? 'text-blue-100' : 'text-gray-400'
                  }`}>
                    {day.name}
                  </div>
                  <div className="text-xl font-bold text-white">
                    {day.dateLabel}
                  </div>
                </div>

                {/* Shifts */}
                <div className="flex-1 p-2 space-y-3">
                  {dayShifts.length === 0 ? (
                     <div className="h-full flex items-center justify-center min-h-[100px]">
                       <span className="text-gray-300 text-2xl font-light">·</span>
                     </div>
                  ) : (
                    dayShifts.map(shift => (
                      <ShiftCard 
                        key={shift.id} 
                        shift={shift} 
                        staffList={staffList}
                        amIBoss={amIBoss}
                        weekDays={weekDays} 
                        onDelete={fetchData}
                      />
                    ))
                  )}
                  
                  {amIBoss && (
                    <button
                      onClick={() => openAddModal(day.isoDate)}
                      className="w-full py-3 text-gray-300 hover:text-black hover:bg-gray-50 border border-transparent hover:border-gray-300 rounded text-xs font-bold uppercase transition-all opacity-0 hover:opacity-100 hidden md:block"
                    >
                      +
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* MODAL */}
      {isModalOpen && (
        <AddShiftModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          storeId={storeId}
          staffList={staffList}
          weekDays={weekDays}
          amIBoss={amIBoss}
          preSelectedDate={selectedDateForShift}
          onShiftAdded={handleShiftAdded}
        />
      )}

      {/* COVERAGE PANEL */}
      <FindCoveragePanel 
        isOpen={isCoverageOpen} 
        onClose={() => setIsCoverageOpen(false)} 
        defaultDate={todayIso} 
        weekDays={weekDays}   
      />
    </div>
  );
}