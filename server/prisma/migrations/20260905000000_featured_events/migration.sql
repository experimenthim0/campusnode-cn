-- CreateEnum
CREATE TYPE "FeaturedOrderingMode" AS ENUM ('CUSTOM', 'AUTOMATIC');

-- CreateTable
CREATE TABLE "FeaturedEvent" (
    "id" VARCHAR(24) NOT NULL,
    "eventId" VARCHAR(24) NOT NULL,
    "sponsorName" TEXT,
    "sponsorLogo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeaturedEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeaturedEventSetting" (
    "id" VARCHAR(24) NOT NULL DEFAULT 'default',
    "orderingMode" "FeaturedOrderingMode" NOT NULL DEFAULT 'CUSTOM',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeaturedEventSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeaturedEvent_eventId_key" ON "FeaturedEvent"("eventId");

-- CreateIndex
CREATE INDEX "FeaturedEvent_isActive_displayOrder_idx" ON "FeaturedEvent"("isActive", "displayOrder");

-- CreateIndex
CREATE INDEX "FeaturedEvent_eventId_idx" ON "FeaturedEvent"("eventId");

-- AddForeignKey
ALTER TABLE "FeaturedEvent" ADD CONSTRAINT "FeaturedEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
