/**
 * Seeds MongoDB with the full MVP Crackers price list.
 *
 *   npm run seed              upsert — updates names/prices, keeps stock
 *   npm run seed -- --fresh   wipes the products collection first
 *   npm run seed -- --reset-stock  also resets every stock level
 *
 * The catalogue lives in src/data/catalog.json, generated from the
 * frontend's original data.js, so productIds (1..101) match exactly what
 * the existing cart already uses.
 */
const path = require('path');
const { config, validateConfig } = require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const Product = require('../models/Product');

const catalog = require(path.join(__dirname, '../data/catalog.json'));

const DEFAULT_STOCK = 500;

async function seed() {
  validateConfig();
  await connectDB();

  const fresh = process.argv.includes('--fresh');
  const resetStock = process.argv.includes('--reset-stock') || fresh;

  if (fresh) {
    const { deletedCount } = await Product.deleteMany({});
    console.log(`  Cleared ${deletedCount} existing products`);
  }

  const ops = [];
  let categoryOrder = 0;

  for (const category of catalog) {
    categoryOrder += 1;
    let sortOrder = 0;

    for (const item of category.items) {
      sortOrder += 1;

      const set = {
        name: item.name,
        tamilName: item.tamilName || '',
        content: item.content || '1 BOX',
        price: Number(item.price),
        image: item.image || '/MVP.png',
        categoryId: category.id,
        categoryTitle: category.title,
        categoryOrder,
        sortOrder,
        isActive: true,
        isAvailable: true,
      };

      if (resetStock) {
        set.stock = DEFAULT_STOCK;
        set.trackStock = true;
      }

      ops.push({
        updateOne: {
          filter: { productId: item.id },
          update: {
            $set: set,
            // Only applied when the document is created, so a re-seed
            // never silently resets stock you have been decrementing.
            $setOnInsert: resetStock
              ? { productId: item.id }
              : { productId: item.id, stock: DEFAULT_STOCK, trackStock: true },
          },
          upsert: true,
        },
      });
    }
  }

  const result = await Product.bulkWrite(ops, { ordered: false });
  const total = await Product.countDocuments();

  // A product priced at 0 is orderable for free. Almost always a typo in
  // the price list, so say so loudly rather than letting it slip through.
  const freebies = await Product.find({ price: { $lte: 0 }, isActive: true }).select(
    'productId name price'
  );
  if (freebies.length) {
    console.log('\n  WARNING — these products have a price of 0 and can be ordered for free:');
    freebies.forEach((p) => console.log(`     #${p.productId}  ${p.name}`));
    console.log(
      '   Fix the price in Frontend/src/data.js and re-run `npm run seed`, or set it\n' +
        '   from the admin panel. To hide one for now, mark it unavailable.'
    );
  }

  console.log('\n  Seed complete');
  console.log(`   Inserted : ${result.upsertedCount}`);
  console.log(`   Updated  : ${result.modifiedCount}`);
  console.log(`   Total products in DB : ${total}`);
  console.log(`   Categories           : ${catalog.length}`);
  console.log(`   Database             : ${config.mongoUri.replace(/\/\/[^@]*@/, '//***:***@')}\n`);

  await disconnectDB();
}

seed().catch(async (err) => {
  console.error('\n  Seed failed:', err.message, '\n');
  await disconnectDB().catch(() => {});
  process.exit(1);
});
