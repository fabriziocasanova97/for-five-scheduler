'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AddStaffForm() {
  const [name, setName] = useState('');
  const [role, setRole] = useState('Barista'); 
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);

    const { error } = await supabase.from('profiles').insert({
      full_name: name,
      role: role
    });

    if (error) {
      alert('Error adding staff: ' + error.message);
    } else {
      setName(''); 
      router.refresh(); 
    }
    setLoading(false);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mb-8">
      <h2 className="text-lg font-bold mb-4 text-gray-900">Add New Team Member</h2>
      <form onSubmit={handleSubmit} className="flex gap-4 items-end">
        
        {/* Name Input */}
        <div className="flex-1">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border p-2 rounded text-black bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g. John Doe"
            required
          />
        </div>

        {/* Role Selection (Chef removed) */}
        <div className="w-40">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Role</label>
          <select 
            value={role} 
            onChange={(e) => setRole(e.target.value)}
            className="w-full border p-2 rounded text-black bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="Barista">Barista</option>
            <option value="Manager">Manager</option>
          </select>
        </div>

        {/* Submit Button */}
        <button 
          type="submit" 
          disabled={loading}
          className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700 disabled:opacity-50 h-[42px] transition"
        >
          {loading ? 'Adding...' : '+ Add'}
        </button>
      </form>
    </div>
  );
}