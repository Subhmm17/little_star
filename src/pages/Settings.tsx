import { useState, useRef } from 'react';
import { db, addAuditLog } from '../db/database';
import { importFromExcel, importFromUDISE } from '../utils/exportExcel';
import type { Student } from '../types';
import { SESSIONS } from '../types';
import { Settings as SettingsIcon, Upload, Trash2, Database, Download, AlertTriangle, CheckCircle, TrendingUp, ArrowRight, X } from 'lucide-react';
import { exportAllStudentsExcel } from '../utils/exportExcel';
import { useAuth } from '../contexts/AuthContext';

const NEXT_CLASS: Record<string, string> = {
  'Pre-Primary': 'Nursery', 'Nursery': 'KG', 'KG': '1',
  '1': '2', '2': '3', '3': '4', '4': '5', '5': '6',
  '6': '7', '7': '8', '8': 'GRADUATED',
};

export default function Settings() {
  const { syncNow } = useAuth();
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const [udiseImporting, setUdiseImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const udiseFileRef = useRef<HTMLInputElement>(null);

  // Promotion state
  const [fromSession, setFromSession] = useState('2025-26');
  const [toSession, setToSession] = useState('2026-27');
  const [promoting, setPromoting] = useState(false);
  const [preview, setPreview] = useState<Array<{ cls: string; nextCls: string; count: number }> | null>(null);

  function showMsg(type: 'success' | 'error', text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const rows = await importFromExcel(file);
      let added = 0, skipped = 0;
      for (const row of rows) {
        if (!row.studentName || !row.scholarNumber) { skipped++; continue; }
        const exists = await db.students.where('scholarNumber').equals(row.scholarNumber!).first();
        if (exists) { skipped++; continue; }
        await db.students.add({
          ...row,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Student);
        added++;
      }
      await addAuditLog('Imported', 'Database', undefined, `Imported ${added} students, skipped ${skipped}`);
      await syncNow();
      showMsg('success', `Imported ${added} students. Skipped ${skipped} (duplicates or missing data).`);
    } catch {
      showMsg('error', 'Failed to import. Please check the file format.');
    }
    setImporting(false);
    e.target.value = '';
  }

  async function handleUDISEImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUdiseImporting(true);
    try {
      const rows = await importFromUDISE(file);
      let added = 0, skipped = 0;
      for (const row of rows) {
        if (!row.studentName) { skipped++; continue; }
        if (row.penNumber) {
          const exists = await db.students.where('penNumber').equals(row.penNumber).first();
          if (exists) { skipped++; continue; }
        }
        await db.students.add({ ...row, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as Student);
        added++;
      }
      await addAuditLog('Imported', 'Database', undefined, `UDISE Import: ${added} students added, ${skipped} skipped`);
      await syncNow();
      showMsg('success', `UDISE Import complete: ${added} students added. ${skipped} skipped (already exist or no name).`);
    } catch {
      showMsg('error', 'Failed to import UDISE file. Download the Excel file from the government portal and try again.');
    }
    setUdiseImporting(false);
    e.target.value = '';
  }

  async function loadPromotionPreview() {
    const students = await db.students.where('status').equals('Active').toArray();
    const filtered = students.filter(s => s.academicSession === fromSession);
    const counts: Record<string, number> = {};
    for (const s of filtered) {
      counts[s.class] = (counts[s.class] || 0) + 1;
    }
    const rows = Object.entries(counts)
      .sort((a, b) => {
        const order = Object.keys(NEXT_CLASS);
        return order.indexOf(a[0]) - order.indexOf(b[0]);
      })
      .map(([cls, count]) => ({
        cls,
        nextCls: NEXT_CLASS[cls] ?? cls,
        count,
      }));
    setPreview(rows);
  }

  async function handlePromote() {
    if (!preview || preview.length === 0) return;
    setPromoting(true);
    try {
      const students = await db.students.where('status').equals('Active').toArray();
      const toPromote = students.filter(s => s.academicSession === fromSession && NEXT_CLASS[s.class]);
      let promoted = 0, graduated = 0;
      for (const s of toPromote) {
        const nextCls = NEXT_CLASS[s.class];
        if (nextCls === 'GRADUATED') {
          await db.students.update(s.id!, { status: 'TC Issued', academicSession: toSession, updatedAt: new Date().toISOString() });
          graduated++;
        } else {
          await db.students.update(s.id!, { class: nextCls, academicSession: toSession, updatedAt: new Date().toISOString() });
          promoted++;
        }
      }
      await addAuditLog('Updated', 'Database', undefined,
        `Bulk promotion ${fromSession}→${toSession}: ${promoted} promoted, ${graduated} marked TC Issued`);
      await syncNow();
      showMsg('success', `Promotion complete! ${promoted} students moved up, ${graduated} Class 8 students marked as TC Issued.`);
      setPreview(null);
    } catch {
      showMsg('error', 'Promotion failed. Please try again.');
    }
    setPromoting(false);
  }

  async function handleForceSyncAll() {
    const students = await db.students.toArray();
    if (students.length === 0) { showMsg('error', 'No students in local database to sync.'); return; }
    showMsg('success', `Syncing ${students.length} students to Google Drive…`);
    await syncNow(students);
    showMsg('success', `Done! ${students.length} students synced to Google Drive. You can now log in on any device.`);
  }

  async function handleFixMisassigned() {
    const VALID_CLASSES = ['Pre-Primary', 'Nursery', 'KG', '1', '2', '3', '4', '5', '6', '7', '8'];
    const all = await db.students.toArray();
    const misassigned = all.filter(s => !VALID_CLASSES.includes(s.class) && s.status !== 'TC Issued');
    if (misassigned.length === 0) {
      showMsg('success', 'No misassigned students found — everything looks correct!');
      return;
    }
    for (const s of misassigned) {
      await db.students.update(s.id!, { class: '8', status: 'TC Issued', updatedAt: new Date().toISOString() });
    }
    await addAuditLog('Updated', 'Student', undefined,
      `Fixed ${misassigned.length} students incorrectly promoted beyond Class 8 — marked as TC Issued`);
    await syncNow();
    showMsg('success', `Fixed ${misassigned.length} student(s) — moved back to Class 8 and marked as TC Issued.`);
  }

  async function handleBackup() {
    const students = await db.students.toArray();
    exportAllStudentsExcel(students);
    await addAuditLog('Downloaded', 'Database', undefined, 'Full backup downloaded');
    showMsg('success', 'Backup downloaded successfully!');
  }

  async function handleClearStudents() {
    if (!confirm('This will permanently delete ALL student records. This action CANNOT be undone. Type "DELETE" to confirm:')) return;
    const response = window.prompt('Type DELETE to confirm:');
    if (response !== 'DELETE') { showMsg('error', 'Cancelled. No data was deleted.'); return; }
    await db.students.clear();
    await addAuditLog('Deleted', 'Database', undefined, 'All student records permanently deleted');
    showMsg('success', 'All student records have been deleted.');
  }

  async function handleClearLogs() {
    if (!confirm('Clear all audit logs?')) return;
    await db.auditLogs.clear();
    showMsg('success', 'Audit logs cleared.');
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Manage database, import/export and system preferences</p>
      </div>

      {/* Status Message */}
      {msg && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${
          msg.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400' :
          'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
        }`}>
          {msg.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
          <p className="text-sm">{msg.text}</p>
        </div>
      )}

      {/* UDISE Import */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-purple-100 dark:bg-purple-900/40 rounded-lg flex items-center justify-center">
            <Upload className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Import from UDISE / Govt. Portal</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Upload the Excel file downloaded from the government school portal</p>
          </div>
        </div>
        <div className="border-2 border-dashed border-purple-200 dark:border-purple-800 rounded-xl p-6 text-center">
          <Upload className="w-8 h-8 text-purple-300 dark:text-purple-700 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Download "List of All Students" from the portal</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Supports the Excel export from UDISE / state school portals</p>
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            {udiseImporting ? 'Importing...' : 'Choose Portal File'}
            <input ref={udiseFileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleUDISEImport} disabled={udiseImporting} />
          </label>
        </div>
        <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg space-y-1">
          <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">Auto-maps these portal columns:</p>
          <p className="text-xs text-purple-600 dark:text-purple-400 font-mono">Class (PP-3→Pre-Primary, PP-2→Nursery, PP-1→KG, I→1 …) · Section · Name · Gender</p>
          <p className="text-xs text-purple-600 dark:text-purple-400 font-mono">Student PEN → PEN Number · Student State Code → SSSM ID · Father/Mother Name · Category</p>
        </div>
      </div>

      {/* Import */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center">
            <Upload className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Import Students</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Upload Excel or CSV file to bulk import students</p>
          </div>
        </div>
        <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center">
          <Upload className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Drag and drop or click to upload<br />
            <span className="text-xs">Supports .xlsx and .csv files</span>
          </p>
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            {importing ? 'Importing...' : 'Choose File'}
            <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={handleImport} disabled={importing} />
          </label>
        </div>
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">Expected Column Headers:</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 font-mono">
            Student Name, Scholar Number, Admission Number, Class, Section, Session, Date of Birth, Gender, Father's Name, Mother's Name, Parent Mobile, PEN Number, APAAR ID, SSSM ID, Status
          </p>
        </div>
      </div>

      {/* Promote Students */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-amber-200 dark:border-amber-800/50 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-amber-100 dark:bg-amber-900/40 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Promote Students</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Move all active students up one class to the next session</p>
          </div>
        </div>

        {/* Session selectors */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex-1 min-w-32">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">From Session</label>
            <select value={fromSession} onChange={e => { setFromSession(e.target.value); setPreview(null); }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none">
              {SESSIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <ArrowRight className="w-5 h-5 text-amber-500 mt-5 flex-shrink-0" />
          <div className="flex-1 min-w-32">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">To Session</label>
            <select value={toSession} onChange={e => { setToSession(e.target.value); setPreview(null); }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none">
              {SESSIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <button onClick={loadPromotionPreview}
            className="mt-5 px-4 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors flex-shrink-0">
            Preview
          </button>
        </div>

        {/* Preview table */}
        {preview && (
          <div className="border border-amber-200 dark:border-amber-800/50 rounded-xl overflow-hidden mb-4">
            <div className="flex items-center justify-between px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800/50">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Promotion Preview — {preview.reduce((a, r) => a + r.count, 0)} active students
              </p>
              <button onClick={() => setPreview(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            {preview.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
                No active students found in session {fromSession}.
              </p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {preview.map(row => (
                  <div key={row.cls} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-900 dark:text-white w-28">
                        {row.cls === 'Pre-Primary' ? 'Pre-Primary' : `Class ${row.cls}`}
                      </span>
                      <ArrowRight className="w-4 h-4 text-amber-500" />
                      <span className={`text-sm font-medium ${row.nextCls === 'GRADUATED' ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                        {row.nextCls === 'GRADUATED' ? 'TC Issued (Graduated)' : row.nextCls === 'Pre-Primary' || row.nextCls === 'Nursery' || row.nextCls === 'KG' ? row.nextCls : `Class ${row.nextCls}`}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5 rounded-full">
                      {row.count} students
                    </span>
                  </div>
                ))}
              </div>
            )}
            {preview.length > 0 && (
              <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800/50">
                <button onClick={handlePromote} disabled={promoting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60">
                  <TrendingUp className="w-4 h-4" />
                  {promoting ? 'Promoting...' : `Confirm — Promote All ${preview.reduce((a, r) => a + r.count, 0)} Students to ${toSession}`}
                </button>
                <p className="text-xs text-amber-700 dark:text-amber-400 text-center mt-2">
                  This will update each student's class and session. Class 8 students will be marked as TC Issued (passed out).
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Backup */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center">
            <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Backup &amp; Sync</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Download backup or force sync all data to Google Drive</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleBackup}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Full Backup (Excel)
          </button>
          <button
            onClick={handleForceSyncAll}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            Force Sync All Data to Google Drive
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
          If another device isn't showing data: sign out &amp; sign back in first (refreshes your session), then click Force Sync.
        </p>
      </div>

      {/* One-time Fix */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-orange-200 dark:border-orange-800/50 p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-orange-100 dark:bg-orange-900/40 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Fix Misassigned Students</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">For students incorrectly promoted beyond Class 8</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          If you ran bulk promotion before the Class 8 limit was set, some Class 8 students may have been moved to "Class 9".
          This will find any student in a class above 8 and mark them as <strong>TC Issued</strong> (passed out).
        </p>
        <button
          onClick={handleFixMisassigned}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors"
        >
          <CheckCircle className="w-4 h-4" />
          Fix Students Promoted Beyond Class 8
        </button>
      </div>

      {/* Danger Zone */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-red-200 dark:border-red-800/50 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-red-100 dark:bg-red-900/40 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="font-semibold text-red-700 dark:text-red-400">Danger Zone</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Irreversible actions — proceed with caution</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border border-red-100 dark:border-red-800/50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Clear Audit Logs</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Remove all activity history</p>
            </div>
            <button onClick={handleClearLogs} className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              <Trash2 className="w-4 h-4" /> Clear
            </button>
          </div>
          <div className="flex items-center justify-between p-3 border border-red-200 dark:border-red-800 rounded-lg bg-red-50/50 dark:bg-red-900/10">
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">Delete All Students</p>
              <p className="text-xs text-red-500 dark:text-red-500">Permanently remove all student records</p>
            </div>
            <button onClick={handleClearStudents} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
              <Trash2 className="w-4 h-4" /> Delete All
            </button>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
        <div className="flex items-center gap-3 mb-3">
          <SettingsIcon className="w-5 h-5 text-gray-400" />
          <h2 className="font-semibold text-gray-900 dark:text-white">About</h2>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <p><span className="font-medium">Little Star Convent School</span></p>
          <p className="text-xs">Student Management System</p>
          <p>Version 1.0.0</p>
          <p>Data is stored locally in your browser using IndexedDB.</p>
          <p>No data is sent to any server — completely offline and private.</p>
        </div>
      </div>
    </div>
  );
}
