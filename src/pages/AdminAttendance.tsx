import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Cpu,
  Fingerprint,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Utensils,
  Gift,
  DoorOpen,
  Trophy,
} from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { useAppData } from '@/contexts/AppDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import type { AccessItemType, Member } from '@/types';

const ACCESS_ITEMS: Array<{ id: AccessItemType; label: string; icon: typeof Utensils }> = [
  { id: 'entry', label: 'Convention Entry', icon: DoorOpen },
  { id: 'food', label: 'Food Collection', icon: Utensils },
  { id: 'souvenir', label: 'Souvenir Collection', icon: Gift },
  { id: 'activity', label: 'Activity Participation', icon: Trophy },
];

function statusMeta(status?: string) {
  if (status === 'verified_checked_in') return { label: 'Biometric Verified', badge: 'status-badge-green' };
  if (status === 'fingerprint_enrolled') return { label: 'Fingerprint Enrolled', badge: 'status-badge-blue' };
  if (status === 'duplicate_attempt') return { label: 'Duplicate Attempt Detected', badge: 'status-badge-red' };
  return { label: 'Pending Verification', badge: 'status-badge-amber' };
}

export function AdminAttendance() {
  const {
    members,
    attendance,
    biometricLogs,
    biometricDevices,
    verifyMemberBiometric,
    claimAccessItem,
  } = useAppData();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<'success' | 'duplicate' | null>(null);

  const actorEmail = user?.email ?? 'admin@mosyf.org';
  const actorName = user?.name ?? 'Admin';
  const onlineDevice = biometricDevices.find(device => device.status === 'online');

  const searchResults = search.length > 1
    ? members.filter(m =>
        m.fullName.toLowerCase().includes(search.toLowerCase()) ||
        m.id.toLowerCase().includes(search.toLowerCase()) ||
        m.qrCode.toLowerCase().includes(search.toLowerCase()) ||
        m.phoneNumber.includes(search)
      ).slice(0, 8)
    : [];

  const pendingMembers = members.filter(member => !member.biometricStatus || member.biometricStatus === 'pending_verification');
  const verifiedMembers = members.filter(member => member.biometricStatus === 'verified_checked_in');
  const duplicates = biometricLogs.filter(log => log.status === 'duplicate');
  const recentVerified = attendance.filter(record => record.verificationMethod === 'biometric').slice(0, 8);

  const scannerPulse = useMemo(() => ({
    scale: scanning ? [1, 1.08, 1] : 1,
    boxShadow: scanning
      ? ['0 0 0 rgba(16,185,129,0)', '0 0 36px rgba(16,185,129,0.55)', '0 0 0 rgba(16,185,129,0)']
      : '0 18px 50px rgba(15,23,42,0.2)',
  }), [scanning]);

  const selectMember = (member: Member) => {
    setSelectedMember(member);
    setSearch(member.fullName);
    setScanResult(null);
  };

  const runBiometricScan = async () => {
    if (!selectedMember) return;
    if (!onlineDevice) {
      addToast({ type: 'error', title: 'No biometric scanner is online' });
      return;
    }

    setScanning(true);
    setScanResult(null);
    await new Promise(resolve => setTimeout(resolve, 1800));
    const result = verifyMemberBiometric(selectedMember.id, actorEmail, actorName);
    setScanning(false);
    setScanResult(result.duplicate ? 'duplicate' : result.ok ? 'success' : null);

    const latest = members.find(member => member.id === selectedMember.id);
    setSelectedMember(latest ? { ...latest, biometricStatus: result.duplicate ? 'duplicate_attempt' : 'verified_checked_in' } : selectedMember);
    addToast({ type: result.ok ? 'success' : 'warning', title: result.message });
  };

  const handleAccessClaim = (item: AccessItemType) => {
    if (!selectedMember) return;
    const result = claimAccessItem(selectedMember.id, item, actorEmail, actorName);
    addToast({ type: result.ok ? 'success' : 'warning', title: result.message });
    setSelectedMember(prev => prev ? {
      ...prev,
      accessClaims: result.ok ? { ...(prev.accessClaims ?? {}), [item]: new Date().toISOString() } : prev.accessClaims,
    } : prev);
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
        <div>
          <motion.h2 className="font-display font-bold text-2xl text-slate-900 dark:text-white"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            Biometric Operations Control
          </motion.h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-3xl">
            Scanner-ready architecture for USB or network fingerprint SDKs through a local WebSocket bridge.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
          <Radio className="w-4 h-4 animate-pulse" />
          <span className="text-sm font-medium">Realtime bridge channel active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Pending Verification', value: pendingMembers.length, icon: Fingerprint, tone: 'text-amber-500 bg-amber-500/10' },
          { label: 'Biometric Verified', value: verifiedMembers.length, icon: ShieldCheck, tone: 'text-emerald-500 bg-emerald-500/10' },
          { label: 'Duplicate Alerts', value: duplicates.length, icon: AlertTriangle, tone: 'text-red-500 bg-red-500/10' },
          { label: 'Online Devices', value: biometricDevices.filter(device => device.status === 'online').length, icon: Cpu, tone: 'text-blue-500 bg-blue-500/10' },
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

      <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.75fr] gap-6">
        <motion.div
          className="rounded-[24px] p-6 backdrop-blur-glass border bg-white/75 dark:bg-slate-900/70 border-white/45 dark:border-white/[0.08]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="font-display font-semibold text-lg text-slate-900 dark:text-white">Member Lookup</h3>
              <p className="text-xs text-slate-500 mt-1">Search by name, member ID, QR code, or phone.</p>
            </div>
            <span className={`${onlineDevice ? 'status-badge-green' : 'status-badge-red'} shrink-0`}>
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
              {onlineDevice ? 'Scanner Online' : 'Scanner Offline'}
            </span>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                if (e.target.value.length < 2) setSelectedMember(null);
              }}
              placeholder="Search member, scan QR code, or enter member ID..."
              className="glass-input-lg w-full pl-12"
            />
            {search.length > 1 && !selectedMember && (
              <div className="absolute top-full left-0 right-0 z-20 mt-2 rounded-2xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10 shadow-xl overflow-hidden">
                {searchResults.length === 0 ? (
                  <p className="p-4 text-sm text-slate-500 text-center">No member found</p>
                ) : searchResults.map(member => (
                  <button key={member.id} onClick={() => selectMember(member)} className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-white/5">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{member.fullName}</p>
                      <p className="text-xs text-slate-500 font-mono">{member.id} - {member.conventionGroup}</p>
                    </div>
                    <span className={`${statusMeta(member.biometricStatus).badge} text-[10px]`}>{statusMeta(member.biometricStatus).label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {selectedMember ? (
              <motion.div
                key={selectedMember.id}
                className="mt-6 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="rounded-[22px] p-6 bg-slate-950 text-white overflow-hidden relative">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.28),transparent_40%)]" />
                  <div className="relative z-10 text-center">
                    <motion.div
                      className="w-32 h-32 rounded-full mx-auto bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center"
                      animate={scannerPulse}
                      transition={{ duration: 1.2, repeat: scanning ? Infinity : 0 }}
                    >
                      <Fingerprint className={`w-16 h-16 ${scanning ? 'text-emerald-300 animate-pulse' : 'text-emerald-400'}`} />
                    </motion.div>
                    <p className="mt-5 text-sm text-emerald-100">{scanning ? 'Capturing fingerprint template...' : 'Ready for fingerprint capture'}</p>
                    <p className="text-xs text-white/45 mt-2">{onlineDevice?.name ?? 'No scanner connected'}</p>
                  </div>
                </div>

                <div>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white">{selectedMember.fullName}</h3>
                      <p className="font-mono text-sm text-purple-accent mt-1">{selectedMember.id}</p>
                    </div>
                    <span className={`${statusMeta(selectedMember.biometricStatus).badge}`}>{statusMeta(selectedMember.biometricStatus).label}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-5">
                    {[
                      { label: 'Fellowship Band', value: selectedMember.fellowshipBand },
                      { label: 'Department(s)', value: selectedMember.departments.join(', ') },
                      { label: 'Convention Group', value: selectedMember.conventionGroup },
                      { label: 'Registered', value: new Date(selectedMember.registeredAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) },
                    ].map(item => (
                      <div key={item.label}>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400">{item.label}</p>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={runBiometricScan}
                    disabled={scanning}
                    className="w-full mt-6 h-13 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {scanning ? <Activity className="w-5 h-5 animate-spin" /> : <Fingerprint className="w-5 h-5" />}
                    {scanning ? 'Scanning Fingerprint' : 'Capture and Verify Fingerprint'}
                  </button>

                  {scanResult && (
                    <motion.div
                      className={`mt-4 p-4 rounded-2xl border ${scanResult === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        {scanResult === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                        {scanResult === 'success' ? 'Verification successful. Attendance recorded.' : 'Duplicate attendance attempt detected.'}
                      </div>
                    </motion.div>
                  )}

                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Access Control</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {ACCESS_ITEMS.map(item => {
                        const claimed = Boolean(selectedMember.accessClaims?.[item.id]);
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleAccessClaim(item.id)}
                            className={`p-3 rounded-2xl border text-left transition-colors ${claimed ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06]'}`}
                          >
                            <Icon className="w-4 h-4 mb-2" />
                            <p className="text-sm font-medium">{claimed ? `${item.label} Claimed` : item.label}</p>
                            <p className="text-[11px] opacity-70 mt-1">{claimed ? 'Duplicate claims blocked' : 'Requires biometric verification'}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                className="mt-6 rounded-[22px] border border-dashed border-slate-300 dark:border-white/10 p-10 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Sparkles className="w-10 h-10 text-purple-accent mx-auto mb-3" />
                <p className="text-sm text-slate-500">Search or scan a QR code to load member details instantly.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="space-y-6">
          <motion.div
            className="rounded-[20px] p-5 backdrop-blur-glass border bg-white/70 dark:bg-slate-900/65 border-white/45 dark:border-white/[0.08]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h3 className="font-display font-semibold text-lg text-slate-900 dark:text-white mb-4">Device Status</h3>
            <div className="space-y-3">
              {biometricDevices.map(device => (
                <div key={device.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{device.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{device.vendor} - {device.connectionType}</p>
                    </div>
                    <span className={`${device.status === 'online' ? 'status-badge-green' : device.status === 'connecting' ? 'status-badge-amber' : 'status-badge-red'} text-[10px]`}>{device.status}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-3">Heartbeat {new Date(device.lastHeartbeat).toLocaleTimeString()}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="rounded-[20px] p-5 backdrop-blur-glass border bg-white/70 dark:bg-slate-900/65 border-white/45 dark:border-white/[0.08]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="font-display font-semibold text-lg text-slate-900 dark:text-white mb-4">Live Verification Feed</h3>
            <div className="space-y-3 max-h-[320px] overflow-y-auto scrollbar-thin">
              {(biometricLogs.length ? biometricLogs : [
                { id: 'empty', status: 'failed' as const, message: 'Waiting for scanner activity', createdAt: new Date().toISOString(), scannerId: 'bio-bridge-01' },
              ]).slice(0, 10).map(log => (
                <div key={log.id} className="flex items-start gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full mt-1.5 ${log.status === 'success' ? 'bg-emerald-500' : log.status === 'duplicate' ? 'bg-red-500' : 'bg-amber-500'} animate-pulse`} />
                  <div className="min-w-0">
                    <p className="text-sm text-slate-700 dark:text-slate-200">{log.memberName ?? log.message}</p>
                    <p className="text-xs text-slate-400 mt-1">{log.message} - {new Date(log.createdAt).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="rounded-[20px] p-5 backdrop-blur-glass border bg-white/70 dark:bg-slate-900/65 border-white/45 dark:border-white/[0.08]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="font-display font-semibold text-lg text-slate-900 dark:text-white mb-4">Recently Verified</h3>
            <div className="space-y-3">
              {recentVerified.map(record => (
                <div key={record.id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{record.memberName}</p>
                    <p className="text-xs font-mono text-slate-400">{record.memberId}</p>
                  </div>
                  <span className="text-xs text-emerald-500">{new Date(record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  );
}
