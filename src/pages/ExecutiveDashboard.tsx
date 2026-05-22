import { useState } from 'react';
import { motion } from 'framer-motion';
import { Pencil, CheckCircle, Clock } from 'lucide-react';
import { ExecutiveLayout } from '@/components/ExecutiveLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useAppData } from '@/contexts/AppDataContext';
import { useToast } from '@/contexts/ToastContext';
import { BAND_COLORS, GROUP_COLORS } from '@/types';

export function ExecutiveDashboard() {
  const { user } = useAuth();
  const { conventionSettings, executives } = useAppData();
  const { addToast } = useToast();
  const [showEditModal, setShowEditModal] = useState(false);

  const exec = executives.find(e => e.email === user?.email) || executives[0];
  const bandColor = BAND_COLORS[exec.fellowshipBand];
  const groupColor = GROUP_COLORS['Group A'];

  const now = new Date();
  const sessions = conventionSettings.sessions.map(s => {
    const sDate = new Date(s.date + 'T' + s.startTime);
    const eDate = new Date(s.date + 'T' + s.endTime);
    let status: 'past' | 'current' | 'upcoming' = 'upcoming';
    if (now > eDate) status = 'past';
    else if (now >= sDate && now <= eDate) status = 'current';
    return { ...s, status };
  });

  return (
    <ExecutiveLayout>
      <div className="max-w-xl mx-auto space-y-6">
        {/* Profile Card */}
        <motion.div
          className="rounded-[24px] p-8 backdrop-blur-glass border bg-white/70 dark:bg-slate-900/65 border-white/45 dark:border-white/[0.08] text-center"
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <motion.div
            className="w-[120px] h-[120px] rounded-full bg-gradient-to-br from-royal-500 to-purple-accent flex items-center justify-center text-white font-display font-bold text-4xl mx-auto border-4 border-white/20 shadow-xl overflow-hidden"
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', bounce: 0.5 }}
          >
            {exec.profilePhoto ? (
              <img src={exec.profilePhoto} alt={exec.fullName} className="w-full h-full object-cover" />
            ) : (
              exec.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)
            )}
          </motion.div>
          <h3 className="font-display font-bold text-2xl text-slate-900 dark:text-white mt-5">{exec.fullName}</h3>
          <span className="inline-block mt-2 px-4 py-1.5 rounded-full text-sm font-medium" style={{ background: `${bandColor}15`, color: bandColor }}>
            {exec.leadershipRole}
          </span>

          <div className="grid grid-cols-2 gap-4 mt-6 text-left">
            {[
              { label: 'Leadership Role', value: exec.leadershipRole },
              { label: 'Department', value: exec.department },
              { label: 'Fellowship Band', value: exec.fellowshipBand },
              { label: 'Phone', value: exec.phoneNumber },
              { label: 'Email', value: exec.email },
              { label: 'Member Since', value: new Date(exec.registeredAt).toLocaleDateString() },
            ].map(item => (
              <div key={item.label}>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">{item.label}</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>

          <motion.button
            className="mt-6 px-6 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center gap-2 mx-auto"
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowEditModal(true)}
          >
            <Pencil className="w-4 h-4" /> Edit Profile
          </motion.button>
        </motion.div>

        {/* Convention Schedule */}
        <motion.div
          className="rounded-[20px] p-6 backdrop-blur-glass border bg-white/70 dark:bg-slate-900/65 border-white/45 dark:border-white/[0.08]"
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        >
          <h3 className="font-display font-semibold text-lg text-slate-900 dark:text-white mb-4">Convention Schedule</h3>
          <div className="relative pl-6 space-y-4">
            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-white/10" />
            {sessions.map((session, i) => (
              <motion.div
                key={session.id}
                className="relative"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
              >
                <div className={`absolute -left-6 w-3 h-3 rounded-full border-2 ${
                  session.status === 'current' ? 'bg-emerald-500 border-emerald-500 animate-pulse' :
                  session.status === 'past' ? 'bg-slate-300 border-slate-300' :
                  'bg-white dark:bg-slate-800 border-blue-500'
                }`} />
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      {session.name}
                      {session.status === 'current' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-500">Happening Now</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(session.date).toLocaleDateString()} · {session.startTime} - {session.endTime}
                    </p>
                    <p className="text-xs text-slate-400">{session.venue}</p>
                  </div>
                  {session.status === 'past' && <CheckCircle className="w-4 h-4 text-slate-300 flex-shrink-0" />}
                  {session.status === 'current' && <Clock className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Group Assignment */}
        <motion.div
          className="rounded-[20px] p-6 backdrop-blur-glass border bg-white/70 dark:bg-slate-900/65 border-white/45 dark:border-white/[0.08] text-center"
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">Your Convention Group</p>
          <h3 className="font-display font-bold text-3xl mt-1" style={{ color: groupColor }}>Group A</h3>
          <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto">
            You will participate in sports, games, and activities with your group members.
          </p>
        </motion.div>

        {/* Fellowship Info */}
        <motion.div
          className="rounded-[20px] p-6 backdrop-blur-glass border bg-white/70 dark:bg-slate-900/65 border-white/45 dark:border-white/[0.08]"
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        >
          <h3 className="font-display font-semibold text-lg text-slate-900 dark:text-white mb-4">My Fellowship Information</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Fellowship Band</span>
              <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: `${bandColor}15`, color: bandColor }}>{exec.fellowshipBand}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Department</span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-accent/10 text-purple-accent">{exec.department}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Church Branch</span>
              <span className="text-sm text-slate-900 dark:text-slate-100">Main Branch</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
          <motion.div className="relative glass-modal dark:glass-modal-dark p-6 max-w-sm w-full" initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white mb-4">Edit Profile</h3>
            <div className="space-y-3">
              <div><label className="text-xs text-slate-500">Full Name</label><input className="glass-input w-full mt-1" defaultValue={exec.fullName} /></div>
              <div><label className="text-xs text-slate-500">Phone</label><input className="glass-input w-full mt-1" defaultValue={exec.phoneNumber} /></div>
              <div><label className="text-xs text-slate-500">Email</label><input className="glass-input w-full mt-1" defaultValue={exec.email} /></div>
              <div><label className="text-xs text-slate-500">Address</label><textarea className="glass-input w-full mt-1 min-h-[60px]" defaultValue={exec.address} /></div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowEditModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={() => { setShowEditModal(false); addToast({ type: 'success', title: 'Profile updated!' }); }} className="flex-1 py-2.5 rounded-xl gradient-btn text-sm font-medium">Save</button>
            </div>
          </motion.div>
        </div>
      )}
    </ExecutiveLayout>
  );
}
