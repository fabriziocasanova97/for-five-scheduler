// @ts-nocheck
'use client';

import Link from 'next/link';

// --- CONSTANTS ---
const ROW_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 
  'bg-orange-500', 'bg-cyan-500', 'bg-rose-500', 'bg-indigo-500'
];

// --- HELPER: FORCE LOCAL DATE STRING ---
const getLocalISOString = (date: any) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// --- NEW HELPER: COMPACT TIME FORMAT (e.g. "7a", "3:30p") ---
const formatCompactTime = (dateStr: string) => {
  const date = new Date(dateStr);
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'p' : 'a';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  
  if (minutes === 0) {
    return `${hours}${ampm}`;
  }
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minutesStr}${ampm}`;
};

interface MasterGridProps {
  stores: any[];
  shifts: any[];
  weekDays: any[];
  todayIso: string;
}

export default function MasterGrid({ stores, shifts, weekDays, todayIso }: MasterGridProps) {

  // --- UPDATED COLOR LOGIC ---
  const getShiftStyle = (shift: any) => {
    // 1. OPEN SHIFT: Red Alert Style
    if (!shift.user_id) {
       return 'bg-red-50 border-2 border-dashed border-red-300 text-red-900 hover:bg-red-100';
    }

    const role = shift.profiles?.role?.trim();
    const isManager = role === 'Manager' || role === 'Operations';

    // 2. MANAGER: Added bg-purple-50 tint
    if (isManager) return 'bg-purple-50 border-2 border-purple-600 text-gray-900';

    const dateObj = new Date(shift.start_time);
    const hour = dateObj.getHours(); 

    // Standard Staff Shifts
    if (hour < 7) return 'bg-white border-2 border-emerald-500 text-gray-900'; 
    if (hour < 10) return 'bg-white border-2 border-blue-500 text-gray-900'; 
    return 'bg-white border-2 border-orange-500 text-gray-900'; 
  };

  return (
    <div className="flex-1 overflow-auto bg-white relative">
      {/* UPDATED: Added 'px-6' to align with the Header 
         This wrapper constrains the width but allows the table to scroll 
         horizontally within the parent if needed.
      */}
      <div className="max-w-[1300px] mx-auto mt-4 px-6"> 
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              {/* Sticky Corner Header */}
              <th className="p-4 border-b border-t border-r border-l border-gray-200 bg-white sticky left-0 top-0 z-50 w-40 text-xs font-extrabold text-black uppercase tracking-widest shadow-[4px_4px_10px_-4px_rgba(0,0,0,0.1)]">
                Store Location
              </th>
              
              {/* Date Headers */}
              {weekDays.map((day) => {
                 const isToday = day.isoDate === todayIso;
                 return (
                  <th key={day.isoDate} className={`p-3 border-b border-t border-r border-gray-200 text-center min-w-[140px] sticky top-0 z-40 ${isToday ? 'bg-blue-600 text-white' : 'bg-black text-white'}`}>
                    <div className={`text-xs font-extrabold tracking-widest uppercase mb-1 ${isToday ? 'text-blue-100' : 'text-gray-400'}`}>
                      {day.shortName}
                    </div>
                    <div className="text-sm font-bold">
                      {day.isoDate.slice(5)}
                    </div>
                  </th>
                 );
              })}
            </tr>
          </thead>
          <tbody>
            {stores.map((store, index) => {
              const rowDotColor = ROW_COLORS[index % ROW_COLORS.length];

              return (
                <tr key={store.id} className="group transition-colors hover:bg-gray-50">
                  {/* Sticky Store Name Column */}
                  <td className="p-4 border-b-4 border-r border-l border-gray-200 bg-white sticky left-0 z-20 group-hover:bg-gray-50 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${rowDotColor} flex-shrink-0`}></div>
                      <Link href={`/store/${store.id}`} className="font-bold text-sm text-gray-900 uppercase tracking-wide hover:text-black hover:underline truncate">
                        {store.name}
                      </Link>
                    </div>
                  </td>

                  {/* Shift Cells */}
                  {weekDays.map(day => {
                    const dayShifts = shifts.filter(s => {
                       const shiftDate = new Date(s.start_time);
                       const shiftIso = getLocalISOString(shiftDate);
                       return s.store_id === store.id && shiftIso === day.isoDate;
                    });
                    
                    dayShifts.sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));
                    const isToday = day.isoDate === todayIso;

                    return (
                      <td key={day.isoDate} className={`p-2 border-b-4 border-r border-gray-200 align-top min-h-[120px] transition-colors ${isToday ? 'bg-blue-50/30' : ''}`}>
                        <div className="flex flex-col gap-2 h-full">
                          {dayShifts.length === 0 ? (
                             // 3. CLEAN EMPTY STATE: Render nothing if empty
                             null
                          ) : (
                            dayShifts.map((shift: any) => {
                              const role = shift.profiles?.role?.trim();
                              const isManager = role === 'Manager' || role === 'Operations';
                              
                              // 4. COMPACT TIME
                              const start = formatCompactTime(shift.start_time);
                              const end = formatCompactTime(shift.end_time);
                              
                              const isOpenShift = !shift.user_id;
                              const cardStyle = getShiftStyle(shift);

                              return (
                                <Link 
                                  key={shift.id} 
                                  href={`/store/${store.id}`} 
                                  className={`relative text-xs p-2 rounded flex flex-col hover:brightness-95 transition-all cursor-pointer ${cardStyle}`}
                                >
                                  <div className="font-bold uppercase tracking-wide truncate w-full flex items-center justify-between gap-1">
                                    <span className="truncate">
                                      {isOpenShift ? (
                                        <span className="text-red-700 font-extrabold tracking-widest text-[9px]">
                                          ⚠ OPEN
                                        </span>
                                      ) : (
                                        <>
                                          {isManager && (
                                            <span className="mr-1 text-purple-700">★</span>
                                          )}
                                          {shift.profiles?.full_name?.split(' ')[0]}
                                        </>
                                      )}
                                    </span>
                                    
                                    {/* 5. NOTE ICON: Only shows if note exists */}
                                    {shift.note && (
                                      <div title={shift.note} className="flex-shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-3 h-3 ${isOpenShift ? 'text-red-400' : 'text-gray-400'} hover:text-black`}>
                                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                                        </svg>
                                      </div>
                                    )}
                                  </div>

                                  <div className="text-[10px] font-medium opacity-80 mt-0.5 tracking-tight flex justify-between">
                                    <span>{start}-{end}</span>
                                  </div>

                                </Link>
                              );
                            })
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}