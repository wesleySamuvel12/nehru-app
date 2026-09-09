/**
 * School ERP — Demo data seeder.
 * Realistic Indian school data (Greenwood International School, Mumbai).
 * Run: bun prisma/seed.ts
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

/* deterministic PRNG */
let seedState = 42
function rnd(): number {
  seedState = (seedState * 1103515245 + 12345) % 2147483648
  return seedState / 2147483648
}
const pick = <T>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)]
const int = (min: number, max: number) => Math.floor(min + rnd() * (max - min + 1))
const chance = (p: number) => rnd() < p
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d }
const daysAhead = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d }
const iso = (d: Date) => d.toISOString().slice(0, 10)

const FIRST_M = ['Aarav','Vivaan','Advik','Kabir','Anaya','Reyansh','Arjun','Ishaan','Rohan','Dhruv','Karthik','Aditya','Sai','Vihaan','Ranvir','Aryan','Dev','Nikhil','Rahul','Sameer','Farhan','Kunal','Pranav','Siddharth','Tanmay','Uday','Varun','Yash','Manav','Laksh']
const FIRST_F = ['Ananya','Diya','Aadhya','Myra','Saanvi','Ira','Pihu','Anika','Navya','Kiara','Riya','Sneha','Priya','Meera','Kavya','Isha','Tara','Nisha','Divya','Pooja','Shreya','Aarti','Rhea','Zoya','Nandini','Simran','Trisha','Charvi','Mahi','Avni']
const LAST = ['Sharma','Verma','Patel','Iyer','Reddy','Nair','Khan','Gupta','Mehta','Joshi','Rao','Malhotra','Kapoor','Desai','Menon','Bose','Chatterjee','Singh','Kulkarni','Pillai','Bhat','Shetty','Naik','Jain','Agarwal','Mishra','Tiwari','Chauhan','Pandey','Saxena']
const OCCUPATIONS = ['Software Engineer','Doctor','Chartered Accountant','Business Owner','Bank Manager','Professor','Architect','Consultant','Government Officer','Engineer']
const BOOK_CATS = ['Fiction','Science','Mathematics','History','Biography','Reference','Computer Science','Literature','Sports','Environment']
const BOOKS: [string, string][] = [
  ['Wings of Fire','A.P.J. Abdul Kalam'],['The Discovery of India','Jawaharlal Nehru'],['Malgudi Days','R.K. Narayan'],
  ['A Brief History of Time','Stephen Hawking'],['The God of Small Things','Arundhati Roy'],['Train to Pakistan','Khushwant Singh'],
  ['Gitanjali','Rabindranath Tagore'],['The White Tiger','Aravind Adiga'],['Midnight\u2019s Children','Salman Rushdie'],
  ['Ignited Minds','A.P.J. Abdul Kalam'],['The Elephant Vanishes','Haruki Murakami'],['Sapiens','Yuval Noah Harari'],
  ['Concepts of Physics','H.C. Verma'],['Objective Mathematics','R.D. Sharma'],['Organic Chemistry','Morrison & Boyd'],
  ['Fundamentals of Physics','Halliday & Resnick'],['Indian Constitution at Work','NCERT'],['The Story of My Life','Helen Keller'],
  ['Harry Potter and the Philosopher\u2019s Stone','J.K. Rowling'],['The Jungle Book','Rudyard Kipling'],['Charlotte\u2019s Web','E.B. White'],
  ['Matilda','Roald Dahl'],['The Diary of a Young Girl','Anne Frank'],['To Kill a Mockingbird','Harper Lee'],
  ['Atomic Habits','James Clear'],['The Alchemist','Paulo Coelho'],['Ikigai','Hector Garcia'],['Deep Work','Cal Newport'],
]
const ASSET_NAMES: [string, string, number][] = [
  ['Smart Board 75" Samsung', 'SMART_BOARD', 185000], ['Projector Epson EB-X06', 'CLASSROOM', 42000],
  ['Dell OptiPlex Desktop', 'IT', 52000], ['MacBook Air M2', 'DEVICE', 99000],
  ['Chromebook C340', 'DEVICE', 26000], ['Microscope Compound Olympus', 'LAB', 35000],
  ['Lab Centrifuge', 'LAB', 48000], ['Basketball Set (Indoor)', 'SPORTS', 15000],
  ['Table Tennis Table', 'SPORTS', 32000], ['Student Desk & Chair Set', 'FURNITURE', 4800],
  ['Whiteboard 6x4', 'CLASSROOM', 6500], ['Wi-Fi Access Point Ubiquiti', 'IT', 11500],
  ['Laser Printer HP M428', 'IT', 34000], ['Server Rack Dell R450', 'IT', 210000],
  ['Gym Dumbbell Set', 'SPORTS', 22000], ['Yoga Mat Bundle (20)', 'SPORTS', 12000],
  ['Chemistry Lab Cabinet', 'FURNITURE', 68000], ['Fire Extinguisher (10kg)', 'CLASSROOM', 4500],
  ['CCTV Dome Camera', 'IT', 8500], ['PA Speaker System', 'CLASSROOM', 27000],
]
const EVENT_TITLES: [string, string, string][] = [
  ['Annual Sports Day', 'SPORTS', 'Main Ground'], ['Parent–Teacher Meeting (Term 1)', 'MEETING', 'Auditorium'],
  ['Independence Day Celebration', 'EVENT', 'Main Quadrangle'], ['Science Exhibition — Innovate 2025', 'EVENT', 'Science Block'],
  ['Annual Day — Rangotsav', 'ANNUAL_DAY', 'School Auditorium'], ['Winter Break', 'HOLIDAY', '—'],
  ['Field Trip — Nehru Planetarium', 'TRIP', 'Worli'], ['Inter-House Debate Finals', 'EVENT', 'Library Hall'],
  ['Diwali Break', 'HOLIDAY', '—'], ['Term 2 Examinations', 'EXAM', 'Exam Halls'],
  ['Art & Craft Mela', 'EVENT', 'Courtyard'], ['Career Counselling Workshop', 'EVENT', 'AV Room'],
  ['Republic Day Parade', 'EVENT', 'Main Ground'], ['Sports Trials — Football', 'SPORTS', 'Football Field'],
  ['Gandhi Jayanti', 'HOLIDAY', '—'],
]

