import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link2, ShieldCheck, Copy, QrCode, Trash2, Search, Download, FileSpreadsheet } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { AdminLayout } from '@/components/AdminLayout';
import { useAppData } from '@/contexts/AppDataContext';
import { useToast } from '@/contexts/ToastContext';
import { BAND_LIST, GROUP_LIST } from '@/types';
import type { FellowshipBand, ConventionGroup } from '@/types';

const biometricBadge = (status?: string) => {
  if (status === 'verified_checked_in') return { className: 'status-badge-green', label: 'Biometric Verified' };
  if (status === 'fingerprint_enrolled') return { className: 'status-badge-blue', label: 'Fingerprint Enrolled' };
  if (status === 'duplicate_attempt') return { className: 'status-badge-red', label: 'Duplicate Attempt Detected' };
  return { className: 'status-badge-amber', label: 'Pending Biometric Verification' };
};

export function AdminRegistrations() {
  const { members, generatedLinks, addGeneratedLink, deleteMember } = useAppData();
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [bandFilter, setBandFilter] = useState<FellowshipBand | 'All'>('All');
  const [groupFilter, setGroupFilter] = useState<ConventionGroup | 'All'>('All');
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [memberPage, setMemberPage] = useState(0);
  const PAGE_SIZE = 10;

  const filteredMembers = members.filter(m => {
    const matchesSearch = !search || m.fullName.toLowerCase().includes(search.toLowerCase()) || m.id.toLowerCase().includes(search.toLowerCase()) || m.phoneNumber.includes(search);
    const matchesBand = bandFilter === 'All' || m.fellowshipBand === bandFilter;
    const matchesGroup = groupFilter === 'All' || m.conventionGroup === groupFilter;
    return matchesSearch && matchesBand && matchesGroup;
  });

  const paginatedMembers = filteredMembers.slice(memberPage * PAGE_SIZE, (memberPage + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filteredMembers.length / PAGE_SIZE);

  const generateLink = (type: 'member' | 'executive') => {
    const token = Math.random().toString(36).substring(2, 15);
    const basePath = `${window.location.origin}${window.location.pathname}`;
    const url = `${basePath}#/register/${type}?token=${token}`;
    addGeneratedLink({ type, url, token, uses: 0, status: 'active' });
    navigator.clipboard.writeText(url);
    addToast({ type: 'success', title: `${type === 'member' ? 'Member' : 'Executive'} link generated and copied!` });
  };

  const showQR = (url: string) => {
    setQrUrl(url);
    setShowQRModal(true);
  };

  const handleDelete = (id: string) => {
    deleteMember(id);
    setShowDeleteConfirm(null);
    addToast({ type: 'success', title: 'Member deleted successfully' });
  };

  const exportExcel = () => {
    addToast({ type: 'info', title: 'Exporting to Excel...' });
    setTimeout(() => addToast({ type: 'success', title: 'Excel file downloaded!' }), 1000);
  };

  const exportPDF = () => {
    addToast({ type: 'info', title: 'Exporting to PDF...' });
    setTimeout(() => addToast({ type: 'success', title: 'PDF file downloaded!' }), 1000);
  };

  return (
    <AdminLayout>
      <motion.h2 className="font-display font-bold text-2xl text-slate-900 dark:text-white mb-6"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        Registration Management
      </motion.h2>

      {/* Link Generator */}
      <motion.div
        className="rounded-[20px] p-8 backdrop-blur-glass border bg-white/70 dark:bg-slate-900/65 border-white/45 dark:border-white/[0.08] mb-6"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
      >
        <h3 className="font-display font-semibold text-lg text-slate-900 dark:text-white mb-6">Generate Registration Links</h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <motion.button
            className="flex-1 flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-br from-royal-500 to-blue-500 text-white shadow-lg"
            whileHover={{ y: -4, scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => generateLink('member')}
          >
            <Link2 className="w-6 h-6" />
            <div className="text-left">
              <p className="font-semibold">Member Registration Link</p>
              <p className="text-xs opacity-70">For regular youth fellowship members</p>
            </div>
          </motion.button>
          <motion.button
            className="flex-1 flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-br from-purple-accent to-purple-light text-white shadow-lg"
            whileHover={{ y: -4, scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => generateLink('executive')}
          >
            <ShieldCheck className="w-6 h-6" />
            <div className="text-left">
              <p className="font-semibold">Executive Registration Link</p>
              <p className="text-xs opacity-70">For youth fellowship leaders</p>
            </div>
          </motion.button>
        </div>
      </motion.div>

      {/* Generated Links */}
      {generatedLinks.length > 0 && (
        <motion.div
          className="rounded-[20px] p-6 backdrop-blur-glass border bg-white/70 dark:bg-slate-900/65 border-white/45 dark:border-white/[0.08] mb-6"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        >
          <h3 className="font-display font-semibold text-lg text-slate-900 dark:text-white mb-4">Generated Links</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/[0.06]">
                  {['Type', 'URL', 'Created', 'Uses', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-medium uppercase tracking-[0.04em] text-slate-400 pb-3 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {generatedLinks.map(link => (
                  <tr key={link.id} className="border-b border-slate-100 dark:border-white/[0.04]">
                    <td className="py-3 pr-4">
                      <span className={`status-badge-${link.type === 'member' ? 'blue' : 'purple'} text-[10px]`}>{link.type}</span>
                    </td>
                    <td className="py-3 pr-4 text-sm text-slate-600 dark:text-slate-300 max-w-[200px] truncate">{link.url}</td>
                    <td className="py-3 pr-4 text-sm text-slate-500">{new Date(link.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 pr-4 text-sm font-mono text-slate-600 dark:text-slate-300">{link.uses}</td>
                    <td className="py-3 pr-4">
                      <span className="status-badge-green text-[10px]">{link.status}</span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { navigator.clipboard.writeText(link.url); addToast({ type: 'success', title: 'Copied!' }); }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                          <Copy className="w-4 h-4 text-slate-400" />
                        </button>
                        <button onClick={() => showQR(link.url)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                          <QrCode className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* All Members */}
      <motion.div
        className="rounded-[20px] p-6 backdrop-blur-glass border bg-white/70 dark:bg-slate-900/65 border-white/45 dark:border-white/[0.08]"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h3 className="font-display font-semibold text-lg text-slate-900 dark:text-white">All Members ({filteredMembers.length})</h3>
          <div className="flex items-center gap-2">
            <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors">
              <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
            </button>
            <button onClick={exportPDF} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors">
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setMemberPage(0); }}
              placeholder="Search by name, ID, or phone..."
              className="glass-input w-full pl-10 text-sm"
            />
          </div>
          <select value={bandFilter} onChange={e => { setBandFilter(e.target.value as FellowshipBand | 'All'); setMemberPage(0); }} className="glass-input text-sm py-2">
            <option value="All">All Bands</option>
            {BAND_LIST.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={groupFilter} onChange={e => { setGroupFilter(e.target.value as ConventionGroup | 'All'); setMemberPage(0); }} className="glass-input text-sm py-2">
            <option value="All">All Groups</option>
            {GROUP_LIST.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        {/* Members Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/[0.06]">
                {['Member ID', 'Full Name', 'Band', 'Departments', 'Group', 'Registered', 'Verification Status', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-medium uppercase tracking-[0.04em] text-slate-400 pb-3 pr-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedMembers.map((member, i) => (
                <motion.tr
                  key={member.id}
                  className="border-b border-slate-100 dark:border-white/[0.04] hover:bg-blue-500/[0.03] transition-colors"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                >
                  <td className="py-3 pr-3 font-mono text-xs text-purple-accent bg-purple-accent/10 px-2 py-1 rounded-md inline-block mt-2">{member.id}</td>
                  <td className="py-3 pr-3 text-sm font-medium text-slate-900 dark:text-slate-100">{member.fullName}</td>
                  <td className="py-3 pr-3"><span className={`status-badge-${member.fellowshipBand.toLowerCase()} text-[10px]`}>{member.fellowshipBand}</span></td>
                  <td className="py-3 pr-3"><span className="text-xs text-slate-500">{member.departments.slice(0, 2).join(', ')}{member.departments.length > 2 ? ` +${member.departments.length - 2}` : ''}</span></td>
                  <td className="py-3 pr-3"><span className={`status-badge-${member.conventionGroup.toLowerCase().replace(' ', '-')} text-[10px]`}>{member.conventionGroup}</span></td>
                  <td className="py-3 pr-3 text-xs text-slate-500">{new Date(member.registeredAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td className="py-3 pr-3"><span className={`${biometricBadge(member.biometricStatus).className} text-[10px]`}>{biometricBadge(member.biometricStatus).label}</span></td>
                  <td className="py-3">
                    <button onClick={() => setShowDeleteConfirm(member.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-slate-500">Showing {memberPage * PAGE_SIZE + 1}-{Math.min((memberPage + 1) * PAGE_SIZE, filteredMembers.length)} of {filteredMembers.length}</p>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setMemberPage(i)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                  i === memberPage ? 'bg-royal-500 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* QR Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowQRModal(false)} />
          <motion.div className="relative glass-modal dark:glass-modal-dark p-8" initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
            <div className="bg-white p-4 rounded-2xl"><QRCodeSVG value={qrUrl} size={240} /></div>
            <p className="text-center text-sm text-slate-500 mt-4 truncate max-w-[260px]">{qrUrl}</p>
          </motion.div>
        </div>
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(null)} />
          <motion.div className="relative glass-modal dark:glass-modal-dark p-6 max-w-sm w-full" initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white mb-2">Delete Member?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">Cancel</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-medium hover:shadow-lg transition-all">Delete</button>
            </div>
          </motion.div>
        </div>
      )}
    </AdminLayout>
  );
}
