import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
import { api } from '../services/api';
import { Download, Upload, Database, AlertTriangle, CheckCircle2, Loader2, Plus, Trash2, ExternalLink, Megaphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const SettingsPage: React.FC = () => {
  const [user, loadingAuth] = useAuthState(auth);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [ads, setAds] = useState<any[]>([]);
  const [showAdForm, setShowAdForm] = useState(false);
  const [newAd, setNewAd] = useState({
    title: '',
    description: '',
    imageUrl: '',
    ctaText: 'Learn More',
    ctaUrl: '',
    type: 'feed'
  });

  useEffect(() => {
    if (user && user.email === "gopinathmanjula7@gmail.com") {
      fetchAds();
    }
  }, [user]);

  const fetchAds = async () => {
    try {
      const data = await api.getAds();
      setAds(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await api.createAd(user.uid, {
        ...newAd,
        id: Math.random().toString(36).substr(2, 9)
      });
      setNewAd({ title: '', description: '', imageUrl: '', ctaText: 'Learn More', ctaUrl: '', type: 'feed' });
      setShowAdForm(false);
      fetchAds();
      setStatus({ type: 'success', message: 'Ad created successfully!' });
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Failed to create ad.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAd = async (adId: string) => {
    if (!user || !window.confirm('Are you sure you want to delete this ad?')) return;
    try {
      await api.deleteAd(user.uid, adId);
      fetchAds();
      setStatus({ type: 'success', message: 'Ad deleted successfully!' });
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Failed to delete ad.' });
    }
  };

  const handleToggleAd = async (adId: string) => {
    if (!user) return;
    try {
      await api.toggleAdStatus(user.uid, adId);
      fetchAds();
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Failed to toggle ad status.' });
    }
  };

  if (loadingAuth) return null;
  if (!user || user.email !== "gopinathmanjula7@gmail.com") {
    return (
      <div className="text-center py-20 px-6 bg-white dark:bg-stone-900 rounded-[2.5rem] border border-black/5 dark:border-white/5 shadow-sm">
        <h2 className="text-3xl font-display font-bold text-stone-900 dark:text-stone-50 mb-4">Page not found</h2>
        <p className="text-stone-400 mb-8">The wave you're looking for doesn't exist.</p>
        <a href="/" className="px-8 py-3 bg-stone-900 dark:bg-stone-50 text-white dark:text-stone-900 rounded-full font-bold">Go back home</a>
      </div>
    );
  }

  const handleExport = async () => {
    if (!user) return;
    setLoading(true);
    setStatus(null);
    try {
      const dbData = await api.exportDb(user.uid);
      const blob = new Blob([JSON.stringify(dbData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `socialwave_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus({ type: 'success', message: 'Database exported successfully!' });
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Failed to export database.' });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('WARNING: This will overwrite your current database with the data from the file. This action cannot be undone. Are you sure?')) {
      e.target.value = '';
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          if (!json.data) throw new Error('Invalid backup format');
          if (!user) return;
          await api.importDb(json.data, user.uid);
          setStatus({ type: 'success', message: 'Database restored successfully! Refreshing...' });
          setTimeout(() => window.location.reload(), 2000);
        } catch (err) {
          console.error(err);
          setStatus({ type: 'error', message: 'Invalid backup file format.' });
          setLoading(false);
        }
      };
      reader.readAsText(file);
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Failed to read backup file.' });
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="px-4">
        <h2 className="text-2xl font-display font-bold text-stone-900 dark:text-stone-50">Settings</h2>
        <p className="text-stone-400 text-sm">Manage your account and data</p>
      </div>

      <div className="bg-white dark:bg-stone-900 rounded-[2rem] border border-black/5 dark:border-white/5 overflow-hidden">
        <div className="p-8 space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center">
              <Database className="text-stone-400" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-50">Database Management</h3>
              <p className="text-sm text-stone-400">Export or restore your entire database</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleExport}
              disabled={loading}
              className="flex flex-col items-center justify-center gap-4 p-8 bg-stone-50 dark:bg-stone-800/50 rounded-3xl border border-black/5 dark:border-white/5 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all group"
            >
              <div className="w-12 h-12 bg-white dark:bg-stone-900 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <Download className="text-emerald-500" size={20} />
              </div>
              <div className="text-center">
                <span className="block font-bold text-stone-900 dark:text-stone-50">Export Data</span>
                <span className="text-xs text-stone-400">Download as JSON</span>
              </div>
            </button>

            <label className="flex flex-col items-center justify-center gap-4 p-8 bg-stone-50 dark:bg-stone-800/50 rounded-3xl border border-black/5 dark:border-white/5 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all group cursor-pointer">
              <div className="w-12 h-12 bg-white dark:bg-stone-900 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <Upload className="text-sky-500" size={20} />
              </div>
              <div className="text-center">
                <span className="block font-bold text-stone-900 dark:text-stone-50">Restore Data</span>
                <span className="text-xs text-stone-400">Upload JSON backup</span>
              </div>
              <input type="file" accept=".json" onChange={handleImport} className="hidden" disabled={loading} />
            </label>
          </div>

          {status && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-2xl flex items-center gap-3 ${
                status.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600'
              }`}
            >
              {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
              <span className="text-sm font-medium">{status.message}</span>
            </motion.div>
          )}

          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex gap-4">
            <AlertTriangle className="text-amber-600 flex-shrink-0" size={20} />
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              <strong>Warning:</strong> Restoring data will completely replace your current database. Make sure you have a backup of your current data before proceeding.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-stone-900 rounded-[2rem] border border-black/5 dark:border-white/5 overflow-hidden">
        <div className="p-8 space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center">
                <Megaphone className="text-stone-400" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-900 dark:text-stone-50">Ad Manager</h3>
                <p className="text-sm text-stone-400">Manage your "real" ads</p>
              </div>
            </div>
            <button 
              onClick={() => setShowAdForm(!showAdForm)}
              className="p-3 bg-stone-900 dark:bg-stone-50 text-white dark:text-stone-900 rounded-2xl hover:scale-105 transition-transform"
            >
              <Plus size={20} />
            </button>
          </div>

          <AnimatePresence>
            {showAdForm && (
              <motion.form 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleCreateAd}
                className="space-y-4 overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input 
                    type="text" 
                    placeholder="Ad Title" 
                    required
                    value={newAd.title}
                    onChange={e => setNewAd({...newAd, title: e.target.value})}
                    className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-800 rounded-2xl border-none focus:ring-2 focus:ring-stone-900/5 transition-all"
                  />
                  <input 
                    type="text" 
                    placeholder="CTA Text (e.g. Learn More)" 
                    value={newAd.ctaText}
                    onChange={e => setNewAd({...newAd, ctaText: e.target.value})}
                    className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-800 rounded-2xl border-none focus:ring-2 focus:ring-stone-900/5 transition-all"
                  />
                </div>
                <textarea 
                  placeholder="Ad Description" 
                  value={newAd.description}
                  onChange={e => setNewAd({...newAd, description: e.target.value})}
                  className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-800 rounded-2xl border-none focus:ring-2 focus:ring-stone-900/5 transition-all h-24"
                />
                <input 
                  type="url" 
                  placeholder="Image URL" 
                  required
                  value={newAd.imageUrl}
                  onChange={e => setNewAd({...newAd, imageUrl: e.target.value})}
                  className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-800 rounded-2xl border-none focus:ring-2 focus:ring-stone-900/5 transition-all"
                />
                <input 
                  type="url" 
                  placeholder="Target URL (Link)" 
                  required
                  value={newAd.ctaUrl}
                  onChange={e => setNewAd({...newAd, ctaUrl: e.target.value})}
                  className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-800 rounded-2xl border-none focus:ring-2 focus:ring-stone-900/5 transition-all"
                />
                <div className="flex gap-4">
                  <select 
                    value={newAd.type}
                    onChange={e => setNewAd({...newAd, type: e.target.value})}
                    className="px-4 py-3 bg-stone-50 dark:bg-stone-800 rounded-2xl border-none focus:ring-2 focus:ring-stone-900/5 transition-all"
                  >
                    <option value="feed">Feed Ad</option>
                    <option value="sidebar">Sidebar Ad</option>
                  </select>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 bg-stone-900 dark:bg-stone-50 text-white dark:text-stone-900 rounded-2xl font-bold hover:bg-stone-800 dark:hover:bg-stone-200 transition-all"
                  >
                    Create Ad
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            {ads.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-stone-100 dark:border-stone-800 rounded-3xl">
                <p className="text-stone-400 text-sm italic">No ads created yet.</p>
              </div>
            ) : (
              ads.map(ad => (
                <div key={ad.id} className="flex items-center gap-4 p-4 bg-stone-50 dark:bg-stone-800/50 rounded-3xl border border-black/5 dark:border-white/5 group">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-stone-200 dark:bg-stone-700 shrink-0">
                    <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-stone-900 dark:text-stone-50 truncate">{ad.title}</h4>
                      <span className="px-2 py-0.5 bg-stone-200 dark:bg-stone-700 rounded-full text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                        {ad.type}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${ad.active ? 'bg-emerald-100 text-emerald-600' : 'bg-stone-200 text-stone-500'}`}>
                        {ad.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 truncate">{ad.description}</p>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleToggleAd(ad.id)}
                      className={`p-2 rounded-xl transition-colors ${ad.active ? 'text-emerald-500 hover:bg-emerald-50' : 'text-stone-400 hover:bg-stone-100'}`}
                      title={ad.active ? 'Deactivate' : 'Activate'}
                    >
                      <CheckCircle2 size={18} />
                    </button>
                    <a href={ad.ctaUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-stone-400 hover:text-stone-900 dark:hover:text-stone-50 transition-colors">
                      <ExternalLink size={18} />
                    </a>
                    <button 
                      onClick={() => handleDeleteAd(ad.id)}
                      className="p-2 text-stone-400 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-stone-900 p-8 rounded-[2rem] shadow-2xl flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-stone-900 dark:text-stone-50" />
            <p className="font-bold text-stone-900 dark:text-stone-50">Processing Database...</p>
          </div>
        </div>
      )}
    </div>
  );
};
