# Database Migrations Workflow

1. Modify `apps/backend/prisma/schema.prisma`.
2. Run `pnpm db:migrate` to generate a migration SQL file.
3. Apply migration to test/staging databases.
4. Run `pnpm db:seed` to populate standard default roles and admin accounts.
