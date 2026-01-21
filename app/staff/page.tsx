'use client';

import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function StaffDirectory() {
  const [staff, setStaff] = useState<any[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<any[]>([]);
  
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Selected Staff Logic
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  const [personShifts, setPersonShifts] = useState<any[]>([]);
  const [loadingShifts, setLoadingShifts] = useState(false);

  // Role Check
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    checkRole();
  }, []);

  useEffect(() => {
    if (search === '') {
      setFilteredStaff(staff);
    } else {
      const lower = search.toLowerCase();
      setFilteredStaff(staff.filter((s: any) => 
        s.full_name?.toLowerCase().includes(lower) || 
        s.email?.toLowerCase().includes(lower)
      ));
    }
  }, [search, staff]);

  const checkRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role?.trim();
    if (role === 'Manager' || role === 'Operations') {
      setAuthorized(true);
      fetchStaff();
    } else {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');
    
    setStaff(data || []);
    setFilteredStaff(data || []);
    setLoading(false);
  };

  const handleSelectPerson = async (person: any) => {
    setSelectedPerson(person);
    setLoadingShifts(true);
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Fetch shifts starting from today
    const { data } = await supabase
      .from('shifts')
      .select('*, stores(name, address)')
      .eq('user_id', person.id)
      .gte('start_time', today.toISOString())
      .order('start_time', { ascending: true })
      .limit(10);

    setPersonShifts(data || []);
    setLoadingShifts(false);
  };

  // --- HELPER: FORMATTERS ---
  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  // Helper to check if a shift is TODAY
  const isToday = (isoString: string) => {
    const d = new Date(isoString);
    const today = new Date();
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
  };

  if (loading) return <div className="p-8 text-center text-xs font-bold uppercase tracking-widest text-gray-400">Loading Directory...</div>;

  if (!authorized) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-xl font-extrabold uppercase tracking-widest text-gray-900">Access Denied</h1>
      <p className="text-xs text-gray-500 mt-2 uppercase tracking-wide">Operations Team Only</p>
      <Link href="/" className="mt-8 text-xs font-bold underline">Go Home</Link>
    </div>
  );

  // Separate Today's shift from future shifts
  const todayShift = personShifts.find(s => isToday(s.start_time));
  const upcomingShifts = personShifts.filter(s => !isToday(s.start_time));

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      
      {/* HEADER - CONSISTENT STYLE */}
      <div className="max-w-5xl mx-auto px-6 pt-10 pb-4">
        <h1 className="text-3xl font-extrabold text-gray-900 uppercase tracking-widest">
          Staff Locator
        </h1>
        <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">
           Find where anyone is working
        </p>

        {/* SEARCH BAR */}
        <div className="relative mt-8">
             <input 
               type="text" 
               placeholder="SEARCH STAFF..." 
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="w-full bg-white border border-gray-200 p-4 text-sm font-bold placeholder-gray-300 focus:ring-2 focus:ring-black focus:border-black outline-none transition-all uppercase tracking-wide shadow-sm"
             />
             <div className="absolute right-4 top-4 text-gray-300">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                 <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
               </svg>
             </div>
        </div>
      </div>

      {/* LIST */}
      <main className="max-w-5xl mx-auto px-6 py-2">
        <div className="bg-white border border-gray-200 shadow-sm">
           {filteredStaff.length === 0 ? (
             <div className="p-8 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">No staff found</div>
           ) : (
             <ul className="divide-y divide-gray-100">
               {filteredStaff.map((person: any) => (
                 <li 
                   key={person.id} 
                   onClick={() => handleSelectPerson(person)}
                   className="p-4 hover:bg-gray-50 cursor-pointer flex justify-between items-center group transition-colors"
                 >
                    <div>
                      <h3 className="font-bold text-gray-900 uppercase tracking-wide text-sm group-hover:text-black">
                        {person.full_name || 'Unknown'}
                      </h3>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">
                        {person.role || 'Staff'}
                      </p>
                    </div>
                    <span className="text-gray-300 group-hover:text-black transition-colors">→</span>
                 </li>
               ))}
             </ul>
           )}
        </div>
      </main>

      {/* MODAL / SLIDE OVER for SCHEDULE */}
      {selectedPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedPerson(null)}></div>
          <div className="relative bg-white w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-start z-10">
              <div>
                <h2 className="text-2xl font-extrabold uppercase tracking-widest text-black">
                  {selectedPerson.full_name}
                </h2>
                <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">
                  Current Status
                </p>
              </div>
              <button onClick={() => setSelectedPerson(null)} className="text-gray-400 hover:text-black">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {loadingShifts ? (
                <div className="text-center py-8 text-xs font-bold text-gray-400 uppercase tracking-widest">Checking Status...</div>
              ) : (
                <>
                  {/* --- TODAY'S STATUS SECTION --- */}
                  <div className="mb-8">
                    {todayShift ? (
                      <div className="bg-black text-white p-6 shadow-lg border-l-4 border-green-500">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-green-400">Working Today</span>
                        </div>
                        
                        <h3 className="text-3xl font-extrabold uppercase tracking-tight leading-none mb-2">
                          {todayShift.stores?.name}
                        </h3>
                        
                        <p className="text-sm font-bold text-gray-300 uppercase tracking-wide mb-4">
                           {todayShift.stores?.address || 'No Address Listed'}
                        </p>

                        <div className="inline-block bg-white/10 px-3 py-1 text-sm font-bold tracking-wider">
                          {formatTime(todayShift.start_time)} - {formatTime(todayShift.end_time)}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-100 p-6 border-l-4 border-gray-400">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1 block">Status</span>
                        <h3 className="text-2xl font-extrabold uppercase tracking-tight text-gray-400">
                          Off Today
                        </h3>
                      </div>
                    )}
                  </div>

                  {/* --- UPCOMING LIST --- */}
                  {upcomingShifts.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                        Upcoming Schedule
                      </h4>
                      <div className="space-y-3">
                        {upcomingShifts.map((shift: any) => (
                          <div key={shift.id} className="border border-gray-200 p-4 hover:border-black transition-colors">
                            <div className="flex justify-between items-start mb-1">
                               <span className="text-[10px] font-bold text-black uppercase tracking-widest">
                                 {formatDate(shift.start_time)}
                               </span>
                            </div>
                            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                              {shift.stores?.name}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 text-center">
               <button 
                 onClick={() => setSelectedPerson(null)}
                 className="text-xs font-bold text-black uppercase tracking-widest hover:underline"
               >
                 Close
               </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}