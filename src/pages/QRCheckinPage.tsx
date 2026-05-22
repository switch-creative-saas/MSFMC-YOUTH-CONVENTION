import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAppData } from '@/contexts/AppDataContext';

export function QRCheckinPage() {
  const { token } = useParams();
  const { members } = useAppData();
  const member = members.find(m => m.qrCode === token) || members[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B1426] to-[#1A3A6B] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Floating particles */}
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white/[0.08]"
          style={{
            width: 4 + Math.random() * 8,
            height: 4 + Math.random() * 8,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `float ${8 + Math.random() * 8}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 5}s`,
          }}
        />
      ))}

      <motion.div
        className="w-full max-w-[420px]"
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <motion.div
          className="glass-lg-dark p-8 text-center animate-float"
          style={{ animationDuration: '6s' }}
        >
          <h2 className="font-display font-bold text-2xl text-white mb-2">Scan to Check In</h2>
          <p className="text-sm text-white/60 mb-6">Show this code at the check-in desk</p>

          {/* QR with rotating border */}
          <div className="flex justify-center mb-6">
            <div className="p-1 rounded-[24px]" style={{
              background: 'conic-gradient(from 0deg, #1A3A6B, #6C5CE7, #2563EB, #1A3A6B)',
              animation: 'spin-slow 4s linear infinite',
            }}>
              <div className="bg-white p-5 rounded-[20px]">
                <QRCodeSVG value={member.qrCode} size={220} />
              </div>
            </div>
          </div>

          <h3 className="font-display font-semibold text-lg text-white">{member.fullName}</h3>
          <p className="font-mono text-sm text-purple-accent mt-1">{member.id}</p>
          <p className="text-xs text-white/50 mt-3">Show this code at the check-in desk</p>

          <motion.button
            className="mt-6 flex items-center gap-2 mx-auto px-6 py-2.5 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
            whileTap={{ scale: 0.97 }}
          >
            <Download className="w-4 h-4" /> Save to Phone
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}
