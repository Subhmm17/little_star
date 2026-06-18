import { useEffect, useState } from 'react';
import { db } from '../db/database';
import type { AuditLog } from '../types';
import { ClipboardList, RefreshCw, Trash2 } from 'lucide-react';

const ACTION_COLORS: Record<string, string> = {
  Added: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Updated: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Deleted: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Downloaded: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Imported: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Viewed: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  function load() {
    setLoading(true);
    db.auditLogs.orderBy('timestamp').reverse().toArray().then(l => {
      setLogs(l);
      setLoading(false);
    });
  }

  useEffect(() => { load(); }, []);

  async function clearLogs() {
    if (!confirm('Clear all audit logs? This cannot be undone.')) return;
    await db.auditLogs.clear();
    load();
  }

  const filtered = logs.filter(l =>
    !filter ||
    l.action.toLowerCase().includes(filter.toLowerCase()) ||
    l.entityType.toLowerCase().includes(filter.toLowerCase()) ||
    l.entityName?.toLowerCase().includes(filter.toLowerCase()) ||
    l.details?.toLowerCase().includes(filter.toLowerCase())
  );

  function formatTime(ts: string) {
    try {
      const d = new Date(ts);
      return d.toLocaleDateString('en-IN') + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch { return ts; }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{logs.length} total activities recorded</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={clearLogs} className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <Trash2 className="w-4 h-4" /> Clear Logs
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <input
          type="text"
          placeholder="Filter logs by action, type, name..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="w-full max-w-sm px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-400 dark:text-white"
        />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No audit logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                  {['Time', 'Action', 'Type', 'Entity', 'Details', 'Performed By'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {filtered.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{formatTime(log.timestamp)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">{log.entityType}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{log.entityName || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate">{log.details || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">{log.performedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
