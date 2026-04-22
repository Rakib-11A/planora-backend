-- Performance indexes (safe to rerun with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User"("createdAt");
CREATE INDEX IF NOT EXISTS "Event_deletedAt_isPublic_isPaid_dateTime_idx" ON "Event"("deletedAt", "isPublic", "isPaid", "dateTime");
CREATE INDEX IF NOT EXISTS "Participation_eventId_status_createdAt_idx" ON "Participation"("eventId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "Participation_userId_createdAt_idx" ON "Participation"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Participation_userId_eventId_status_idx" ON "Participation"("userId", "eventId", "status");
CREATE INDEX IF NOT EXISTS "Review_eventId_deletedAt_createdAt_idx" ON "Review"("eventId", "deletedAt", "createdAt");
CREATE INDEX IF NOT EXISTS "Payment_userId_createdAt_idx" ON "Payment"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Payment_eventId_status_idx" ON "Payment"("eventId", "status");
CREATE INDEX IF NOT EXISTS "Invitation_eventId_status_createdAt_idx" ON "Invitation"("eventId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "Invitation_inviteeId_createdAt_idx" ON "Invitation"("inviteeId", "createdAt");
