import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, UserPlus, Fingerprint, BarChart3, Settings,
  LogOut, Menu, X, Bell, Sun, Moon, ChevronRight, ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
  { icon: UserPlus, label: 'Registrations', path: '/admin/registrations' },
  { icon: Fingerprint, label: 'Attendance', path: '/admin/attendance' },
  { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
  { icon: Settings, label: 'Convention', path: '/admin/convention' },
];

const SUPER_ADMIN_ITEMS = [
  { icon: ShieldCheck, label: 'Admin Access', path: '/admin/access' },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0B1426] transition-colors duration-400">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed left-0 top-0 h-full w-[280px] sidebar-glass z-40">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-royal-500 to-purple-accent flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="font-display font-bold text-lg text-white">MOSYF</span>
        </div>

        <nav className="px-4 mt-4 space-y-1">
          {[...NAV_ITEMS, ...(user?.role === 'super_admin' ? SUPER_ADMIN_ITEMS : [])].map((item, i) => {
            const isActive = location.pathname === item.path;
            return (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
              >
                <Link
                  to={item.path}
                  className={`sidebar-item ${isActive ? 'sidebar-item-active' : ''}`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              </motion.div>
            );
          })}
          <div className="pt-4 mt-4 border-t border-white/[0.08]">
            <button onClick={handleLogout} className="sidebar-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10">
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="fixed left-0 top-0 h-full w-[280px] sidebar-glass z-50 lg:hidden"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-royal-500 to-purple-accent flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                  </div>
                  <span className="font-display font-bold text-lg text-white">MOSYF</span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="text-white/60 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <nav className="px-4 mt-4 space-y-1">
                {[...NAV_ITEMS, ...(user?.role === 'super_admin' ? SUPER_ADMIN_ITEMS : [])].map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`sidebar-item ${isActive ? 'sidebar-item-active' : ''}`}
                      onClick={() => setMobileOpen(false)}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
                <button onClick={handleLogout} className="sidebar-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 mt-4">
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="lg:ml-[280px] min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 px-4 sm:px-8 py-4">
          <div className={`flex items-center justify-between h-16 px-6 rounded-2xl backdrop-blur-xl border transition-all duration-300 ${
            theme === 'dark'
              ? 'bg-slate-900/80 border-white/[0.06]'
              : 'bg-white/80 border-slate-900/[0.06]'
          }`}>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors"
              >
                <Menu className="w-5 h-5 text-slate-700 dark:text-slate-200" />
              </button>
              <h1 className="font-display font-semibold text-[1.125rem] text-slate-900 dark:text-slate-100">
                Welcome back, {user?.name || 'Admin'}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-xl hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
              </button>
              <button className="p-2.5 rounded-xl hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors relative">
                <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
              </button>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-royal-500 to-purple-accent flex items-center justify-center text-white font-display font-bold text-sm">
                {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'AD'}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="px-4 sm:px-8 pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
