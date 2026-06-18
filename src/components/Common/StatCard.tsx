import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  onClick?: () => void;
  subtitle?: string;
}

export default function StatCard({ label, value, icon: Icon, color, bgColor, onClick, subtitle }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700
        flex items-center gap-4
        ${onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-100 transition-all duration-150' : ''}
      `}
    >
      <div className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-tight" title={label}>{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );
}
