import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Student } from '../types';

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN');
  } catch {
    return dateStr;
  }
}

export function exportStudentProfilePDF(student: Student): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('STUDENT PROFILE', pageWidth / 2, 18, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, pageWidth / 2, 30, { align: 'center' });

  // Photo placeholder
  let yOffset = 50;
  if (student.photo) {
    try {
      doc.addImage(student.photo, 'JPEG', 14, yOffset, 35, 40);
    } catch {
      doc.setDrawColor(200);
      doc.rect(14, yOffset, 35, 40);
      doc.setTextColor(150);
      doc.setFontSize(8);
      doc.text('Photo', 31, yOffset + 22, { align: 'center' });
    }
  }

  // Student name
  doc.setTextColor(37, 99, 235);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(student.studentName, 60, yOffset + 10);

  doc.setTextColor(80, 80, 80);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Scholar No: ${student.scholarNumber}`, 60, yOffset + 20);
  doc.text(`Class: ${student.class} ${student.section ? '- ' + student.section : ''}`, 60, yOffset + 28);
  doc.text(`Status: ${student.status}`, 60, yOffset + 36);

  yOffset += 55;

  // Sections
  const sections = [
    {
      title: 'Basic Information',
      rows: [
        ['Admission Number', student.admissionNumber || '-'],
        ['Academic Session', student.academicSession || '-'],
        ['Date of Birth', formatDate(student.dateOfBirth)],
        ['Gender', student.gender || '-'],
        ['Category', student.category || '-'],
        ['Blood Group', student.bloodGroup || '-'],
      ],
    },
    {
      title: 'Parent Information',
      rows: [
        ["Father's Name", student.fatherName || '-'],
        ["Mother's Name", student.motherName || '-'],
        ['Parent Mobile', student.parentMobile || '-'],
        ['Alternate Mobile', student.alternateMobile || '-'],
      ],
    },
    {
      title: 'Government IDs',
      rows: [
        ['PEN Number', student.penNumber || '-'],
        ['APAAR ID', student.apaarId || '-'],
        ['SSSM ID', student.sssmId || '-'],
      ],
    },
    {
      title: 'Address',
      rows: [
        ['Full Address', student.fullAddress || '-'],
        ['Village/City', student.village || '-'],
        ['District', student.district || '-'],
        ['State', student.state || '-'],
        ['Pincode', student.pincode || '-'],
      ],
    },
    {
      title: 'School Information',
      rows: [
        ['Admission Date', formatDate(student.admissionDate)],
        ['Status', student.status || '-'],
        ['Remarks', student.remarks || '-'],
      ],
    },
  ];

  for (const section of sections) {
    doc.setFillColor(37, 99, 235);
    doc.rect(14, yOffset, pageWidth - 28, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(section.title, 18, yOffset + 5.5);
    yOffset += 10;

    autoTable(doc, {
      startY: yOffset,
      body: section.rows,
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
      margin: { left: 14, right: 14 },
    });

    yOffset = (doc as any).lastAutoTable.finalY + 8;

    if (yOffset > 260) {
      doc.addPage();
      yOffset = 15;
    }
  }

  doc.save(`Student_${student.studentName.replace(/\s+/g, '_')}_${student.scholarNumber}.pdf`);
}

export function exportClassPDF(students: Student[], className: string): void {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`CLASS ${className} - STUDENT LIST`, pageWidth / 2, 13, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Students: ${students.length} | Generated: ${new Date().toLocaleDateString('en-IN')}`, pageWidth / 2, 23, { align: 'center' });

  autoTable(doc, {
    startY: 35,
    head: [['#', 'Scholar No', 'Name', 'Father Name', 'Gender', 'Mobile', 'PEN No', 'APAAR ID', 'SSSM ID', 'Status']],
    body: students.map((s, i) => [
      i + 1,
      s.scholarNumber,
      s.studentName,
      s.fatherName,
      s.gender,
      s.parentMobile,
      s.penNumber || '-',
      s.apaarId || '-',
      s.sssmId || '-',
      s.status,
    ]),
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235] },
  });

  doc.save(`Class_${className}_Students.pdf`);
}

export function exportAllStudentsPDF(students: Student[]): void {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SCHOOL STUDENT DATABASE', pageWidth / 2, 13, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Students: ${students.length} | Generated: ${new Date().toLocaleDateString('en-IN')}`, pageWidth / 2, 23, { align: 'center' });

  // Group by class
  const byClass: Record<string, Student[]> = {};
  for (const s of students) {
    const cls = s.class || 'Unknown';
    if (!byClass[cls]) byClass[cls] = [];
    byClass[cls].push(s);
  }

  let first = true;
  for (const [cls, clsStudents] of Object.entries(byClass)) {
    if (!first) doc.addPage();
    first = false;

    doc.setFontSize(12);
    doc.setTextColor(37, 99, 235);
    doc.setFont('helvetica', 'bold');
    doc.text(`Class ${cls} (${clsStudents.length} students)`, 14, 40);

    autoTable(doc, {
      startY: 45,
      head: [['#', 'Scholar No', 'Name', 'Father Name', 'Gender', 'Mobile', 'PEN No', 'Status']],
      body: clsStudents.map((s, i) => [
        i + 1, s.scholarNumber, s.studentName, s.fatherName, s.gender, s.parentMobile, s.penNumber || '-', s.status,
      ]),
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [37, 99, 235] },
    });
  }

  doc.save(`School_Database_${new Date().toISOString().split('T')[0]}.pdf`);
}
