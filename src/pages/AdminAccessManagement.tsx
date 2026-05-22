import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ShieldMinus, UserCog, Clock, Activity, Search } from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { useAppData } from '@/contexts/AppDataContext';
import { updateRegisteredAuthUserRole } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

export function AdminAccessManagement() {
  const {
    executives,
    adminActivities,
    promoteExecutiveToAdmin,
    revokeExecutiveAdmin,
  } = useAppData();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [search, setSearch] = useState('');

  const actorEmail = user?.email ?? 'superadmin@mosyf.org';
  const actorName = user?.name ?? 'Super Admin';
  const filteredExecutives = executives.filter(exec =>
    !search ||
    exec.fullName.toLowerCase().includes(search.toLowerCase()) ||
    exec.email.toLowerCase().includes(search.toLowerCase()) ||
    exec.leadershipRole.toLowerCase().includes(search.toLowerCase())
  );
  const admins = executives.filter(exec => exec.registrationStatus === 'admin');

  const grantAccess = (executiveId: string) => {
    const executive = executives.find(exec => exec.id === executiveId);
    if (!executive) return;
    promoteExecutiveToAdmin(executiveId, actorEmail, actorName);
    updateRegisteredAuthUserRole(executive.email, 'admin');
    addToast({ type: 'success', title: `${executive.fullName} can now access the admin dashboard` });
  };

  const revokeAccess = (executiveId: string) => {
    const executive = executives.find(exec => exec.id === executiveId);
    if (!executive) return;
    revokeExecutiveAdmin(executiveId, actorEmail, actorName);
    updateRegisteredAuthUserRole(executive.email, 'executive');
    addToast({ type: 'warning', title: `${executive.fullName} admin access revoked` });
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <motion.h2 className="font-display font-bold text-2xl text-slate-900 dark:text-white"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          Admin Access Management
        </motion.h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          Super admin control for executive registrations, admin promotion, revocation, and audit activity.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Executive Registrations', value: executives.length, icon: UserCog, tone: 'text-purple-accent bg-purple-accent/10' },
          { label: 'Active Admins', value: admins.length, icon: ShieldCheck, tone: 'text-emerald-500 bg-emerald-500/10' },
          { label: 'Audit Events', value: adminActivities.length, icon: Activity, tone: 'text-blue-500 bg-blue-500/10' },
        ].map((item, index) => (
          <motion.div
            key={item.label}
            className="rounded-[20px] p-5 backdrop-blur-glass border bg-white/70 dark:bg-slate-900/65 border-white/45 dark:border-white/[0.08]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
          >
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${item.tone}`}>
              <item.icon className="w-5 h-5" />
            </div>
            <p className="font-mono text-3xl font-bold text-slate-900 dark:text-white mt-4">{item.value}</p>
            <p className="text-xs text-slate-500 mt-1">{item.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.65fr] gap-6">
        <motion.div
          className="rounded-[20px] p-6 backdrop-blur-glass border bg-white/70 dark:bg-slate-900/65 border-white/45 dark:border-white/[0.08]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
            <h3 className="font-display font-semibold text-lg text-slate-900 dark:text-white">Executive Registrations</h3>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="glass-input w-full pl-10 text-sm"
                placeholder="Search executives..."
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/[0.06]">
                  {['Name', 'Leadership Role', 'Department', 'Band', 'Registration Status', 'Actions'].map(header => (
                    <th key={header} className="text-left text-xs font-medium uppercase tracking-[0.04em] text-slate-400 pb-3 pr-4">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredExecutives.map((exec, index) => {
                  const isAdmin = exec.registrationStatus === 'admin';
                  return (
                    <motion.tr
                      key={exec.id}
                      className="border-b border-slate-100 dark:border-white/[0.04]"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.025 }}
                    >
                      <td className="py-4 pr-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{exec.fullName}</p>
                          <p className="text-xs text-slate-500">{exec.email}</p>
                        </div>
                      </td>
                      <td className="py-4 pr-4 text-sm text-slate-600 dark:text-slate-300">{exec.leadershipRole}</td>
                      <td className="py-4 pr-4"><span className="status-badge-purple text-[10px]">{exec.department}</span></td>
                      <td className="py-4 pr-4"><span className="status-badge-blue text-[10px]">{exec.fellowshipBand}</span></td>
                      <td className="py-4 pr-4">
                        <span className={`${isAdmin ? 'status-badge-green' : 'status-badge-amber'} text-[10px]`}>
                          {isAdmin ? 'ADMIN' : 'EXECUTIVE'}
                        </span>
                      </td>
                      <td className="py-4">
                        {isAdmin ? (
                          <button onClick={() => revokeAccess(exec.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20">
                            <ShieldMinus className="w-3.5 h-3.5" /> Revoke Admin Access
                          </button>
                        ) : (
                          <button onClick={() => grantAccess(exec.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">
                            <ShieldCheck className="w-3.5 h-3.5" /> Grant Admin Access
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.div
          className="rounded-[20px] p-6 backdrop-blur-glass border bg-white/70 dark:bg-slate-900/65 border-white/45 dark:border-white/[0.08]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="font-display font-semibold text-lg text-slate-900 dark:text-white mb-4">Admin Activity Audit</h3>
          <div className="space-y-4 max-h-[560px] overflow-y-auto scrollbar-thin">
            {(adminActivities.length ? adminActivities : [
              { id: 'empty', actorName: 'System', actorEmail: 'system', action: 'role' as const, target: 'No admin actions recorded yet', createdAt: new Date().toISOString() },
            ]).map(activity => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{activity.target}</p>
                  <p className="text-xs text-slate-500 mt-1">{activity.actorName} - {new Date(activity.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </AdminLayout>
  );
}
