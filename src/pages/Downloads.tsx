import { useEffect, useState } from 'react';
import { db, addAuditLog } from '../db/database';
import type { Student } from '../types';
import { CLASSES } from '../types';
import { Download, FileText, FileSpreadsheet, File, Package } from 'lucide-react';
import { exportAllStudentsPDF, exportClassPDF } from '../utils/exportPDF';
import { exportAllStudentsExcel, exportClassExcel, exportAllStudentsCSV } from '../utils/exportExcel';
import { exportClassWord } from '../utils/exportWord';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Downloads() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState('');

  useEffect(() => {
    db.students.toArray().then(s => { setStudents(s); setLoading(false); });
  }, []);

  const byClass: Record<string, Student[]> = {};
  for (const s of students) {
    const cls = s.class || 'Unknown';
    if (!byClass[cls]) byClass[cls] = [];
    byClass[cls].push(s);
  }

  async function downloadAllProfilesZip() {
    setDownloading('zip');
    const zip = new JSZip();

    for (const [cls, clsStudents] of Object.entries(byClass)) {
      const folder = zip.folder(`Class_${cls}`)!;
      for (const student of clsStudents) {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, pageWidth, 30, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('STUDENT PROFILE', pageWidth / 2, 15, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(student.studentName, pageWidth / 2, 23, { align: 'center' });

        autoTable(doc, {
          startY: 38,
          body: [
            ['Scholar No', student.scholarNumber, 'Admission No', student.admissionNumber || '-'],
            ['Class', `${student.class}${student.section ? '-' + student.section : ''}`, 'Gender', student.gender],
            ["Father's Name", student.fatherName, "Mother's Name", student.motherName],
            ['Mobile', student.parentMobile, 'DOB', student.dateOfBirth || '-'],
            ['PEN Number', student.penNumber || '-', 'APAAR ID', student.apaarId || '-'],
            ['SSSM ID', student.sssmId || '-', 'Status', student.status],
            ['Address', student.fullAddress || '-', 'District', student.district || '-'],
          ],
          theme: 'striped',
          styles: { fontSize: 9 },
          columnStyles: { 0: { fontStyle: 'bold' }, 2: { fontStyle: 'bold' } },
        });

        const pdfBlob = doc.output('blob');
        folder.file(`${student.studentName.replace(/[^a-zA-Z0-9]/g, '_')}_${student.scholarNumber}.pdf`, pdfBlob);
      }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `All_Student_Profiles_${new Date().toISOString().split('T')[0]}.zip`);
    await addAuditLog('Downloaded', 'Database', undefined, 'Bulk ZIP download of all student profiles');
    setDownloading('');
  }

  const downloadActions = [
    {
      id: 'school-pdf',
      label: 'Full School Report (PDF)',
      desc: 'All students, class-wise breakdown',
      icon: FileText,
      color: 'red',
      action: async () => {
        exportAllStudentsPDF(students);
        await addAuditLog('Downloaded', 'Database', undefined, 'Full school PDF downloaded');
      },
    },
    {
      id: 'school-excel',
      label: 'Full School Report (Excel)',
      desc: 'All students + per-class sheets',
      icon: FileSpreadsheet,
      color: 'green',
      action: async () => {
        exportAllStudentsExcel(students);
        await addAuditLog('Downloaded', 'Database', undefined, 'Full school Excel downloaded');
      },
    },
    {
      id: 'school-csv',
      label: 'Full Database (CSV)',
      desc: 'All student data in CSV format',
      icon: File,
      color: 'gray',
      action: async () => {
        exportAllStudentsCSV(students);
        await addAuditLog('Downloaded', 'Database', undefined, 'Full CSV downloaded');
      },
    },
    {
      id: 'zip',
      label: 'All Student Profiles (ZIP)',
      desc: 'Individual PDF per student, organized by class',
      icon: Package,
      color: 'purple',
      action: downloadAllProfilesZip,
    },
  ];

  const colorMap: Record<string, string> = {
    red: 'border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20',
    green: 'border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20',
    gray: 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
    purple: 'border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20',
    blue: 'border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Downloads</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Export and download student data</p>
      </div>

      {/* Whole School Downloads */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Download className="w-4 h-4 text-blue-600" />
          Whole School Downloads
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {downloadActions.map(action => (
            <button
              key={action.id}
              onClick={async () => { setDownloading(action.id); await action.action(); setDownloading(''); }}
              disabled={loading || downloading === action.id}
              className={`flex flex-col items-start p-4 rounded-xl border transition-all text-left ${colorMap[action.color]} disabled:opacity-50`}
            >
              <action.icon className="w-6 h-6 mb-2" />
              <p className="text-sm font-semibold">{downloading === action.id ? 'Downloading...' : action.label}</p>
              <p className="text-xs opacity-70 mt-0.5">{action.desc}</p>
              <p className="text-xs mt-2 font-mono opacity-60">{students.length} students</p>
            </button>
          ))}
        </div>
      </div>

      {/* Class-wise Downloads */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Download className="w-4 h-4 text-blue-600" />
          Class-wise Downloads
        </h2>
        {loading ? (
          <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>
        ) : Object.keys(byClass).length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">No students found</div>
        ) : (
          <div className="space-y-3">
            {CLASSES.filter(cls => byClass[cls]).map(cls => (
              <ClassDownloadRow
                key={cls}
                className={cls}
                count={byClass[cls]?.length || 0}
                students={byClass[cls] || []}
                onDownload={addAuditLog}
              />
            ))}
            {/* Unknown class */}
            {byClass['Unknown'] && (
              <ClassDownloadRow
                className="Unknown"
                count={byClass['Unknown'].length}
                students={byClass['Unknown']}
                onDownload={addAuditLog}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ClassDownloadRow({ className, count, students, onDownload }: {
  className: string; count: number; students: Student[];
  onDownload: typeof addAuditLog;
}) {
  const [busy, setBusy] = useState('');

  async function dl(type: string, fn: () => Promise<void> | void) {
    setBusy(type);
    await fn();
    await onDownload('Downloaded', 'Class', `Class ${className}`, `${type} downloaded for Class ${className}`);
    setBusy('');
  }

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-32">
        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{className}</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Class {className}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{count} students</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => dl('PDF', () => exportClassPDF(students, className))}
          disabled={!!busy}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
        >
          <FileText className="w-3.5 h-3.5" />
          {busy === 'PDF' ? '...' : 'PDF'}
        </button>
        <button
          onClick={() => dl('Excel', () => exportClassExcel(students, className))}
          disabled={!!busy}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50 transition-colors"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          {busy === 'Excel' ? '...' : 'Excel'}
        </button>
        <button
          onClick={() => dl('Word', () => exportClassWord(students, className))}
          disabled={!!busy}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 transition-colors"
        >
          <FileText className="w-3.5 h-3.5" />
          {busy === 'Word' ? '...' : 'Word'}
        </button>
      </div>
    </div>
  );
}
