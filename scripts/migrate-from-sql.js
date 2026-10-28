import fs from 'fs';
import readline from 'readline';
import prisma from '../app/db.server.js';

/**
 * Migration Script: Imports MySQL dump (.sql) from legacy PHP app into modern Prisma database
 * Handles:
 * 1. access_table -> StoreAccess (preserves plan 1/2, plan_id, test status)
 * 2. store_{shop}_ymm_data -> StoreYmmData (shop, year, make, model, collection)
 */

export async function migrateFromSqlFile(sqlFilePath) {
  if (!fs.existsSync(sqlFilePath)) {
    throw new Error(`SQL file not found at: ${sqlFilePath}`);
  }

  console.log(`Starting migration from: ${sqlFilePath}`);
  const fileStream = fs.createReadStream(sqlFilePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let currentTable = null;
  const storeMap = new Map(); // prefix -> full domain
  let accessCount = 0;
  let ymmCount = 0;
  let currentInsertBuffer = '';

  for await (const line of rl) {
    const trimmed = line.trim();

    // Check table name
    const insertMatch = trimmed.match(/^INSERT INTO\s+[`']?([a-zA-Z0-9_\-]+)[`']?/i);
    if (insertMatch) {
      currentTable = insertMatch[1];
      currentInsertBuffer = trimmed;
    } else if (currentInsertBuffer) {
      currentInsertBuffer += ' ' + trimmed;
    }

    if (currentInsertBuffer.endsWith(';')) {
      const fullQuery = currentInsertBuffer;
      currentInsertBuffer = '';

      if (currentTable === 'access_table') {
        const valuesPart = fullQuery.substring(fullQuery.indexOf('VALUES') + 6);
        const rowRegex = /\(([^)]+)\)/g;
        let match;
        while ((match = rowRegex.exec(valuesPart)) !== null) {
          const rawVals = match[1].split(',').map(v => v.trim().replace(/^['"`]|['"`]$/g, ''));
          const id = parseInt(rawVals[0], 10);
          const storeName = rawVals[1];
          const plan = rawVals.length >= 6 ? parseInt(rawVals[5], 10) || 1 : 1;
          const planId = rawVals.length >= 7 ? String(rawVals[6]) : null;
          const test = rawVals.length >= 8 ? rawVals[7] === '1' : false;

          if (storeName && storeName.includes('.')) {
            const prefix = storeName.split('.')[0];
            storeMap.set(prefix, storeName);

            try {
              await prisma.storeAccess.upsert({
                where: { shop: storeName },
                update: { plan, planId, test },
                create: { shop: storeName, plan, planId, test },
              });
              accessCount++;
            } catch (err) {
              console.error(`Failed to upsert storeAccess for ${storeName}:`, err.message);
            }
          }
        }
      } else if (currentTable && currentTable.startsWith('store_') && currentTable.endsWith('_ymm_data')) {
        const prefix = currentTable.replace(/^store_/, '').replace(/_ymm_data$/, '');
        let shopDomain = storeMap.get(prefix) || `${prefix}.myshopify.com`;

        const valuesPart = fullQuery.substring(fullQuery.indexOf('VALUES') + 6);
        const rowRegex = /\(([^)]+)\)/g;
        let match;
        const records = [];

        while ((match = rowRegex.exec(valuesPart)) !== null) {
          const rowStr = match[1];
          const tokens = [];
          let currentToken = '';
          let inQuote = false;
          let quoteChar = '';

          for (let i = 0; i < rowStr.length; i++) {
            const char = rowStr[i];
            if ((char === "'" || char === '"') && (i === 0 || rowStr[i - 1] !== '\\')) {
              if (!inQuote) {
                inQuote = true;
                quoteChar = char;
              } else if (quoteChar === char) {
                inQuote = false;
              } else {
                currentToken += char;
              }
            } else if (char === ',' && !inQuote) {
              tokens.push(currentToken.trim());
              currentToken = '';
            } else {
              currentToken += char;
            }
          }
          tokens.push(currentToken.trim());

          if (tokens.length >= 5) {
            const year = tokens[1].replace(/^['"`]|['"`]$/g, '').trim();
            const make = tokens[2].replace(/^['"`]|['"`]$/g, '').trim();
            const model = tokens[3].replace(/^['"`]|['"`]$/g, '').trim();
            const collection = tokens[4].replace(/^['"`]|['"`]$/g, '').trim();

            if (year && make && model && collection) {
              records.push({
                shop: shopDomain,
                year,
                make,
                model,
                collection,
              });
            }
          }
        }

        if (records.length > 0) {
          try {
            // In SQLite, createMany works without skipDuplicates
            const res = await prisma.storeYmmData.createMany({
              data: records,
            });
            ymmCount += res.count;
            console.log(`Migrated ${res.count} records for ${shopDomain} (Table: ${currentTable})`);
          } catch (err) {
            // If duplicate exists, insert row by row with upsert
            let inserted = 0;
            for (const r of records) {
              try {
                await prisma.storeYmmData.upsert({
                  where: {
                    shop_ymm_record_unique: {
                      shop: r.shop,
                      year: r.year,
                      make: r.make,
                      model: r.model,
                      collection: r.collection,
                    },
                  },
                  update: {},
                  create: r,
                });
                inserted++;
              } catch (e) {
                // Ignore duplicate
              }
            }
            ymmCount += inserted;
            console.log(`Upserted ${inserted} records for ${shopDomain} (Table: ${currentTable})`);
          }
        }
      }
    }
  }

  console.log(`\n================ MIGRATION COMPLETE ================`);
  console.log(`Total Stores Synced in StoreAccess: ${accessCount}`);
  console.log(`Total Fitment Rows Imported in StoreYmmData: ${ymmCount}`);
  console.log(`====================================================\n`);

  return { accessCount, ymmCount };
}

if (process.argv[2]) {
  migrateFromSqlFile(process.argv[2])
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
