import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Download, Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAppData } from '@/contexts/AppDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { BAND_COLORS, GROUP_COLORS } from '@/types';

export function MemberID() {
  const { members } = useAppData();
  const { user } = useAuth();
  const { addToast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const member = members.find(m => m.email === user?.email) || members[0];
  const bandColor = BAND_COLORS[member.fellowshipBand];
  const groupColor = GROUP_COLORS[member.conventionGroup];

  const handleDownload = () => {
    addToast({ type: 'success', title: 'ID card downloaded!' });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-md mx-auto">
      <motion.h2 className="font-display font-bold text-2xl text-slate-900 dark:text-white mb-5"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        My Digital ID
      </motion.h2>

      {/* ID Card */}
      <motion.div
        ref={cardRef}
        className="rounded-3xl overflow-hidden backdrop-blur-glass border bg-white/70 dark:bg-slate-900/65 border-white/45 dark:border-white/[0.08]"
        style={{ boxShadow: '0 24px 80px rgba(26, 58, 107, 0.2)' }}
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
        whileHover={{ y: -8, boxShadow: '0 32px 96px rgba(26, 58, 107, 0.3)' }}
      >
        {/* Header Strip */}
        <div className="h-24 bg-gradient-to-r from-royal-500 to-purple-accent flex items-center justify-center relative">
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 400 100" fill="none">
              <path d="M0 50 Q100 20 200 50 T400 50" stroke="white" strokeWidth="1" fill="none" />
              <path d="M0 60 Q100 30 200 60 T400 60" stroke="white" strokeWidth="0.5" fill="none" />
            </svg>
          </div>
          <div className="relative z-10 flex items-center gap-2">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <div className="text-center">
              <p className="text-white font-display font-bold text-sm">MOSYF</p>
              <p className="text-white/70 text-[9px] uppercase tracking-wider">Member ID</p>
            </div>
          </div>
        </div>

        {/* Avatar */}
        <div className="flex justify-center -mt-10">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-royal-500 to-purple-accent flex items-center justify-center text-white font-display font-bold text-2xl border-4 border-white dark:border-slate-800 shadow-lg">
            {member.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
        </div>

        {/* Details */}
        <div className="px-6 pb-6 text-center">
          <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white mt-3">{member.fullName}</h3>
          <span className="inline-block font-mono font-bold text-base text-purple-accent bg-purple-accent/10 px-4 py-1.5 rounded-lg mt-2">
            {member.id}
          </span>

          {/* QR Code */}
          <div className="flex justify-center mt-5">
            <div className="bg-white p-3 rounded-2xl shadow-sm">
              <QRCodeSVG value={member.qrCode} size={140} />
            </div>
          </div>

          {/* Grid Info */}
          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03]">
              <p className="text-[9px] uppercase tracking-wider text-slate-400">Band</p>
              <p className="text-sm font-semibold" style={{ color: bandColor }}>{member.fellowshipBand}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03]">
              <p className="text-[9px] uppercase tracking-wider text-slate-400">Group</p>
              <p className="text-sm font-semibold" style={{ color: groupColor }}>{member.conventionGroup}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] col-span-2">
              <p className="text-[9px] uppercase tracking-wider text-slate-400">Departments</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{member.departments.join(', ')}</p>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 mt-4">
            Registered: {new Date(member.registeredAt).toLocaleDateString()}
          </p>
        </div>
      </motion.div>

      {/* Actions */}
      <div className="flex gap-3 mt-5">
        <motion.button
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
          whileTap={{ scale: 0.97 }}
        >
          <Download className="w-4 h-4" /> Download
        </motion.button>
        <motion.button
          onClick={handlePrint}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
          whileTap={{ scale: 0.97 }}
        >
          <Printer className="w-4 h-4" /> Print Badge
        </motion.button>
      </div>
    </div>
  );
}
