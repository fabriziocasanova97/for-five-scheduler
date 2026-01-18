// @ts-nocheck
'use client';

import OpenShiftsBoard from '../components/OpenShiftsBoard';

export default function MarketplacePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 pt-10 pb-4">
        <h1 className="text-3xl font-extrabold text-gray-900 uppercase tracking-widest">
          Shift Board
        </h1>
        <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">
           Available Shifts & Swap Requests
        </p>
      </div>

      <main className="max-w-7xl mx-auto py-6 px-6">
        {/* We use the existing board component */}
        <OpenShiftsBoard />
      </main>
    </div>
  );
}