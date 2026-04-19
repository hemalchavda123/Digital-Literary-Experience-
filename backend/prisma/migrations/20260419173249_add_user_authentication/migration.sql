/*
  Warnings:

  - Added the required column `userId` to the `Annotation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Label` table without a default value. This is not possible if the table is not empty.

*/

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- Create a system user for existing data
INSERT INTO "User" ("id", "email", "username", "password", "createdAt", "updatedAt")
VALUES ('00000000-0000-0000-0000-000000000000', 'system@example.com', 'system', '$2b$10$placeholder', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable: Add userId column with default value for existing rows
ALTER TABLE "Label" ADD COLUMN "userId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

-- AlterTable: Add userId column with default value for existing rows
ALTER TABLE "Annotation" ADD COLUMN "userId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

-- Remove default constraint after backfilling existing data
ALTER TABLE "Label" ALTER COLUMN "userId" DROP DEFAULT;
ALTER TABLE "Annotation" ALTER COLUMN "userId" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Annotation_userId_idx" ON "Annotation"("userId");

-- CreateIndex
CREATE INDEX "Label_userId_idx" ON "Label"("userId");

-- AddForeignKey
ALTER TABLE "Label" ADD CONSTRAINT "Label_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
