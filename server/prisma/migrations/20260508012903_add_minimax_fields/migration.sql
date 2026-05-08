-- AlterTable
ALTER TABLE "Persona" ADD COLUMN "description" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PracticeMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "speaker" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "content" TEXT NOT NULL,
    "meta" TEXT NOT NULL DEFAULT '{}',
    "metaJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PracticeMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PracticeSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PracticeMessage" ("content", "createdAt", "id", "meta", "seq", "sessionId", "speaker", "type") SELECT "content", "createdAt", "id", "meta", "seq", "sessionId", "speaker", "type" FROM "PracticeMessage";
DROP TABLE "PracticeMessage";
ALTER TABLE "new_PracticeMessage" RENAME TO "PracticeMessage";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
