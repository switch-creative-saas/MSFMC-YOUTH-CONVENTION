import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function GlassCard({ children, className, hover = true, onClick }: GlassCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <motion.div
      className={cn(
        'rounded-2xl p-6 backdrop-blur-glass transition-all duration-300',
        isDark ? 'glass-dark' : 'glass',
        onClick && 'cursor-pointer',
        className
      )}
      whileHover={hover ? { y: -4, boxShadow: '0 16px 48px rgba(26, 58, 107, 0.2)' } : undefined}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}
