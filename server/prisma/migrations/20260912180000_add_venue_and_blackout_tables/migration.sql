-- CreateTable: Venue
CREATE TABLE IF NOT EXISTS "Venue" (
    "id" VARCHAR(24) NOT NULL,
    "name" VARCHAR NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Venue_name_key
CREATE UNIQUE INDEX IF NOT EXISTS "Venue_name_key" ON "Venue"("name");

-- CreateTable: VenueBlackout
CREATE TABLE IF NOT EXISTS "VenueBlackout" (
    "id" VARCHAR(24) NOT NULL,
    "venue" VARCHAR NOT NULL,
    "title" VARCHAR NOT NULL,
    "reason" VARCHAR,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "createdById" VARCHAR(24),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VenueBlackout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: VenueBlackout_venue_startTime_idx
CREATE INDEX IF NOT EXISTS "VenueBlackout_venue_startTime_idx" ON "VenueBlackout"("venue", "startTime");

-- CreateIndex: VenueBlackout_startTime_endTime_idx
CREATE INDEX IF NOT EXISTS "VenueBlackout_startTime_endTime_idx" ON "VenueBlackout"("startTime", "endTime");