async function main() {
  console.log('Resetting database…')
  await db.$transaction([
    db.auditLog.deleteMany(), db.loginLog.deleteMany(), db.notification.deleteMany(),
    db.notificationTemplate.deleteMany(), db.approvalTask.deleteMany(), db.approvalWorkflow.deleteMany(),
    db.integrationSetting.deleteMany(), db.schoolSetting.deleteMany(), db.school.deleteMany(),
    db.term.deleteMany(), db.academicYear.deleteMany(),
    db.eventRegistration.deleteMany(), db.event.deleteMany(),
    db.certificate.deleteMany(), db.certificateRequest.deleteMany(),
    db.announcement.deleteMany(), db.message.deleteMany(), db.complaint.deleteMany(),
    db.pickupLog.deleteMany(), db.securityAlert.deleteMany(), db.visitor.deleteMany(),
    db.hostelAllocation.deleteMany(), db.bed.deleteMany(), db.room.deleteMany(), db.hostel.deleteMany(),
    db.transportAllocation.deleteMany(), db.stop.deleteMany(), db.route.deleteMany(), db.vehicle.deleteMany(),
    db.assetTransfer.deleteMany(), db.asset.deleteMany(),
    db.bookReservation.deleteMany(), db.libraryTransaction.deleteMany(), db.book.deleteMany(),
    db.vaccination.deleteMany(), db.clinicVisit.deleteMany(), db.healthRecord.deleteMany(),
    db.payslip.deleteMany(), db.payrollRun.deleteMany(), db.performanceReview.deleteMany(),
    db.discount.deleteMany(), db.budget.deleteMany(), db.expense.deleteMany(),
    db.payment.deleteMany(), db.feeInvoice.deleteMany(), db.feeStructure.deleteMany(),
    db.reportCard.deleteMany(), db.mark.deleteMany(), db.question.deleteMany(),
    db.examSchedule.deleteMany(), db.exam.deleteMany(), db.gradeConfig.deleteMany(),
    db.submission.deleteMany(), db.assignment.deleteMany(), db.learningMaterial.deleteMany(),
    db.lessonPlan.deleteMany(), db.leaveRequest.deleteMany(), db.employeeAttendance.deleteMany(),
    db.attendance.deleteMany(), db.enrollment.deleteMany(), db.timetableSlot.deleteMany(),
    db.subject.deleteMany(), db.section.deleteMany(), db.house.deleteMany(), db.class.deleteMany(),
    db.department.deleteMany(), db.leadFollowUp.deleteMany(), db.campaign.deleteMany(),
    db.lead.deleteMany(), db.application.deleteMany(),
    db.permission.deleteMany(), db.user.deleteMany(), db.student.deleteMany(), db.parent.deleteMany(),
    db.employee.deleteMany(),
  ])

  const passwordHash = await bcrypt.hash('demo1234', 10)
  const yearStart = new Date(new Date().getFullYear() - (new Date().getMonth() >= 3 ? 0 : 1), 3, 1) // Apr 1
  const yearEnd = new Date(yearStart.getFullYear() + 1, 2, 31)

  console.log('Academic year, school, departments…')
  const ay = await db.academicYear.create({ data: { name: `${yearStart.getFullYear()}-${String(yearStart.getFullYear() + 1).slice(2)}`, startDate: yearStart, endDate: yearEnd, isCurrent: true } })
  const terms = await Promise.all([
    db.term.create({ data: { academicYearId: ay.id, name: 'Term 1', startDate: yearStart, endDate: new Date(yearStart.getFullYear(), 8, 30), isCurrent: false } }),
    db.term.create({ data: { academicYearId: ay.id, name: 'Term 2', startDate: new Date(yearStart.getFullYear(), 9, 1), endDate: new Date(yearStart.getFullYear() + 1, 2, 31), isCurrent: true } }),
  ])

  await db.school.create({ data: { name: 'Greenwood International School', code: 'GRW-MAIN', address: '18 Hill Road, Bandra West, Mumbai 400050', phone: '+91 22 2640 1200', email: 'office@greenwood.edu.in', isMaster: true } })
  await db.school.create({ data: { name: 'Greenwood International — Pune Campus', code: 'GRW-PUNE', address: 'Baner Road, Pune 411045', phone: '+91 20 2712 3300', email: 'pune@greenwood.edu.in' } })
  await db.schoolSetting.create({ data: { schoolName: 'Greenwood International School', address: '18 Hill Road, Bandra West, Mumbai 400050', phone: '+91 22 2640 1200', email: 'office@greenwood.edu.in', currentYearId: ay.id } })

  const departments = await Promise.all([
    db.department.create({ data: { name: 'Academics', headName: 'Rajesh Malhotra' } }),
    db.department.create({ data: { name: 'Administration', headName: 'Sunita Desai' } }),
    db.department.create({ data: { name: 'Finance', headName: 'Vikram Rao' } }),
    db.department.create({ data: { name: 'Sports', headName: 'Deepak Shetty' } }),
    db.department.create({ data: { name: 'Transport', headName: 'Imran Khan' } }),
  ])

  const houses = await Promise.all(['Ruby', 'Emerald', 'Sapphire', 'Topaz'].map((name, i) =>
    db.house.create({ data: { name, color: ['rose', 'emerald', 'sky', 'amber'][i] } })))

  /* ── Employees ── */
  console.log('Employees…')
  const empData = [
    ['Rajesh', 'Malhotra', 'PRINCIPAL', 'Principal', false], ['Sunita', 'Desai', 'VICE_PRINCIPAL', 'Vice Principal', false],
    ['Priya', 'Nair', 'TEACHER', 'Senior Teacher — English', true], ['Amit', 'Verma', 'TEACHER', 'Senior Teacher — Mathematics', true],
    ['Kavita', 'Iyer', 'TEACHER', 'Senior Teacher — Science', true], ['Suresh', 'Kulkarni', 'TEACHER', 'Teacher — Social Studies', true],
    ['Meera', 'Joshi', 'TEACHER', 'Teacher — Hindi', true], ['Rahul', 'Kapoor', 'TEACHER', 'Teacher — Physics', true],
    ['Divya', 'Rao', 'TEACHER', 'Teacher — Chemistry', true], ['Arjun', 'Menon', 'TEACHER', 'Teacher — Biology', true],
    ['Neha', 'Saxena', 'TEACHER', 'Teacher — Computer Science', true], ['Vikram', 'Shetty', 'TEACHER', 'Teacher — Physical Education', true],
    ['Pooja', 'Bhat', 'TEACHER', 'Teacher — Mathematics', true], ['Sameer', 'Khan', 'TEACHER', 'Teacher — History & Civics', true],
    ['Ritu', 'Pandey', 'TEACHER', 'Teacher — Geography', true], ['Manish', 'Chauhan', 'TEACHER', 'Teacher — English', true],
    ['Shalini', 'Pillai', 'TEACHER', 'Teacher — Primary (All Subjects)', true], ['Farhan', 'Ali', 'TEACHER', 'Teacher — Marathi', true],
    ['Anita', 'Bose', 'NURSE', 'School Nurse', false], ['Dr. Sanjay', 'Gupta', 'DOCTOR', 'School Doctor', false],
    ['Vikram', 'Rao', 'ACCOUNTANT', 'Head Accountant', false], ['Swati', 'Agarwal', 'ACCOUNTANT', 'Accounts Executive', false],
    ['Imran', 'Sheikh', 'TRANSPORT', 'Transport Manager', false], ['Mahesh', 'Tiwari', 'LIBRARIAN', 'Head Librarian', false],
    ['Ravi', 'Naik', 'SECURITY', 'Head of Security', false], ['Lata', 'Mishra', 'HR', 'HR Manager', false],
    ['Geeta', 'Singh', 'WARDEN', 'Girls Hostel Warden', false], ['Ramesh', 'Yadav', 'WARDEN', 'Boys Hostel Warden', false],
    ['Deepa', 'Kamath', 'COUNSELLOR', 'Admissions Head Counsellor', false], ['Nitin', 'Jain', 'COUNSELLOR', 'Admission Counsellor', false],
  ]
  const employees: { id: string; name: string; isTeacher: boolean; designation: string }[] = []
  for (let i = 0; i < empData.length; i++) {
    const [first, last, , designation, isTeacher] = empData[i]
    const emp = await db.employee.create({
      data: {
        employeeNo: `EMP${String(i + 1).padStart(4, '0')}`, firstName: first, lastName: last,
        gender: ['Priya','Kavita','Meera','Divya','Neha','Pooja','Ritu','Shalini','Anita','Swati','Lata','Geeta','Deepa'].includes(first) ? 'FEMALE' : 'MALE',
        dob: new Date(1975 + int(0, 20), int(0, 11), int(1, 28)),
        email: `${first.toLowerCase().replace(/\W/g, '')}.${last.toLowerCase()}@greenwood.edu.in`,
        phone: `+9198${String(int(10000000, 99999999))}`,
        designation, departmentId: departments[i % departments.length].id,
        isTeacher: !!isTeacher, qualification: isTeacher ? pick(['M.Ed', 'B.Ed, M.Sc', 'M.A, B.Ed', 'Ph.D', 'M.Com, B.Ed']) : pick(['MBA', 'M.Com', 'B.Sc', 'GNM', 'MBBS']),
        specialization: isTeacher ? designation.split('—')[1]?.trim() : undefined,
        joiningDate: new Date(2010 + int(0, 14), int(0, 11), int(1, 28)),
        salary: designation.includes('Principal') ? 145000 : designation.includes('Senior') ? 78000 : isTeacher ? 58000 : 48000,
        bankAccount: `XXXX${int(1000, 9999)}`, status: 'ACTIVE',
        address: pick(['Bandra West, Mumbai', 'Andheri East, Mumbai', 'Powai, Mumbai', 'Khar West, Mumbai', 'Juhu, Mumbai']),
        licenseExpiry: designation.includes('Transport') ? daysAhead(int(60, 500)) : undefined,
      },
    })
    employees.push({ id: emp.id, name: `${emp.firstName} ${emp.lastName}`, isTeacher: !!isTeacher, designation })
  }
  const teachers = employees.filter(e => e.isTeacher)

  /* ── Users ── */
  console.log('Users…')
  const roleUsers: [string, string, string, string][] = [
    ['admin@greenwood.edu.in', 'Arvind Khanna', 'SUPER_ADMIN'],
    ['schooladmin@greenwood.edu.in', 'Sunita Desai', 'SCHOOL_ADMIN'],
    ['principal@greenwood.edu.in', 'Rajesh Malhotra', 'PRINCIPAL'],
    ['teacher@greenwood.edu.in', 'Priya Nair', 'TEACHER'],
    ['teacher2@greenwood.edu.in', 'Amit Verma', 'TEACHER'],
    ['accounts@greenwood.edu.in', 'Vikram Rao', 'ACCOUNTANT'],
    ['hr@greenwood.edu.in', 'Lata Mishra', 'HR'],
    ['counsellor@greenwood.edu.in', 'Deepa Kamath', 'COUNSELLOR'],
    ['librarian@greenwood.edu.in', 'Mahesh Tiwari', 'LIBRARIAN'],
    ['transport@greenwood.edu.in', 'Imran Sheikh', 'TRANSPORT'],
    ['warden@greenwood.edu.in', 'Geeta Singh', 'WARDEN'],
    ['nurse@greenwood.edu.in', 'Anita Bose', 'NURSE'],
    ['security@greenwood.edu.in', 'Ravi Naik', 'SECURITY'],
  ]
  for (const [email, name, role] of roleUsers) {
    const emp = employees.find(e => e.name === name)
    await db.user.create({ data: { email, passwordHash, name, role, linkedEmployeeId: emp?.id } })
  }

  /* ── Classes, sections, subjects ── */
  console.log('Classes & subjects…')
  const classList: { id: string; name: string; level: number }[] = []
  for (let lv = 1; lv <= 12; lv++) {
    const c = await db.class.create({ data: { name: `Grade ${lv}`, level: lv, stream: lv >= 11 ? (lv === 12 ? 'Commerce' : 'Science') : undefined } })
    classList.push({ id: c.id, name: c.name, level: lv })
  }
  const sectionList: { id: string; name: string; classId: string; className: string }[] = []
  for (const c of classList) {
    const names = c.level <= 10 ? ['A', 'B'] : ['A']
    for (const n of names) {
      const t = teachers[int(0, teachers.length - 1)]
      const s = await db.section.create({ data: { name: n, classId: c.id, teacherId: t.id, teacherName: t.name, capacity: 36 } })
      sectionList.push({ id: s.id, name: n, classId: c.id, className: c.name })
    }
  }
  const SUBJECT_BASE: Record<number, string[]> = {
    1: ['English', 'Hindi', 'Mathematics', 'EVS', 'Art & Craft'], 2: ['English', 'Hindi', 'Mathematics', 'EVS', 'Art & Craft'],
    3: ['English', 'Hindi', 'Mathematics', 'Science', 'Social Studies', 'Computer'], 4: ['English', 'Hindi', 'Mathematics', 'Science', 'Social Studies', 'Computer'],
    5: ['English', 'Hindi', 'Mathematics', 'Science', 'Social Studies', 'Computer'], 6: ['English', 'Hindi', 'Mathematics', 'Science', 'Social Studies', 'Computer', 'Marathi'],
    7: ['English', 'Hindi', 'Mathematics', 'Science', 'Social Studies', 'Computer', 'Marathi'], 8: ['English', 'Hindi', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'History & Civics', 'Geography'],
    9: ['English', 'Hindi', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'History & Civics', 'Geography'], 10: ['English', 'Hindi', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'History & Civics', 'Geography'],
    11: ['English', 'Physics', 'Chemistry', 'Mathematics', 'Biology', 'Computer Science'], 12: ['English', 'Accountancy', 'Business Studies', 'Economics', 'Mathematics', 'Entrepreneurship'],
  }
  const subjectMap: Record<string, { id: string; name: string }[]> = {}
  for (const c of classList) {
    subjectMap[c.id] = []
    const subs = SUBJECT_BASE[c.level] || SUBJECT_BASE[8]
    for (const name of subs) {
      const t = teachers.find(x => x.designation.includes(name.split(' ')[0])) || teachers[int(0, teachers.length - 1)]
      const s = await db.subject.create({ data: { name, code: `${name.slice(0, 3).toUpperCase()}-${c.level}${int(10, 99)}`, classId: c.id, teacherId: t.id, teacherName: t.name } })
      subjectMap[c.id].push({ id: s.id, name })
    }
  }

  /* Timetable for grades 3–10 sections (Mon–Sat, 7 periods) */
  const timeSlots = ['08:00-08:45', '08:45-09:30', '09:45-10:30', '10:30-11:15', '11:45-12:30', '12:30-13:15', '13:45-14:30']
  const slots: any[] = []
  for (const sec of sectionList.filter(s => s.className >= 'Grade 3' && s.className <= 'Grade 10')) {
    const subs = subjectMap[sec.classId]
    for (let day = 1; day <= 6; day++) {
      const shuffled = [...subs].sort(() => rnd() - 0.5)
      for (let p = 0; p < 7; p++) {
        const sub = shuffled[p % shuffled.length]
        slots.push({ classId: sec.classId, sectionId: sec.id, subjectId: sub.id, dayOfWeek: day, period: p + 1, startTime: timeSlots[p].split('-')[0], endTime: timeSlots[p].split('-')[1], room: `R-${int(101, 320)}` })
      }
    }
  }
  await db.timetableSlot.createMany({ data: slots })

  /* ── Parents & Students ── */
  console.log('Parents & students…')
  const students: { id: string; name: string; classId: string; sectionId: string; className: string; parentId: string; admissionNo: string }[] = []
  const parentsCreated: { id: string; name: string; phone: string }[] = []
  let admCounter = 1
  for (const c of classList) {
    const secs = sectionList.filter(s => s.classId === c.id)
    const perClass = c.level <= 10 ? 10 : 6
    for (let i = 0; i < perClass; i++) {
      const male = chance(0.5)
      const firstName = male ? pick(FIRST_M) : pick(FIRST_F)
      const lastName = pick(LAST)
      const sec = secs[i % secs.length]
      const phone = `+9198${String(int(20000000, 99999999))}`
      let parentRec = parentsCreated.find(p => p.phone === phone)
      if (!parentRec) {
        const pGender = chance(0.6) ? 'FATHER' : 'MOTHER'
        const pName = pGender === 'FATHER' ? `${pick(FIRST_M)} ${lastName}` : `${pick(FIRST_F)} ${lastName}`
        const par = await db.parent.create({
          data: {
            name: pName, relation: pGender, occupation: pick(OCCUPATIONS), phone,
            email: `${pName.toLowerCase().replace(/\W/g, '.')}@gmail.com`,
            address: pick(['Bandra West, Mumbai', 'Santacruz East, Mumbai', 'Khar Road, Mumbai', 'Juhu Tara Road, Mumbai', 'Vile Parle West, Mumbai']),
            emergencyContact: `+9198${String(int(20000000, 99999999))}`,
          },
        })
        parentRec = { id: par.id, name: par.name, phone }
        parentsCreated.push(parentRec)
      }
      const dobYear = new Date().getFullYear() - c.level - 5
      const student = await db.student.create({
        data: {
          admissionNo: `GWS${String(admCounter++).padStart(5, '0')}`, rollNo: String(i + 1).padStart(2, '0'),
          firstName, lastName, gender: male ? 'MALE' : 'FEMALE',
          dob: new Date(dobYear, int(0, 11), int(1, 28)),
          bloodGroup: pick(['A+', 'B+', 'O+', 'AB+', 'A-', 'O-']),
          category: pick(['General', 'OBC', 'SC', 'ST']), religion: pick(['Hindu', 'Muslim', 'Christian', 'Sikh', 'Parsi']),
          house: pick(['Ruby', 'Emerald', 'Sapphire', 'Topaz']), club: pick(['Robotics', 'Eco Club', 'Debate', 'Music', 'Chess', 'Photography', null as any]),
          status: 'ACTIVE', admissionDate: new Date(2016 + int(0, 8), 3, 10),
          address: pick(['Bandra West, Mumbai', 'Santacruz, Mumbai', 'Khar, Mumbai', 'Vile Parle, Mumbai']),
          parentId: parentRec.id, classId: c.id, sectionId: sec.id,
          barcode: `STU${String(admCounter).padStart(8, '0')}`,
        },
      })
      students.push({ id: student.id, name: `${firstName} ${lastName}`, classId: c.id, sectionId: sec.id, className: c.name, parentId: parentRec.id, admissionNo: student.admissionNo })
    }
  }
  // Parent + student portal users (3 families)
  const fam1 = students.find(s => s.className === 'Grade 8')!
  const fam1kids = students.filter(s => s.parentId === fam1.parentId)
  const fam2 = students.find(s => s.className === 'Grade 5')!
  const fam3 = students.find(s => s.className === 'Grade 10')!
  const [pu1, pu2, pu3] = await Promise.all([
    db.parent.findUnique({ where: { id: fam1.parentId } }), db.parent.findUnique({ where: { id: fam2.parentId } }),
    db.parent.findUnique({ where: { id: fam3.parentId } }),
  ])
  await db.user.create({ data: { email: 'parent@greenwood.edu.in', passwordHash, name: pu1!.name, role: 'PARENT', linkedParentId: pu1!.id, phone: pu1!.phone } })
  await db.user.create({ data: { email: 'parent2@greenwood.edu.in', passwordHash, name: pu2!.name, role: 'PARENT', linkedParentId: pu2!.id, phone: pu2!.phone } })
  await db.user.create({ data: { email: 'parent3@greenwood.edu.in', passwordHash, name: pu3!.name, role: 'PARENT', linkedParentId: pu3!.id, phone: pu3!.phone } })
  await db.user.create({ data: { email: 'student@greenwood.edu.in', passwordHash, name: fam1.name, role: 'STUDENT', linkedStudentId: fam1.id } })
  const s2 = students.find(s => s.className === 'Grade 9')!
  await db.user.create({ data: { email: 'student2@greenwood.edu.in', passwordHash, name: s2.name, role: 'STUDENT', linkedStudentId: s2.id } })

  /* ── Attendance (last 30 days, weekdays) ── */
  console.log('Attendance…')
  const attRows: any[] = []
  const empAttRows: any[] = []
  for (let d = 29; d >= 0; d--) {
    const date = daysAgo(d)
    const dow = date.getDay()
    if (dow === 0) continue
    const isHoliday = (dow === 6 && chance(0.3))
    for (const s of students) {
      const r = rnd()
      const status = isHoliday ? 'HOLIDAY' : r < 0.9 ? 'PRESENT' : r < 0.94 ? 'ABSENT' : r < 0.97 ? 'LATE' : r < 0.99 ? 'HALF_DAY' : 'EXCUSED'
      attRows.push({
        studentId: s.id, date, status,
        checkInTime: status === 'PRESENT' || status === 'LATE' ? (status === 'LATE' ? `08:${int(45, 59)}` : `07:${int(30, 59)}`) : null,
        classId: s.classId, sectionId: s.sectionId,
        markedById: teachers[0].id, markedBy: teachers[0].name,
        remarks: status === 'ABSENT' ? pick(['Sick leave informed by parent', 'Not reported', 'Family function']) : null,
        notified: status === 'ABSENT',
      })
    }
    if (!isHoliday) {
      for (const e of employees) {
        const r = rnd()
        empAttRows.push({ employeeId: e.id, date, status: r < 0.93 ? 'PRESENT' : r < 0.96 ? 'LATE' : r < 0.98 ? 'LEAVE' : 'ABSENT', checkInTime: '07:45', checkOutTime: '15:30' })
      }
    }
  }
  for (let i = 0; i < attRows.length; i += 800) await db.attendance.createMany({ data: attRows.slice(i, i + 800) })
  for (let i = 0; i < empAttRows.length; i += 800) await db.employeeAttendance.createMany({ data: empAttRows.slice(i, i + 800) })

  /* Leave requests */
  await db.leaveRequest.createMany({ data: [
    { requesterType: 'STUDENT', requesterId: students[3].id, requesterName: students[3].name, type: 'SICK', fromDate: daysAgo(4), toDate: daysAgo(3), reason: 'Viral fever, doctor advised rest.', status: 'APPROVED', approverId: teachers[0].id, approverName: teachers[0].name, decidedAt: daysAgo(4), remarks: 'Get well soon.' },
    { requesterType: 'STUDENT', requesterId: students[8].id, requesterName: students[8].name, type: 'EMERGENCY', fromDate: daysAhead(2), toDate: daysAhead(3), reason: 'Family wedding out of town.', status: 'PENDING' },
    { requesterType: 'EMPLOYEE', requesterId: teachers[4].id, requesterName: teachers[4].name, type: 'CASUAL', fromDate: daysAhead(7), toDate: daysAhead(8), reason: 'Personal errands.', status: 'PENDING' },
    { requesterType: 'EMPLOYEE', requesterId: teachers[6].id, requesterName: teachers[6].name, type: 'SICK', fromDate: daysAgo(10), toDate: daysAgo(9), reason: 'Migraine.', status: 'APPROVED', approverName: 'Rajesh Malhotra', decidedAt: daysAgo(10) },
  ] })

  /* ── Assignments, LMS, lesson plans ── */
  console.log('Academics, LMS…')
  const g8 = classList.find(c => c.level === 8)!
  const g9 = classList.find(c => c.level === 9)!
  const g5 = classList.find(c => c.level === 5)!
  const assignments = await Promise.all([
    db.assignment.create({ data: { title: 'Algebra Worksheet — Linear Equations', description: 'Solve problems 1–20 from Chapter 4.', type: 'HOMEWORK', classId: g8.id, sectionId: sectionList.find(s => s.classId === g8.id && s.name === 'A')!.id, subjectId: subjectMap[g8.id].find(s => s.name === 'Mathematics')!.id, teacherId: teachers[1].id, teacherName: teachers[1].name, dueDate: daysAhead(3), maxMarks: 20 } }),
    db.assignment.create({ data: { title: 'Essay: Impact of Climate Change', description: '500-word essay with 3 references.', type: 'ASSIGNMENT', classId: g9.id, sectionId: sectionList.find(s => s.classId === g9.id && s.name === 'A')!.id, subjectId: subjectMap[g9.id].find(s => s.name === 'English')!.id, teacherId: teachers[0].id, teacherName: teachers[0].name, dueDate: daysAhead(5), maxMarks: 25 } }),
    db.assignment.create({ data: { title: 'Science Project — Working Model', description: 'Build a working model demonstrating any physics principle.', type: 'PROJECT', classId: g8.id, sectionId: sectionList.find(s => s.classId === g8.id && s.name === 'B')!.id, subjectId: subjectMap[g8.id].find(s => s.name === 'Physics')!.id, teacherId: teachers[5].id, teacherName: teachers[5].name, dueDate: daysAgo(2), maxMarks: 50 } }),
    db.assignment.create({ data: { title: 'Reading Comprehension — Unit 3', type: 'HOMEWORK', classId: g5.id, sectionId: sectionList.find(s => s.classId === g5.id && s.name === 'A')!.id, subjectId: subjectMap[g5.id].find(s => s.name === 'English')!.id, teacherId: teachers[14].id, teacherName: teachers[14].name, dueDate: daysAhead(1), maxMarks: 10 } }),
  ])
  const subs8 = students.filter(s => s.className === 'Grade 8')
  const submissionRows: any[] = []
  assignments.forEach((a, ai) => {
    const pool = ai === 0 || ai === 2 ? subs8 : students.filter(s => s.className === (ai === 1 ? 'Grade 9' : 'Grade 5'))
    pool.slice(0, 6).forEach((s, i) => {
      const graded = i < 3
      submissionRows.push({ assignmentId: a.id, studentId: s.id, submittedAt: daysAgo(int(1, 4)), marks: graded ? int(12, a.maxMarks) : null, grade: graded ? pick(['A', 'B+', 'A-']) : null, feedback: graded ? pick(['Well structured!', 'Good effort, revise diagrams.', 'Excellent work.']) : null, status: graded ? 'GRADED' : i === 3 ? 'LATE' : 'SUBMITTED' })
    })
  })
  await db.submission.createMany({ data: submissionRows })

  await db.learningMaterial.createMany({ data: [
    { title: 'Photosynthesis — Video Lecture', description: 'Recorded class session with animations.', type: 'VIDEO', url: 'https://www.youtube.com/watch?v=eo5XndJaz-Y', classId: g8.id, subjectId: subjectMap[g8.id].find(s => s.name === 'Biology')!.id, teacherId: teachers[7].id, teacherName: teachers[7].name, isOnline: true, scheduledAt: daysAhead(2) },
    { title: 'Quadratic Equations — Notes PDF', type: 'DOCUMENT', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', classId: g8.id, subjectId: subjectMap[g8.id].find(s => s.name === 'Mathematics')!.id, teacherId: teachers[1].id, teacherName: teachers[1].name },
    { title: 'World War II — Timeline Deck', type: 'PRESENTATION', url: 'https://example.com/ww2-timeline', classId: g9.id, subjectId: subjectMap[g9.id].find(s => s.name === 'History & Civics')!.id, teacherId: teachers[10].id, teacherName: teachers[10].name },
    { title: 'English Grammar Practice Links', type: 'LINK', url: 'https://www.britishcouncil.org/english', classId: g5.id, subjectId: subjectMap[g5.id].find(s => s.name === 'English')!.id, teacherId: teachers[14].id, teacherName: teachers[14].name },
    { title: 'Live Online Class — Chemistry (Periodic Table)', type: 'VIDEO', url: 'https://meet.google.com/demo-link', classId: g9.id, subjectId: subjectMap[g9.id].find(s => s.name === 'Chemistry')!.id, teacherId: teachers[6].id, teacherName: teachers[6].name, isOnline: true, scheduledAt: daysAhead(1) },
  ] })
  await db.lessonPlan.createMany({ data: [
    { teacherId: teachers[0].id, teacherName: teachers[0].name, classId: g9.id, subjectId: subjectMap[g9.id].find(s => s.name === 'English')!.id, title: 'Letter Writing — Formal Letters', objectives: 'Structure of formal letters; tone; sample analysis', content: 'Warm-up, model letter walkthrough, guided practice, peer review', date: daysAhead(1), status: 'PLANNED' },
    { teacherId: teachers[1].id, teacherName: teachers[1].name, classId: g8.id, subjectId: subjectMap[g8.id].find(s => s.name === 'Mathematics')!.id, title: 'Linear Equations — Word Problems', objectives: 'Translate word problems to equations', content: 'Examples 4.12–4.20, group activity', date: daysAgo(1), status: 'COMPLETED' },
  ] })

  /* ── Exams & marks ── */
  console.log('Exams…')
  const exam1 = await db.exam.create({ data: { name: 'Unit Test 1', type: 'UNIT', academicYearId: ay.id, termId: terms[0].id, startDate: daysAgo(45), endDate: daysAgo(40), status: 'COMPLETED', resultPublished: true, classIds: JSON.stringify([g8.id, g9.id]), createdById: teachers[0].id } })
  const exam2 = await db.exam.create({ data: { name: 'Term 1 Examination', type: 'TERM', academicYearId: ay.id, termId: terms[0].id, startDate: daysAgo(25), endDate: daysAgo(18), status: 'PUBLISHED', resultPublished: true, classIds: JSON.stringify([g8.id, g9.id, g5.id]) } })
  const exam3 = await db.exam.create({ data: { name: 'Term 2 Examination', type: 'TERM', academicYearId: ay.id, termId: terms[1].id, startDate: daysAhead(30), endDate: daysAhead(38), status: 'SCHEDULED', classIds: JSON.stringify([g8.id, g9.id]) } })
  for (const exam of [exam1, exam2]) {
    const forClasses = exam.id === exam1.id ? [g8, g9] : [g8, g9, g5]
    for (const c of forClasses) {
      for (const sub of subjectMap[c.id].slice(0, 6)) {
        await db.examSchedule.create({ data: { examId: exam.id, subjectId: sub.id, classId: c.id, date: daysAgo(exam.id === exam1.id ? int(40, 45) : int(18, 25)), startTime: '09:00', endTime: '11:00', maxMarks: 100, passMarks: 35, room: `Exam Hall ${int(1, 4)}` } })
      }
    }
    const pool = students.filter(s => forClasses.some(c => c.id === s.classId))
    const marks: any[] = []
    for (const s of pool) {
      for (const sub of subjectMap[s.classId].slice(0, 6)) {
        const pct = int(38, 99)
        const obtained = pct
        marks.push({ examId: exam.id, studentId: s.id, subjectId: sub.id, marksObtained: obtained, maxMarks: 100, grade: pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : pct >= 35 ? 'D' : 'F', enteredById: teachers[0].id, enteredBy: teachers[0].name })
      }
    }
    await db.mark.createMany({ data: marks })
    for (const s of pool) {
      const ms = marks.filter(m => m.studentId === s.id)
      const obtained = ms.reduce((a, m) => a + m.marksObtained, 0)
      const total = ms.reduce((a, m) => a + m.maxMarks, 0)
      const pct = Math.round((obtained / total) * 1000) / 10
      await db.reportCard.create({ data: { studentId: s.id, examId: exam.id, totalMarks: total, obtained, percentage: pct, grade: pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : 'D', published: true } })
    }
  }
  await db.gradeConfig.createMany({ data: [
    { name: 'Outstanding', minPercent: 90, maxPercent: 100, grade: 'A+', gpa: 10, remark: 'Excellent command' },
    { name: 'Excellent', minPercent: 80, maxPercent: 89.99, grade: 'A', gpa: 9, remark: 'Very good' },
    { name: 'Very Good', minPercent: 70, maxPercent: 79.99, grade: 'B+', gpa: 8, remark: 'Above average' },
    { name: 'Good', minPercent: 60, maxPercent: 69.99, grade: 'B', gpa: 7, remark: 'Satisfactory' },
    { name: 'Average', minPercent: 50, maxPercent: 59.99, grade: 'C', gpa: 6, remark: 'Needs improvement' },
    { name: 'Pass', minPercent: 35, maxPercent: 49.99, grade: 'D', gpa: 5, remark: 'Minimum competence' },
    { name: 'Needs Support', minPercent: 0, maxPercent: 34.99, grade: 'F', gpa: 0, remark: 'Requires remedial support' },
  ] })
  await db.question.createMany({ data: [
    { subjectId: subjectMap[g8.id].find(s => s.name === 'Mathematics')!.id, classId: g8.id, type: 'MCQ', text: 'If 3x + 7 = 22, what is the value of x?', optionsJson: JSON.stringify(['3', '5', '7', '9']), correctAnswer: '5', marks: 2, difficulty: 'EASY', explanation: '3x = 15 → x = 5' },
    { subjectId: subjectMap[g8.id].find(s => s.name === 'Physics')!.id, classId: g8.id, type: 'MCQ', text: 'Which force keeps planets in orbit around the Sun?', optionsJson: JSON.stringify(['Magnetic force', 'Gravitational force', 'Friction', 'Electrostatic force']), correctAnswer: 'Gravitational force', marks: 2 },
    { subjectId: subjectMap[g8.id].find(s => s.name === 'Biology')!.id, classId: g8.id, type: 'TRUE_FALSE', text: 'Mitochondria are known as the powerhouse of the cell.', correctAnswer: 'True', marks: 1 },
    { subjectId: subjectMap[g9.id].find(s => s.name === 'English')!.id, classId: g9.id, type: 'SHORT', text: 'Explain the central theme of "The Road Not Taken".', correctAnswer: 'Choices and their consequences', marks: 5, difficulty: 'MEDIUM' },
    { subjectId: subjectMap[g9.id].find(s => s.name === 'Chemistry')!.id, classId: g9.id, type: 'NUMERIC', text: 'What is the atomic number of Carbon?', correctAnswer: '6', marks: 1 },
    { subjectId: subjectMap[g8.id].find(s => s.name === 'History & Civics')!.id, classId: g8.id, type: 'LONG', text: 'Describe the causes of the Indian Revolt of 1857.', marks: 10, difficulty: 'HARD' },
  ] })

  /* ── Fees ── */
  console.log('Fees…')
  for (const c of classList) {
    const amount = 24000 + c.level * 3200
    await db.feeStructure.create({ data: { name: `${c.name} — Annual Fee 2025-26`, classId: c.id, academicYearId: ay.id, totalAmount: amount, installments: 2, itemsJson: JSON.stringify([
      { name: 'Tuition Fee', amount: Math.round(amount * 0.62) }, { name: 'Activity & Lab Fee', amount: Math.round(amount * 0.18) },
      { name: 'Library & Technology', amount: Math.round(amount * 0.1) }, { name: 'Sports & Events', amount: Math.round(amount * 0.1) },
    ]) } })
  }
  let invCounter = 1, rcptCounter = 1
  for (const s of students) {
    const cls = classList.find(c => c.id === s.classId)!
    const struct = await db.feeStructure.findFirst({ where: { classId: cls.id } })
    const half = Math.round((struct!.totalAmount || 40000) / 2)
    // Term 1 invoice — mostly paid
    const t1Paid = chance(0.88) ? half : chance(0.5) ? Math.round(half * 0.5) : 0
    const inv1 = await db.feeInvoice.create({ data: { invoiceNo: `INV-2025-${String(invCounter++).padStart(5, '0')}`, studentId: s.id, academicYearId: ay.id, title: 'Term 1 Fee (Apr–Sep)', term: 'Term 1', totalAmount: half, paidAmount: t1Paid, status: t1Paid >= half ? 'PAID' : t1Paid > 0 ? 'PARTIAL' : 'OVERDUE', dueDate: daysAgo(30), itemsJson: JSON.stringify([{ name: 'Tuition (Term 1)', amount: Math.round(half * 0.62) }, { name: 'Activity & Lab', amount: Math.round(half * 0.38) }]) } })
    if (t1Paid > 0) await db.payment.create({ data: { receiptNo: `RCPT-2025-${String(rcptCounter++).padStart(5, '0')}`, invoiceId: inv1.id, studentId: s.id, amount: t1Paid, method: pick(['ONLINE', 'UPI', 'BANK_TRANSFER', 'CASH', 'CARD']), reference: `TXN${int(100000, 999999)}`, status: 'SUCCESS', paidAt: daysAgo(int(20, 45)), collectedById: 'system', collectedBy: 'Online Gateway' } })
    // Term 2 invoice — upcoming
    const t2Status = chance(0.2) ? 'PAID' : chance(0.6) ? 'PENDING' : chance(0.5) ? 'PARTIAL' : 'PENDING'
    const t2Paid = t2Status === 'PAID' ? half : t2Status === 'PARTIAL' ? Math.round(half * 0.4) : 0
    const inv2 = await db.feeInvoice.create({ data: { invoiceNo: `INV-2025-${String(invCounter++).padStart(5, '0')}`, studentId: s.id, academicYearId: ay.id, title: 'Term 2 Fee (Oct–Mar)', term: 'Term 2', totalAmount: half, paidAmount: t2Paid, status: t2Paid >= half ? 'PAID' : t2Paid > 0 ? 'PARTIAL' : 'PENDING', dueDate: daysAhead(int(3, 25)), itemsJson: JSON.stringify([{ name: 'Tuition (Term 2)', amount: Math.round(half * 0.62) }, { name: 'Sports & Events', amount: Math.round(half * 0.38) }]) } })
    if (t2Paid > 0) await db.payment.create({ data: { receiptNo: `RCPT-2025-${String(rcptCounter++).padStart(5, '0')}`, invoiceId: inv2.id, studentId: s.id, amount: t2Paid, method: pick(['ONLINE', 'UPI']), reference: `TXN${int(100000, 999999)}`, status: 'SUCCESS', paidAt: daysAgo(int(1, 10)), collectedBy: 'Online Gateway' } })
  }
  await db.discount.createMany({ data: [
    { name: 'Sibling Discount (10%)', type: 'PERCENT', value: 10, reason: 'Sibling enrolled', appliesTo: 'ALL' },
    { name: 'Merit Scholarship — Top 5', type: 'PERCENT', value: 25, reason: 'Academic merit', appliesTo: 'ALL' },
    { name: 'Staff Ward Concession', type: 'PERCENT', value: 30, reason: 'Employee child', appliesTo: 'ALL' },
    { name: 'Full Fee Upfront (5% off)', type: 'PERCENT', value: 5, reason: 'Annual payment', appliesTo: 'ALL' },
  ] })
  await db.expense.createMany({ data: [
    { title: 'Faculty salaries — October', category: 'SALARIES', amount: 1840000, date: daysAgo(20), vendor: 'Payroll', status: 'PAID', approvedBy: 'Sunita Desai', approvedAt: daysAgo(21), paymentMethod: 'BANK_TRANSFER' },
    { title: 'Electricity bill — MSEB', category: 'UTILITIES', amount: 148500, date: daysAgo(15), vendor: 'MSEB', status: 'PAID', approvedBy: 'Vikram Rao', approvedAt: daysAgo(15) },
    { title: 'Bus fleet diesel refill', category: 'TRANSPORT', amount: 92500, date: daysAgo(12), vendor: 'HP Petrol Pump', status: 'PAID', approvedBy: 'Vikram Rao', approvedAt: daysAgo(12) },
    { title: 'Science lab equipment upgrade', category: 'MAINTENANCE', amount: 210000, date: daysAgo(8), vendor: 'LabTech India', status: 'APPROVED', approvedBy: 'Rajesh Malhotra', approvedAt: daysAgo(7) },
    { title: 'Annual Day stage & sound', category: 'EVENTS', amount: 165000, date: daysAhead(5), vendor: 'StageCraft Events', status: 'PENDING' },
    { title: 'Classroom supplies — Term 2', category: 'SUPPLIES', amount: 67000, date: daysAgo(5), vendor: 'Navneet Stationers', status: 'APPROVED', approvedBy: 'Sunita Desai', approvedAt: daysAgo(4) },
    { title: 'CCTV maintenance contract', category: 'MAINTENANCE', amount: 38000, date: daysAgo(3), vendor: 'SecureVision Systems', status: 'PENDING' },
    { title: 'Library book purchase — 40 titles', category: 'SUPPLIES', amount: 84000, date: daysAgo(2), vendor: 'Bookworm Distributors', status: 'PENDING' },
  ] })
  await db.budget.createMany({ data: [
    { name: 'Academics Budget 2025-26', category: 'ACADEMICS', academicYearId: ay.id, allocated: 4200000, spent: 2180000 },
    { name: 'Sports & Co-curricular', category: 'SPORTS', academicYearId: ay.id, allocated: 1200000, spent: 640000 },
    { name: 'Infrastructure & Maintenance', category: 'MAINTENANCE', academicYearId: ay.id, allocated: 2800000, spent: 1720000 },
    { name: 'Technology & IT', category: 'IT', academicYearId: ay.id, allocated: 1900000, spent: 1150000 },
    { name: 'Events & Celebrations', category: 'EVENTS', academicYearId: ay.id, allocated: 900000, spent: 380000 },
    { name: 'Transport Operations', category: 'TRANSPORT', academicYearId: ay.id, allocated: 1600000, spent: 890000 },
  ] })

  /* ── HR: payroll, performance ── */
  console.log('HR…')
  const lastMonth = new Date(); lastMonth.setMonth(lastMonth.getMonth() - 1)
  const run = await db.payrollRun.create({ data: { month: lastMonth.getMonth() + 1, year: lastMonth.getFullYear(), status: 'PAID', processedBy: 'Lata Mishra', processedAt: daysAgo(18), totalAmount: 0 } })
  let total = 0
  for (const e of employees) {
    const basic = Math.round((e as any).salary || 50000)
    const allowances = Math.round(basic * 0.18)
    const deductions = Math.round(basic * 0.06)
    const tax = Math.round(basic * 0.1)
    const net = basic + allowances - deductions - tax
    await db.payslip.create({ data: { payrollRunId: run.id, employeeId: e.id, basic, allowances, deductions, tax, netPay: net, daysPresent: int(24, 26), daysPaid: 26, status: 'PAID' } })
    total += net
  }
  await db.payrollRun.update({ where: { id: run.id }, data: { totalAmount: total } })
  await db.performanceReview.createMany({ data: teachers.slice(0, 6).map((t, i) => ({
    employeeId: t.id, employeeName: t.name, period: '2025 — H1', reviewerId: employees[0].id, reviewerName: 'Rajesh Malhotra',
    score: 3.6 + (i % 3) * 0.4, goals: 'Improve student engagement metrics; complete 2 teacher trainings.',
    strengths: pick(['Strong classroom management', 'Innovative lesson design', 'Excellent student rapport']),
    improvements: pick(['Digital tools adoption', 'Assessment variety', 'Parent communication cadence']),
    training: pick(['IB Workshop — Assessment', 'Google Educator L2', 'Inclusive Classrooms Certification']),
    status: pick(['SUBMITTED', 'ACKNOWLEDGED', 'DRAFT']),
  })) })

  /* ── Admissions CRM ── */
  console.log('Admissions…')
  const stages = ['NEW', 'CONTACTED', 'COUNSELLING', 'APPLICATION', 'TEST', 'INTERVIEW', 'APPROVED', 'ENROLLED']
  const campaigns = await Promise.all([
    db.campaign.create({ data: { name: 'Google Ads — Admissions 2026', source: 'GOOGLE', budget: 250000, spend: 118000, startDate: daysAgo(60), leadsCount: 64, conversions: 9, status: 'ACTIVE' } }),
    db.campaign.create({ data: { name: 'Metro Billboards — Bandra', source: 'OFFLINE', budget: 400000, spend: 400000, startDate: daysAgo(90), endDate: daysAgo(20), leadsCount: 38, conversions: 6, status: 'COMPLETED' } }),
    db.campaign.create({ data: { name: 'Facebook / Instagram', source: 'SOCIAL', budget: 150000, spend: 72000, startDate: daysAgo(45), leadsCount: 51, conversions: 4, status: 'ACTIVE' } }),
    db.campaign.create({ data: { name: 'Referral Program — Parents', source: 'REFERRAL', budget: 50000, spend: 21000, startDate: daysAgo(75), leadsCount: 22, conversions: 11, status: 'ACTIVE' } }),
  ])
  for (let i = 0; i < 46; i++) {
    const stage = i < 8 ? stages[i % 7] : pick(stages)
    const assigned = pick([employees.find(e => e.designation.includes('Head Counsellor'))!, employees.find(e => e.designation === 'Admission Counsellor')!])
    const lead = await db.lead.create({
      data: {
        name: `${pick([...FIRST_M, ...FIRST_F])} ${pick(LAST)}`, email: `parent${i}@gmail.com`,
        phone: `+9197${String(int(10000000, 99999999))}`,
        source: pick(['WALK_IN', 'WEBSITE', 'REFERRAL', 'CAMPAIGN', 'PHONE', 'EVENT']),
        classAppliedFor: pick(classList).name, stage,
        assignedToId: assigned.id, assignedToName: assigned.name,
        notes: pick(['Interested in STEM focus.', 'Asked about bus routes to Khar.', 'Comparing with 2 other schools.', 'Wants campus tour next week.', 'Follow up after salary credit.']),
        nextFollowUp: chance(0.6) ? daysAhead(int(1, 10)) : null,
        campaignId: chance(0.5) ? pick(campaigns).id : null,
        createdAt: daysAgo(int(1, 60)),
      },
    })
    if (chance(0.5)) await db.leadFollowUp.create({ data: { leadId: lead.id, note: pick(['Called — shared brochure on WhatsApp.', 'Campus visit scheduled.', 'Left voicemail, will retry.', 'Discussed fee structure & scholarships.']), outcome: pick(['INTERESTED', 'FOLLOW_UP', 'NO_RESPONSE']), nextAt: daysAhead(int(1, 7)), byId: assigned.id, byName: assigned.name, createdAt: daysAgo(int(1, 15)) } })
  }
  for (let i = 0; i < 18; i++) {
    const status = i < 6 ? pick(['SUBMITTED', 'SCREENING', 'DOC_VERIFICATION', 'TEST', 'INTERVIEW']) : pick(['SUBMITTED', 'APPROVED', 'APPROVED', 'ENROLLED', 'REJECTED', 'DOC_VERIFICATION'])
    await db.application.create({
      data: {
        applicationNo: `APP-2026-${String(i + 1).padStart(4, '0')}`,
        studentName: `${pick([...FIRST_M, ...FIRST_F])} ${pick(LAST)}`,
        dob: new Date(2013 + int(0, 6), int(0, 11), int(1, 28)), gender: chance(0.5) ? 'MALE' : 'FEMALE',
        classApplied: pick(classList).name,
        parentName: `${pick([...FIRST_M, ...FIRST_F])} ${pick(LAST)}`,
        parentPhone: `+9196${String(int(10000000, 99999999))}`, parentEmail: `applicant${i}@gmail.com`,
        address: pick(['Bandra West, Mumbai', 'Powai, Mumbai', 'Chembur, Mumbai', 'Dadar East, Mumbai']),
        previousSchool: chance(0.7) ? pick(['Little Angels School', 'St. Xavier Primary', 'Sunrise Public School', 'Kidzee, Khar']) : undefined,
        docsVerified: ['TEST', 'INTERVIEW', 'APPROVED', 'ENROLLED'].includes(status), testScore: ['TEST', 'INTERVIEW', 'APPROVED', 'ENROLLED'].includes(status) ? int(55, 96) : null,
        interviewScore: ['INTERVIEW', 'APPROVED', 'ENROLLED'].includes(status) ? int(60, 95) : null,
        status, remarks: status === 'REJECTED' ? 'Did not meet entrance test cutoff.' : status === 'APPROVED' ? 'Excellent performance across rounds.' : undefined,
        createdAt: daysAgo(int(2, 50)),
      },
    })
  }

  /* ── Transport ── */
  console.log('Transport…')
  const vehicles: any[] = []
  for (let i = 0; i < 5; i++) {
    const v = await db.vehicle.create({ data: {
      regNo: `MH02-${pick(['CV', 'BX', 'QP'])}-${int(1000, 9999)}`, model: pick(['Tata Starbus 40-seat', 'Eicher Skyline 36-seat', 'Ashok Leyland Falcon 45-seat']),
      capacity: pick([36, 40, 45]), driverName: pick(['Suresh Pawar', 'Rafiq Sayyed', 'Dattaram Sawant', 'Bhaskar Jadhav', 'Sunil Gaikwad']),
      driverPhone: `+9198${String(int(10000000, 99999999))}`, driverLicense: `MH${int(10000000, 99999999)}`,
      licenseExpiry: daysAhead(int(30, 400)), attendantName: pick(['Sanjay Kamble', 'Vikas More', 'Ajay Landge']),
      insuranceExpiry: daysAhead(int(20, 300)), fitnessExpiry: daysAhead(int(40, 600)), lastServiceAt: daysAgo(int(10, 60)),
      gpsLat: 19.06 + (rnd() - 0.5) * 0.09, gpsLng: 72.83 + (rnd() - 0.5) * 0.11, speedKmph: int(0, 45), lastGpsAt: new Date(),
    } })
    vehicles.push(v)
  }
  const routeNames = ['Route 1 — Bandra Loop', 'Route 2 — Santacruz East', 'Route 3 — Khar–Juhu', 'Route 4 — Vile Parle North', 'Route 5 — Powai Express']
  const stopsByRoute: Record<string, any[]> = {}
  const routes: any[] = []
  for (let i = 0; i < 5; i++) {
    const r = await db.route.create({ data: { name: routeNames[i], vehicleId: vehicles[i].id, distanceKm: 8 + i * 3.2, monthlyFee: 1800 + i * 250, status: 'ACTIVE' } })
    routes.push(r)
    stopsByRoute[r.id] = []
    const stopNames = [['Bandra Station (West)', 'Waterfield Road', 'Hill Road Junction', 'Mount Mary Steps', 'School Gate'],
      ['Santacruz East Metro', 'Kalina Gate 2', 'Vakola Pipeline', 'School Gate'],
      ['Khar Station Road', 'Khar Danda', 'Juhu Tara Road', 'Gulmohar Ave', 'School Gate'],
      ['Vile Parle Station (E)', 'Nehru Road', 'Domestic Airport T1', 'School Gate'],
      ['Powai Lake Gardens', 'Hiranandani Gardens', 'Chandivali Junction', 'Andheri East Hub', 'Marol Naka', 'School Gate']][i]
    for (let j = 0; j < stopNames.length; j++) {
      const st = await db.stop.create({ data: { routeId: r.id, name: stopNames[j], sequence: j + 1, pickupTime: `0${6 + j}:${int(10, 59)}`, dropTime: `1${4 + Math.floor(j / 2)}:${int(10, 59)}`, lat: 19.05 + j * 0.008, lng: 72.82 + j * 0.009 } })
      stopsByRoute[r.id].push(st)
    }
  }
  const transportStudents = students.filter((_, i) => i % 3 === 0).slice(0, 36)
  for (const s of transportStudents) {
    const r = routes[int(0, routes.length - 1)]
    const stops = stopsByRoute[r.id]
    await db.transportAllocation.create({ data: { studentId: s.id, routeId: r.id, stopId: stops[int(0, stops.length - 1)].id, type: 'BOTH', status: 'ACTIVE', monthlyFee: r.monthlyFee, pickupStatus: pick(['Picked up', 'Dropped', 'Waiting']) } })
  }

  /* ── Hostel ── */
  console.log('Hostel…')
  const hostels = await Promise.all([
    db.hostel.create({ data: { name: 'Nalanda Boys Hostel', type: 'BOYS', wardenId: employees.find(e => e.designation === 'Boys Hostel Warden')!.id, wardenName: 'Ramesh Yadav' } }),
    db.hostel.create({ data: { name: 'Tagore Girls Hostel', type: 'GIRLS', wardenId: employees.find(e => e.designation === 'Girls Hostel Warden')!.id, wardenName: 'Geeta Singh' } }),
  ])
  const allBeds: { id: string; hostelId: string; roomNo: string }[] = []
  for (const h of hostels) {
    for (let fl = 0; fl < 2; fl++) {
      for (let rm = 1; rm <= 6; rm++) {
        const room = await db.room.create({ data: { hostelId: h.id, roomNo: `${fl + 1}0${rm}`, floor: fl + 1, capacity: 4, type: pick(['SHARED', 'SHARED', 'DORMITORY']) } })
        for (let b = 1; b <= 4; b++) {
          const bed = await db.bed.create({ data: { roomId: room.id, bedNo: `${room.roomNo}-B${b}`, status: 'FREE' } })
          allBeds.push({ id: bed.id, hostelId: h.id, roomNo: room.roomNo })
        }
      }
    }
  }
  const boarders = students.filter(s => ['Grade 8', 'Grade 9', 'Grade 10', 'Grade 11'].includes(s.className)).slice(0, 60)
  let bi = 0
  for (const s of boarders) {
    const free = allBeds[bi++]
    if (!free) break
    await db.bed.update({ where: { id: free.id }, data: { status: 'OCCUPIED' } })
    await db.hostelAllocation.create({ data: { bedId: free.id, studentId: s.id, checkInDate: daysAgo(int(30, 200)), status: 'ACTIVE', monthlyFee: 9500, notes: pick(['Prefers lower berth', 'Vegetarian mess', 'Near window seat', null as any]) } })
  }
  await db.complaint.createMany({ data: [
    { category: 'HOSTEL', studentId: boarders[0]?.id, raisedById: 'parent', raisedBy: 'Parent — Hostel', title: 'Hot water not available on 2nd floor', description: 'No hot water in showers since Monday morning.', priority: 'HIGH', status: 'IN_PROGRESS', assignedToName: 'Ramesh Yadav' },
    { category: 'HOSTEL', studentId: boarders[5]?.id, raisedById: 'student', raisedBy: 'Student — Hostel', title: 'Mess menu variety request', description: 'Requesting more variety in dinner menu.', priority: 'MEDIUM', status: 'OPEN' },
    { category: 'TRANSPORT', studentId: transportStudents[2]?.id, raisedById: 'parent', raisedBy: 'Parent — Transport', title: 'Bus frequently 10+ minutes late', description: 'Route 3 pickup at Khar Danda is consistently delayed.', priority: 'MEDIUM', status: 'RESOLVED', resolution: 'Route timing adjusted by 10 minutes from Nov 18.', resolvedAt: daysAgo(6) },
    { category: 'ACADEMICS', raisedById: 'parent', raisedBy: 'Parent', title: 'Extra math practice sheets request', description: 'Requesting additional worksheets for Grade 8 algebra.', priority: 'LOW', status: 'RESOLVED', resolution: 'Shared weekly practice pack on portal.', resolvedAt: daysAgo(3) },
    { category: 'FOOD', studentId: boarders[10]?.id, raisedById: 'student', raisedBy: 'Student', title: 'Food quality — Thursday dinner', description: 'Rice was undercooked at Thursday dinner.', priority: 'HIGH', status: 'CLOSED', resolution: 'Mess contractor issued warning; audit done.', resolvedAt: daysAgo(9) },
    { category: 'GENERAL', raisedById: 'parent', raisedBy: 'Parent', title: 'Water cooler on 3rd floor', description: 'Water cooler dispenses warm water.', priority: 'MEDIUM', status: 'OPEN' },
  ] })

  /* ── Security & visitors ── */
  console.log('Security…')
  await db.visitor.createMany({ data: Array.from({ length: 26 }, (_, i) => {
    const inside = i < 4
    return {
      name: `${pick([...FIRST_M, ...FIRST_F])} ${pick(LAST)}`, phone: `+9193${String(int(10000000, 99999999))}`,
      purpose: pick(['MEETING', 'DELIVERY', 'PARENT_PICKUP', 'VENDOR', 'MAINTENANCE']),
      personToMeet: pick(['Front Office', 'Principal — Rajesh Malhotra', 'Accounts — Vikram Rao', 'Admissions — Deepa Kamath', 'Hostel Office']),
      passNo: `PASS-${String(101 + i)}`, vehicleNo: chance(0.4) ? `MH02${pick(['AB', 'CD'])}-${int(100, 999)}` : undefined,
      checkInAt: daysAgo(int(0, 20)), checkOutAt: inside ? undefined : daysAgo(int(0, 19)),
      status: inside ? 'INSIDE' : 'EXITED', approvedBy: 'Ravi Naik',
      notes: pick(['Amazon delivery — front office', 'Parent picking up Grade 3 student', 'Book vendor meeting', 'AC repair technician', null as any]),
    }
  }) })
  await db.pickupLog.createMany({ data: Array.from({ length: 12 }, (_, i) => ({
    studentId: pick(students).id, personName: `${pick([...FIRST_M, ...FIRST_F])} ${pick(LAST)}`,
    relation: pick(['Father', 'Mother', 'Authorized Guardian']), method: pick(['QR', 'QR', 'MANUAL', 'OTP']),
    type: pick(['PICKUP', 'DROP']), status: i === 7 ? 'PENDING' : 'VERIFIED', time: daysAgo(int(0, 14)),
  })) })
  await db.securityAlert.createMany({ data: [
    { type: 'MEDICAL', description: 'Student fainted during assembly — nurse attending.', severity: 'HIGH', location: 'Assembly Ground', status: 'RESOLVED', raisedBy: 'Ravi Naik', resolvedAt: daysAgo(12), resolution: 'Low sugar; parents informed, student stable.' },
    { type: 'LOST_ITEM', description: 'Grade 4 student lost blue water bottle near library.', severity: 'LOW', location: 'Library', status: 'RESOLVED', raisedBy: 'Front Office', resolvedAt: daysAgo(8), resolution: 'Found and returned.' },
    { type: 'INTRUSION', description: 'Unidentified person at back gate during lunch break.', severity: 'CRITICAL', location: 'Back Gate', status: 'INVESTIGATING', raisedBy: 'Ravi Naik' },
    { type: 'FIRE', description: 'Fire drill — quarterly scheduled drill completed.', severity: 'MEDIUM', location: 'All Blocks', status: 'RESOLVED', raisedBy: 'Admin', resolvedAt: daysAgo(20), resolution: 'Evacuation in 4m 32s — pass.' },
  ] })

  /* ── Health ── */
  console.log('Health…')
  const healthRows = students.map(s => ({
    studentId: s.id, bloodGroup: pick(['A+', 'B+', 'O+', 'AB+']), heightCm: 110 + int(0, 60), weightKg: 25 + int(0, 35),
    allergies: chance(0.25) ? pick(['Peanuts', 'Dust', 'Pollen', 'Lactose', 'Penicillin']) : undefined,
    chronicConditions: chance(0.08) ? pick(['Mild Asthma', 'Myopia']) : undefined,
    medications: chance(0.1) ? 'Asthalin inhaler (as needed)' : undefined,
    emergencyContact: `+9198${String(int(10000000, 99999999))}`,
    familyDoctor: chance(0.5) ? 'Dr. Mehta Clinic, Bandra' : undefined,
    lastScreeningAt: daysAgo(int(20, 120)),
  }))
  await db.healthRecord.createMany({ data: healthRows })
  await db.clinicVisit.createMany({ data: [
    { studentId: students[2].id, date: daysAgo(3), reason: 'Headache', symptoms: 'Mild headache since morning', temperatureC: 98.4, diagnosis: 'Dehydration', treatment: 'ORS + rest', medication: 'ORS sachets', attendedBy: 'Anita Bose', severity: 'MINOR', parentNotified: true },
    { studentId: students[5].id, date: daysAgo(7), reason: 'Scraped knee', symptoms: 'Fall during PT period', diagnosis: 'Abrasion', treatment: 'Antiseptic dressing', attendedBy: 'Anita Bose', severity: 'MINOR', parentNotified: true },
    { studentId: students[9].id, date: daysAgo(10), reason: 'Fever', symptoms: 'Temperature 101F, body ache', temperatureC: 101.2, diagnosis: 'Viral fever', treatment: 'Sent home with parents', medication: 'Paracetamol as advised', attendedBy: 'Dr. Sanjay Gupta', severity: 'MODERATE', followUpRequired: true, parentNotified: true },
    { studentId: students[12].id, date: daysAgo(14), reason: 'Stomach ache', symptoms: 'Cramps post lunch', diagnosis: 'Indigestion', treatment: 'Antacid', attendedBy: 'Anita Bose', severity: 'MINOR', parentNotified: true },
    { studentId: students[15].id, date: daysAgo(18), reason: 'Sports injury — ankle', symptoms: 'Swelling right ankle', diagnosis: 'Grade 1 sprain', treatment: 'Ice pack + crepe bandage', attendedBy: 'Dr. Sanjay Gupta', severity: 'MODERATE', followUpRequired: true, parentNotified: true },
  ] })
  await db.vaccination.createMany({ data: students.slice(0, 20).map(s => ({ studentId: s.id, vaccine: pick(['MMR Booster', 'Td (Tetanus)', 'Hepatitis B', 'HPV (Girls 10-14)', 'Influenza (Seasonal)']), dose: pick(['1st', '2nd', 'Booster']), date: daysAgo(int(30, 400)), status: 'COMPLETED', administeredBy: 'Dr. Sanjay Gupta' })) })

  /* ── Library ── */
  console.log('Library…')
  const books: any[] = []
  for (let i = 0; i < BOOKS.length; i++) {
    const [title, author] = BOOKS[i]
    const copies = int(2, 8)
    const b = await db.book.create({ data: { title, author, isbn: `978-${int(100000000, 999999999)}`, category: BOOK_CATS[i % BOOK_CATS.length], publisher: pick(['Penguin India', 'Oxford University Press', 'NCERT', 'Scholastic', 'Rupa Publications']), editionYear: int(2010, 2024), totalCopies: copies, availableCopies: copies - int(0, 2), shelf: `${pick(['A', 'B', 'C', 'D'])}-${int(1, 9)}`, price: int(150, 900), barcode: `BK${String(100000 + i)}`, coverUrl: undefined, language: 'English' } })
    books.push(b)
  }
  const libTxns: any[] = []
  for (let i = 0; i < 28; i++) {
    const b = pick(books)
    const s = pick(students)
    const issued = daysAgo(int(3, 40))
    const due = new Date(issued); due.setDate(due.getDate() + 14)
    const returned = chance(0.6)
    const overdue = !returned && due < new Date()
    libTxns.push({
      bookId: b.id, bookTitle: b.title, userType: chance(0.85) ? 'STUDENT' : 'EMPLOYEE',
      userId: chance(0.85) ? s.id : pick(employees).id,
      userName: chance(0.85) ? s.name : pick(employees).name,
      issueDate: issued, dueDate: due, returnDate: returned ? daysAgo(int(1, 10)) : undefined,
      renewals: chance(0.2) ? 1 : 0, fine: overdue ? Math.min(50, Math.ceil((Date.now() - due.getTime()) / 86400000) * 2) : 0,
      status: returned ? 'RETURNED' : overdue ? 'OVERDUE' : 'ISSUED', issuedBy: 'Mahesh Tiwari',
    })
  }
  await db.libraryTransaction.createMany({ data: libTxns })
  await db.bookReservation.createMany({ data: [
    { bookId: books[12].id, userId: students[0].id, userName: students[0].name, status: 'READY', expiresAt: daysAhead(2) },
    { bookId: books[17].id, userId: students[4].id, userName: students[4].name, status: 'PENDING' },
    { bookId: books[0].id, userType: 'EMPLOYEE', userId: employees[0].id, userName: employees[0].name, status: 'PENDING' },
  ] })

  /* ── Assets ── */
  console.log('Assets…')
  const assets: any[] = []
  for (let i = 0; i < ASSET_NAMES.length; i++) {
    const [name, category, cost] = ASSET_NAMES[i]
    const units = int(2, 6)
    for (let u = 0; u < units; u++) {
      const status = pick(['IN_USE', 'IN_USE', 'IN_USE', 'AVAILABLE', 'MAINTENANCE', 'DISPOSED'])
      const a = await db.asset.create({ data: {
        assetTag: `AST-${String(1000 + assets.length)}`, name, category, purchaseDate: new Date(2019 + int(0, 5), int(0, 11), int(1, 28)),
        purchaseCost: cost, currentValue: Math.round(cost * (0.55 + rnd() * 0.3)),
        status, location: pick(['Classroom Block A', 'Science Lab', 'Computer Lab', 'Sports Complex', 'Library', 'Admin Block', 'Auditorium']),
        assignedToType: status === 'IN_USE' ? pick(['CLASS', 'ROOM', 'EMPLOYEE']) : undefined,
        assignedToName: status === 'IN_USE' ? pick(['Grade 8-A', 'Physics Lab', 'Computer Lab 1', 'Priya Nair', 'Music Room']) : undefined,
        warrantyExpiry: daysAhead(int(-100, 700)), lastMaintenance: daysAgo(int(20, 300)),
        condition: pick(['NEW', 'GOOD', 'GOOD', 'WORN', 'NEEDS_REPAIR']), barcode: `ASSET${String(200000 + assets.length)}`,
      } })
      assets.push(a)
    }
  }
  await db.assetTransfer.createMany({ data: [
    { assetId: assets[0].id, fromName: 'Store Room', toType: 'CLASS', toName: 'Grade 8-A', reason: 'New smart board installation', byName: 'Sunita Desai', date: daysAgo(30) },
    { assetId: assets[3].id, fromName: 'Computer Lab 1', toType: 'ROOM', toName: 'Principal Office', reason: 'Staff requirement', byName: 'Sunita Desai', date: daysAgo(15) },
    { assetId: assets[9].id, fromName: 'Grade 5-B', toType: 'CLASS', toName: 'Grade 5-A', reason: 'Section rebalance', byName: 'Admin', date: daysAgo(8) },
  ] })

  /* ── Events ── */
  console.log('Events…')
  const events = await Promise.all(EVENT_TITLES.map(([title, type, location], i) => {
    const start = i < 8 ? daysAgo(int(5, 90)) : daysAhead(int(2, 75))
    return db.event.create({ data: {
      title, type, description: `${title} — organised by ${pick(['Student Council', 'Sports Committee', 'Cultural Committee', 'PTA'])}.`,
      startDate: start, endDate: type === 'HOLIDAY' ? new Date(start.getTime() + 86400000 * int(1, 5)) : undefined,
      location, audience: pick(['ALL', 'ALL', 'STUDENTS', 'PARENTS', 'TEACHERS']),
      organizerName: pick(['Student Council', 'Ms. Shalini Pillai', 'Sports Committee', 'PTA Executive']),
      registrationRequired: chance(0.3), capacity: chance(0.3) ? int(100, 500) : undefined,
      color: type === 'HOLIDAY' ? 'rose' : type === 'EXAM' ? 'amber' : type === 'SPORTS' ? 'emerald' : 'sky',
      status: start < new Date() ? 'COMPLETED' : 'SCHEDULED',
    } })
  }))
  await db.eventRegistration.createMany({ data: [
    { eventId: events[0].id, userId: students[0].id, userName: students[0].name, status: 'REGISTERED' },
    { eventId: events[0].id, userId: students[1].id, userName: students[1].name, status: 'REGISTERED' },
    { eventId: events[4].id, userId: students[2].id, userName: students[2].name, status: 'REGISTERED' },
    { eventId: events[4].id, userId: fam1.id, userName: fam1.name, status: 'REGISTERED' },
    { eventId: events[9].id, userId: students[3].id, userName: students[3].name, status: 'REGISTERED' },
  ] })

  /* ── Communication ── */
  console.log('Communication…')
  await db.announcement.createMany({ data: [
    { title: 'Annual Day rehearsals begin Nov 25', body: 'All participants must report to the auditorium at 2:00 PM daily. Consent forms for parents due by Nov 22.', type: 'CIRCULAR', audience: 'ALL', priority: 'HIGH', channels: 'IN_APP,EMAIL,PUSH', publishedBy: 'Sunita Desai', publishAt: daysAgo(3) },
    { title: 'Term 2 fee payment reminder', body: 'Term 2 fees are due by the 10th. Pay online via the parent portal to avoid late fees.', type: 'REMINDER', audience: 'PARENTS', priority: 'URGENT', channels: 'IN_APP,EMAIL,SMS,WHATSAPP', publishedBy: 'Vikram Rao', publishAt: daysAgo(1) },
    { title: 'Parent–Teacher Meeting — Dec 14', body: 'PTM slots for Grades 6–10 open on the portal. Book your 15-minute slot with class teachers.', type: 'EVENT', audience: 'PARENTS', priority: 'NORMAL', channels: 'IN_APP,EMAIL', publishedBy: 'Priya Nair', publishAt: daysAgo(2) },
    { title: 'Science Exhibition registrations open', body: 'Grades 7–10 can register teams of up to 3 for Innovate 2025. Submit project abstracts by month-end.', type: 'ANNOUNCEMENT', audience: 'STUDENTS', priority: 'NORMAL', channels: 'IN_APP', publishedBy: 'Kavita Iyer', publishAt: daysAgo(5) },
    { title: 'Heavy rain advisory — transport', body: 'Buses may run 10–15 minutes late due to waterlogging on Western Express Highway.', type: 'EMERGENCY', audience: 'ALL', priority: 'URGENT', channels: 'IN_APP,SMS,WHATSAPP,PUSH', publishedBy: 'Imran Sheikh', publishAt: daysAgo(7) },
    { title: 'Library week — book fair & reading challenge', body: 'Explore 500+ new titles at the book fair. Reading challenge winners announced at assembly.', type: 'ANNOUNCEMENT', audience: 'ALL', priority: 'LOW', channels: 'IN_APP', publishedBy: 'Mahesh Tiwari', publishAt: daysAgo(9) },
    { title: 'Winter uniform from Dec 1', body: 'Students must wear the full winter uniform including blazers from December 1.', type: 'CIRCULAR', audience: 'ALL', priority: 'NORMAL', channels: 'IN_APP,EMAIL', publishedBy: 'Sunita Desai', publishAt: daysAgo(4) },
    { title: 'Sports team selection results', body: 'Congratulations to all selected for the district football and basketball squads!', type: 'ANNOUNCEMENT', audience: 'STUDENTS', priority: 'NORMAL', channels: 'IN_APP', publishedBy: 'Vikram Shetty', publishAt: daysAgo(6) },
  ] })
  const parentUser1 = await db.user.findFirst({ where: { email: 'parent@greenwood.edu.in' } })
  const teacherUser = await db.user.findFirst({ where: { email: 'teacher@greenwood.edu.in' } })
  if (parentUser1 && teacherUser) {
    const thId = `${parentUser1.id}_${teacherUser.id}`
    await db.message.createMany({ data: [
      { threadId: thId, fromUserId: parentUser1.id, fromName: pu1!.name, fromRole: 'PARENT', toUserId: teacherUser.id, toName: 'Priya Nair', toRole: 'TEACHER', subject: 'Aarav\u2019s progress in English', body: 'Hello Ma\u2019am, how is Aarav doing in English this term? He enjoys the reading assignments.', createdAt: daysAgo(4) },
      { threadId: thId, fromUserId: teacherUser.id, fromName: 'Priya Nair', fromRole: 'TEACHER', toUserId: parentUser1.id, toName: pu1!.name, toRole: 'PARENT', subject: 'Re: Aarav\u2019s progress in English', body: 'Hello! Aarav is doing very well — his essay on climate change was one of the best in class. Encourage 20 minutes of daily reading at home.', readAt: daysAgo(3), createdAt: daysAgo(4) },
      { threadId: thId, fromUserId: parentUser1.id, fromName: pu1!.name, fromRole: 'PARENT', toUserId: teacherUser.id, toName: 'Priya Nair', toRole: 'TEACHER', subject: 'Re: Aarav\u2019s progress in English', body: 'Thank you so much for the feedback! We have started a evening reading routine.', createdAt: daysAgo(3) },
    ] })
  }
  const notifRows: any[] = []
  if (parentUser1) {
    notifRows.push(
      { userId: parentUser1.id, title: 'Attendance alert', message: `${fam1.name} was marked absent today (Grade 8-A).`, type: 'WARNING', link: 'attendance', createdAt: daysAgo(0) },
      { userId: parentUser1.id, title: 'Fee reminder', message: 'Term 2 fee of ₹19,200 is due in 7 days. Pay online now.', type: 'WARNING', link: 'fees', createdAt: daysAgo(1) },
      { userId: parentUser1.id, title: 'Term 1 results published', message: `Term 1 report card for ${fam1.name} is now available.`, type: 'SUCCESS', link: 'examinations', createdAt: daysAgo(12) },
      { userId: parentUser1.id, title: 'Bus approaching', message: 'Route 1 — Bandra Loop will reach your stop in ~10 minutes.', type: 'INFO', link: 'transport', createdAt: daysAgo(2) },
      { userId: parentUser1.id, title: 'Clinic visit', message: `${fam1.name} visited the clinic (headache). Student is fine now.`, type: 'INFO', link: 'health', createdAt: daysAgo(3) },
    )
  }
  const studentUser = await db.user.findFirst({ where: { email: 'student@greenwood.edu.in' } })
  if (studentUser) {
    notifRows.push(
      { userId: studentUser.id, title: 'New homework assigned', message: 'Algebra Worksheet — Linear Equations, due in 3 days.', type: 'INFO', link: 'lms', createdAt: daysAgo(1) },
      { userId: studentUser.id, title: 'Assignment graded', message: 'Your submission for "Essay: Impact of Climate Change" was graded: A.', type: 'SUCCESS', link: 'lms', createdAt: daysAgo(2) },
    )
  }
  const adminUser = await db.user.findFirst({ where: { role: 'SUPER_ADMIN' } })
  if (adminUser) {
    notifRows.push(
      { userId: adminUser.id, title: 'Admission application received', body: undefined as any, message: 'New online application APP-2026-0017 for Grade 6.', type: 'INFO', link: 'admissions', createdAt: daysAgo(0) },
      { userId: adminUser.id, title: 'Fee payment received', message: 'Payment of ₹19,200 received — INV-2025-00101.', type: 'SUCCESS', link: 'fees', createdAt: daysAgo(0) },
      { userId: adminUser.id, title: 'Pending approvals', message: '3 leave requests and 1 expense approval are waiting.', type: 'WARNING', link: 'dashboard', createdAt: daysAgo(1) },
    )
  }
  if (notifRows.length) await db.notification.createMany({ data: notifRows })
  await db.notificationTemplate.createMany({ data: [
    { key: 'attendance_absent', name: 'Absence Alert', channel: 'PUSH', subject: 'Attendance Alert', body: '{{studentName}} was marked {{status}} on {{date}}.' },
    { key: 'fee_overdue', name: 'Fee Overdue Reminder', channel: 'SMS', subject: 'Fee Payment Reminder', body: 'Dear Parent, {{amount}} for {{invoice}} is overdue. Please pay via portal.' },
    { key: 'payment_success', name: 'Payment Success', channel: 'EMAIL', subject: 'Payment Receipt', body: 'Payment of {{amount}} received. Receipt: {{receiptNo}}' },
    { key: 'result_published', name: 'Results Published', channel: 'PUSH', subject: 'Results Available', body: '{{examName}} results for {{studentName}} are now available.' },
    { key: 'bus_approaching', name: 'Bus ETA Alert', channel: 'PUSH', subject: 'Bus Approaching', body: 'Bus {{route}} will reach {{stop}} in ~{{eta}} minutes.' },
    { key: 'hostel_checkin', name: 'Hostel Check-in', channel: 'SMS', subject: 'Hostel Check-in', body: '{{studentName}} checked into {{hostel}} room {{roomNo}}.' },
    { key: 'certificate_approved', name: 'Certificate Ready', channel: 'EMAIL', subject: 'Certificate Issued', body: 'Your {{type}} certificate is ready to download.' },
    { key: 'event_reminder', name: 'Event Reminder', channel: 'PUSH', subject: 'Upcoming Event', body: '{{eventTitle}} is on {{date}} at {{location}}.' },
  ] })

  /* ── Certificates ── */
  console.log('Certificates…')
  const certReqs = await Promise.all([
    db.certificateRequest.create({ data: { studentId: students[0].id, type: 'BONAFIDE', purpose: 'Passport application', status: 'ISSUED', requestedBy: pu1!.name, approvedBy: 'Rajesh Malhotra', approvedAt: daysAgo(5), issuedAt: daysAgo(4) } }),
    db.certificateRequest.create({ data: { studentId: students[6].id, type: 'STUDY', purpose: 'Bank account opening', status: 'APPROVED', requestedBy: 'Parent', approvedBy: 'Rajesh Malhotra', approvedAt: daysAgo(1) } }),
    db.certificateRequest.create({ data: { studentId: students[11].id, type: 'TRANSFER', purpose: 'Relocation to Delhi', status: 'PENDING', requestedBy: 'Parent' } }),
    db.certificateRequest.create({ data: { studentId: students[16].id, type: 'CONDUCT', purpose: 'Summer camp enrolment', status: 'VERIFIED', requestedBy: 'Parent' } }),
    db.certificateRequest.create({ data: { studentId: students[20].id, type: 'CHARACTER', purpose: 'Scholarship application', status: 'REJECTED', requestedBy: 'Parent', remarks: 'Duplicate request — already issued this term.', approvedBy: 'Sunita Desai', approvedAt: daysAgo(2) } }),
    db.certificateRequest.create({ data: { studentId: students[25].id, type: 'TRANSCRIPT', purpose: 'School transfer abroad', status: 'PENDING', requestedBy: 'Parent' } }),
  ])
  await db.certificate.create({ data: { requestId: certReqs[0].id, studentId: students[0].id, type: 'BONAFIDE', certificateNo: 'GWS/CERT/2025/001', title: 'Bonafide Certificate', verifyCode: `VRF-${int(100000, 999999)}`, issuedBy: 'Rajesh Malhotra', contentJson: '{"body":"This is to certify that the student is bonafide."}' } })
  await db.approvalTask.createMany({ data: [
    { type: 'LEAVE', entityId: 'seed-leave-2', title: 'Leave request — Family wedding (Grade 4)', requestedById: 'parent', requestedBy: 'Parent', approverRole: 'TEACHER' },
    { type: 'LEAVE', entityId: 'seed-leave-3', title: 'Leave request — Personal errands (Kavita Iyer)', requestedById: 'staff', requestedBy: 'Kavita Iyer', approverRole: 'PRINCIPAL' },
    { type: 'EXPENSE', entityId: 'seed-exp-5', title: 'Expense approval — Annual Day stage & sound ₹1,65,000', requestedById: 'accounts', requestedBy: 'Vikram Rao', approverRole: 'SCHOOL_ADMIN' },
    { type: 'CERTIFICATE', entityId: certReqs[1].id, title: 'Study certificate — verify & approve', requestedById: 'parent', requestedBy: 'Parent', approverRole: 'PRINCIPAL' },
    { type: 'FEE_DISCOUNT', entityId: 'seed-disc', title: 'Merit scholarship 25% — verify documents', requestedById: 'accounts', requestedBy: 'Vikram Rao', approverRole: 'SCHOOL_ADMIN' },
  ] })

  /* ── Integrations & workflows & audit ── */
  await db.integrationSetting.createMany({ data: [
    { key: 'razorpay', name: 'Razorpay Payment Gateway', category: 'PAYMENT', provider: 'Razorpay', status: 'CONNECTED', configJson: '{"keyId":"rzp_test_••••4821","webhook":"/api/integrations/razorpay"}', lastSyncAt: daysAgo(0) },
    { key: 'msg91', name: 'MSG91 SMS Gateway', category: 'SMS', provider: 'MSG91', status: 'CONNECTED', configJson: '{"senderId":"GRWSCH","route":"transactional"}', lastSyncAt: daysAgo(0) },
    { key: 'sendgrid', name: 'SendGrid Email', category: 'EMAIL', provider: 'SendGrid', status: 'CONNECTED', configJson: '{"from":"noreply@greenwood.edu.in"}', lastSyncAt: daysAgo(1) },
    { key: 'gupshup', name: 'Gupshup WhatsApp Business', category: 'WHATSAPP', provider: 'Gupshup', status: 'DISCONNECTED', configJson: '{}' },
    { key: 'gps-tracker', name: 'Fleet GPS Tracking', category: 'GPS', provider: 'LocoNav', status: 'CONNECTED', configJson: '{"pollSeconds":30}', lastSyncAt: daysAgo(0) },
    { key: 'biometric', name: 'ZKTeco Biometric Attendance', category: 'BIOMETRIC', provider: 'ZKTeco', status: 'ERROR', configJson: '{"deviceIp":"192.168.1.45"}' },
    { key: 'rfid', name: 'RFID Student Cards', category: 'RFID', provider: 'HID Global', status: 'DISCONNECTED', configJson: '{}' },
    { key: 'cctv', name: 'CCTV — SecureVision', category: 'CCTV', provider: 'SecureVision', status: 'CONNECTED', configJson: '{"cams":42}', lastSyncAt: daysAgo(0) },
    { key: 'tally', name: 'Tally Accounting Sync', category: 'ACCOUNTING', provider: 'TallyPrime', status: 'DISCONNECTED', configJson: '{}' },
    { key: 'google-classroom', name: 'Google Classroom', category: 'LMS', provider: 'Google Workspace', status: 'CONNECTED', configJson: '{"domain":"greenwood.edu.in"}', lastSyncAt: daysAgo(2) },
    { key: 'saral', name: 'Saral Data Portal (Govt)', category: 'GOVERNMENT', provider: 'Maharashtra Education Dept', status: 'DISCONNECTED', configJson: '{}' },
    { key: 'stripe', name: 'Stripe (Intl fees)', category: 'PAYMENT', provider: 'Stripe', status: 'DISCONNECTED', configJson: '{}' },
  ] })
  await db.approvalWorkflow.createMany({ data: [
    { name: 'Leave Approval', entityType: 'LeaveRequest', steps: JSON.stringify([{ step: 1, approverRole: 'TEACHER' }, { step: 2, approverRole: 'PRINCIPAL' }]) },
    { name: 'Certificate Issuance', entityType: 'CertificateRequest', steps: JSON.stringify([{ step: 1, approverRole: 'PRINCIPAL', label: 'Verify request' }, { step: 2, approverRole: 'SCHOOL_ADMIN', label: 'Approve & issue' }]) },
    { name: 'Expense Approval', entityType: 'Expense', steps: JSON.stringify([{ step: 1, approverRole: 'ACCOUNTANT' }, { step: 2, approverRole: 'SCHOOL_ADMIN' }]) },
  ] })
  await db.auditLog.createMany({ data: [
    { userId: adminUser?.id, userName: 'Arvind Khanna', userRole: 'SUPER_ADMIN', action: 'CREATE', entity: 'Exam', details: '{"name":"Term 2 Examination"}', createdAt: daysAgo(10) },
    { userName: 'Vikram Rao', userRole: 'ACCOUNTANT', action: 'UPDATE', entity: 'FeeInvoice', details: '{"changes":["status","paidAmount"]}', createdAt: daysAgo(9) },
    { userName: 'Rajesh Malhotra', userRole: 'PRINCIPAL', action: 'APPROVE', entity: 'CertificateRequest', details: '{"type":"BONAFIDE"}', createdAt: daysAgo(5) },
    { userName: 'Priya Nair', userRole: 'TEACHER', action: 'CREATE', entity: 'Assignment', details: '{"title":"Essay: Impact of Climate Change"}', createdAt: daysAgo(7) },
    { userName: 'Sunita Desai', userRole: 'SCHOOL_ADMIN', action: 'UPDATE', entity: 'Student', details: '{"changes":["sectionId"]}', createdAt: daysAgo(4) },
    { userName: 'Deepa Kamath', userRole: 'COUNSELLOR', action: 'UPDATE', entity: 'Lead', details: '{"stage":"COUNSELLING"}', createdAt: daysAgo(3) },
    { userName: 'Anita Bose', userRole: 'NURSE', action: 'CREATE', entity: 'ClinicVisit', details: '{"reason":"Headache"}', createdAt: daysAgo(3) },
    { userName: 'Ravi Naik', userRole: 'SECURITY', action: 'CREATE', entity: 'SecurityAlert', details: '{"type":"INTRUSION"}', createdAt: daysAgo(2) },
    { userName: 'Mahesh Tiwari', userRole: 'LIBRARIAN', action: 'CREATE', entity: 'LibraryTransaction', details: '{"book":"Sapiens"}', createdAt: daysAgo(1) },
    { userName: 'Arvind Khanna', userRole: 'SUPER_ADMIN', action: 'EXPORT', entity: 'students', details: '{"rows":116}', createdAt: daysAgo(1) },
    { userName: 'Vikram Rao', userRole: 'ACCOUNTANT', action: 'VIEW', entity: 'Payment', details: '{"receiptNo":"RCPT-2025-00112"}', createdAt: daysAgo(0) },
    { userName: 'Geeta Singh', userRole: 'WARDEN', action: 'UPDATE', entity: 'HostelAllocation', details: '{"action":"check-in"}', createdAt: daysAgo(0) },
  ] })
  for (const [role, mods] of Object.entries(MODULE_ACCESS_SEED)) {
    for (const m of mods) await db.permission.create({ data: { role, module: m, allowed: true } })
  }

  const counts = {
    users: await db.user.count(), students: await db.student.count(), employees: await db.employee.count(),
    attendance: await db.attendance.count(), invoices: await db.feeInvoice.count(), marks: await db.mark.count(),
    leads: await db.lead.count(), books: await db.book.count(), beds: await db.bed.count(),
  }
  console.log('Seed complete ✅', JSON.stringify(counts))
}

const MODULE_ACCESS_SEED: Record<string, string[]> = {
  SUPER_ADMIN: ['dashboard', 'admissions', 'students', 'parents', 'teachers', 'academics', 'lms', 'attendance', 'examinations', 'fees', 'hr', 'transport', 'hostel', 'security', 'health', 'library', 'assets', 'communication', 'events', 'certificates', 'analytics', 'integrations', 'settings', 'audit-logs'],
  SCHOOL_ADMIN: ['dashboard', 'admissions', 'students', 'parents', 'teachers', 'academics', 'lms', 'attendance', 'examinations', 'fees', 'hr', 'transport', 'hostel', 'security', 'health', 'library', 'assets', 'communication', 'events', 'certificates', 'analytics', 'integrations', 'settings', 'audit-logs'],
  PRINCIPAL: ['dashboard', 'admissions', 'students', 'parents', 'teachers', 'academics', 'lms', 'attendance', 'examinations', 'transport', 'hostel', 'security', 'health', 'library', 'assets', 'communication', 'events', 'certificates', 'analytics', 'audit-logs'],
  TEACHER: ['dashboard', 'students', 'parents', 'academics', 'lms', 'attendance', 'examinations', 'library', 'health', 'communication', 'events', 'certificates'],
  ACCOUNTANT: ['dashboard', 'fees', 'analytics', 'events'],
  HR: ['dashboard', 'teachers', 'hr', 'assets', 'analytics', 'events'],
  COUNSELLOR: ['dashboard', 'admissions', 'students', 'events'],
  LIBRARIAN: ['dashboard', 'library', 'students', 'events'],
  TRANSPORT: ['dashboard', 'transport', 'students', 'events'],
  WARDEN: ['dashboard', 'hostel', 'students', 'health', 'events'],
  NURSE: ['dashboard', 'health', 'students', 'events'],
  SECURITY: ['dashboard', 'security', 'students', 'events'],
  PARENT: ['parent-portal', 'fees', 'transport', 'hostel', 'attendance', 'examinations', 'lms', 'library', 'communication', 'events', 'certificates', 'health'],
  STUDENT: ['student-portal', 'lms', 'attendance', 'examinations', 'library', 'transport', 'hostel', 'communication', 'events', 'certificates', 'fees'],
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
