import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, GraduationCap, FileText, Download,
  ClipboardList, Settings, ChevronLeft, ChevronRight, BookOpen, X
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobile: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/students', icon: Users, label: 'Students' },
  { to: '/admissions', icon: GraduationCap, label: 'Admissions' },
  { to: '/transfer-certificates', icon: BookOpen, label: 'Transfer Certs' },
  { to: '/reports', icon: FileText, label: 'Reports' },
  { to: '/downloads', icon: Download, label: 'Downloads' },
  { to: '/audit-logs', icon: ClipboardList, label: 'Audit Logs' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar({ collapsed, onToggle, isMobile, mobileOpen, onMobileClose }: SidebarProps) {
  const isVisible = isMobile ? mobileOpen : true;
  const width = isMobile ? 256 : (collapsed ? 64 : 256);
  const showLabels = isMobile ? true : !collapsed;

  return (
    <aside
      className="fixed left-0 top-0 h-full z-40 flex flex-col shadow-xl transition-all duration-300 ease-in-out"
      style={{
        background: 'linear-gradient(180deg, #0d1b35 0%, #152033 100%)',
        width,
        transform: isVisible ? 'translateX(0)' : 'translateX(-100%)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5" style={{ borderBottom: '1px solid #1e3358' }}>
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center shadow" style={{ background: '#f5a623' }}>
            <GraduationCap className="w-5 h-5" style={{ color: '#0d1b35' }} />
          </div>
          {showLabels && (
            <div className="overflow-hidden">
              <p className="text-white font-bold text-sm leading-tight">Little Star</p>
              <p className="text-xs font-medium" style={{ color: '#f5a623' }}>Convent School</p>
            </div>
          )}
        </div>
        {/* Mobile close button */}
        {isMobile && (
          <button onClick={onMobileClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={isMobile ? onMobileClose : undefined}
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 mx-2 rounded-lg mb-1
              transition-all duration-150 group relative
              ${isActive ? 'text-white font-semibold' : 'text-slate-300 hover:bg-white/10 hover:text-white'}
            `}
            style={({ isActive }) => isActive ? { background: 'rgba(245,166,35,0.18)', color: '#f5a623' } : {}}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {showLabels && <span className="text-sm font-medium truncate">{label}</span>}
            {!showLabels && !isMobile && (
              <div className="absolute left-16 ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded
                opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                {label}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Toggle Button — desktop only */}
      {!isMobile && (
        <button
          onClick={onToggle}
          className="flex items-center justify-center py-3 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          style={{ borderTop: '1px solid #1e3358' }}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          {!collapsed && <span className="ml-2 text-sm">Collapse</span>}
        </button>
      )}
    </aside>
  );
}
