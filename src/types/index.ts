export type Gender = 'Male' | 'Female' | 'Other';
export type StudentStatus = 'Active' | 'Inactive' | 'TC Issued';
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-';
export type Category = 'General' | 'OBC' | 'SC' | 'ST' | 'EWS' | 'Other';

export interface Student {
  id?: number;
  // Basic Information
  studentName: string;
  scholarNumber: string;
  admissionNumber: string;
  class: string;
  section: string;
  academicSession: string;
  // Personal Information
  dateOfBirth: string;
  gender: Gender;
  category?: Category;
  bloodGroup?: BloodGroup;
  // Parent Information
  fatherName: string;
  motherName: string;
  parentMobile: string;
  alternateMobile?: string;
  // Government IDs
  penNumber?: string;
  apaarId?: string;
  sssmId?: string;
  studentAadhaar?: string;
  fatherAadhaar?: string;
  motherAadhaar?: string;
  // Bank Details
  bankAccountNumber?: string;
  bankIfscCode?: string;
  bankName?: string;
  // Address
  fullAddress?: string;
  village?: string;
  district?: string;
  state?: string;
  pincode?: string;
  // School Info
  admissionDate: string;
  status: StudentStatus;
  remarks?: string;
  // Photo
  photo?: string; // base64
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface AuditLog {
  id?: number;
  action: 'Added' | 'Updated' | 'Deleted' | 'Downloaded' | 'Imported' | 'Viewed';
  entityType: 'Student' | 'Class' | 'Report' | 'Database';
  entityId?: string;
  entityName?: string;
  details?: string;
  changes?: string;
  performedBy: string;
  timestamp: string;
}

export interface ClassInfo {
  name: string;
  totalStudents: number;
  boys: number;
  girls: number;
}

export interface DashboardStats {
  totalStudents: number;
  totalBoys: number;
  totalGirls: number;
  activeStudents: number;
  inactiveStudents: number;
  tcIssuedStudents: number;
  newAdmissions: number;
  missingPEN: number;
  missingAPAAR: number;
  missingSSSM: number;
  classSummary: ClassInfo[];
}

export interface FilterOptions {
  class?: string;
  section?: string;
  gender?: Gender | '';
  status?: StudentStatus | '';
  admissionYear?: string;
  missingPEN?: boolean;
  missingAPAAR?: boolean;
  missingSSSM?: boolean;
  searchQuery?: string;
}

export const CLASSES = [
  'Pre-Primary', 'Nursery', 'KG',
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'
];

export const SECTIONS = ['A', 'B', 'C', 'D', 'E'];

export const CURRENT_SESSION = '2025-26';

export const SESSIONS = [
  '2023-24', '2024-25', '2025-26', '2026-27'
];

export const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli',
  'Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];
