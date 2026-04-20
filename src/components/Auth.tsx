import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, Mail, Lock, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Identifiants invalides ou accès non autorisé.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-500/30 mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white uppercase">Classroom Mastermind</h1>
          <p className="text-zinc-500 mt-2">Accès restreint aux enseignants autorisés</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-xl border border-zinc-200 dark:border-zinc-800">
          <div className="mb-8 text-center">
            <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-200">Connexion</h2>
            <p className="text-sm text-zinc-400 mt-1">Veuillez saisir vos identifiants personnels</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">E-mail</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all dark:text-white"
                  placeholder="nom@ecole.fr"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Mot de passe</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all dark:text-white"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <AnimatePresence>
              {message && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`p-3 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}
                >
                  {message.text}
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/30 disabled:opacity-50 mt-4 flex items-center justify-center gap-3"
            >
              {loading ? 'Vérification...' : <><LogIn className="w-5 h-5" /> Se connecter</>}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-zinc-500 mt-8">
          Vous n'avez pas de compte ? Contactez votre administrateur d'école.
        </p>
      </motion.div>
    </div>
  );
};
