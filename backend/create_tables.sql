-- Create Announcement table if it doesn't exist
CREATE TABLE IF NOT EXISTS "Announcement" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- Create AnnouncementReply table if it doesn't exist
CREATE TABLE IF NOT EXISTS "AnnouncementReply" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AnnouncementReply_pkey" PRIMARY KEY ("id")
);

-- Create Assignment table if it doesn't exist
CREATE TABLE IF NOT EXISTS "Assignment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "dueDate" TIMESTAMP(3),
    "totalMarks" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- Create AssignmentStatus table if it doesn't exist
CREATE TABLE IF NOT EXISTS "AssignmentStatus" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "grade" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssignmentStatus_pkey" PRIMARY KEY ("id")
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS "Announcement_projectId_idx" ON "Announcement"("projectId");
CREATE INDEX IF NOT EXISTS "AnnouncementReply_announcementId_idx" ON "AnnouncementReply"("announcementId");
CREATE INDEX IF NOT EXISTS "AnnouncementReply_userId_idx" ON "AnnouncementReply"("userId");
CREATE INDEX IF NOT EXISTS "Assignment_projectId_idx" ON "Assignment"("projectId");
CREATE INDEX IF NOT EXISTS "AssignmentStatus_assignmentId_idx" ON "AssignmentStatus"("assignmentId");
CREATE INDEX IF NOT EXISTS "AssignmentStatus_userId_idx" ON "AssignmentStatus"("userId");

-- Create unique constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'AssignmentStatus_assignmentId_userId_key'
    ) THEN
        ALTER TABLE "AssignmentStatus" 
        ADD CONSTRAINT "AssignmentStatus_assignmentId_userId_key" 
        UNIQUE ("assignmentId", "userId");
    END IF;
END $$;

-- Add foreign keys if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Announcement_projectId_fkey'
    ) THEN
        ALTER TABLE "Announcement" 
        ADD CONSTRAINT "Announcement_projectId_fkey" 
        FOREIGN KEY ("projectId") REFERENCES "Project"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'AnnouncementReply_announcementId_fkey'
    ) THEN
        ALTER TABLE "AnnouncementReply" 
        ADD CONSTRAINT "AnnouncementReply_announcementId_fkey" 
        FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'AnnouncementReply_userId_fkey'
    ) THEN
        ALTER TABLE "AnnouncementReply" 
        ADD CONSTRAINT "AnnouncementReply_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Assignment_projectId_fkey'
    ) THEN
        ALTER TABLE "Assignment" 
        ADD CONSTRAINT "Assignment_projectId_fkey" 
        FOREIGN KEY ("projectId") REFERENCES "Project"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'AssignmentStatus_assignmentId_fkey'
    ) THEN
        ALTER TABLE "AssignmentStatus" 
        ADD CONSTRAINT "AssignmentStatus_assignmentId_fkey" 
        FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'AssignmentStatus_userId_fkey'
    ) THEN
        ALTER TABLE "AssignmentStatus" 
        ADD CONSTRAINT "AssignmentStatus_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
