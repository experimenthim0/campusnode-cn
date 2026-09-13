-- Verified before creating this migration: no duplicate (eventId, studentId)
-- or (eventId, externalUserId) pairs exist in the current database.
CREATE UNIQUE INDEX "Participation_eventId_studentId_key"
ON "Participation"("eventId", "studentId");

CREATE UNIQUE INDEX "Participation_eventId_externalUserId_key"
ON "Participation"("eventId", "externalUserId");
