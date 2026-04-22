-- Manual rollback for add_performance_indexes migration.
DROP INDEX IF EXISTS "Invitation_inviteeId_createdAt_idx";
DROP INDEX IF EXISTS "Invitation_eventId_status_createdAt_idx";
DROP INDEX IF EXISTS "Payment_eventId_status_idx";
DROP INDEX IF EXISTS "Payment_userId_createdAt_idx";
DROP INDEX IF EXISTS "Review_eventId_deletedAt_createdAt_idx";
DROP INDEX IF EXISTS "Participation_userId_eventId_status_idx";
DROP INDEX IF EXISTS "Participation_userId_createdAt_idx";
DROP INDEX IF EXISTS "Participation_eventId_status_createdAt_idx";
DROP INDEX IF EXISTS "Event_deletedAt_isPublic_isPaid_dateTime_idx";
DROP INDEX IF EXISTS "User_createdAt_idx";
