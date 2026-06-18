import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Login from '../../pages/Login';
import { useAuth } from '../../contexts/AuthContext';

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const { user, syncing } = useAuth();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  if (!user) return <Login />;

  const sidebarWidth = collapsed ? 64 : 256;

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-950 ${darkMode ? 'dark' : ''}`}>
      {/* Sync overlay — thin top bar while saving */}
      {syncing && (
        <div className="fixed top-0 left-0 right-0 h-0.5 z-50 bg-blue-100 dark:bg-gray-800">
          <div className="h-full bg-blue-500 animate-pulse" style={{ width: '60%' }} />
        </div>
      )}
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <Header darkMode={darkMode} onToggleDark={() => setDarkMode(!darkMode)} sidebarWidth={sidebarWidth} />
      <main className="min-h-screen pt-16 transition-all duration-300" style={{ marginLeft: sidebarWidth }}>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
