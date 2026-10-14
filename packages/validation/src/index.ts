import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  schoolId: z.string().optional(),
});

export const StudentCreateSchema = z.object({
  admissionNumber: z.string().min(1, 'Admission number is required'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(1, 'Last name is required'),
  classId: z.string().uuid('Invalid class ID'),
  sectionId: z.string().uuid('Invalid section ID').optional(),
  dateOfBirth: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  parentId: z.string().uuid().optional(),
  bloodGroup: z.string().optional(),
  emergencyContact: z.string().optional(),
});

export const MarkAttendanceSchema = z.object({
  classId: z.string().uuid(),
  date: z.string(),
  records: z.array(
    z.object({
      studentId: z.string().uuid(),
      status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'HALF_DAY']),
      remarks: z.string().optional(),
    })
  ),
});

export const FeePaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.number().positive(),
  paymentMethod: z.enum(['CASH', 'CARD', 'ONLINE', 'UPI', 'CHEQUE', 'BANK_TRANSFER']),
  transactionRef: z.string().optional(),
});
