import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { Student } from '../types';

function studentToRow(s: Student, index: number) {
  return {
    '#': index + 1,
    'Scholar Number': s.scholarNumber,
    'Admission Number': s.admissionNumber,
    'Student Name': s.studentName,
    'Class': s.class,
    'Section': s.section,
    'Session': s.academicSession,
    'Date of Birth': s.dateOfBirth,
    'Gender': s.gender,
    'Category': s.category || '',
    'Blood Group': s.bloodGroup || '',
    "Father's Name": s.fatherName,
    "Mother's Name": s.motherName,
    'Parent Mobile': s.parentMobile,
    'Alternate Mobile': s.alternateMobile || '',
    'PEN Number': s.penNumber || '',
    'APAAR ID': s.apaarId || '',
    'SSSM ID': s.sssmId || '',
    'Full Address': s.fullAddress || '',
    'Village/City': s.village || '',
    'District': s.district || '',
    'State': s.state || '',
    'Pincode': s.pincode || '',
    'Admission Date': s.admissionDate,
    'Status': s.status,
    'Remarks': s.remarks || '',
  };
}

export function exportClassExcel(students: Student[], className: string): void {
  const rows = students.map(studentToRow);
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Class ${className}`);
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([buf], { type: 'application/octet-stream' }), `Class_${className}_Students.xlsx`);
}

export function exportAllStudentsExcel(students: Student[]): void {
  const wb = XLSX.utils.book_new();

  // All students sheet
  const allRows = students.map(studentToRow);
  const wsAll = XLSX.utils.json_to_sheet(allRows);
  XLSX.utils.book_append_sheet(wb, wsAll, 'All Students');

  // Per-class sheets
  const byClass: Record<string, Student[]> = {};
  for (const s of students) {
    const cls = s.class || 'Unknown';
    if (!byClass[cls]) byClass[cls] = [];
    byClass[cls].push(s);
  }
  for (const [cls, clsStudents] of Object.entries(byClass)) {
    const rows = clsStudents.map(studentToRow);
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, `Class ${cls}`.slice(0, 31));
  }

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([buf], { type: 'application/octet-stream' }), `School_Database_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportAllStudentsCSV(students: Student[]): void {
  const rows = students.map(studentToRow);
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `School_Database_${new Date().toISOString().split('T')[0]}.csv`);
}

// ── UDISE Government Portal Import ───────────────────────────────────────────
const UDISE_CLASS_MAP: Record<string, string> = {
  'PP-3': 'Pre-Primary', 'PP-2': 'Nursery', 'PP-1': 'KG',
  'I': '1', 'II': '2', 'III': '3', 'IV': '4', 'V': '5',
  'VI': '6', 'VII': '7', 'VIII': '8', 'IX': '9', 'X': '10',
  'XI': '11', 'XII': '12',
};

function parseUDISECategory(cat: string): Student['category'] | undefined {
  if (!cat || cat === 'NA') return undefined;
  if (cat.includes('GENERAL')) return 'General';
  if (cat.includes('OBC')) return 'OBC';
  if (cat.includes('-SC')) return 'SC';
  if (cat.includes('-ST')) return 'ST';
  return 'General';
}

export async function importFromUDISE(file: File): Promise<Partial<Student>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as string[][];

        // Find the header row — the one that contains "Name" and "Class"
        let headerIdx = -1;
        for (let i = 0; i < rawRows.length; i++) {
          const row = rawRows[i].map(c => String(c).trim());
          if (row.includes('Name') && row.includes('Class')) { headerIdx = i; break; }
        }
        if (headerIdx === -1) { reject(new Error('Header row not found')); return; }

        const headers = rawRows[headerIdx].map(c => String(c).trim());
        const get = (row: string[], col: string) => {
          const idx = headers.indexOf(col);
          return idx >= 0 ? String(row[idx] || '').trim() : '';
        };

        const today = new Date().toISOString().split('T')[0];
        const students: Partial<Student>[] = [];

        for (const rawRow of rawRows.slice(headerIdx + 1)) {
          const row = rawRow.map(c => String(c));
          const name = get(row, 'Name');
          if (!name || name === 'Name') continue;

          const rawClass = get(row, 'Class');
          const sssmRaw = get(row, 'Student State Code');

          students.push({
            studentName: name,
            scholarNumber: get(row, 'Student PEN'),
            admissionNumber: '',
            class: UDISE_CLASS_MAP[rawClass] ?? rawClass,
            section: get(row, 'Section'),
            academicSession: '2025-26',
            dateOfBirth: '',
            gender: (get(row, 'Gender') as Student['gender']) || 'Male',
            category: parseUDISECategory(get(row, 'Social Category')),
            fatherName: get(row, 'Father Name'),
            motherName: get(row, 'Mother Name'),
            parentMobile: '',
            penNumber: get(row, 'Student PEN'),
            sssmId: sssmRaw !== 'NA' ? sssmRaw : '',
            apaarId: '',
            admissionDate: today,
            status: 'Active',
          });
        }
        resolve(students);
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
}

export async function importFromExcel(file: File): Promise<Partial<Student>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws) as Record<string, string>[];

        const students: Partial<Student>[] = rows.map((row) => ({
          studentName: row['Student Name'] || row['studentName'] || '',
          scholarNumber: row['Scholar Number'] || row['scholarNumber'] || '',
          admissionNumber: row['Admission Number'] || row['admissionNumber'] || '',
          class: row['Class'] || row['class'] || '',
          section: row['Section'] || row['section'] || '',
          academicSession: row['Session'] || row['academicSession'] || '2025-26',
          dateOfBirth: row['Date of Birth'] || row['dateOfBirth'] || '',
          gender: (row['Gender'] || row['gender'] || 'Male') as Student['gender'],
          category: row['Category'] as Student['category'],
          bloodGroup: row['Blood Group'] as Student['bloodGroup'],
          fatherName: row["Father's Name"] || row['fatherName'] || '',
          motherName: row["Mother's Name"] || row['motherName'] || '',
          parentMobile: row['Parent Mobile'] || row['parentMobile'] || '',
          alternateMobile: row['Alternate Mobile'] || row['alternateMobile'] || '',
          penNumber: row['PEN Number'] || row['penNumber'] || '',
          apaarId: row['APAAR ID'] || row['apaarId'] || '',
          sssmId: row['SSSM ID'] || row['sssmId'] || '',
          fullAddress: row['Full Address'] || row['fullAddress'] || '',
          village: row['Village/City'] || row['village'] || '',
          district: row['District'] || row['district'] || '',
          state: row['State'] || row['state'] || '',
          pincode: row['Pincode'] || row['pincode'] || '',
          admissionDate: row['Admission Date'] || row['admissionDate'] || new Date().toISOString().split('T')[0],
          status: (row['Status'] || row['status'] || 'Active') as Student['status'],
          remarks: row['Remarks'] || row['remarks'] || '',
        }));

        resolve(students);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
}
