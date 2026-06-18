import { Document, Paragraph, Table, TableCell, TableRow, TextRun, HeadingLevel, BorderStyle, AlignmentType, WidthType, Packer } from 'docx';
import { saveAs } from 'file-saver';
import type { Student } from '../types';

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try { return new Date(dateStr).toLocaleDateString('en-IN'); } catch { return dateStr; }
}

function makeRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 35, type: WidthType.PERCENTAGE },
        shading: { fill: 'EFF6FF' },
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 18 })] })],
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: 'BFDBFE' },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'BFDBFE' },
          left: { style: BorderStyle.SINGLE, size: 1, color: 'BFDBFE' },
          right: { style: BorderStyle.SINGLE, size: 1, color: 'BFDBFE' },
        },
      }),
      new TableCell({
        width: { size: 65, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ children: [new TextRun({ text: value || '-', size: 18 })] })],
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: 'BFDBFE' },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'BFDBFE' },
          left: { style: BorderStyle.SINGLE, size: 1, color: 'BFDBFE' },
          right: { style: BorderStyle.SINGLE, size: 1, color: 'BFDBFE' },
        },
      }),
    ],
  });
}

function makeSection(title: string, rows: [string, string][]): (Paragraph | Table)[] {
  return [
    new Paragraph({
      text: title,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120 },
      shading: { fill: '1D4ED8', type: 'clear' },
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: rows.map(([label, value]) => makeRow(label, value)),
    }),
  ];
}

export async function exportStudentProfileWord(student: Student): Promise<void> {
  const sections: (Paragraph | Table)[] = [
    new Paragraph({
      text: 'STUDENT PROFILE',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: student.studentName, bold: true, size: 32 }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Scholar No: ${student.scholarNumber} | Class: ${student.class}${student.section ? '-' + student.section : ''} | Status: ${student.status}`, size: 20 }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }),
    ...makeSection('Basic Information', [
      ['Scholar Number', student.scholarNumber],
      ['Admission Number', student.admissionNumber],
      ['Class & Section', `${student.class}${student.section ? ' - ' + student.section : ''}`],
      ['Academic Session', student.academicSession],
      ['Date of Birth', formatDate(student.dateOfBirth)],
      ['Gender', student.gender],
      ['Category', student.category || '-'],
      ['Blood Group', student.bloodGroup || '-'],
    ]),
    ...makeSection("Parent Information", [
      ["Father's Name", student.fatherName],
      ["Mother's Name", student.motherName],
      ['Parent Mobile', student.parentMobile],
      ['Alternate Mobile', student.alternateMobile || '-'],
    ]),
    ...makeSection('Government IDs', [
      ['PEN Number', student.penNumber || '-'],
      ['APAAR ID', student.apaarId || '-'],
      ['SSSM ID', student.sssmId || '-'],
    ]),
    ...makeSection('Address', [
      ['Full Address', student.fullAddress || '-'],
      ['Village/City', student.village || '-'],
      ['District', student.district || '-'],
      ['State', student.state || '-'],
      ['Pincode', student.pincode || '-'],
    ]),
    ...makeSection('School Information', [
      ['Admission Date', formatDate(student.admissionDate)],
      ['Status', student.status],
      ['Remarks', student.remarks || '-'],
    ]),
    new Paragraph({
      children: [new TextRun({ text: `Generated on: ${new Date().toLocaleDateString('en-IN')}`, italics: true, size: 16, color: '6B7280' })],
      alignment: AlignmentType.RIGHT,
      spacing: { before: 400 },
    }),
  ];

  const doc = new Document({
    sections: [{ properties: {}, children: sections }],
  });

  const buffer = await Packer.toBlob(doc);
  saveAs(buffer, `Student_${student.studentName.replace(/\s+/g, '_')}_${student.scholarNumber}.docx`);
}

export async function exportClassWord(students: Student[], className: string): Promise<void> {
  const headerRow = new TableRow({
    tableHeader: true,
    children: ['#', 'Scholar No', 'Name', 'Father Name', 'Gender', 'Mobile', 'Status'].map(text =>
      new TableCell({
        shading: { fill: '1D4ED8' },
        children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 16 })] })],
      })
    ),
  });

  const dataRows = students.map((s, i) =>
    new TableRow({
      children: [String(i + 1), s.scholarNumber, s.studentName, s.fatherName, s.gender, s.parentMobile, s.status].map(text =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: text || '-', size: 16 })] })],
        })
      ),
    })
  );

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          text: `CLASS ${className} - STUDENT LIST`,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `Total Students: ${students.length} | Generated: ${new Date().toLocaleDateString('en-IN')}`, size: 18 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [headerRow, ...dataRows],
        }),
      ],
    }],
  });

  const buffer = await Packer.toBlob(doc);
  saveAs(buffer, `Class_${className}_Students.docx`);
}
