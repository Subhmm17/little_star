import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Moon, Sun, User, RefreshCw, CheckCircle, AlertCircle, LogOut, Menu } from 'lucide-react';
import { db } from '../../db/database';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  darkMode: boolean;
  onToggleDark: () => void;
  sidebarWidth: number;
  onMenuClick: () => void;
  isMobile: boolean;
}

export default function Header({ darkMode, onToggleDark, sidebarWidth, onMenuClick, isMobile }: HeaderProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ id: number; name: string; scholarNumber: string; class: string }>>([]);
  const [showResults, setShowResults] = useState(false);
  const { user, syncing, syncError, syncNow, logout } = useAuth();
  const navigate = useNavigate();

  async function handleSearch(q: string) {
    setQuery(q);
    if (q.length < 2) { setResults([]); setShowResults(false); return; }
    const ql = q.toLowerCase();
    const all = await db.students.toArray();
    const filtered = all.filter(s =>
      s.studentName?.toLowerCase().includes(ql) ||
      s.scholarNumber?.toLowerCase().includes(ql) ||
      s.penNumber?.toLowerCase().includes(ql) ||
      s.apaarId?.toLowerCase().includes(ql) ||
      s.sssmId?.toLowerCase().includes(ql) ||
      s.fatherName?.toLowerCase().includes(ql) ||
      s.motherName?.toLowerCase().includes(ql)
    ).slice(0, 8);
    setResults(filtered.map(s => ({ id: s.id!, name: s.studentName, scholarNumber: s.scholarNumber, class: s.class })));
    setShowResults(true);
  }

  function selectResult(id: number) {
    setQuery('');
    setShowResults(false);
    navigate(`/students/${id}`);
  }

  return (
    <header
      className="fixed top-0 right-0 z-30 h-16 flex items-center justify-between px-3 md:px-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm transition-all duration-300"
      style={{ left: sidebarWidth }}
    >
      {/* Left: hamburger (mobile) + search */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {isMobile && (
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 flex-shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={isMobile ? 'Search…' : 'Search students by name, scholar no, PEN, APAAR...'}
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onBlur={e => { setTimeout(() => setShowResults(false), 200); e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.backgroundColor = ''; }}
            onFocus={e => { if (query.length >= 2) setShowResults(true); e.currentTarget.style.borderColor = '#f5a623'; e.currentTarget.style.backgroundColor = 'white'; }}
            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 border border-transparent rounded-lg outline-none transition-all dark:text-white"
          />
          {showResults && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
              {results.map(r => (
                <button key={r.id} onMouseDown={() => selectResult(r.id)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,166,35,0.15)' }}>
                    <User className="w-4 h-4" style={{ color: '#f5a623' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{r.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Scholar: {r.scholarNumber} | Class {r.class}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {showResults && results.length === 0 && query.length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50">
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">No students found</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1 md:gap-2 ml-2 flex-shrink-0">
        {/* Sync status */}
        <button
          onClick={() => syncNow()}
          title={syncError ?? (syncing ? 'Syncing...' : 'Synced to Google Drive')}
          className="flex items-center gap-1 md:gap-1.5 px-2 md:px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border"
        >
          {syncing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
              <span className="hidden sm:inline text-blue-600 dark:text-blue-400">Syncing…</span>
            </>
          ) : syncError ? (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-red-500" />
              <span className="hidden sm:inline text-red-600 dark:text-red-400">Error</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              <span className="hidden sm:inline text-green-600 dark:text-green-400">Saved</span>
            </>
          )}
        </button>

        <button onClick={onToggleDark}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 transition-colors">
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <button className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 transition-colors relative">
          <Bell className="w-5 h-5" />
        </button>

        {/* User avatar + logout */}
        <div className="flex items-center gap-1 md:gap-2 ml-1 pl-1 md:pl-2 border-l border-gray-200 dark:border-gray-700">
          {user?.picture ? (
            <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#f5a623' }}>
              <User className="w-4 h-4 text-white" />
            </div>
          )}
          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight">{user?.name ?? 'School Staff'}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight truncate max-w-32">{user?.email ?? ''}</p>
          </div>
          <button onClick={logout} title="Sign out"
            className="p-1.5 ml-0.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
