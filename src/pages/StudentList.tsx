import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus, Search, Filter, Download, Upload, Eye, Edit, Trash2,
  ChevronLeft, ChevronRight, X, FileSpreadsheet, FileText
} from 'lucide-react';
import { db, addAuditLog, deleteStudentAndSync } from '../db/database';
import type { Student, FilterOptions, Gender, StudentStatus } from '../types';
import { CLASSES, SECTIONS } from '../types';
import { exportClassExcel, exportAllStudentsExcel, exportAllStudentsCSV, importFromExcel } from '../utils/exportExcel';
import { exportClassPDF, exportAllStudentsPDF } from '../utils/exportPDF';
import { exportClassWord } from '../utils/exportWord';

const PAGE_SIZE = 20;

export default function StudentList() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filtered, setFiltered] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [importStatus, setImportStatus] = useState('');

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const load = useCallback(async () => {
    setLoading(true);
    const all = await db.students.toArray();
    setStudents(all);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const cls = searchParams.get('class') || '';
    const gender = searchParams.get('gender') || '';
    const status = searchParams.get('status') || '';
    const missingPEN = searchParams.get('missingPEN') === 'true';
    const missingAPAAR = searchParams.get('missingAPAAR') === 'true';
    const missingSSSM = searchParams.get('missingSSSM') === 'true';
    setSelectedClass(cls);
    setFilters({ class: cls, gender: gender as Gender | '', status: status as StudentStatus | '', missingPEN, missingAPAAR, missingSSSM });
  }, [searchParams]);

  useEffect(() => {
    let result = [...students];
    const q = searchQuery.toLowerCase();

    if (q) {
      result = result.filter(s =>
        s.studentName?.toLowerCase().includes(q) ||
        s.scholarNumber?.toLowerCase().includes(q) ||
        s.fatherName?.toLowerCase().includes(q) ||
        s.motherName?.toLowerCase().includes(q) ||
        s.penNumber?.toLowerCase().includes(q) ||
        s.apaarId?.toLowerCase().includes(q) ||
        s.sssmId?.toLowerCase().includes(q)
      );
    }
    if (filters.class) result = result.filter(s => s.class === filters.class);
    if (filters.section) result = result.filter(s => s.section === filters.section);
    if (filters.gender) result = result.filter(s => s.gender === filters.gender);
    if (filters.status) result = result.filter(s => s.status === filters.status);
    if (filters.missingPEN) result = result.filter(s => !s.penNumber);
    if (filters.missingAPAAR) result = result.filter(s => !s.apaarId);
    if (filters.missingSSSM) result = result.filter(s => !s.sssmId);

    setFiltered(result);
    setPage(1);
  }, [students, searchQuery, filters]);

  async function handleDelete(id: number) {
    const student = students.find(s => s.id === id);
    await deleteStudentAndSync(id);
    await addAuditLog('Deleted', 'Student', student?.studentName, 'Status changed to Inactive', undefined, String(id));
    setDeleteConfirm(null);
    load();
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus('Importing...');
    try {
      const rows = await importFromExcel(file);
      let added = 0;
      for (const row of rows) {
        if (!row.studentName || !row.scholarNumber) continue;
        const exists = await db.students.where('scholarNumber').equals(row.scholarNumber!).first();
        if (exists) continue;
        await db.students.add({
          ...row,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Student);
        added++;
      }
      await addAuditLog('Imported', 'Database', undefined, `Imported ${added} students from Excel`);
      setImportStatus(`✓ Imported ${added} students`);
      load();
    } catch {
      setImportStatus('✗ Import failed');
    }
    e.target.value = '';
    setTimeout(() => setImportStatus(''), 4000);
  }

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const displayClass = filters.class || selectedClass;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {displayClass ? `Class ${displayClass} Students` : 'All Students'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{filtered.length} student{filtered.length !== 1 ? 's' : ''} found</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer text-gray-600 dark:text-gray-300 transition-colors">
            <Upload className="w-4 h-4" />
            Import
            <input type="file" accept=".xlsx,.csv" className="hidden" onChange={handleImport} />
          </label>
          {importStatus && <span className="text-sm py-2 text-green-600 dark:text-green-400">{importStatus}</span>}
          <ExportMenu students={filtered} className={displayClass} />
          <button
            onClick={() => navigate('/students/add')}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Student
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, scholar no, PEN, APAAR, SSSM..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-400 dark:text-white"
            />
          </div>
          <select
            value={filters.class || ''}
            onChange={e => setFilters(f => ({ ...f, class: e.target.value }))}
            className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none dark:text-white"
          >
            <option value="">All Classes</option>
            {CLASSES.map(c => <option key={c}>{c}</option>)}
          </select>
          <select
            value={filters.section || ''}
            onChange={e => setFilters(f => ({ ...f, section: e.target.value }))}
            className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none dark:text-white"
          >
            <option value="">All Sections</option>
            {SECTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
          <select
            value={filters.gender || ''}
            onChange={e => setFilters(f => ({ ...f, gender: e.target.value as Gender | '' }))}
            className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none dark:text-white"
          >
            <option value="">All Genders</option>
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>
          <select
            value={filters.status || ''}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value as StudentStatus | '' }))}
            className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none dark:text-white"
          >
            <option value="">All Status</option>
            <option>Active</option>
            <option>Inactive</option>
            <option>TC Issued</option>
          </select>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900'}`}
          >
            <Filter className="w-4 h-4" />
            More Filters
          </button>
          {(filters.class || filters.gender || filters.status || filters.missingPEN || filters.missingAPAAR || filters.missingSSSM || searchQuery) && (
            <button
              onClick={() => { setFilters({}); setSearchQuery(''); }}
              className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>

        {/* More Filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
              <input type="checkbox" checked={!!filters.missingPEN} onChange={e => setFilters(f => ({ ...f, missingPEN: e.target.checked }))} className="rounded border-gray-300" />
              Missing PEN Number
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
              <input type="checkbox" checked={!!filters.missingAPAAR} onChange={e => setFilters(f => ({ ...f, missingAPAAR: e.target.checked }))} className="rounded border-gray-300" />
              Missing APAAR ID
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
              <input type="checkbox" checked={!!filters.missingSSSM} onChange={e => setFilters(f => ({ ...f, missingSSSM: e.target.checked }))} className="rounded border-gray-300" />
              Missing SSSM ID
            </label>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-400 dark:text-gray-500 text-sm">Loading students...</p>
          </div>
        ) : paginated.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">No students found</p>
            <button onClick={() => navigate('/students/add')} className="mt-3 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">+ Add Student</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                  {['Scholar No', 'Name', "Father's Name", 'Class', 'Gender', 'Mobile', 'PEN No', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {paginated.map(student => (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-blue-700 dark:text-blue-400 font-medium">{student.scholarNumber}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {student.photo ? (
                          <img src={student.photo} alt="" className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-bold">
                            {student.studentName?.charAt(0)}
                          </div>
                        )}
                        <span className="font-medium text-gray-900 dark:text-white">{student.studentName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{student.fatherName}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                        {student.class}{student.section ? '-' + student.section : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{student.gender}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{student.parentMobile}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{student.penNumber || <span className="text-red-400">—</span>}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={student.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => navigate(`/students/${student.id}`)} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => navigate(`/students/${student.id}/edit`)} className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors" title="Edit">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteConfirm(student.id!)} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
              <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirm Modal */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Deactivate Student?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              The student will be marked as <strong>Inactive</strong> instead of being permanently deleted. You can reactivate them later.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">Deactivate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'Active': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'Inactive': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'TC Issued': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function ExportMenu({ students, className }: { students: Student[]; className: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
      >
        <Download className="w-4 h-4" />
        Export
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-1 z-50 min-w-48">
            <p className="px-3 py-1 text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">Export Format</p>
            <button onClick={() => { exportClassPDF(students, className || 'All'); setOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <FileText className="w-4 h-4 text-red-500" /> PDF
            </button>
            <button onClick={() => { exportClassExcel(students, className || 'All'); setOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <FileSpreadsheet className="w-4 h-4 text-green-500" /> Excel
            </button>
            <button onClick={() => { exportClassWord(students, className || 'All'); setOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <FileText className="w-4 h-4 text-blue-500" /> Word
            </button>
            <button onClick={() => { exportAllStudentsCSV(students); setOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <FileText className="w-4 h-4 text-gray-500" /> CSV
            </button>
            <div className="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1">
              <button onClick={() => { exportAllStudentsExcel(students); setOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <FileSpreadsheet className="w-4 h-4 text-green-600" /> Full Excel (Class-wise)
              </button>
              <button onClick={() => { exportAllStudentsPDF(students); setOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <FileText className="w-4 h-4 text-red-600" /> Full PDF (Class-wise)
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
