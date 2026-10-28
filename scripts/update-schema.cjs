const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const statements = [
    `ALTER TABLE WidgetConfig ADD COLUMN showResetBtn BOOLEAN NOT NULL DEFAULT 0;`,
    `ALTER TABLE WidgetConfig ADD COLUMN resetBtnText TEXT NOT NULL DEFAULT 'RESET';`,
    `ALTER TABLE WidgetConfig ADD COLUMN badgeText TEXT NOT NULL DEFAULT '';`,
    `ALTER TABLE WidgetConfig ADD COLUMN borderStyle TEXT NOT NULL DEFAULT 'none';`,
    `CREATE TABLE IF NOT EXISTS FitmentSearchLog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop TEXT NOT NULL,
      year TEXT NOT NULL,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE INDEX IF NOT EXISTS fitment_search_log_shop_created_idx ON FitmentSearchLog(shop, createdAt);`
  ];

  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log('Executed:', sql.trim().split('\n')[0]);
    } catch (e) {
      console.log('Skipped/exists:', e.message);
    }
  }

  const cols = await prisma.$queryRawUnsafe('PRAGMA table_info(WidgetConfig);');
  console.log('Updated WidgetConfig columns:', cols.map(c => c.name));
}

main().catch(console.error).finally(() => prisma.$disconnect());
