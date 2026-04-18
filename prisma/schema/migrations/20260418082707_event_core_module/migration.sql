/*
  Warnings:

  - You are about to drop the column `date` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `eventLink` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `isFeatured` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `organizerId` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `registrationFee` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `time` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Event` table. All the data in the column will be lost.
  - Added the required column `createdById` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dateTime` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Made the column `venue` on table `Event` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_organizerId_fkey";

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "date",
DROP COLUMN "eventLink",
DROP COLUMN "isActive",
DROP COLUMN "isFeatured",
DROP COLUMN "organizerId",
DROP COLUMN "registrationFee",
DROP COLUMN "time",
DROP COLUMN "type",
ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "dateTime" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "isPaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "venue" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Event_dateTime_idx" ON "Event"("dateTime");

-- CreateIndex
CREATE INDEX "Event_isPublic_isPaid_dateTime_idx" ON "Event"("isPublic", "isPaid", "dateTime");

-- CreateIndex
CREATE INDEX "Event_createdById_idx" ON "Event"("createdById");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
