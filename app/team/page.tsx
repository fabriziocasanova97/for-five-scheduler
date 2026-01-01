import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

// Correct Import: No curly braces!
import AddStaffForm from '@/app/components/AddStaffForm';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function TeamPage() {
  const { data: staff } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name');

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
          <Link href="/" className="text-blue-600 hover:underline">
            ← Back to Dashboard
          </Link>
        </div>

        {/* This component was causing the error before */}
        <AddStaffForm />

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="p-4 text-sm font-bold text-gray-500">Name</th>
                <th className="p-4 text-sm font-bold text-gray-500">Role</th>
                <th className="p-4 text-sm font-bold text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff?.map((person) => (
                <tr key={person.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-bold text-gray-800">{person.full_name}</td>
                  <td className="p-4">
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold">
                      {person.role}
                    </span>
                  </td>
                  <td className="p-4 text-gray-400 text-sm">
                    Managed via Supabase
                  </td>
                </tr>
              ))}
              
              {staff?.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-400">
                    No staff members found. Add one above!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}