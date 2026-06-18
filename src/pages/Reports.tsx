import { useEffect, useState } from 'react';
import { db } from '../db/database';
import type { Student } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileText, Printer, TrendingUp, Users, AlertTriangle } from 'lucide-react';
import { exportAllStudentsPDF } from '../utils/exportPDF';
import { exportAllStudentsExcel } from '../utils/exportExcel';

const COLORS = ['#3B82F6', '#EC4899', '#10B981', '#F59E0B', '#6366F1', '#EF4444', '#14B8A6', '#8B5CF6'];

export default function Reports() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReport, setActiveReport] = useState('overview');

  useEffect(() => {
    db.students.toArray().then(s => { setStudents(s); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const byClass: Record<string, { boys: number; girls: number; total: number; active: number }> = {};
  const bySession: Record<string, number> = {};
  let missingPEN = 0, missingAPAAR = 0, missingSSSM = 0;

  for (const s of students) {
    const cls = s.class || 'Unknown';
    if (!byClass[cls]) byClass[cls] = { boys: 0, girls: 0, total: 0, active: 0 };
    byClass[cls].total++;
    if (s.gender === 'Male') byClass[cls].boys++;
    else byClass[cls].girls++;
    if (s.status === 'Active') byClass[cls].active++;

    const session = s.academicSession || 'Unknown';
    bySession[session] = (bySession[session] || 0) + 1;

    if (!s.penNumber) missingPEN++;
    if (!s.apaarId) missingAPAAR++;
    if (!s.sssmId) missingSSSM++;
  }

  const classData = Object.entries(byClass).map(([name, d]) => ({ name: `Cl.${name}`, ...d }));
  const sessionData = Object.entries(bySession).map(([name, value]) => ({ name, value }));

  const activeStudents = students.filter(s => s.status === 'Active');
  const inactiveStudents = students.filter(s => s.status === 'Inactive');
  const tcStudents = students.filter(s => s.status === 'TC Issued');
  const missingPENList = students.filter(s => !s.penNumber);
  const missingAPAARList = students.filter(s => !s.apaarId);
  const missingSSSMList = students.filter(s => !s.sssmId);

  const reports = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'class-wise', label: 'Class-wise', icon: Users },
    { id: 'active', label: 'Active Students', icon: Users },
    { id: 'inactive', label: 'Inactive Students', icon: Users },
    { id: 'tc-issued', label: 'TC Issued', icon: FileText },
    { id: 'missing-pen', label: 'Missing PEN', icon: AlertTriangle },
    { id: 'missing-apaar', label: 'Missing APAAR', icon: AlertTriangle },
    { id: 'missing-sssm', label: 'Missing SSSM', icon: AlertTriangle },
  ];

  function renderTable(list: Student[], title: string) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">{title} ({list.length})</h3>
          <div className="flex gap-2">
            <button onClick={() => exportAllStudentsPDF(list)} className="text-xs px-3 py-1.5 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">PDF</button>
            <button onClick={() => exportAllStudentsExcel(list)} className="text-xs px-3 py-1.5 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20">Excel</button>
            <button onClick={() => window.print()} className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1">
              <Printer className="w-3 h-3" /> Print
            </button>
          </div>
        </div>
        {list.length === 0 ? (
          <div className="p-10 text-center text-gray-400 dark:text-gray-500 text-sm">No students in this report</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50">
                  {['#', 'Scholar No', 'Name', "Father's Name", 'Class', 'Gender', 'Mobile', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {list.map((s, i) => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-blue-600 dark:text-blue-400">{s.scholarNumber}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">{s.studentName}</td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{s.fatherName}</td>
                    <td className="px-4 py-2.5"><span className="px-2 py-0.5 text-xs rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300">{s.class}{s.section ? '-' + s.section : ''}</span></td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{s.gender}</td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{s.parentMobile}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                        s.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        s.status === 'TC Issued' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>{s.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Generate and view student reports</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportAllStudentsPDF(students)} className="flex items-center gap-2 px-4 py-2 text-sm border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <FileText className="w-4 h-4" /> Export PDF
          </button>
          <button onClick={() => exportAllStudentsExcel(students)} className="flex items-center gap-2 px-4 py-2 text-sm border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
            <FileText className="w-4 h-4" /> Export Excel
          </button>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex flex-wrap gap-2">
        {reports.map(r => (
          <button
            key={r.id}
            onClick={() => setActiveReport(r.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg border font-medium transition-colors ${
              activeReport === r.id
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <r.icon className="w-4 h-4" />
            {r.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeReport === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Class-wise Distribution</h3>
              {classData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={classData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="boys" fill="#3B82F6" name="Boys" radius={[3,3,0,0]} />
                    <Bar dataKey="girls" fill="#EC4899" name="Girls" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-gray-400 py-20 text-sm">No data available</p>}
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Session-wise Admissions</h3>
              {sessionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={sessionData} cx="50%" cy="50%" outerRadius={110} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {sessionData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-gray-400 py-20 text-sm">No data available</p>}
            </div>
          </div>

          {/* Summary Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Class-wise Summary</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900/50">
                    {['Class', 'Total', 'Boys', 'Girls', 'Active', '% Missing PEN'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {Object.entries(byClass).map(([cls, d]) => {
                    const noPEN = students.filter(s => s.class === cls && !s.penNumber).length;
                    return (
                      <tr key={cls} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">Class {cls}</td>
                        <td className="px-4 py-2.5 font-bold text-blue-600 dark:text-blue-400">{d.total}</td>
                        <td className="px-4 py-2.5 text-indigo-600 dark:text-indigo-400">{d.boys}</td>
                        <td className="px-4 py-2.5 text-pink-600 dark:text-pink-400">{d.girls}</td>
                        <td className="px-4 py-2.5 text-green-600 dark:text-green-400">{d.active}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                              <div className="h-1.5 rounded-full bg-red-500" style={{ width: `${(noPEN / d.total) * 100}%` }} />
                            </div>
                            <span className="text-xs text-red-500">{Math.round((noPEN / d.total) * 100)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeReport === 'class-wise' && renderTable(students, 'All Students (Class-wise)')}
      {activeReport === 'active' && renderTable(activeStudents, 'Active Students')}
      {activeReport === 'inactive' && renderTable(inactiveStudents, 'Inactive Students')}
      {activeReport === 'tc-issued' && renderTable(tcStudents, 'TC Issued Students')}
      {activeReport === 'missing-pen' && renderTable(missingPENList, 'Students Missing PEN Number')}
      {activeReport === 'missing-apaar' && renderTable(missingAPAARList, 'Students Missing APAAR ID')}
      {activeReport === 'missing-sssm' && renderTable(missingSSSMList, 'Students Missing SSSM ID')}
    </div>
  );
}
