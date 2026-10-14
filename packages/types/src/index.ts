export type UserRole =
  | 'SUPER_ADMIN'
  | 'SCHOOL_ADMIN'
  | 'PRINCIPAL'
  | 'HOD'
  | 'TEACHER'
  | 'STUDENT'
  | 'PARENT'
  | 'ACCOUNTANT'
  | 'HR'
  | 'LIBRARIAN'
  | 'TRANSPORT'
  | 'HOSTEL'
  | 'HEALTH'
  | 'SECURITY';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  schoolId?: string;
  avatarUrl?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Student {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  classId: string;
  sectionId?: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  parentId?: string;
  rollNumber?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'TRANSFERRED' | 'GRADUATED';
}

export interface Teacher {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  departmentId: string;
  qualification: string;
  specialization: string;
  joiningDate: string;
  status: 'ACTIVE' | 'RESIGNED' | 'ON_LEAVE';
}

export interface Parent {
  id: string;
  name: string;
  email: string;
  phone: string;
  relationship: 'FATHER' | 'MOTHER' | 'GUARDIAN';
  students?: Student[];
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  classId: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'HALF_DAY';
  remarks?: string;
}

export interface Exam {
  id: string;
  name: string;
  term: string;
  academicYear: string;
  startDate: string;
  endDate: string;
}

export interface Grade {
  id: string;
  studentId: string;
  examId: string;
  subjectId: string;
  score: number;
  maxScore: number;
  percentage: number;
  letterGrade: string;
  remarks?: string;
}

export interface FeeInvoice {
  id: string;
  invoiceNumber: string;
  studentId: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  dueDate: string;
  status: 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERDUE';
}

export interface TimetableSlot {
  id: string;
  classId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subjectId: string;
  teacherId: string;
  roomNumber?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}
