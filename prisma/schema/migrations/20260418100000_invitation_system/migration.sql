-- AlterEnum
ALTER TYPE "InvitationStatus" ADD VALUE 'CANCELLED';

-- DropForeignKey
ALTER TABLE "Invitation" DROP CONSTRAINT "Invitation_invitedById_fkey";

-- DropForeignKey
ALTER TABLE "Invitation" DROP CONSTRAINT "Invitation_invitedUserId_fkey";

-- DropIndex
DROP INDEX "Invitation_eventId_invitedUserId_key";

-- DropIndex
DROP INDEX "Invitation_invitedById_idx";

-- DropIndex
DROP INDEX "Invitation_invitedUserId_idx";

-- AlterTable
ALTER TABLE "Invitation" DROP COLUMN "invitedById",
DROP COLUMN "invitedUserId",
ADD COLUMN     "inviteeId" TEXT NOT NULL,
ADD COLUMN     "inviterId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "status" SET DEFAULT 'INITIATED';

-- CreateIndex
CREATE INDEX "Invitation_inviteeId_idx" ON "Invitation"("inviteeId");

-- CreateIndex
CREATE INDEX "Invitation_inviterId_idx" ON "Invitation"("inviterId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_eventId_inviteeId_key" ON "Invitation"("eventId", "inviteeId");

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

