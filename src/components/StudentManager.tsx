import React from 'react';
import type { Student } from '../types';
import { Users, Search, Filter } from 'lucide-react';

interface Props {
  students: Student[];
  onEdit: (student: Student) => void;
}

export const StudentManager: React.FC<Props> = ({ students, onEdit }) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredStudents = students.filter(s => 
    `${s.prenom} ${s.nom}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-500" />
            Gestion des Élèves ({students.length})
          </h2>
          <p className="text-sm text-zinc-500">Cliquez sur un élève pour modifier son profil et ses besoins.</p>
        </div>

        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Rechercher un élève..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full md:w-64 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStudents.map(s => (
          <button 
            key={s.id} 
            onClick={() => onEdit(s)}
            className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md transition-all group"
          >
            <div className="flex flex-col items-start">
              <span className="font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                {s.prenom} {s.nom}
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-bold text-zinc-500 uppercase">
                  {s.genre}
                </span>
                <span className="text-[10px] text-zinc-400">
                  Bavardage: <span className={s.profil.bavard >= 4 ? "text-red-500 font-bold" : "text-zinc-500"}>{s.profil.bavard}/5</span>
                </span>
              </div>
            </div>
            
            <div className="flex gap-1.5 bg-zinc-50 dark:bg-zinc-800/50 p-1.5 rounded-xl">
              <div className={`w-3 h-3 rounded-full shadow-sm ${s.profil.bavard >= 4 ? "bg-red-500" : "bg-zinc-200 dark:bg-zinc-700"}`} title="Bavardage" />
              <div className={`w-3 h-3 rounded-full shadow-sm ${s.profil.trouble_visuel ? "bg-blue-500" : "bg-zinc-200 dark:bg-zinc-700"}`} title="Visuel" />
              <div className={`w-3 h-3 rounded-full shadow-sm ${s.profil.trouble_attention ? "bg-amber-500" : "bg-zinc-200 dark:bg-zinc-700"}`} title="Attention" />
              <div className={`w-3 h-3 rounded-full shadow-sm ${s.profil.moteur ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-700"}`} title="Moteur" />
            </div>
          </button>
        ))}
      </div>

      {filteredStudents.length === 0 && (
        <div className="text-center py-12 bg-zinc-100 dark:bg-zinc-900/50 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
          <p className="text-zinc-500">Aucun élève ne correspond à votre recherche.</p>
        </div>
      )}
    </div>
  );
};
