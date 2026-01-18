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

  // --- 2. FETCH DATA ---
  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      const role = profile?.role ? profile.role.trim() : '';
      setAmIBoss(role === 'Operations'); 
      setCurrentUserRole(role); 
    }

    const { data: storeData } = await supabase.from('stores').select('*').eq('id', storeId).single();
    const { data: staffData } = await supabase.from('profiles').select('*').order('full_name');
    
    // Fetch Buffer
    const fetchStart = new Date(currentMonday);
    fetchStart.setDate(fetchStart.getDate() - 1);
    const fetchEnd = new Date(currentMonday);
    fetchEnd.setDate(fetchEnd.getDate() + 8);

    // Note: select('*') automatically includes the new 'note' column
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

  useEffect(() => {
    fetchData();
  }, [storeId, queryDate]); 

  // --- ACTIONS ---
  const handleShiftAdded = () => {
    fetchData(); 
    setIsModalOpen(false);
  };

  const openAddModal = (dateIso?: string) => {
    setSelectedDateForShift(dateIso || weekDays[0].isoDate);
    setIsModalOpen(true);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white">Loading...</div>;

  // CHANGED: Force navigation to be enabled for everyone for testing
  // const allowedRoles = ['operations', 'manager'];
  // const canNavigate = allowedRoles.includes(currentUserRole.toLowerCase());
  const canNavigate = true; 

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
               {canNavigate && (
                 <Link href={`/store/${storeId}?date=${prevDateString}`} className="group p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-400 group-hover:text-black transition-colors">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                    </svg>
                 </Link>
               )}
               
               <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
                 Week of {weekDays[0].dateLabel}
               </span>

               {canNavigate && (
                 <Link href={`/store/${storeId}?date=${nextDateString}`} className="group p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-400 group-hover:text-black transition-colors">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                 </Link>
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

        {/* --- STORE ANNOUNCEMENTS --- */}
        <StoreNote 
          storeId={storeId} 
          initialNote={store?.notes} 
          amIBoss={amIBoss}
        />

        {/* --- LABOR SUMMARY --- */}
        {amIBoss && (
          <div className="mt-6">
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
    </div>
  );
}