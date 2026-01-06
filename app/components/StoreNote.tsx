'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface StoreNoteProps {
  storeId: string;
  initialNote: string;
  amIBoss: boolean;
}

export default function StoreNote({ storeId, initialNote, amIBoss }: StoreNoteProps) {
  const [note, setNote] = useState(initialNote || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    
    // Save to Supabase
    const { error } = await supabase
      .from('stores')
      .update({ notes: note })
      .eq('id', storeId);

    if (error) {
      console.error('Error saving note:', error);
      alert('Failed to save note');
    } else {
      setIsEditing(false);
    }
    setIsSaving(false);
  };

  // If there is no note and you are NOT the boss, show nothing
  if (!note && !isEditing && !amIBoss) return null;

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex justify-between items-end mb-2 border-b border-gray-200 pb-1">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">
          Store Bulletin
        </h3>
        {amIBoss && !isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="text-[10px] font-bold uppercase tracking-widest text-black underline hover:text-gray-600"
          >
            Edit
          </button>
        )}
      </div>

      {/* Content */}
      {isEditing ? (
        <div className="bg-gray-50 p-4 border border-black">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-mono text-gray-900 placeholder-gray-400 resize-none h-24"
            placeholder="Write an announcement for the staff..."
            autoFocus
          />
          <div className="flex justify-end gap-3 mt-2 pt-2 border-t border-gray-200">
            <button
              onClick={() => {
                setIsEditing(false);
                setNote(initialNote || ''); // Revert on cancel
              }}
              className="text-xs font-bold uppercase text-gray-500 hover:text-black"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="text-xs font-bold uppercase bg-black text-white px-3 py-1 hover:bg-gray-800 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 p-5 border-l-4 border-black">
           {note ? (
             <p className="text-sm text-gray-900 font-medium whitespace-pre-wrap leading-relaxed">
               {note}
             </p>
           ) : (
             <p className="text-sm text-gray-400 italic">
               No announcements for this week.
             </p>
           )}
        </div>
      )}
    </div>
  );
}