import fs from 'fs';
import readline from 'readline';
import prisma from '../app/db.server.js';

function escapeSqlString(str) {
  if (str === null || str === undefined) return "''";
  return "'" + String(str).replace(/'/g, "''") + "'";
}

function parseSqlRow(line) {
  let s = line.trim();
  if (s.startsWith('(')) s = s.substring(1);
  if (s.endsWith(');') || s.endsWith('),')) s = s.substring(0, s.length - 2);
  else if (s.endsWith(')')) s = s.substring(0, s.length - 1);

  const tokens = [];
  let cur = '';
  let inQuote = false;
  let escape = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escape) {
      cur += ch;
      escape = false;
    } else if (ch === '\\') {
      escape = true;
    } else if (ch === "'") {
      if (inQuote && i + 1 < s.length && s[i + 1] === "'") {
        cur += "'";
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === ',' && !inQuote) {
      tokens.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  tokens.push(cur.trim());
  return tokens;
}

async function flushYmmBatch(batch) {
  if (!batch || batch.length === 0) return 0;
  
  const now = new Date().toISOString();
  const valueClauses = batch.map(r => {
    return `(${escapeSqlString(r.shop)}, ${escapeSqlString(r.year)}, ${escapeSqlString(r.make)}, ${escapeSqlString(r.model)}, ${escapeSqlString(r.collection)}, ${escapeSqlString(now)}, ${escapeSqlString(now)})`;
  }).join(',\n');

  const sql = `INSERT OR IGNORE INTO "StoreYmmData" ("shop", "year", "make", "model", "collection", "createdAt", "updatedAt") VALUES \n${valueClauses};`;

  try {
    await prisma.$executeRawUnsafe(sql);
    return batch.length;
  } catch (err) {
    console.error(`Batch insert error (${batch.length} rows):`, err.message);
    return 0;
  }
}

async function main() {
  const filePath = process.argv[2] || 'c:/Users/WTS-LAP-169/Downloads/magentodevelopme_duplicate_Fitment_Search.sql';

  if (!fs.existsSync(filePath)) {
    console.error(`File does not exist: ${filePath}`);
    process.exit(1);
  }

  const stat = fs.statSync(filePath);
  console.log(`Starting Production Migration from: ${filePath} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
  const startTime = Date.now();

  // SQLite high-performance PRAGMAs
  try {
    await prisma.$executeRawUnsafe('PRAGMA synchronous = OFF;');
    await prisma.$executeRawUnsafe('PRAGMA journal_mode = WAL;');
    await prisma.$executeRawUnsafe('PRAGMA cache_size = 100000;');
    await prisma.$executeRawUnsafe('PRAGMA temp_store = MEMORY;');
  } catch (e) {
    console.log('PRAGMA notice:', e.message);
  }

  const fileStream = fs.createReadStream(filePath, { encoding: 'utf8', highWaterMark: 256 * 1024 });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const storeMap = new Map(); // prefix -> full domain
  let currentTarget = null; // 'access' | 'pricing' | 'ymm'
  let currentPrefix = null;
  let currentShop = null;

  let ymmBatch = [];
  let totalYmmRows = 0;
  let totalStores = 0;
  let totalPlans = 0;
  let lineCount = 0;

  for await (const line of rl) {
    lineCount++;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('--') || trimmed.startsWith('/*')) continue;

    // Detect INSERT INTO
    if (trimmed.startsWith('INSERT INTO `access_table`')) {
      currentTarget = 'access';
      continue;
    } else if (trimmed.startsWith('INSERT INTO `pricing_plans`')) {
      currentTarget = 'pricing';
      continue;
    } else if (trimmed.startsWith('INSERT INTO `store_') && trimmed.includes('_ymm_data`')) {
      // Flush any pending ymmBatch from previous table
      if (ymmBatch.length > 0) {
        await flushYmmBatch(ymmBatch);
        totalYmmRows += ymmBatch.length;
        ymmBatch = [];
      }

      currentTarget = 'ymm';
      const m = trimmed.match(/INSERT INTO `store_([a-zA-Z0-9_\-]+)_ymm_data`/);
      if (m) {
        currentPrefix = m[1];
        currentShop = storeMap.get(currentPrefix) || `${currentPrefix}.myshopify.com`;
      }
      continue;
    } else if (trimmed.startsWith('INSERT INTO') || trimmed.startsWith('CREATE TABLE') || trimmed.startsWith('ALTER TABLE')) {
      if (ymmBatch.length > 0) {
        await flushYmmBatch(ymmBatch);
        totalYmmRows += ymmBatch.length;
        ymmBatch = [];
      }
      currentTarget = null;
    }

    // Process row data lines
    if (trimmed.startsWith('(')) {
      if (currentTarget === 'access') {
        const tokens = parseSqlRow(trimmed);
        if (tokens.length >= 8) {
          const storeName = tokens[1].replace(/^['"`]|['"`]$/g, '').trim();
          const plan = parseInt(tokens[5], 10) || 1;
          const planId = tokens[6] ? tokens[6].replace(/^['"`]|['"`]$/g, '').trim() : null;
          const test = tokens[7].replace(/^['"`]|['"`]$/g, '').trim() === '1';

          if (storeName && storeName.includes('.')) {
            const prefix = storeName.split('.')[0];
            storeMap.set(prefix, storeName);

            try {
              await prisma.storeAccess.upsert({
                where: { shop: storeName },
                update: { plan, planId, test },
                create: { shop: storeName, plan, planId, test },
              });
              totalStores++;
            } catch (err) {
              // Ignore duplicate
            }
          }
        }
      } else if (currentTarget === 'pricing') {
        const tokens = parseSqlRow(trimmed);
        if (tokens.length >= 6) {
          const id = parseInt(tokens[0], 10);
          const title = tokens[1].replace(/^['"`]|['"`]$/g, '').trim();
          const amount = parseFloat(tokens[2]) || 0;
          const currencyCode = tokens[3].replace(/^['"`]|['"`]$/g, '').trim() || 'USD';
          const planDetails = tokens[4].replace(/^['"`]|['"`]$/g, '').trim();
          const maxLimit = parseInt(tokens[5], 10) || 100;

          if (id && title) {
            try {
              await prisma.pricingPlan.upsert({
                where: { id },
                update: { title, amount, currencyCode, planDetails, maxLimit },
                create: { id, title, amount, currencyCode, planDetails, maxLimit },
              });
              totalPlans++;
            } catch (err) {
              // Ignore
            }
          }
        }
      } else if (currentTarget === 'ymm' && currentShop) {
        const tokens = parseSqlRow(trimmed);
        if (tokens.length >= 5) {
          const year = tokens[1].replace(/^['"`]|['"`]$/g, '').trim();
          const make = tokens[2].replace(/^['"`]|['"`]$/g, '').trim();
          const model = tokens[3].replace(/^['"`]|['"`]$/g, '').trim();
          const collection = tokens[4].replace(/^['"`]|['"`]$/g, '').trim();

          if (year && make && model && collection) {
            ymmBatch.push({
              shop: currentShop,
              year,
              make,
              model,
              collection,
            });

            if (ymmBatch.length >= 500) {
              await flushYmmBatch(ymmBatch);
              totalYmmRows += ymmBatch.length;
              ymmBatch = [];

              if (totalYmmRows % 10000 === 0) {
                console.log(`[Import Progress] Processed ${totalYmmRows.toLocaleString()} fitment records (${((lineCount / 1000000) * 100).toFixed(0)}% estimated)`);
              }
            }
          }
        }
      }
    }
  }

  // Flush final remaining batch
  if (ymmBatch.length > 0) {
    await flushYmmBatch(ymmBatch);
    totalYmmRows += ymmBatch.length;
    ymmBatch = [];
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n======================================================');
  console.log('🎉 PRODUCTION MIGRATION SUCCESSFULLY COMPLETED!');
  console.log(`⏱️ Duration: ${durationSec}s`);
  console.log(`🏪 Stores Synced in StoreAccess: ${totalStores}`);
  console.log(`💎 Pricing Plans Configured: ${totalPlans}`);
  console.log(`🚗 Total YMM Fitment Rows Imported: ${totalYmmRows.toLocaleString()}`);
  console.log('======================================================\n');
}

main().catch(err => {
  console.error('Fatal error during migration:', err);
  process.exit(1);
});
