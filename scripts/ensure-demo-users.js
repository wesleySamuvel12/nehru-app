const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const mainSchool = await prisma.school.findFirst({ where: { code: 'NIS-MAIN' } }) || await prisma.school.findFirst();
  if (!mainSchool) {
    console.error('No school found');
    return;
  }
  const passwordHash = await bcrypt.hash('demo1234', 10);

  const demoAccounts = [
    { email: 'admin@nis.edu.in', name: 'Arvind Khanna', role: 'SUPER_ADMIN' },
    { email: 'schooladmin@nis.edu.in', name: 'Sunita Desai', role: 'SCHOOL_ADMIN' },
    { email: 'principal@nis.edu.in', name: 'Rajesh Malhotra', role: 'PRINCIPAL' },
    { email: 'coordinator@nis.edu.in', name: 'Kavita Iyer', role: 'ACADEMIC_COORDINATOR' },
    { email: 'hod@nis.edu.in', name: 'Dr. Suresh Menon', role: 'HOD' },
    { email: 'headmistress@nis.edu.in', name: 'Meenakshi Sundaram', role: 'HEADMISTRESS' },
    { email: 'ceo@nis.edu.in', name: 'Dr. P. Krishnakumar', role: 'CEO_SECRETARY' },
    { email: 'correspondent@nis.edu.in', name: 'Adv. S. Radhakrishnan', role: 'CORRESPONDENT' },
    { email: 'adminexec@nis.edu.in', name: 'R. Balasubramanian', role: 'ADMIN_EXECUTIVE' },
    { email: 'admission@nis.edu.in', name: 'Deepa Kamath', role: 'ADMISSION_ADMIN' },
    { email: 'teacher@nis.edu.in', name: 'Priya Nair', role: 'TEACHER' },
    { email: 'teacher2@nis.edu.in', name: 'Amit Verma', role: 'TEACHER' },
    { email: 'accounts@nis.edu.in', name: 'Vikram Rao', role: 'ACCOUNTANT' },
    { email: 'hr@nis.edu.in', name: 'Lata Mishra', role: 'HR' },
    { email: 'counsellor@nis.edu.in', name: 'Ananya Sen', role: 'COUNSELLOR' },
    { email: 'librarian@nis.edu.in', name: 'Mahesh Tiwari', role: 'LIBRARIAN' },
    { email: 'transport@nis.edu.in', name: 'Imran Sheikh', role: 'TRANSPORT' },
    { email: 'warden@nis.edu.in', name: 'Geeta Singh', role: 'WARDEN' },
    { email: 'nurse@nis.edu.in', name: 'Anita Bose', role: 'NURSE' },
    { email: 'security@nis.edu.in', name: 'Ravi Naik', role: 'SECURITY' },
    { email: 'parent@nis.edu.in', name: 'Rohan Gupta', role: 'PARENT' },
    { email: 'student@nis.edu.in', name: 'Diya Gupta', role: 'STUDENT' },
  ];

  for (const acct of demoAccounts) {
    const existing = await prisma.user.findUnique({ where: { email: acct.email } });
    if (!existing) {
      await prisma.user.create({
        data: {
          schoolId: mainSchool.id,
          email: acct.email,
          name: acct.name,
          role: acct.role,
          passwordHash,
          status: 'ACTIVE',
          failedAttempts: 0,
        }
      });
      console.log(`Created demo user: ${acct.email} (${acct.role})`);
    } else {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          status: 'ACTIVE',
          failedAttempts: 0,
          lockedUntil: null,
          role: acct.role,
        }
      });
      console.log(`Refreshed demo user: ${acct.email} (${acct.role})`);
    }
  }

  console.log('All demo users successfully configured.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
