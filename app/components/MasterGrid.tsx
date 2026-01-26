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

interface MasterGridProps {
  stores: any[];
  shifts: any[];
  weekDays: any[];
  todayIso: string;
}

export default function MasterGrid({ stores, shifts, weekDays, todayIso }: MasterGridProps) {

  // --- COLOR LOGIC ---
  const getShiftStyle = (shift: any) => {
    if (!shift.user_id) {
       return 'bg-blue-50 border-2 border-dashed border-blue-400 text-blue-900';
    }

    const role = shift.profiles?.role?.trim();
    const isManager = role === 'Manager' || role === 'Operations';

    if (isManager) return 'bg-white border-2 border-purple-600 text-gray-900';

    const dateObj = new Date(shift.start_time);
    const hour = dateObj.getHours(); 

    if (hour < 7) return 'bg-white border-2 border-emerald-500 text-gray-900'; 
    if (hour < 10) return 'bg-white border-2 border-blue-500 text-gray-900'; 
    return 'bg-white border-2 border-orange-500 text-gray-900'; 
  };

  return (
    <div className="flex-1 overflow-auto bg-white relative">
      <div className="max-w-[1800px] mx-auto mt-4"> 
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
                    // Filter shifts for this specific cell (Store + Day)
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
                             <div className="flex-1 flex items-center justify-center">
                               <span className="text-gray-200 text-xl font-light">·</span>
                             </div>
                          ) : (
                            dayShifts.map((shift: any) => {
                              const role = shift.profiles?.role?.trim();
                              const isManager = role === 'Manager' || role === 'Operations';
                              const start = new Date(shift.start_time).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'});
                              const end = new Date(shift.end_time).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'});
                              
                              const isOpenShift = !shift.user_id;
                              const cardStyle = getShiftStyle(shift);

                              return (
                                <Link 
                                  key={shift.id} 
                                  href={`/store/${store.id}`} 
                                  className={`text-xs p-2 rounded flex flex-col hover:brightness-95 transition-all cursor-pointer ${cardStyle}`}
                                >
                                  <div className="font-bold uppercase tracking-wide truncate w-full flex items-center gap-1">
                                    {isOpenShift ? (
                                      <span className="text-blue-700 font-extrabold tracking-widest text-[10px]">
                                        ● OPEN
                                      </span>
                                    ) : (
                                      <>
                                        {isManager && (
                                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-purple-600 flex-shrink-0">
                                            <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                                          </svg>
                                        )}
                                        {shift.profiles?.full_name?.split(' ')[0]}
                                      </>
                                    )}
                                  </div>

                                  <div className="text-[10px] font-medium opacity-80 mt-0.5 tracking-tight">
                                    {start} - {end}
                                  </div>

                                  {shift?.note && (
                                     <div className={`mt-1 text-[9px] font-semibold italic border-t pt-0.5 leading-tight break-words ${isOpenShift ? 'text-blue-800 border-blue-200' : 'text-gray-500 border-gray-200/50'}`}>
                                       {shift.note}
                                     </div>
                                  )}

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