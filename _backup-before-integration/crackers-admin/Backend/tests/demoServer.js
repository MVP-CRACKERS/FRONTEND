/* eslint-disable */
/**
 * DEMO SERVER — no MongoDB required.
 *
 *   npm run dev:demo
 *
 * Runs the real backend against an in-memory store seeded with the full
 * price list and a demo admin, so you can click through the whole site
 * before setting up MongoDB Atlas.
 *
 * Everything is lost when you stop the process. Never use in production.
 */
process.env.MONGODB_URI = 'mongodb://in-memory/demo';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'demo-only-secret-demo-only-secret-demo-only-secret';
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@mvpcrackers.com';
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@12345';

require('./memoryMongo').install();

const fs = require('fs');
const { config } = require('../src/config/env');
const { createApp } = require('../src/app');
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

  await Admin.create({
    name: 'Demo Admin',
    email: config.admin.email.toLowerCase(),
    passwordHash: await Admin.hashPassword(config.admin.password),
    role: 'superadmin',
  });

  fs.mkdirSync(config.invoicesDir, { recursive: true });

  createApp().listen(config.port, () => {
    console.log(`\n  DEMO MODE — in-memory database, data resets on restart`);
    console.log(`   API   : http://localhost:${config.port}/api`);
    console.log(`   Admin : ${config.admin.email} / ${config.admin.password}`);
    console.log(`   ${catalog.reduce((s, c) => s + c.items.length, 0)} products loaded\n`);
  });
})();
