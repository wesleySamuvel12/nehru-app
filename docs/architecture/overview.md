# System Architecture Overview

The School ERP platform is structured as a high-throughput, multi-tenant distributed monorepo powered by NestJS and Next.js.

## Topology
- **apps/backend**: Unified NestJS API engine serving REST endpoints, WebSocket event bus, and Prisma ORM.
- **apps/admin-web**: Administrative command center for Super Admins, School Admins, HR, Accountants, and Facility Managers.
- **apps/teacher-web**: Focused workspace for faculty attendance marking, grading, syllabus tracking, and homework.
- **apps/student-web**: Student learning hub for assignments, exam timetable, report cards, and course materials.
- **apps/parent-web**: Guardian portal for tracking student attendance, paying tuition fees, and teacher messaging.
