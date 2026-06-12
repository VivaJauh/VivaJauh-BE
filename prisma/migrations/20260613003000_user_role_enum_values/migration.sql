-- Rename legacy access roles to the cooperative domain roles.
ALTER TYPE "UserRole" RENAME VALUE 'field_officer' TO 'primary_admin';
ALTER TYPE "UserRole" RENAME VALUE 'remote_admin' TO 'secondary_admin';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'member';
