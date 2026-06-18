import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, User, UserCheck, UserX, FileText, AlertTriangle,
  TrendingUp, BookOpen, RefreshCw, Plus
} from 'lucide-react';
import { getDashboardStats } from '../db/database';
import StatCard from '../components/Common/StatCard';
import type { DashboardStats, ClassInfo } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

const COLORS = ['#3B82F6', '#EC4899', '#10B981', '#F59E0B', '#6366F1', '#EF4444'];

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    const s = await getDashboardStats();
    setStats(s);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const genderData = [
    { name: 'Boys', value: stats.totalBoys },
    { name: 'Girls', value: stats.totalGirls },
  ];

  const statusData = [
    { name: 'Active', value: stats.activeStudents },
    { name: 'Inactive', value: stats.inactiveStudents },
    { name: 'TC Issued', value: stats.tcIssuedStudents },
  ];

  const classChartData = stats.classSummary.map(c => ({
    name: `Cls ${c.name}`,
    Boys: c.boys,
    Girls: c.girls,
    Total: c.totalStudents,
  }));

  const missingData = [
    { label: 'Missing PEN', value: stats.missingPEN, color: '#EF4444' },
    { label: 'Missing APAAR', value: stats.missingAPAAR, color: '#F59E0B' },
    { label: 'Missing SSSM', value: stats.missingSSSM, color: '#6366F1' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Little Star Convent School</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 md:px-4 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => navigate('/students/add')}
            className="flex items-center gap-2 px-3 md:px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Student</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total Students"
          value={stats.totalStudents}
          icon={Users}
          color="text-blue-600"
          bgColor="bg-blue-100 dark:bg-blue-900/40"
          onClick={() => navigate('/students')}
        />
        <StatCard
          label="Total Boys"
          value={stats.totalBoys}
          icon={User}
          color="text-indigo-600"
          bgColor="bg-indigo-100 dark:bg-indigo-900/40"
          onClick={() => navigate('/students?gender=Male')}
        />
        <StatCard
          label="Total Girls"
          value={stats.totalGirls}
          icon={User}
          color="text-pink-600"
          bgColor="bg-pink-100 dark:bg-pink-900/40"
          onClick={() => navigate('/students?gender=Female')}
        />
        <StatCard
          label="Active"
          value={stats.activeStudents}
          icon={UserCheck}
          color="text-green-600"
          bgColor="bg-green-100 dark:bg-green-900/40"
          onClick={() => navigate('/students?status=Active')}
        />
        <StatCard
          label="Inactive"
          value={stats.inactiveStudents}
          icon={UserX}
          color="text-red-600"
          bgColor="bg-red-100 dark:bg-red-900/40"
          onClick={() => navigate('/students?status=Inactive')}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          label="TC Issued"
          value={stats.tcIssuedStudents}
          icon={FileText}
          color="text-amber-600"
          bgColor="bg-amber-100 dark:bg-amber-900/40"
          onClick={() => navigate('/students?status=TC Issued')}
        />
        <StatCard
          label="New Admissions"
          value={stats.newAdmissions}
          icon={TrendingUp}
          color="text-teal-600"
          bgColor="bg-teal-100 dark:bg-teal-900/40"
          subtitle="Current session"
        />
        <StatCard
          label="Missing PEN"
          value={stats.missingPEN}
          icon={AlertTriangle}
          color="text-red-600"
          bgColor="bg-red-100 dark:bg-red-900/40"
          onClick={() => navigate('/students?missingPEN=true')}
        />
        <StatCard
          label="Missing APAAR"
          value={stats.missingAPAAR}
          icon={AlertTriangle}
          color="text-orange-600"
          bgColor="bg-orange-100 dark:bg-orange-900/40"
          onClick={() => navigate('/students?missingAPAAR=true')}
        />
        <StatCard
          label="Missing SSSM"
          value={stats.missingSSSM}
          icon={AlertTriangle}
          color="text-purple-600"
          bgColor="bg-purple-100 dark:bg-purple-900/40"
          onClick={() => navigate('/students?missingSSSM=true')}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gender Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Gender Distribution</h3>
          {stats.totalStudents > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={genderData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {genderData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Students']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">No data</div>
          )}
          <div className="flex justify-center gap-4 mt-2">
            {genderData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                <span className="text-sm text-gray-600 dark:text-gray-400">{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Status Breakdown</h3>
          {stats.totalStudents > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  <Cell fill="#10B981" />
                  <Cell fill="#EF4444" />
                  <Cell fill="#F59E0B" />
                </Pie>
                <Tooltip formatter={(value) => [value, 'Students']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">No data</div>
          )}
          <div className="flex justify-center gap-3 mt-2 flex-wrap">
            {statusData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ['#10B981', '#EF4444', '#F59E0B'][i] }} />
                <span className="text-xs text-gray-600 dark:text-gray-400">{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Missing Data */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Missing Government IDs</h3>
          <div className="space-y-3">
            {missingData.map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                  <span className="font-semibold" style={{ color: item.color }}>{item.value}</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      backgroundColor: item.color,
                      width: stats.totalStudents > 0 ? `${(item.value / stats.totalStudents) * 100}%` : '0%'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Class-wise Chart */}
      {classChartData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Class-wise Student Count</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={classChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Boys" fill="#3B82F6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Girls" fill="#EC4899" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Class Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Class-wise Summary</h2>
          <button
            onClick={() => navigate('/students')}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
          >
            View All Students →
          </button>
        </div>
        {stats.classSummary.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-100 dark:border-gray-700">
            <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No students added yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Add students to see class-wise summary</p>
            <button
              onClick={() => navigate('/students/add')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add First Student
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {stats.classSummary
              .sort((a, b) => {
                const order = ['Pre-Primary', 'Nursery', 'KG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
                return order.indexOf(a.name) - order.indexOf(b.name);
              })
              .map((cls: ClassInfo) => (
                <ClassCard key={cls.name} cls={cls} onClick={() => navigate(`/students?class=${encodeURIComponent(cls.name)}`)} />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ClassCard({ cls, onClick }: { cls: ClassInfo; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700
        hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700 hover:scale-[1.02]
        active:scale-100 transition-all duration-150 text-left w-full"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded">
          CLASS {cls.name}
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{cls.totalStudents}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Students</p>
      <div className="flex gap-3 mt-2">
        <span className="text-xs text-blue-600 dark:text-blue-400">&#9794; {cls.boys}</span>
        <span className="text-xs text-pink-600 dark:text-pink-400">&#9792; {cls.girls}</span>
      </div>
    </button>
  );
}
