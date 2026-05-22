import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { AdminLayout } from '@/components/AdminLayout';
import { useAppData } from '@/contexts/AppDataContext';
import { StatCard } from '@/components/StatCard';
import { Users, Shield, UserCheck, Activity } from 'lucide-react';
import { BAND_COLORS, GROUP_COLORS } from '@/types';

export function AdminAnalytics() {
  const { members, executives, attendance, firstTimers } = useAppData();

  const presentCount = attendance.filter(a => a.status === 'present').length;
  const maleCount = members.filter(m => m.gender === 'Male').length;
  const femaleCount = members.filter(m => m.gender === 'Female').length;
  const ftTotal = firstTimers.length;
  const ftWantMembership = firstTimers.filter(ft => ft.wantsPermanentMembership).length;
  const ftFollowedUp = firstTimers.filter(ft => ft.followedUp).length;

  const attendanceTrend = [
    { day: 'Mon', count: 32 },
    { day: 'Tue', count: 45 },
    { day: 'Wed', count: 38 },
    { day: 'Thu', count: 52 },
    { day: 'Fri', count: 48 },
    { day: 'Sat', count: 65 },
    { day: 'Sun', count: 58 },
  ];

  const genderData = [
    { name: 'Male', value: maleCount, color: '#2563EB' },
    { name: 'Female', value: femaleCount, color: '#EC4899' },
  ];

  const bandData = [
    { name: 'Peniel', value: members.filter(m => m.fellowshipBand === 'Peniel').length, fill: BAND_COLORS.Peniel },
    { name: 'Judah', value: members.filter(m => m.fellowshipBand === 'Judah').length, fill: BAND_COLORS.Judah },
    { name: 'Zion', value: members.filter(m => m.fellowshipBand === 'Zion').length, fill: BAND_COLORS.Zion },
    { name: 'Ephraim', value: members.filter(m => m.fellowshipBand === 'Ephraim').length, fill: BAND_COLORS.Ephraim },
    { name: 'None', value: members.filter(m => m.fellowshipBand === 'None').length, fill: BAND_COLORS.None },
  ];

  const deptCounts: Record<string, number> = {};
  members.forEach(m => m.departments.forEach(d => { deptCounts[d] = (deptCounts[d] || 0) + 1; }));
  const deptData = Object.entries(deptCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value, fill: '#6C5CE7' }));

  const groupData = [
    { name: 'Group A', value: members.filter(m => m.conventionGroup === 'Group A').length, color: GROUP_COLORS['Group A'] },
    { name: 'Group B', value: members.filter(m => m.conventionGroup === 'Group B').length, color: GROUP_COLORS['Group B'] },
    { name: 'Group C', value: members.filter(m => m.conventionGroup === 'Group C').length, color: GROUP_COLORS['Group C'] },
    { name: 'Group D', value: members.filter(m => m.conventionGroup === 'Group D').length, color: GROUP_COLORS['Group D'] },
    { name: 'Group E', value: members.filter(m => m.conventionGroup === 'Group E').length, color: GROUP_COLORS['Group E'] },
  ];

  const tooltipStyle = {
    background: 'rgba(15, 23, 42, 0.9)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '12px',
    padding: '8px 12px',
  };

  return (
    <AdminLayout>
      <motion.h2 className="font-display font-bold text-2xl gradient-text mb-6"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        Analytics Dashboard
      </motion.h2>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <StatCard icon={Users} iconColor="#2563EB" iconBg="rgba(37,99,235,0.1)" label="Total Youth Members" value={members.length} delay={0} />
        <StatCard icon={Shield} iconColor="#6C5CE7" iconBg="rgba(108,92,231,0.1)" label="Total Executives" value={executives.length} delay={0.1} />
        <StatCard icon={UserCheck} iconColor="#10B981" iconBg="rgba(16,185,129,0.1)" label="Convention Attendees" value={presentCount} delay={0.2} />
        <StatCard icon={Activity} iconColor="#F59E0B" iconBg="rgba(245,158,11,0.1)" label="First Timers" value={ftTotal} delay={0.3} />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Attendance Trends */}
        <motion.div
          className="rounded-[20px] p-6 backdrop-blur-glass border bg-white/70 dark:bg-slate-900/65 border-white/45 dark:border-white/[0.08] lg:col-span-2"
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        >
          <h3 className="font-display font-semibold text-lg text-slate-900 dark:text-white mb-4">Attendance Trends (Last 7 Days)</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceTrend}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={2} fill="url(#areaGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Gender Distribution */}
        <motion.div
          className="rounded-[20px] p-6 backdrop-blur-glass border bg-white/70 dark:bg-slate-900/65 border-white/45 dark:border-white/[0.08]"
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        >
          <h3 className="font-display font-semibold text-lg text-slate-900 dark:text-white mb-4">Gender Distribution</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={genderData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                  {genderData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            {genderData.map(g => (
              <div key={g.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: g.color }} />
                <span className="text-xs text-slate-600 dark:text-slate-400">{g.name}: {g.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Fellowship Band */}
        <motion.div
          className="rounded-[20px] p-6 backdrop-blur-glass border bg-white/70 dark:bg-slate-900/65 border-white/45 dark:border-white/[0.08]"
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        >
          <h3 className="font-display font-semibold text-lg text-slate-900 dark:text-white mb-4">Members by Fellowship Band</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bandData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Department Analytics */}
        <motion.div
          className="rounded-[20px] p-6 backdrop-blur-glass border bg-white/70 dark:bg-slate-900/65 border-white/45 dark:border-white/[0.08] lg:col-span-2"
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        >
          <h3 className="font-display font-semibold text-lg text-slate-900 dark:text-white mb-4">Members by Department</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={tooltipStyle} />
                <defs>
                  <linearGradient id="deptGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6C5CE7" />
                    <stop offset="100%" stopColor="#A29BFE" />
                  </linearGradient>
                </defs>
                <Bar dataKey="value" fill="url(#deptGrad)" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Convention Group */}
        <motion.div
          className="rounded-[20px] p-6 backdrop-blur-glass border bg-white/70 dark:bg-slate-900/65 border-white/45 dark:border-white/[0.08]"
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
        >
          <h3 className="font-display font-semibold text-lg text-slate-900 dark:text-white mb-4">Convention Group Assignment</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={groupData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {groupData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {groupData.map(g => (
              <div key={g.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: g.color }} />
                <span className="text-xs text-slate-600 dark:text-slate-400">{g.name}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* First Timers */}
        <motion.div
          className="rounded-[20px] p-6 backdrop-blur-glass border bg-white/70 dark:bg-slate-900/65 border-white/45 dark:border-white/[0.08]"
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
        >
          <h3 className="font-display font-semibold text-lg text-slate-900 dark:text-white mb-4">First Timers Overview</h3>
          <div className="space-y-5">
            {[
              { label: 'Total First Timers', value: ftTotal, max: ftTotal, color: 'from-blue-500 to-blue-400' },
              { label: 'Wants Membership', value: ftWantMembership, max: ftTotal, color: 'from-emerald-500 to-emerald-400', pct: Math.round((ftWantMembership / ftTotal) * 100) },
              { label: 'Followed Up', value: ftFollowedUp, max: ftTotal, color: 'from-purple-500 to-purple-400', pct: Math.round((ftFollowedUp / ftTotal) * 100) },
            ].map(item => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600 dark:text-slate-300">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">{item.value}</span>
                    {'pct' in item && <span className="text-xs text-slate-400">{item.pct}%</span>}
                  </div>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full bg-gradient-to-r ${item.color}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${(item.value / item.max) * 100}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </AdminLayout>
  );
}
