import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Edit, Printer, FileText, FileSpreadsheet, User,
  Phone, MapPin, BookOpen, IdCard, Calendar
} from 'lucide-react';
import { db, addAuditLog } from '../db/database';
import type { Student } from '../types';
import { exportStudentProfilePDF } from '../utils/exportPDF';
import { exportStudentProfileWord } from '../utils/exportWord';

function formatDate(d: string) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }); }
  catch { return d; }
}

export default function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.students.get(Number(id)).then(s => {
      setStudent(s || null);
      if (s) addAuditLog('Viewed', 'Student', s.studentName, undefined, undefined, id);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 dark:text-gray-400">Student not found.</p>
        <button onClick={() => navigate('/students')} className="mt-3 text-sm text-blue-600 hover:text-blue-700">← Back to students</button>
      </div>
    );
  }

  async function handlePDF() {
    if (!student) return;
    exportStudentProfilePDF(student);
    await addAuditLog('Downloaded', 'Student', student.studentName, 'PDF profile downloaded', undefined, id);
  }

  async function handleWord() {
    if (!student) return;
    await exportStudentProfileWord(student);
    await addAuditLog('Downloaded', 'Student', student.studentName, 'Word profile downloaded', undefined, id);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Student Profile</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Scholar No: {student.scholarNumber}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors">
            <Printer className="w-4 h-4" /> Print
          </button>
          <button onClick={handlePDF} className="flex items-center gap-2 px-3 py-2 text-sm border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors">
            <FileText className="w-4 h-4" /> PDF
          </button>
          <button onClick={handleWord} className="flex items-center gap-2 px-3 py-2 text-sm border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition-colors">
            <FileSpreadsheet className="w-4 h-4" /> Word
          </button>
          <button onClick={() => navigate(`/students/${id}/edit`)} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Edit className="w-4 h-4" /> Edit
          </button>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Banner */}
        <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-600" />
        <div className="px-6 pb-6">
          <div className="flex flex-wrap items-end gap-4 -mt-12 mb-4">
            <div className="w-24 h-24 rounded-xl border-4 border-white dark:border-gray-800 shadow-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              {student.photo ? (
                <img src={student.photo} alt={student.studentName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-gray-400" />
              )}
            </div>
            <div className="pb-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{student.studentName}</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Class {student.class}{student.section ? ' – ' + student.section : ''} &nbsp;|&nbsp; Scholar No: {student.scholarNumber}
              </p>
            </div>
            <div className="ml-auto pb-1">
              <StatusBadge status={student.status} />
            </div>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Basic Info */}
        <InfoSection title="Basic Information" icon={IdCard}>
          <InfoRow label="Scholar Number" value={student.scholarNumber} />
          <InfoRow label="Admission Number" value={student.admissionNumber} />
          <InfoRow label="Class & Section" value={`${student.class}${student.section ? ' – ' + student.section : ''}`} />
          <InfoRow label="Academic Session" value={student.academicSession} />
          <InfoRow label="Date of Birth" value={formatDate(student.dateOfBirth)} />
          <InfoRow label="Gender" value={student.gender} />
          <InfoRow label="Category" value={student.category} />
          <InfoRow label="Blood Group" value={student.bloodGroup} highlight />
        </InfoSection>

        {/* Parent Info */}
        <InfoSection title="Parent Information" icon={User}>
          <InfoRow label="Father's Name" value={student.fatherName} />
          <InfoRow label="Mother's Name" value={student.motherName} />
          <InfoRow label="Parent Mobile" value={student.parentMobile} icon={<Phone className="w-3.5 h-3.5" />} />
          <InfoRow label="Alternate Mobile" value={student.alternateMobile} icon={<Phone className="w-3.5 h-3.5" />} />
          <InfoRow label="Father's Aadhaar" value={student.fatherAadhaar} />
          <InfoRow label="Mother's Aadhaar" value={student.motherAadhaar} />
        </InfoSection>

        {/* Government IDs */}
        <InfoSection title="Government IDs" icon={IdCard}>
          <InfoRow label="PEN Number" value={student.penNumber} missing={!student.penNumber} />
          <InfoRow label="APAAR ID" value={student.apaarId} missing={!student.apaarId} />
          <InfoRow label="SSSM ID" value={student.sssmId} missing={!student.sssmId} />
          <InfoRow label="Student Aadhaar" value={student.studentAadhaar} />
        </InfoSection>

        {/* Address */}
        <InfoSection title="Address" icon={MapPin}>
          <InfoRow label="Full Address" value={student.fullAddress} />
          <InfoRow label="Village / City" value={student.village} />
          <InfoRow label="District" value={student.district} />
          <InfoRow label="State" value={student.state} />
          <InfoRow label="Pincode" value={student.pincode} />
        </InfoSection>
      </div>

      {/* Bank Details */}
      {(student.bankAccountNumber || student.bankIfscCode || student.bankName) && (
        <InfoSection title="Bank Details" icon={IdCard}>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-50 dark:divide-gray-700">
            <InfoRow label="Account Number" value={student.bankAccountNumber} />
            <InfoRow label="IFSC Code" value={student.bankIfscCode} />
            <InfoRow label="Bank Name" value={student.bankName} />
          </div>
        </InfoSection>
      )}

      {/* School Info */}
      <InfoSection title="School Information" icon={BookOpen}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-0 divide-x divide-y divide-gray-50 dark:divide-gray-700">
          <InfoRow label="Admission Date" value={formatDate(student.admissionDate)} />
          <InfoRow label="Status" value={student.status} />
          <InfoRow label="Remarks" value={student.remarks} />
        </div>
      </InfoSection>

      {/* Timestamps */}
      <div className="text-xs text-gray-400 dark:text-gray-600 flex flex-wrap gap-4">
        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Added: {formatDate(student.createdAt)}</span>
        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Updated: {formatDate(student.updatedAt)}</span>
      </div>
    </div>
  );
}

function InfoSection({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
        <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h3>
      </div>
      <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value, icon, missing, highlight }: {
  label: string; value?: string; icon?: React.ReactNode; missing?: boolean; highlight?: boolean;
}) {
  return (
    <div className="flex items-center px-5 py-2.5">
      <span className="text-xs text-gray-400 dark:text-gray-500 w-36 flex-shrink-0">{label}</span>
      <span className={`text-sm flex items-center gap-1.5 ${
        missing ? 'text-red-400 italic' :
        highlight ? 'font-semibold text-blue-600 dark:text-blue-400' :
        'text-gray-900 dark:text-white font-medium'
      }`}>
        {icon}
        {value || (missing ? 'Not provided' : '—')}
      </span>
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
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}
