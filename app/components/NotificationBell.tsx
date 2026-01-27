// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [role, setRole] = useState(null); 
  const [userId, setUserId] = useState(null); 
  const router = useRouter();

  useEffect(() => {
    // 1. Get User & Role FIRST
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setUserId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      const userRole = profile?.role?.trim();
      setRole(userRole);

      // 2. Fetch immediately
      fetchNotifications(user.id, userRole);

      // 3. Poll every 30 seconds
      const interval = setInterval(() => fetchNotifications(user.id, userRole), 30000);
      return () => clearInterval(interval);
    };

    init();
  }, []);

  const fetchNotifications = async (uid, uRole) => {
    if (!uid) return;

    let data, error;
    const isManager = uRole === 'Manager' || uRole === 'Operations';

    if (isManager) {
      // --- MANAGER LOGIC: Show Pending Approvals ---
      const response = await supabase
        .from('shifts')
        .select('id, store_id, stores(name), start_time, swap_status')
        .eq('swap_status', 'pending_approval');
      data = response.data;
    } else {
      // --- BARISTA LOGIC: Show Denied Swaps for THIS User ---
      const response = await supabase
        .from('shifts')
        .select('id, store_id, stores(name), start_time, swap_status')
        .eq('user_id', uid)           // Only MY shifts
        .eq('swap_status', 'denied'); // Only REJECTED ones
      data = response.data;
    }

    if (data) {
      setCount(data.length);
      setNotifications(data);
    }
  };

  return (
    <div className="relative z-50">
      {/* BELL ICON */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 transition-colors duration-200 ${isOpen ? 'text-white' : 'text-gray-400 hover:text-white'}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>

        {/* BADGE */}
        {count > 0 && (
          <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white ring-2 ring-black">
            {count}
          </span>
        )}
      </button>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div className="absolute right-0 mt-3 w-80 bg-white rounded-sm border-2 border-black shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 origin-top-right">
            
            {/* Header */}
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-black">
                Notifications
              </span>
              {count > 0 && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 border border-current uppercase tracking-wider ${
                  (role === 'Manager' || role === 'Operations') 
                    ? 'text-purple-700 bg-purple-50' 
                    : 'text-red-700 bg-red-50'
                }`}>
                  {count} { (role === 'Manager' || role === 'Operations') ? 'Pending' : 'Alerts' }
                </span>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto bg-white min-h-[120px]">
              {notifications.length === 0 ? (
                // EMPTY STATE
                <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-gray-300 mb-2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  <p className="text-xs font-extrabold text-gray-900 uppercase tracking-widest">
                    All Caught Up
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1 font-medium">
                    No pending actions required.
                  </p>
                </div>
              ) : (
                // NOTIFICATIONS LIST
                notifications.map(notif => {
                  const isDenied = notif.swap_status === 'denied';
                  return (
                    <div 
                      key={notif.id}
                      onClick={() => {
                          setIsOpen(false);
                          router.push(`/store/${notif.store_id}`);
                      }}
                      className={`
                        p-4 border-b border-gray-100 cursor-pointer transition-colors group relative border-l-4
                        ${isDenied 
                            ? 'border-l-red-600 bg-red-50/50 hover:bg-red-50' 
                            : 'border-l-purple-600 bg-white hover:bg-purple-50'
                        }
                      `}
                    >
                      <div className="flex flex-col gap-1">
                          <div className="flex justify-between items-start">
                              <p className={`text-xs font-bold uppercase tracking-wide ${
                                isDenied ? 'text-red-700' : 'text-gray-900'
                              }`}>
                                {isDenied ? 'Swap Rejected' : 'Swap Request'}
                              </p>
                              
                              {/* TIMESTAMP - Upper Right */}
                              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                                  {new Date(notif.start_time).toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'})}
                              </p>
                          </div>
                          
                          <p className="text-xs text-gray-600">
                              {isDenied 
                                ? "Action needed: Acknowledge alert at " 
                                : "Action needed at "
                              }
                              <span className="font-bold text-black border-b border-gray-300 pb-0.5">{notif.stores?.name}</span>
                          </p>
                          
                          <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400">
                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                               <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                             </svg>
                          </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}