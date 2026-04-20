import React, { useState } from 'react';
import Papa from 'papaparse';
import { Upload, CheckCircle, AlertCircle, FileDown } from 'lucide-react';
import type { Student, StudentProfile } from '../types';

interface Props {
  onImport: (students: Student[]) => void;
}

export const ImportDashboard: React.FC<Props> = ({ onImport }) => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const downloadTemplate = () => {
    const headers = ['nom', 'prenom', 'genre'];
    const sampleData = ['Dupont', 'Jean', 'M'];
    const csvContent = [headers, sampleData].map(e => e.join(",")).join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "template_eleves.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        try {
          const importedStudents: Student[] = results.data.map((row: any, index) => {
            // Validate required fields
            if (!row.nom || !row.prenom) {
              throw new Error(`Ligne ${index + 1}: Nom et Prénom sont requis`);
            }

            const profil: StudentProfile = {
              bavard: 1,
              moteur: false,
              trouble_visuel: false,
              trouble_attention: false
            };

            return {
              id: row.id || crypto.randomUUID(),
              nom: row.nom,
              prenom: row.prenom,
              genre: row.genre || 'NB',
              profil
            };
          });

          onImport(importedStudents);
          setSuccess(true);
          setError(null);
        } catch (err: any) {
          setError(err.message);
          setSuccess(false);
        }
      },
      error: (err) => {
        setError("Erreur lors de la lecture du fichier CSV");
        setSuccess(false);
      }
    });
  };

  return (
    <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Import des Élèves</h2>
        <button 
          onClick={downloadTemplate}
          className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors border border-indigo-100"
        >
          <FileDown className="w-4 h-4" /> Modèle CSV
        </button>
      </div>
      
      <div className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-8 hover:border-indigo-500 transition-colors cursor-pointer relative">
        <input 
          type="file" 
          accept=".csv" 
          onChange={handleFileUpload}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
        <Upload className="w-12 h-12 text-zinc-400 mb-3" />
        <p className="text-zinc-600 dark:text-zinc-400 text-center">
          Glissez-déposez votre fichier CSV ici ou <span className="text-indigo-600 font-medium">parcourez</span>
        </p>
        <p className="text-xs text-zinc-500 mt-2">Format requis: nom, prenom, genre</p>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm">Importation réussie !</span>
        </div>
      )}
    </div>
  );
};
