import Dexie, { type Table } from 'dexie';
import type { Student, AuditLog } from '../types';
import { syncStudentsToSheet, appendAuditToSheet } from '../services/googleSheets';

export class SchoolDatabase extends Dexie {
  students!: Table<Student>;
  auditLogs!: Table<AuditLog>;

  constructor() {
    super('SchoolManagementDB');
    this.version(1).stores({
      students: '++id, scholarNumber, admissionNumber, class, section, status, gender, academicSession, fatherName, motherName, penNumber, apaarId, sssmId',
      auditLogs: '++id, action, entityType, timestamp',
    });
  }
}

export const db = new SchoolDatabase();

// ── Helpers to read auth state without importing React context ───────────────
function getToken(): string | null { return localStorage.getItem('lscs_access_token'); }
function getSheetId(): string | null { return localStorage.getItem('lscs_spreadsheet_id'); }

// ── Auto-sync to Google Sheets after every write ─────────────────────────────
async function autoSync() {
  const token = getToken();
  const sheetId = getSheetId();
  if (!token || !sheetId) return;
  try {
    const students = await db.students.toArray();
    await syncStudentsToSheet(token, sheetId, students);
  } catch (err) {
    console.warn('Auto-sync failed:', err);
  }
}

export async function addAuditLog(
  action: AuditLog['action'],
  entityType: AuditLog['entityType'],
  entityName?: string,
  details?: string,
  changes?: string,
  entityId?: string
) {
  await db.auditLogs.add({
    action,
    entityType,
    entityId,
    entityName,
    details,
    changes,
    performedBy: 'School Staff',
    timestamp: new Date().toISOString(),
  });

  // Push audit entry to Google Sheets (non-blocking)
  const token = getToken();
  const sheetId = getSheetId();
  if (token && sheetId) {
    appendAuditToSheet(token, sheetId, action, entityType, entityName ?? '', details ?? '').catch(() => {});
  }
}

// ── Wrapped DB write helpers that trigger auto-sync ──────────────────────────
export async function addStudentAndSync(student: Omit<Student, 'id'>): Promise<number> {
  const id = await db.students.add(student as Student);
  autoSync(); // fire and forget
  return id as number;
}

export async function updateStudentAndSync(id: number, data: Partial<Student>): Promise<void> {
  await db.students.update(id, data);
  autoSync();
}

export async function deleteStudentAndSync(id: number): Promise<void> {
  await db.students.update(id, { status: 'Inactive', updatedAt: new Date().toISOString() });
  autoSync();
}

export async function getDashboardStats() {
  const students = await db.students.toArray();
  const now = new Date();
  const sessionYear = now.getFullYear();
  const sessionStart = new Date(`${sessionYear}-04-01`);

  const classCounts: Record<string, { total: number; boys: number; girls: number }> = {};
  let totalBoys = 0, totalGirls = 0, activeStudents = 0, inactiveStudents = 0;
  let tcIssuedStudents = 0, newAdmissions = 0, missingPEN = 0, missingAPAAR = 0, missingSSSM = 0;

  for (const s of students) {
    const cls = s.class || 'Unknown';
    if (!classCounts[cls]) classCounts[cls] = { total: 0, boys: 0, girls: 0 };
    classCounts[cls].total++;

    if (s.gender === 'Male') { classCounts[cls].boys++; totalBoys++; }
    else { classCounts[cls].girls++; totalGirls++; }

    if (s.status === 'Active') activeStudents++;
    else if (s.status === 'Inactive') inactiveStudents++;
    else if (s.status === 'TC Issued') tcIssuedStudents++;

    if (new Date(s.admissionDate) >= sessionStart) newAdmissions++;
    if (!s.penNumber) missingPEN++;
    if (!s.apaarId) missingAPAAR++;
    if (!s.sssmId) missingSSSM++;
  }

  return {
    totalStudents: students.length,
    totalBoys,
    totalGirls,
    activeStudents,
    inactiveStudents,
    tcIssuedStudents,
    newAdmissions,
    missingPEN,
    missingAPAAR,
    missingSSSM,
    classSummary: Object.entries(classCounts).map(([name, data]) => ({
      name,
      totalStudents: data.total,
      boys: data.boys,
      girls: data.girls,
    })),
  };
}
