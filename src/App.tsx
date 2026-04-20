import { useState, useEffect } from 'react';
import type { Student } from './types';
import type { Layout, SeatingPlan, Constraint, HistoryPair } from './types';
import { ImportDashboard } from './components/ImportDashboard';
import { LayoutEditor } from './components/LayoutEditor';
import { ClassroomGrid } from './components/ClassroomGrid';
import { StudentProfileEditor } from './components/StudentProfileEditor';
import { StudentManager } from './components/StudentManager';
import { ArchiveViewer } from './components/ArchiveViewer';
import { Auth } from './components/Auth';
import { runOptimization } from './lib/optimization';
import { supabase } from './lib/supabase';
import { Sparkles, Save, Users, Map as MapIcon, History, Settings, LogOut, FileDown } from 'lucide-react';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

function App() {
  const [students, setStudents] = useState<Student[]>([]);
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [history, setHistory] = useState<HistoryPair[]>([]);
  const [layout, setLayout] = useState<Layout>({
    id: 'default',
    name: 'Ma Classe',
    grid_config: { rows: 6, cols: 8, cells: {} }
  });
  const [plan, setPlan] = useState<SeatingPlan>({ assignments: {} });
  const [session, setSession] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<'import' | 'layout' | 'students' | 'grid' | 'archives'>('import');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [archives, setArchives] = useState<any[]>([]);

  // Auth Listener
  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session: s } }: any) => {
      setSession(s);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, s: any) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load from Supabase (or localStorage fallback)
  useEffect(() => {
    const fetchData = async () => {
      // 1. Try to load from Supabase if session exists
      if (session && supabase) {
        try {
          const { data: stds } = await supabase.from('students').select('*');
          const { data: lay } = await supabase.from('layouts').select('*').maybeSingle();
          const { data: cons } = await supabase.from('constraints').select('*');
          const { data: hist } = await supabase.from('history_pairs').select('*');
          const { data: arch } = await supabase.from('archives').select('*');

          // If we have online students, use them. Otherwise, fallback to local storage
          if (stds && stds.length > 0) {
            setStudents(stds);
          } else {
            const local = localStorage.getItem('cm_students');
            if (local) setStudents(JSON.parse(local));
          }

          if (lay) {
            setLayout(lay);
          } else {
            const localLay = localStorage.getItem('cm_layout');
            if (localLay) setLayout(JSON.parse(localLay));
          }

          if (cons && cons.length > 0) {
            setConstraints(cons);
          } else {
            const localCons = localStorage.getItem('cm_constraints');
            if (localCons) setConstraints(JSON.parse(localCons));
          }

          if (hist && hist.length > 0) setHistory(hist);
          
          if (arch && arch.length > 0) {
            setArchives(arch.map((a: any) => ({
              id: a.id,
              date: a.created_at,
              plan: a.plan,
              layout: layout
            })));
          } else {
            const localArch = localStorage.getItem('cm_archives');
            if (localArch) setArchives(JSON.parse(localArch));
          }
          
          return; // Success, we're done
        } catch (e) {
          console.error("Supabase fetch error, falling back to local:", e);
        }
      }

      // 2. Fallback to LocalStorage (if not logged in or fetch failed)
      try {
        const savedStudents = localStorage.getItem('cm_students');
        const savedLayout = localStorage.getItem('cm_layout');
        const savedConstraints = localStorage.getItem('cm_constraints');
        const savedHistory = localStorage.getItem('cm_history');
        const savedArchives = localStorage.getItem('cm_archives');

        if (savedStudents) setStudents(JSON.parse(savedStudents));
        if (savedLayout) setLayout(JSON.parse(savedLayout));
        if (savedConstraints) setConstraints(JSON.parse(savedConstraints));
        if (savedHistory) setHistory(JSON.parse(savedHistory));
        if (savedArchives) setArchives(JSON.parse(savedArchives));
      } catch (e) {
        console.error("LocalStorage parse error", e);
      }
    };

    fetchData();
  }, [session]);

  // Backup Save to localStorage & Supabase Sync
  useEffect(() => {
    // 1. Always save to LocalStorage (local safety)
    localStorage.setItem('cm_students', JSON.stringify(students));
    localStorage.setItem('cm_layout', JSON.stringify(layout));
    localStorage.setItem('cm_constraints', JSON.stringify(constraints));
    localStorage.setItem('cm_history', JSON.stringify(history));
    localStorage.setItem('cm_archives', JSON.stringify(archives));

    // 2. Sync to Supabase if connected
    if (session && supabase) {
      const syncData = async () => {
        // Save Layout (single row per user)
        await supabase.from('layouts').upsert({
          ...layout,
          user_id: session.user.id
        }, { onConflict: 'user_id' });
        
        // Note: For performance, complex sync for students/archives 
        // should ideally be triggered on specific actions (like "Valider" or "Import")
        // but for now, we'll ensure they are persisted on finalize.
      };
      syncData();
    }
  }, [students, layout, constraints, history, archives, session]);

  const startOptimization = async () => {
    setIsOptimizing(true);
    setProgress(0);
    
    // Simulate async optimization for progress bar
    setTimeout(() => {
      try {
        const optimizedPlan = runOptimization(
          students,
          constraints,
          history,
          layout,
          5000,
          (p) => setProgress(p)
        );
        setPlan(optimizedPlan);
        setActiveTab('grid');
      } catch (e: any) {
        alert(e.message);
      } finally {
        setIsOptimizing(false);
      }
    }, 100);
  };

  const finalizePlan = async () => {
    // Check if plan is not empty
    if (Object.keys(plan.assignments).length === 0) {
      alert("Le plan est vide !");
      return;
    }

    // 1. Save to Archives
    const newArchive = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      plan: { ...plan },
      layout: { ...layout }
    };
    setArchives([newArchive, ...archives]);

    // 2. Update History Memory
    const updatedHistory = [...history];
    const assignments = plan.assignments;
    const processed = new Set<string>();

    Object.entries(assignments).forEach(([key, s1Id]) => {
      const [r, c] = key.split('-').map(Number);
      for (let i = r - 2; i <= r + 2; i++) {
        for (let j = c - 2; j <= c + 2; j++) {
          if (i === r && j === c) continue;
          const nId = assignments[`${i}-${j}`];
          if (nId) {
            const pairId = [s1Id, nId].sort().join(':');
            if (!processed.has(pairId)) {
              const existingIdx = updatedHistory.findIndex(h => 
                (h.student_a_id === s1Id && h.student_b_id === nId) ||
                (h.student_a_id === nId && h.student_b_id === s1Id)
              );

              if (existingIdx >= 0) {
                updatedHistory[existingIdx] = {
                  ...updatedHistory[existingIdx],
                  count_sessions: updatedHistory[existingIdx].count_sessions + 1
                };
              } else {
                updatedHistory.push({ 
                  id: crypto.randomUUID(), 
                  student_a_id: s1Id, 
                  student_b_id: nId, 
                  count_sessions: 1 
                });
              }
              processed.add(pairId);
            }
          }
        }
      }
    });

    setHistory(updatedHistory);
    
    // 3. Persist to Supabase if session active
    if (session && supabase) {
       const user_id = session.user.id;
       try {
         // A. Save Layout FIRST
         const layoutId = layout.id === 'default' ? crypto.randomUUID() : layout.id;
         const { error: layoutError } = await supabase.from('layouts').upsert({
           id: layoutId,
           user_id,
           name: layout.name,
           grid_config: layout.grid_config
         });
         if (layoutError) throw layoutError;

         // Update local layout ID to avoid recreations
         setLayout(prev => ({ ...prev, id: layoutId }));

         // B. Sync Students
         const { error: studentError } = await supabase.from('students').upsert(
           students.map(s => ({ ...s, user_id }))
         );
         if (studentError) throw studentError;

         // C. Sync Constraints
         const { error: constraintError } = await supabase.from('constraints').upsert(
           constraints.map(c => ({ ...c, user_id }))
         );
         if (constraintError) throw constraintError;

         // D. Sync History
         const { error: historyError } = await supabase.from('history_pairs').upsert(
           updatedHistory.map(h => ({ ...h, user_id })),
           { onConflict: 'user_id, student_a_id, student_b_id' }
         );
         if (historyError) throw historyError;

         // E. Sync Archives
         const { error: archiveError } = await supabase.from('archives').upsert(
           [...archives, newArchive].map(a => ({
             id: a.id,
             user_id,
             plan: a.plan,
             layout_id: layoutId,
             created_at: a.date
           }))
         );
         if (archiveError) throw archiveError;

         // Final state update to match DB structure if needed
         alert("✅ Félicitations ! Tout est sauvegardé sur votre compte Supabase.");
       } catch (error: any) {
         console.error("Détails de l'erreur Supabase:", error);
         alert(`❌ Erreur de sauvegarde : ${error.message}\n\nVérifiez que vous avez bien lancé le nouveau script SQL dans Supabase.`);
       }
    } else {
      alert("⚠️ Mode Local : Plan archivé sur cet ordinateur uniquement.");
    }

    setActiveTab('archives');
  };

  const deleteArchive = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette archive ?")) return;

    // 1. Update Local State
    setArchives(archives.filter(a => a.id !== id));

    // 2. Sync with Supabase
    if (session && supabase) {
      const { error } = await supabase.from('archives').delete().eq('id', id);
      if (error) {
        console.error("Delete error:", error);
        alert("Erreur lors de la suppression sur le serveur.");
      }
    }
  };

  const exportPDF = () => {
    const gridElement = document.getElementById('classroom-grid-container');
    if (!gridElement) {
      alert("Veuillez vous placer sur l'onglet 'Plan de Classe' pour exporter le PDF.");
      return;
    }
    
    // Simple et infaillible : déclenche l'impression du navigateur
    window.print();
  };

  if (!session && supabase) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-black tracking-tight">CLASSROOM MASTERMIND</h1>
          </div>

          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('import')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'import' ? 'bg-white dark:bg-zinc-700 shadow-sm text-indigo-600' : 'text-zinc-500 hover:text-zinc-900'}`}
            >
              <Users className="w-4 h-4" /> Import
            </button>
            <button 
              onClick={() => setActiveTab('layout')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'layout' ? 'bg-white dark:bg-zinc-700 shadow-sm text-indigo-600' : 'text-zinc-500 hover:text-zinc-900'}`}
            >
              <MapIcon className="w-4 h-4" /> Salle
            </button>
            <button 
              onClick={() => setActiveTab('students')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'students' ? 'bg-white dark:bg-zinc-700 shadow-sm text-indigo-600' : 'text-zinc-500 hover:text-zinc-900'}`}
            >
              <Users className="w-4 h-4" /> Élèves
            </button>
            <button 
              onClick={() => setActiveTab('grid')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'grid' ? 'bg-white dark:bg-zinc-700 shadow-sm text-indigo-600' : 'text-zinc-500 hover:text-zinc-900'}`}
            >
              <Settings className="w-4 h-4" /> Placement
            </button>
            <button 
              onClick={() => setActiveTab('archives')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'archives' ? 'bg-white dark:bg-zinc-700 shadow-sm text-indigo-600' : 'text-zinc-500 hover:text-zinc-900'}`}
            >
              <History className="w-4 h-4" /> Archives
            </button>
          </div>

          <div className="flex items-center gap-4">
            {students.length > 0 && (
              <button 
                onClick={startOptimization}
                disabled={isOptimizing}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-50"
              >
                {isOptimizing ? 'Optimisation...' : 'Lancer l\'Optimisation'}
              </button>
            )}
            <button 
              onClick={() => supabase.auth.signOut()}
              className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
              title="Déconnexion"
            >
              <LogOut className="w-5 h-5" />
            </button>
            <button 
              onClick={exportPDF}
              className="p-2 text-zinc-500 hover:text-indigo-600 transition-colors"
              title="Exporter en PDF"
            >
              <FileDown className="w-6 h-6" />
            </button>
            <button 
              onClick={finalizePlan}
              className="p-2 text-zinc-500 hover:text-indigo-600 transition-colors"
              title="Finaliser et Sauvegarder"
            >
              <Save className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {isOptimizing && (
          <div className="mb-8 p-6 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-indigo-600 uppercase tracking-widest">Algorithme en cours</span>
              <span className="text-sm font-mono">{Math.round(progress * 100)}%</span>
            </div>
            <div className="h-3 bg-indigo-200 dark:bg-indigo-900 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-indigo-600"
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
              />
            </div>
            <p className="text-xs text-indigo-500 mt-2">Test de 5000 combinaisons par recherche locale (Hill Climbing)...</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8">
            {activeTab === 'import' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <ImportDashboard onImport={(imported) => {
                  setStudents(imported);
                  setActiveTab('students');
                }} />
              </motion.div>
            )}

            {activeTab === 'students' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <StudentManager students={students} onEdit={setEditingStudent} />
              </motion.div>
            )}

            {activeTab === 'archives' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <ArchiveViewer 
                  archives={archives} 
                  students={students} 
                  onView={(archive) => {
                    setPlan(archive.plan);
                    setLayout(archive.layout);
                    setActiveTab('grid');
                  }}
                  onDelete={deleteArchive}
                />
              </motion.div>
            )}
            
            {activeTab === 'layout' && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <LayoutEditor layout={layout} onChange={setLayout} />
              </motion.div>
            )}

            {activeTab === 'grid' && (
              <motion.div 
                id="classroom-grid-container"
                className="bg-white dark:bg-zinc-950 p-8 rounded-3xl"
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
              >
                <ClassroomGrid 
                  layout={layout} 
                  students={students} 
                  constraints={constraints} 
                  history={history} 
                  plan={plan}
                  onPlanChange={setPlan}
                />
              </motion.div>
            )}
          </div>

          <div className="lg:col-span-4 space-y-6">
             <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-500" />
                  Statistiques
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 text-sm">Places libres</span>
                    <span className="font-mono font-bold">
                      {Object.values(layout.grid_config.cells).filter(c => c.type === 'seat').length - Object.keys(plan.assignments).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 text-sm">Contraintes Actives</span>
                    <span className="font-mono font-bold text-indigo-600">{constraints.length}</span>
                  </div>
                </div>
             </div>

             <div className="p-6 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl text-white shadow-xl shadow-indigo-500/20">
                <h3 className="text-lg font-bold mb-2">Conseil Expert</h3>
                <p className="text-sm text-indigo-100 leading-relaxed">
                  Utilisez l'onglet "Salle" pour marquer les fenêtres et les portes. Les élèves ayant un trouble de l'attention seront automatiquement éloignés de ces sources de distraction.
                </p>
             </div>
          </div>
        </div>
      </main>

      {editingStudent && (
        <StudentProfileEditor 
          student={editingStudent}
          allStudents={students}
          constraints={constraints}
          onConstraintsChange={setConstraints}
          onClose={() => setEditingStudent(null)}
          onSave={(updated) => {
            setStudents(students.map(s => s.id === updated.id ? updated : s));
            setEditingStudent(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
