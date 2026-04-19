-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "featuredEventId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SiteSettings_featuredEventId_key" ON "SiteSettings"("featuredEventId");

-- AddForeignKey
ALTER TABLE "SiteSettings" ADD CONSTRAINT "SiteSettings_featuredEventId_fkey" FOREIGN KEY ("featuredEventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
