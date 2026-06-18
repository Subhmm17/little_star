import type { Student } from '../types';

const SPREADSHEET_NAME = 'Little Star Convent School - Student Database';
const SHEET_STUDENTS = 'Students';
const SHEET_AUDIT = 'AuditLog';
const STORAGE_KEY = 'lscs_spreadsheet_id';

// ── Column headers (row 1) ──────────────────────────────────────────────────
const HEADERS = [
  'ID', 'Student Name', 'Scholar Number', 'Admission Number', 'Class',
  'Section', 'Academic Session', 'Date of Birth', 'Gender', 'Category',
  'Blood Group', "Father's Name", "Mother's Name", 'Parent Mobile',
  'Alternate Mobile', 'PEN Number', 'APAAR ID', 'SSSM ID', 'Full Address',
  'Village/City', 'District', 'State', 'Pincode', 'Admission Date',
  'Status', 'Remarks', 'Created At', 'Updated At',
];

// ── Helpers ─────────────────────────────────────────────────────────────────
function studentToRow(s: Student): string[] {
  return [
    String(s.id ?? ''), s.studentName, s.scholarNumber, s.admissionNumber ?? '',
    s.class, s.section ?? '', s.academicSession, s.dateOfBirth, s.gender,
    s.category ?? '', s.bloodGroup ?? '', s.fatherName, s.motherName ?? '',
    s.parentMobile, s.alternateMobile ?? '', s.penNumber ?? '',
    s.apaarId ?? '', s.sssmId ?? '', s.fullAddress ?? '', s.village ?? '',
    s.district ?? '', s.state ?? '', s.pincode ?? '', s.admissionDate,
    s.status, s.remarks ?? '', s.createdAt, s.updatedAt,
  ];
}

function rowToStudent(row: string[]): Student | null {
  if (!row[1] && !row[2]) return null;
  return {
    id: row[0] ? Number(row[0]) : undefined,
    studentName: row[1] ?? '',
    scholarNumber: row[2] ?? '',
    admissionNumber: row[3] ?? '',
    class: row[4] ?? '',
    section: row[5] ?? '',
    academicSession: row[6] ?? '2025-26',
    dateOfBirth: row[7] ?? '',
    gender: (row[8] as Student['gender']) ?? 'Male',
    category: (row[9] as Student['category']) || undefined,
    bloodGroup: (row[10] as Student['bloodGroup']) || undefined,
    fatherName: row[11] ?? '',
    motherName: row[12] ?? '',
    parentMobile: row[13] ?? '',
    alternateMobile: row[14] || undefined,
    penNumber: row[15] || undefined,
    apaarId: row[16] || undefined,
    sssmId: row[17] || undefined,
    fullAddress: row[18] || undefined,
    village: row[19] || undefined,
    district: row[20] || undefined,
    state: row[21] || undefined,
    pincode: row[22] || undefined,
    admissionDate: row[23] ?? '',
    status: (row[24] as Student['status']) ?? 'Active',
    remarks: row[25] || undefined,
    createdAt: row[26] ?? new Date().toISOString(),
    updatedAt: row[27] ?? new Date().toISOString(),
  };
}

async function sheetsRequest(
  token: string,
  method: string,
  url: string,
  body?: unknown
) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sheets API error ${res.status}: ${err}`);
  }
  return res.json();
}

// ── Spreadsheet management ──────────────────────────────────────────────────
export function getCachedSpreadsheetId(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export async function findSpreadsheet(token: string): Promise<string | null> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(SPREADSHEET_NAME)}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}

export async function createSpreadsheet(token: string): Promise<string> {
  const data = await sheetsRequest(
    token, 'POST',
    'https://sheets.googleapis.com/v4/spreadsheets',
    {
      properties: { title: SPREADSHEET_NAME },
      sheets: [
        { properties: { title: SHEET_STUDENTS, index: 0 } },
        { properties: { title: SHEET_AUDIT, index: 1 } },
      ],
    }
  );
  const id = data.spreadsheetId;

  // Write headers
  await sheetsRequest(
    token, 'PUT',
    `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${SHEET_STUDENTS}!A1?valueInputOption=RAW`,
    { values: [HEADERS] }
  );
  await sheetsRequest(
    token, 'PUT',
    `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${SHEET_AUDIT}!A1?valueInputOption=RAW`,
    { values: [['Timestamp', 'Action', 'Type', 'Entity', 'Details', 'Performed By']] }
  );

  // Bold + freeze headers
  await sheetsRequest(
    token, 'POST',
    `https://sheets.googleapis.com/v4/spreadsheets/${id}:batchUpdate`,
    {
      requests: [
        {
          repeatCell: {
            range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.145, green: 0.388, blue: 0.922 },
                textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)',
          },
        },
        {
          updateSheetProperties: {
            properties: { sheetId: 0, gridProperties: { frozenRowCount: 1 } },
            fields: 'gridProperties.frozenRowCount',
          },
        },
      ],
    }
  );

  localStorage.setItem(STORAGE_KEY, id);
  return id;
}

export async function getOrCreateSpreadsheet(token: string): Promise<string> {
  const cached = getCachedSpreadsheetId();
  if (cached) {
    // Verify it still exists
    try {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${cached}?fields=id,trashed`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const f = await res.json();
        if (!f.trashed) return cached;
      }
    } catch { /* fall through */ }
    localStorage.removeItem(STORAGE_KEY);
  }

  const found = await findSpreadsheet(token);
  if (found) {
    localStorage.setItem(STORAGE_KEY, found);
    return found;
  }

  return createSpreadsheet(token);
}

// ── Read ─────────────────────────────────────────────────────────────────────
export async function loadStudentsFromSheet(token: string, spreadsheetId: string): Promise<Student[]> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEET_STUDENTS}!A2:AB?majorDimension=ROWS`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  const rows: string[][] = data.values ?? [];
  return rows.map(rowToStudent).filter((s): s is Student => s !== null);
}

// ── Write (full sync) ─────────────────────────────────────────────────────────
export async function syncStudentsToSheet(
  token: string,
  spreadsheetId: string,
  students: Student[]
): Promise<void> {
  // Clear existing data rows first
  await sheetsRequest(
    token, 'POST',
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEET_STUDENTS}!A2:AB:clear`,
    {}
  );

  if (students.length === 0) return;

  // Write all rows
  await sheetsRequest(
    token, 'PUT',
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEET_STUDENTS}!A2?valueInputOption=RAW`,
    { values: students.map(studentToRow) }
  );
}

// ── Audit log ────────────────────────────────────────────────────────────────
export async function appendAuditToSheet(
  token: string,
  spreadsheetId: string,
  action: string,
  entityType: string,
  entityName: string,
  details: string
): Promise<void> {
  const row = [new Date().toLocaleString('en-IN'), action, entityType, entityName, details, 'School Staff'];
  await sheetsRequest(
    token, 'POST',
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEET_AUDIT}!A:F:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { values: [row] }
  );
}
