import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

const DEV_USERS = [
  { label: 'Super Admin', email: 'superadmin@mosyf.org', password: 'admin123', role: 'super_admin' },
  { label: 'Executive', email: 'executive@mosyf.org', password: 'exec123', role: 'executive' },
];

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      addToast({ type: 'success', title: 'Welcome back!', description: 'Redirecting to your dashboard...' });
      setTimeout(() => {
        const role = result.role;
        if (role === 'super_admin' || role === 'admin') navigate('/admin/dashboard');
        else if (role === 'executive') navigate('/executive/dashboard');
        else if (role === 'member') navigate('/member/home');
        else navigate('/');
      }, 500);
    } else {
      addToast({ type: 'error', title: 'Invalid credentials', description: 'Please check your email and password.' });
    }
  };

  const quickLogin = async (devUser: typeof DEV_USERS[0]) => {
    setEmail(devUser.email);
    setPassword(devUser.password);
    setLoading(true);
    const result = await login(devUser.email, devUser.password);
    setLoading(false);
    if (result.success) {
      addToast({ type: 'success', title: `Logged in as ${devUser.label}` });
      setTimeout(() => {
        if (devUser.role === 'super_admin' || devUser.role === 'admin') navigate('/admin/dashboard');
        else if (devUser.role === 'executive') navigate('/executive/dashboard');
        else navigate('/member/home');
      }, 300);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-100 dark:bg-[#0B1426] transition-colors duration-400">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #1A3A6B, #6C5CE7)' }}
      >
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 400 400" fill="none">
            <path d="M200 50L50 150V300L200 350L350 300V150L200 50Z" stroke="white" strokeWidth="2" fill="none"
              style={{ animation: 'float 8s ease-in-out infinite' }} />
            <path d="M200 100L100 170V280L200 320L300 280V170L200 100Z" stroke="white" strokeWidth="1.5" fill="none"
              style={{ animation: 'float-reverse 10s ease-in-out infinite' }} />
          </svg>
        </div>
        <div className="relative z-10 text-center text-white px-12">
          <div className="w-24 h-24 rounded-3xl bg-white/10 backdrop-blur-lg flex items-center justify-center mx-auto mb-8 animate-float">
            <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h2 className="font-display font-bold text-3xl mb-4">MOSYF Convention Portal</h2>
          <p className="text-white/70 max-w-sm mx-auto">The most modern platform for managing youth fellowship conventions.</p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        {/* Floating orbs */}
        <div className="floating-orb w-[120px] h-[120px] top-20 right-20" />
        <div className="floating-orb w-[80px] h-[80px] bottom-32 left-16 animate-float-reverse" />

        <motion.div
          className="w-full max-w-[420px] relative z-10"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <div className={`rounded-3xl p-10 backdrop-blur-glass-lg border ${
            'bg-white/85 border-white/50 dark:bg-slate-900/80 dark:border-white/[0.1]'
          }`}
            style={{ boxShadow: '0 24px 80px rgba(26, 58, 107, 0.15)' }}
          >
            <div className="text-center mb-8">
              <h2 className="font-display font-bold text-2xl text-slate-900 dark:text-white">Welcome Back</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Super Admin and Executive sign in</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="glass-input w-full pl-12"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="glass-input w-full pl-12 pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                className="gradient-btn w-full h-12 flex items-center justify-center gap-2 disabled:opacity-80"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : 'Sign In'}
              </motion.button>
            </form>

            {/* Dev Quick Login */}
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/[0.06]">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 text-center mb-3">Quick Login (Dev Mode)</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {DEV_USERS.map((u) => (
                  <motion.button
                    key={u.email}
                    onClick={() => quickLogin(u)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-purple-accent/10 text-purple-accent border border-purple-accent/20 hover:bg-purple-accent/20 transition-colors"
                    whileTap={{ scale: 0.95 }}
                  >
                    {u.label}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
