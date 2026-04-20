import React from 'react';
import type { SeatingPlan, Student, Layout } from '../types';
import { Calendar, Eye, Trash2 } from 'lucide-react';

interface ArchivedPlan {
  id: string;
  date: string;
  plan: SeatingPlan;
  layout: Layout;
}

interface Props {
  archives: ArchivedPlan[];
  students: Student[];
  onView: (plan: ArchivedPlan) => void;
  onDelete: (id: string) => void;
}

export const ArchiveViewer: React.FC<Props> = ({ archives, students, onView, onDelete }) => {
  const studentMap = new Map(students.map(s => [s.id, s]));

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Calendar className="w-6 h-6 text-indigo-500" />
          Archives des Plans
        </h2>
        <p className="text-sm text-zinc-500">Consultez et gérez vos anciens plans de classe validés.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {archives.map(archive => (
          <div key={archive.id} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm hover:shadow-md transition-all group">
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                {new Date(archive.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <div className="flex gap-1">
                <button 
                  onClick={() => onView(archive)}
                  className="p-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-600 rounded-lg transition-colors"
                  title="Voir le plan"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => onDelete(archive.id)}
                  className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 rounded-lg transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="p-4">
               <div className="flex flex-wrap gap-1">
                 {Object.values(archive.plan.assignments).slice(0, 12).map(sid => {
                   const s = studentMap.get(sid);
                   return (
                     <span key={sid} className="text-[8px] bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500">
                       {s?.prenom}
                     </span>
                   );
                 })}
                 {Object.keys(archive.plan.assignments).length > 12 && (
                   <span className="text-[8px] text-zinc-400">...</span>
                 )}
               </div>
               <p className="mt-3 text-[10px] text-zinc-400 uppercase font-bold tracking-wider">
                 {Object.keys(archive.plan.assignments).length} élèves placés
               </p>
            </div>
          </div>
        ))}

        {archives.length === 0 && (
          <div className="lg:col-span-3 text-center py-20 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
            <Calendar className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
            <p className="text-zinc-500 font-medium">Aucun plan archivé pour le moment.</p>
            <p className="text-sm text-zinc-400 mt-1">Validez un plan dans l'onglet Placement pour le retrouver ici.</p>
          </div>
        )}
      </div>
    </div>
  );
};
