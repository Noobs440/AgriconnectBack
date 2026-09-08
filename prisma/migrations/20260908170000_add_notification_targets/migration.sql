ALTER TABLE "Notification" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'general';
ALTER TABLE "Notification" ADD COLUMN "targetId" TEXT;