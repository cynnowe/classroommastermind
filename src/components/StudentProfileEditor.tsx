import React from 'react';
import type { Student, StudentProfile, Constraint } from '../types';
import { X, Check, UserMinus, Plus, Trash2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  student: Student;
  allStudents: Student[];
  constraints: Constraint[];
  onConstraintsChange: (constraints: Constraint[]) => void;
  onSave: (student: Student) => void;
  onClose: () => void;
}

export const StudentProfileEditor: React.FC<Props> = ({ 
  student, 
  allStudents, 
  constraints, 
  onConstraintsChange, 
  onSave, 
  onClose 
}) => {
  const [profile, setProfile] = React.useState<StudentProfile>(student.profil);
  const [selectedBlacklistId, setSelectedBlacklistId] = React.useState<string>('');

  const handleChange = (field: keyof StudentProfile, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const studentBlacklist = constraints.filter(c => 
    c.type === 'blacklist' && (c.student_a_id === student.id || c.student_b_id === student.id)
  );

  const addBlacklist = () => {
    if (!selectedBlacklistId) return;
    
    // Check if already exists
    const exists = constraints.some(c => 
      c.type === 'blacklist' && 
      ((c.student_a_id === student.id && c.student_b_id === selectedBlacklistId) ||
       (c.student_a_id === selectedBlacklistId && c.student_b_id === student.id))
    );

    if (exists) return;

    const newConstraint: Constraint = {
      id: crypto.randomUUID(),
      type: 'blacklist',
      student_a_id: student.id,
      student_b_id: selectedBlacklistId
    };

    onConstraintsChange([...constraints, newConstraint]);
    setSelectedBlacklistId('');
  };

  const removeBlacklist = (id: string) => {
    onConstraintsChange(constraints.filter(c => c.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/50">
          <div>
            <h3 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">{student.prenom} {student.nom}</h3>
            <p className="text-sm text-zinc-500">Configuration du profil et des contraintes</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column: Profil */}
          <div className="space-y-6">
            <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest">Besoins Pédagogiques</h4>
            
            <div className="space-y-3">
              <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Niveau de bavardage</label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map(num => (
                  <button
                    key={num}
                    onClick={() => handleChange('bavard', num)}
                    className={cn(
                      "flex-1 h-12 rounded-xl font-bold transition-all border-2",
                      profile.bavard === num 
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30" 
                        : "bg-white dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700 text-zinc-400 hover:border-zinc-300"
                    )}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 cursor-pointer hover:bg-zinc-100 transition-colors">
                <span className="text-sm font-bold">Élève Moteur</span>
                <input 
                  type="checkbox" 
                  checked={profile.moteur}
                  onChange={(e) => handleChange('moteur', e.target.checked)}
                  className="w-6 h-6 rounded-lg border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 cursor-pointer hover:bg-zinc-100 transition-colors">
                <span className="text-sm font-bold text-blue-600">Trouble visuel</span>
                <input 
                  type="checkbox" 
                  checked={profile.trouble_visuel}
                  onChange={(e) => handleChange('trouble_visuel', e.target.checked)}
                  className="w-6 h-6 rounded-lg border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 cursor-pointer hover:bg-zinc-100 transition-colors">
                <span className="text-sm font-bold text-amber-600">Trouble de l'attention</span>
                <input 
                  type="checkbox" 
                  checked={profile.trouble_attention}
                  onChange={(e) => handleChange('trouble_attention', e.target.checked)}
                  className="w-6 h-6 rounded-lg border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                />
              </label>
            </div>
          </div>

          {/* Right Column: Blacklist */}
          <div className="space-y-6">
            <h4 className="text-xs font-black text-red-600 uppercase tracking-widest flex items-center gap-2">
              <UserMinus className="w-4 h-4" /> Liste Noire (Incompatibilités)
            </h4>
            
            <div className="flex gap-2">
              <select 
                value={selectedBlacklistId}
                onChange={(e) => setSelectedBlacklistId(e.target.value)}
                className="flex-1 bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl text-sm p-3 outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Sélectionner un élève...</option>
                {allStudents
                  .filter(s => s.id !== student.id)
                  .map(s => (
                    <option key={s.id} value={s.id}>{s.prenom} {s.nom}</option>
                  ))
                }
              </select>
              <button 
                onClick={addBlacklist}
                disabled={!selectedBlacklistId}
                className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 shadow-lg shadow-red-500/20"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
              {studentBlacklist.map(c => {
                const otherId = c.student_a_id === student.id ? c.student_b_id : c.student_a_id;
                const other = allStudents.find(s => s.id === otherId);
                return (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl">
                    <span className="text-sm font-medium text-red-700 dark:text-red-400">
                      Ne pas placer avec <strong>{other?.prenom} {other?.nom}</strong>
                    </span>
                    <button 
                      onClick={() => removeBlacklist(c.id)}
                      className="p-1.5 hover:bg-red-200 dark:hover:bg-red-800 rounded-lg text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
              {studentBlacklist.length === 0 && (
                <p className="text-xs text-zinc-400 text-center py-4 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-2xl">
                  Aucune restriction de voisinage.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 bg-zinc-50 dark:bg-zinc-800/30 border-t border-zinc-100 dark:border-zinc-800 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 px-6 py-3 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl font-bold hover:bg-white dark:hover:bg-zinc-800 transition-colors"
          >
            Annuler
          </button>
          <button 
            onClick={() => onSave({ ...student, profil: profile })}
            className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-2"
          >
            <Check className="w-6 h-6" /> Valider le Profil
          </button>
        </div>
      </div>
    </div>
  );
};
