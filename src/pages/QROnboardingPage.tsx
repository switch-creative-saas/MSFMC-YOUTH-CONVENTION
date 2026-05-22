import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, UserCheck } from 'lucide-react';

export function QROnboardingPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B1426] to-[#1A3A6B] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="floating-orb w-[200px] h-[200px] top-20 left-20" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)' }} />
      <div className="floating-orb w-[150px] h-[150px] bottom-32 right-16 animate-float-reverse" style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)' }} />

      <motion.div
        className="w-full max-w-[420px]"
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <div className="glass-lg-dark p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-royal-500 to-purple-accent flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h2 className="font-display font-bold text-2xl text-white mb-2">Welcome to MOSYF!</h2>
          <p className="text-sm text-white/60 mb-8">You&apos;re about to join Mountain of Solution Youth Fellowship</p>

          <div className="space-y-4">
            <motion.button
              className="w-full h-[120px] rounded-2xl flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg"
              whileHover={{ y: -4, scale: 1.02, boxShadow: '0 16px 40px rgba(245, 158, 11, 0.4)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(`/register/member?token=${token}`)}
            >
              <Sparkles className="w-8 h-8" />
              <span className="font-semibold text-base">I&apos;m a First Timer</span>
              <span className="text-xs text-white/70">New to MOSYF? Start here!</span>
            </motion.button>

            <motion.button
              className="w-full h-[120px] rounded-2xl flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg"
              whileHover={{ y: -4, scale: 1.02, boxShadow: '0 16px 40px rgba(37, 99, 235, 0.4)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/login')}
            >
              <UserCheck className="w-8 h-8" />
              <span className="font-semibold text-base">I&apos;m a Returning Member</span>
              <span className="text-xs text-white/70">Already a member? Check in here!</span>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
