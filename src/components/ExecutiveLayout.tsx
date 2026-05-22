import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Calendar, LogOut, Menu, X, Sun, Moon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/executive/dashboard' },
  { icon: Calendar, label: 'Convention', path: '/executive/convention' },
];

export function ExecutiveLayout({ children }: { children: React.ReactNode }) {
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
      <aside className="hidden lg:block fixed left-0 top-0 h-full w-[240px] sidebar-glass z-40">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-accent to-purple-light flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="font-display font-bold text-lg text-white">MOSYF</span>
        </div>

        <nav className="px-4 mt-4 space-y-1">
          {NAV_ITEMS.map((item, i) => {
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

      {/* Mobile Drawer */}
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
              className="fixed left-0 top-0 h-full w-[240px] sidebar-glass z-50 lg:hidden"
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <div className="p-6 flex items-center justify-between">
                <span className="font-display font-bold text-lg text-white">MOSYF</span>
                <button onClick={() => setMobileOpen(false)} className="text-white/60 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <nav className="px-4 mt-4 space-y-1">
                {NAV_ITEMS.map((item) => {
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

      <div className="lg:ml-[240px] min-h-screen">
        <header className="sticky top-0 z-30 px-4 sm:px-8 py-4">
          <div className={`flex items-center justify-between h-16 px-6 rounded-2xl backdrop-blur-xl border ${
            theme === 'dark' ? 'bg-slate-900/80 border-white/[0.06]' : 'bg-white/80 border-slate-900/[0.06]'
          }`}>
            <div className="flex items-center gap-4">
              <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-white/10">
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="font-display font-semibold text-[1.125rem] text-slate-900 dark:text-slate-100">
                Welcome, {user?.name || 'Executive'}
              </h1>
            </div>
            <button onClick={toggleTheme} className="p-2.5 rounded-xl hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors">
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>
          </div>
        </header>
        <main className="px-4 sm:px-8 pb-8">{children}</main>
      </div>
    </div>
  );
}
