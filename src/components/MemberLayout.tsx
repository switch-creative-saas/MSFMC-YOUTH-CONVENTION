// MemberLayout
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, CreditCard, CheckCircle, User, Sun, Moon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

const NAV_ITEMS = [
  { icon: Home, label: 'Home', path: '/member/home' },
  { icon: CreditCard, label: 'My ID', path: '/member/id' },
  { icon: CheckCircle, label: 'Attendance', path: '/member/attendance' },
  { icon: User, label: 'Profile', path: '/member/profile' },
];

export function MemberLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0B1426] transition-colors duration-400 pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-30 px-4 py-3">
        <div className={`flex items-center justify-between h-14 px-5 rounded-2xl backdrop-blur-xl border ${
          theme === 'dark' ? 'bg-slate-900/80 border-white/[0.06]' : 'bg-white/80 border-slate-900/[0.06]'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="font-display font-bold text-sm text-slate-900 dark:text-slate-100">MOSYF</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors">
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-display font-bold text-xs">
              {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'ME'}
            </div>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="px-4 pt-2">{children}</main>

      {/* Bottom Navigation */}
      <nav className={`fixed bottom-0 left-0 right-0 z-40 h-16 border-t backdrop-blur-xl ${
        theme === 'dark'
          ? 'bg-slate-900/90 border-white/[0.08]'
          : 'bg-white/90 border-slate-900/[0.06]'
      }`}>
        <div className="flex items-center justify-around h-full max-w-md mx-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <motion.button
                key={item.path}
                className="flex flex-col items-center gap-1 py-2 px-4 relative"
                onClick={() => navigate(item.path)}
                whileTap={{ scale: 0.9 }}
              >
                <item.icon
                  className={`w-5 h-5 transition-colors ${
                    isActive ? 'text-blue-500' : 'text-slate-400 dark:text-slate-500'
                  }`}
                />
                <span className={`text-[10px] font-medium ${
                  isActive ? 'text-blue-500' : 'text-slate-400 dark:text-slate-500'
                }`}>
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-blue-500"
                    layoutId="bottomNavDot"
                    transition={{ type: 'spring', bounce: 0.3 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
