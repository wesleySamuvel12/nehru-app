import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import configuration from './config/configuration';
import { PrismaService } from './database/prisma.service';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { SchoolsModule } from './schools/schools.module';
import { BranchesModule } from './branches/branches.module';
import { StudentsModule } from './students/students.module';
import { ParentsModule } from './parents/parents.module';
import { TeachersModule } from './teachers/teachers.module';
import { EmployeesModule } from './employees/employees.module';
import { AcademicsModule } from './academics/academics.module';
import { ClassesModule } from './classes/classes.module';
import { SubjectsModule } from './subjects/subjects.module';
import { AttendanceModule } from './attendance/attendance.module';
import { TimetableModule } from './timetable/timetable.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { ExamsModule } from './exams/exams.module';
import { GradesModule } from './grades/grades.module';
import { FeesModule } from './fees/fees.module';
import { LibraryModule } from './library/library.module';
import { TransportModule } from './transport/transport.module';
import { HostelModule } from './hostel/hostel.module';
import { HealthModule } from './health/health.module';
import { SecurityModule } from './security/security.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DocumentsModule } from './documents/documents.module';
import { MeetingsModule } from './meetings/meetings.module';
import { ReportsModule } from './reports/reports.module';
import { AuditModule } from './audit/audit.module';
import { HealthCheckModule } from './health-check/health-check.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'super-secret-jwt-token-key-2026',
      signOptions: { expiresIn: '7d' },
    }),
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    SchoolsModule,
    BranchesModule,
    StudentsModule,
    ParentsModule,
    TeachersModule,
    EmployeesModule,
    AcademicsModule,
    ClassesModule,
    SubjectsModule,
    AttendanceModule,
    TimetableModule,
    AssignmentsModule,
    ExamsModule,
    GradesModule,
    FeesModule,
    LibraryModule,
    TransportModule,
    HostelModule,
    HealthModule,
    SecurityModule,
    NotificationsModule,
    DocumentsModule,
    MeetingsModule,
    ReportsModule,
    AuditModule,
    HealthCheckModule
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
