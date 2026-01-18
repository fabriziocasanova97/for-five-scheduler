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
  const router = useRouter();

  useEffect(() => {
    fetchNotifications();

    // Poll every 30 seconds to keep it live
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('shifts')
      .select('id, store_id, stores(name), start_time')
      .eq('swap_status', 'pending_approval');

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

        {/* RED DOT BADGE */}
        {count > 0 && (
          <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white ring-2 ring-black animate-pulse">
            {count}
          </span>
        )}
      </button>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <>
          {/* Invisible Backdrop to close when clicking outside */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div className="absolute right-0 mt-3 w-80 bg-white border border-gray-800 rounded shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 origin-top-right">
            
            {/* Header */}
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500">
                Notifications
              </span>
              {count > 0 && (
                <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                  {count} Pending
                </span>
              )}
            </div>

            {/* List or Empty State */}
            <div className="max-h-80 overflow-y-auto bg-white min-h-[120px]">
              {notifications.length === 0 ? (
                // --- PROFESSIONAL EMPTY STATE ---
                <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                  <div className="bg-gray-50 p-3 rounded-full mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-300">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </div>
                  <p className="text-xs font-bold text-gray-900 uppercase tracking-widest">
                    All Caught Up
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    No pending actions required.
                  </p>
                </div>
              ) : (
                // --- LIST OF NOTIFICATIONS ---
                notifications.map(notif => (
                  <div 
                    key={notif.id}
                    onClick={() => {
                        setIsOpen(false);
                        router.push(`/store/${notif.store_id}`);
                    }}
                    className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors group relative"
                  >
                    <div className="flex items-start gap-3">
                        {/* Purple Dot Indicator */}
                        <div className="mt-1.5 w-2 h-2 rounded-full bg-purple-600 group-hover:scale-110 transition-transform shadow-sm"></div>
                        
                        <div>
                            <p className="text-xs font-bold text-gray-900 uppercase tracking-wide group-hover:text-purple-700 transition-colors">
                              Swap Request
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Action needed at <span className="font-bold text-black">{notif.stores?.name}</span>
                            </p>
                            <p className="text-[10px] text-gray-400 mt-1.5 font-medium">
                                {new Date(notif.start_time).toLocaleDateString(undefined, {weekday: 'short', month: 'short', day: 'numeric'})}
                            </p>
                        </div>
                        
                        {/* Arrow Icon on Hover */}
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400">
                           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                             <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                           </svg>
                        </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}