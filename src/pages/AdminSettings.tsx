import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Plus, Trash2, Pencil } from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { useAppData } from '@/contexts/AppDataContext';
import { useToast } from '@/contexts/ToastContext';
import type { ConventionSession } from '@/types';

export function AdminSettings() {
  const { conventionSettings, updateConventionSettings } = useAppData();
  const { addToast } = useToast();
  const [settings, setSettings] = useState({ ...conventionSettings });
  const [saving, setSaving] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [editingSession, setEditingSession] = useState<ConventionSession | null>(null);
  const [sessionForm, setSessionForm] = useState<Omit<ConventionSession, 'id'>>({ name: '', date: '', startTime: '', endTime: '', venue: '' });

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    updateConventionSettings(settings);
    setSaving(false);
    addToast({ type: 'success', title: 'Convention settings updated!' });
  };

  const addSession = () => {
    const id = `s${Date.now()}`;
    const newSession = { ...sessionForm, id };
    setSettings(prev => ({ ...prev, sessions: [...prev.sessions, newSession] }));
    setShowSessionModal(false);
    setSessionForm({ name: '', date: '', startTime: '', endTime: '', venue: '' });
    addToast({ type: 'success', title: 'Session added!' });
  };

  const updateSession = () => {
    if (!editingSession) return;
    setSettings(prev => ({
      ...prev,
      sessions: prev.sessions.map(s => s.id === editingSession.id ? { ...sessionForm, id: editingSession.id } : s),
    }));
    setEditingSession(null);
    setSessionForm({ name: '', date: '', startTime: '', endTime: '', venue: '' });
    addToast({ type: 'success', title: 'Session updated!' });
  };

  const deleteSession = (id: string) => {
    setSettings(prev => ({ ...prev, sessions: prev.sessions.filter(s => s.id !== id) }));
    addToast({ type: 'success', title: 'Session deleted!' });
  };

  const openEditSession = (session: ConventionSession) => {
    setEditingSession(session);
    setSessionForm({ name: session.name, date: session.date, startTime: session.startTime, endTime: session.endTime, venue: session.venue });
    setShowSessionModal(true);
  };

  const inputClass = "glass-input w-full";
  const labelClass = "text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block";

  return (
    <AdminLayout>
      <motion.h2 className="font-display font-bold text-2xl text-slate-900 dark:text-white mb-6"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        Convention Settings
      </motion.h2>

      {/* Convention Details */}
      <motion.div
        className="rounded-[20px] p-8 backdrop-blur-glass border bg-white/70 dark:bg-slate-900/65 border-white/45 dark:border-white/[0.08] mb-6"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
      >
        <h3 className="font-display font-semibold text-lg text-slate-900 dark:text-white mb-6">Convention Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Convention Name</label>
            <input className={inputClass} value={settings.name} onChange={e => setSettings({ ...settings, name: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Theme</label>
            <input className={inputClass} value={settings.theme} onChange={e => setSettings({ ...settings, theme: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Start Date</label>
            <input type="date" className={inputClass} value={settings.startDate} onChange={e => setSettings({ ...settings, startDate: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>End Date</label>
            <input type="date" className={inputClass} value={settings.endDate} onChange={e => setSettings({ ...settings, endDate: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Location</label>
            <input className={inputClass} value={settings.location} onChange={e => setSettings({ ...settings, location: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Max Attendees</label>
            <input type="number" className={inputClass} value={settings.maxAttendees} onChange={e => setSettings({ ...settings, maxAttendees: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className={`relative w-12 h-7 rounded-full transition-colors ${settings.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${settings.isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              <input type="checkbox" className="sr-only" checked={settings.isActive} onChange={e => setSettings({ ...settings, isActive: e.target.checked })} />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{settings.isActive ? 'Active' : 'Inactive'}</span>
            </label>
          </div>
        </div>
        <motion.button
          className="gradient-btn mt-6 h-12 px-8 flex items-center gap-2"
          onClick={handleSave}
          disabled={saving}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
        >
          {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </motion.button>
      </motion.div>

      {/* Sessions Manager */}
      <motion.div
        className="rounded-[20px] p-6 backdrop-blur-glass border bg-white/70 dark:bg-slate-900/65 border-white/45 dark:border-white/[0.08]"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display font-semibold text-lg text-slate-900 dark:text-white">Convention Sessions</h3>
          <motion.button
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-royal-500 to-blue-500 text-white text-sm font-medium"
            whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}
            onClick={() => { setEditingSession(null); setSessionForm({ name: '', date: '', startTime: '', endTime: '', venue: '' }); setShowSessionModal(true); }}
          >
            <Plus className="w-4 h-4" /> Add Session
          </motion.button>
        </div>
        <div className="space-y-3">
          {settings.sessions.map((session, i) => (
            <motion.div
              key={session.id}
              className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.04]"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }}
            >
              <div>
                <p className="font-medium text-sm text-slate-900 dark:text-white">{session.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {new Date(session.date).toLocaleDateString()} · {session.startTime} - {session.endTime} · {session.venue}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEditSession(session)} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                  <Pencil className="w-4 h-4 text-slate-400" />
                </button>
                <button onClick={() => deleteSession(session.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Session Modal */}
      {showSessionModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSessionModal(false)} />
          <motion.div className="relative glass-modal dark:glass-modal-dark p-6 max-w-md w-full" initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white mb-4">
              {editingSession ? 'Edit Session' : 'Add Session'}
            </h3>
            <div className="space-y-4">
              <div><label className={labelClass}>Name</label><input className={inputClass} value={sessionForm.name} onChange={e => setSessionForm({ ...sessionForm, name: e.target.value })} /></div>
              <div><label className={labelClass}>Date</label><input type="date" className={inputClass} value={sessionForm.date} onChange={e => setSessionForm({ ...sessionForm, date: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelClass}>Start Time</label><input type="time" className={inputClass} value={sessionForm.startTime} onChange={e => setSessionForm({ ...sessionForm, startTime: e.target.value })} /></div>
                <div><label className={labelClass}>End Time</label><input type="time" className={inputClass} value={sessionForm.endTime} onChange={e => setSessionForm({ ...sessionForm, endTime: e.target.value })} /></div>
              </div>
              <div><label className={labelClass}>Venue</label><input className={inputClass} value={sessionForm.venue} onChange={e => setSessionForm({ ...sessionForm, venue: e.target.value })} /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowSessionModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5">Cancel</button>
              <button onClick={editingSession ? updateSession : addSession} className="flex-1 py-2.5 rounded-xl gradient-btn text-sm font-medium">
                {editingSession ? 'Update' : 'Add'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AdminLayout>
  );
}
