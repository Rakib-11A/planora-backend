/*
  Warnings:

  - You are about to drop the column `joinedAt` on the `Participation` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Participation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "ParticipationStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "Participation" DROP COLUMN "joinedAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
