import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import AddShiftModal from '@/app/components/AddShiftModal';
import ShiftCard from '@/app/components/ShiftCard';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Props = {
  params: Promise<{ id: string }>,
  searchParams: Promise<{ date?: string }> 
}

export default async function StorePage(props: Props) {
  const resolvedParams = await props.params;
  const resolvedSearchParams = await props.searchParams;
  const storeId = resolvedParams.id;

  // --- TIME TRAVEL LOGIC ---
  const queryDate = resolvedSearchParams.date;
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

  // --- DATABASE FETCH ---
  const { data: store } = await supabase.from('stores').select('*').eq('id', storeId).single();
  const { data: staffList } = await supabase.from('profiles').select('*').order('full_name');
  
  // *** THIS IS THE CRITICAL LINE ***
  const { data: allShifts } = await supabase
    .from('shifts')
    .select(`*, profiles ( full_name, role )`) // We request 'role' here
    .eq('store_id', storeId);

  // Filter shifts
  const weekStartStr = weekDays[0].isoDate;
  const weekEndDate = new Date(weekDays[6].isoDate);
  weekEndDate.setDate(weekEndDate.getDate() + 1); 
  const weekEndStr = weekEndDate.toISOString().split('T')[0];

  const currentWeekShifts = allShifts?.filter(s => 
    s.start_time >= weekStartStr && s.start_time < weekEndStr
  );

  // --- LABOR SUMMARY ---
  const laborSummary: Record<string, number> = {};

  currentWeekShifts?.forEach((shift) => {
    const name = shift.profiles?.full_name || 'Unknown';
    const start = new Date(shift.start_time).getTime();
    const end = new Date(shift.end_time).getTime();
    const hours = (end - start) / (1000 * 60 * 60);

    if (laborSummary[name]) {
      laborSummary[name] += hours;
    } else {
      laborSummary[name] = hours;
    }
  });

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
          <AddShiftModal storeId={storeId} staffList={staffList || []} />
        </div>

        {/* NAVIGATION & SUMMARY */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between bg-gray-100 p-2 rounded-lg max-w-md">
            <Link 
              href={`/store/${storeId}?date=${prevDateString}`}
              className="px-4 py-2 bg-white text-sm font-bold rounded shadow hover:bg-gray-50 text-gray-700"
            >
              ← Last Week
            </Link>
            <span className="font-bold text-gray-700">Week of {weekDays[0].dateLabel}</span>
            <Link 
              href={`/store/${storeId}?date=${nextDateString}`}
              className="px-4 py-2 bg-white text-sm font-bold rounded shadow hover:bg-gray-50 text-gray-700"
            >
              Next Week →
            </Link>
          </div>

          {Object.keys(laborSummary).length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-bold text-blue-800 uppercase mb-2">Weekly Staff Hours</h3>
              <div className="flex flex-wrap gap-3">
                {Object.entries(laborSummary).map(([name, hours]) => (
                  <div key={name} className={`px-3 py-1 rounded border text-sm font-bold flex items-center gap-2 ${
                    hours > 40 ? 'bg-red-100 text-red-700 border-red-300' : 'bg-white text-gray-700 border-gray-200'
                  }`}>
                    <span>{name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                      hours > 40 ? 'bg-red-600 text-white' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {hours.toFixed(1)}h
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 p-8 overflow-x-auto">
        <div className="grid grid-cols-7 gap-4 min-w-[1000px]">
          {weekDays.map((day) => {
            const dayShifts = currentWeekShifts?.filter(shift => 
              shift.start_time.startsWith(day.isoDate)
            );

            const isToday = day.isoDate === new Date().toISOString().split('T')[0];

            return (
              <div key={day.isoDate} className="flex flex-col h-full">
                <div className={`p-3 rounded-t-lg border border-b-0 text-center ${
                   isToday ? 'bg-blue-600 text-white border-blue-600' : 'bg-white'
                }`}>
                  <p className={`font-bold ${isToday ? 'text-white' : 'text-gray-800'}`}>{day.name}</p>
                  <p className={`text-xs ${isToday ? 'text-blue-100' : 'text-gray-400'}`}>{day.dateLabel}</p>
                </div>

                <div className="bg-gray-100 flex-1 border rounded-b-lg p-2 min-h-[500px] flex flex-col">
                  <div className="space-y-2 flex-1">
                    {dayShifts?.map((shift) => (
                      <ShiftCard key={shift.id} shift={shift} />
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