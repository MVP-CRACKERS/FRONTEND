/* eslint-disable */
/**
 * DEV-ONLY: runs the real testFlow.js suite against the in-memory store,
 * so the whole backend can be exercised without a mongod binary.
 *
 *   node tests/run.js
 */
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mvp-test';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'test-secret-test-secret-test-secret-test-secret-0123456789';
process.env.NODE_ENV = 'test';
process.env.ADMIN_EMAIL = 'admin@mvpcrackers.com';
process.env.ADMIN_PASSWORD = 'TestPassword123!';
process.env.PUBLIC_BASE_URL = 'http://localhost:5000';

require('./memoryMongo').install();

// Pre-seed catalogue + admin before the suite starts.
const Product = require('../src/models/Product');
const Admin = require('../src/models/Admin');
const catalog = require('../src/data/catalog.json');

(async () => {
  let categoryOrder = 0;
  for (const category of catalog) {
    categoryOrder += 1;
    let sortOrder = 0;
    for (const item of category.items) {
      sortOrder += 1;
      await Product.create({
        productId: item.id,
        name: item.name,
        content: item.content,
        price: item.price,
        image: item.image || '/MVP.png',
        categoryId: category.id,
        categoryTitle: category.title,
        categoryOrder,
        sortOrder,
        stock: 500,
      });
    }
  }
  // One deliberately out-of-stock product for the error-path tests.
  await Product.create({
    productId: 900,
    name: 'Deliberately Out Of Stock Item',
    content: '1 BOX',
    price: 100,
    categoryId: 'test',
    categoryTitle: 'TEST',
    categoryOrder: 99,
    stock: 0,
  });

  await Admin.create({
    name: 'Test Admin',
    email: 'admin@mvpcrackers.com',
    passwordHash: await Admin.hashPassword('TestPassword123!'),
    role: 'superadmin',
  });

  console.log(`  Seeded ${await Product.countDocuments()} products + 1 admin into the in-memory store`);

  require('../src/scripts/testFlow.js');
})();
