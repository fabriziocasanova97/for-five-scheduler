// @ts-nocheck
'use client';

import OpenShiftsBoard from '../components/OpenShiftsBoard';

export default function MarketplacePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* CHANGED: max-w-7xl -> max-w-5xl 
        This constrains the width so it sits neatly in the center 
        with ample whitespace on the left/right.
      */}
      <div className="max-w-5xl mx-auto px-6 pt-10 pb-4">
        <h1 className="text-3xl font-extrabold text-gray-900 uppercase tracking-widest">
          Open Shifts
        </h1>
        {/* CHANGED: Updated subtitle to be more descriptive (Option 1) */}
        <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">
           Marketplace for pickups and swaps
        </p>
      </div>

      <main className="max-w-5xl mx-auto py-6 px-6">
        {/* We use the existing board component */}
        <OpenShiftsBoard />
      </main>
    </div>
  );
}