import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, TrendingUp } from 'lucide-react';
import { db } from '../db/database';
import type { Student } from '../types';
import { CURRENT_SESSION } from '../types';

export default function Admissions() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    const all = await db.students.toArray();
    const now = new Date();
    const sessionYear = now.getFullYear();
    const sessionStart = new Date(`${sessionYear}-04-01`);
    const recent = all
      .filter(s => new Date(s.admissionDate) >= sessionStart)
      .sort((a, b) => new Date(b.admissionDate).getTime() - new Date(a.admissionDate).getTime());
    setStudents(recent);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admissions</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">New admissions for session {CURRENT_SESSION}</p>
        </div>
        <button
          onClick={() => navigate('/students/add')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Admission
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Recent Admissions ({students.length})</h2>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : students.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">No new admissions this session.</p>
            <button onClick={() => navigate('/students/add')} className="mt-3 text-sm text-blue-600 hover:text-blue-700">+ Add Student</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50">
                  {['#', 'Admission Date', 'Scholar No', 'Student Name', 'Class', 'Gender', 'Father Name', 'Mobile'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {students.map((s, i) => (
                  <tr
                    key={s.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer"
                    onClick={() => navigate(`/students/${s.id}`)}
                  >
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600 dark:text-gray-300">{s.admissionDate}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-blue-600 dark:text-blue-400">{s.scholarNumber}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">{s.studentName}</td>
                    <td className="px-4 py-2.5"><span className="px-2 py-0.5 text-xs rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300">{s.class}{s.section ? '-' + s.section : ''}</span></td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{s.gender}</td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{s.fatherName}</td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{s.parentMobile}</td>
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
