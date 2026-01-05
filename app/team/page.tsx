import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

// NOTE: We removed AddStaffForm to prevent "Ghost Users".
// Users should be added via the Supabase Auth Dashboard.

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function TeamPage() {
  // Fetch profiles and sort by name
  const { data: staff } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name');

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
            <p className="text-gray-500 text-sm mt-1">
              View your current staff list. To add new staff, use the Supabase Dashboard.
            </p>
          </div>
          <Link href="/" className="text-blue-600 hover:underline font-bold">
            ← Back to Dashboard
          </Link>
        </div>

        {/* Staff Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
          <table className="w-full text-left">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="p-4 text-sm font-bold text-gray-700">Name</th>
                <th className="p-4 text-sm font-bold text-gray-700">Role</th>
                <th className="p-4 text-sm font-bold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {staff?.map((person) => (
                <tr key={person.id} className="border-b hover:bg-gray-50 transition">
                  <td className="p-4 font-bold text-gray-900">
                    {person.full_name || 'New Staff (Update Name)'}
                  </td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                      person.role === 'Manager' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {person.role || 'Barista'}
                    </span>
                  </td>
                  <td className="p-4 text-green-600 text-sm font-bold flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Active
                  </td>
                </tr>
              ))}
              
              {(!staff || staff.length === 0) && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-400">
                    No staff members found. Add them in Supabase Auth!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Helpful Tip */}
        <div className="mt-6 bg-blue-50 text-blue-800 p-4 rounded-lg border border-blue-100 text-sm">
          <strong>Tip:</strong> To change a user's Role (e.g., promote to Manager) or Name, go to the 
          <strong> Table Editor</strong> in Supabase and edit the 'profiles' table directly.
        </div>

      </div>
    </div>
  );
}