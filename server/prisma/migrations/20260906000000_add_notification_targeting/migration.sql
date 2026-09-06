-- Add notification targeting fields
ALTER TABLE "Notification"
ADD COLUMN "clubId" VARCHAR(24),
ADD COLUMN "recipientUserId" VARCHAR(24),
ADD COLUMN "targetScope" VARCHAR(32) NOT NULL DEFAULT 'USER';

-- Add notification targeting indexes
CREATE INDEX "Notification_recipientUserId_createdAt_idx"
ON "Notification"("recipientUserId", "createdAt");

CREATE INDEX "Notification_targetScope_createdAt_idx"
ON "Notification"("targetScope", "createdAt");

CREATE INDEX "Notification_clubId_createdAt_idx"
ON "Notification"("clubId", "createdAt");

-- Add club relationship
ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_clubId_fkey"
FOREIGN KEY ("clubId")
REFERENCES "Club"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;