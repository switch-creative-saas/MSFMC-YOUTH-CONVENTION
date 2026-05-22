import { motion } from 'framer-motion';
import { useAnimatedCounter } from '@/hooks/useAnimatedCounter';
import { useTheme } from '@/contexts/ThemeContext';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  label: string;
  value: number;
  trend?: string;
  trendUp?: boolean;
  isLive?: boolean;
  delay?: number;
}

export function StatCard({ icon: Icon, iconColor, iconBg, label, value, trend, trendUp, isLive, delay = 0 }: StatCardProps) {
  const { count } = useAnimatedCounter(value, 1200);
  const { theme } = useTheme();

  return (
    <motion.div
      className={`rounded-[20px] p-6 backdrop-blur-glass border transition-all duration-300 ${
        theme === 'dark'
          ? 'bg-slate-900/65 border-white/[0.08]'
          : 'bg-white/72 border-white/45'
      }`}
      style={{ boxShadow: theme === 'dark' ? '0 8px 32px rgba(0,0,0,0.3)' : '0 8px 32px rgba(26,58,107,0.15)' }}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1], delay }}
      whileHover={{ y: -4, boxShadow: '0 16px 48px rgba(26, 58, 107, 0.2)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 rounded-[14px] flex items-center justify-center" style={{ background: iconBg }}>
          <Icon className="w-5 h-5" style={{ color: iconColor }} />
        </div>
        {isLive && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        )}
        {trend && !isLive && (
          <span className={`text-xs font-medium ${trendUp ? 'text-emerald-500' : 'text-red-500'}`}>
            {trendUp ? '+' : ''}{trend}
          </span>
        )}
      </div>
      <p className="text-xs font-medium uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-[1.75rem] font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
        {count.toLocaleString()}
      </p>
    </motion.div>
  );
}
