const Product = require('../models/Product');
const { AppError, asyncHandler } = require('../utils/AppError');
const { sanitize } = require('../utils/validators');

/** Accepts either the numeric productId (1..101) or a Mongo _id. */
async function findProduct(idParam) {
  const asNumber = Number.parseInt(idParam, 10);
  if (Number.isInteger(asNumber) && String(asNumber) === String(idParam).trim()) {
    return Product.findOne({ productId: asNumber });
  }
  if (/^[0-9a-fA-F]{24}$/.test(String(idParam))) {
    return Product.findById(idParam);
  }
  return null;
}

/**
 * GET /api/products
 * Public. Returns the live price list.
 *
 * ?grouped=true  -> categories in the exact shape the old data.js exported,
 *                   so the frontend can drop it straight into CATEGORIES.
 * ?category=id   -> filter by category
 * ?search=text   -> name search
 * ?includeUnavailable=true -> admin listings
 */
const listProducts = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.includeUnavailable !== 'true') {
    filter.isActive = true;
  }
  if (req.query.category) filter.categoryId = sanitize(req.query.category, 60);
  if (req.query.search) {
    filter.name = { $regex: sanitize(req.query.search, 80).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  }

  const products = await Product.find(filter).sort({ categoryOrder: 1, sortOrder: 1, productId: 1 });
  const publicProducts = products.map((p) => p.toPublicJSON());

  if (req.query.grouped === 'true') {
    const map = new Map();
    for (const p of products) {
      if (!map.has(p.categoryId)) {
        map.set(p.categoryId, {
          id: p.categoryId,
          title: p.categoryTitle,
          order: p.categoryOrder,
          items: [],
        });
      }
      map.get(p.categoryId).items.push(p.toPublicJSON());
    }
    const categories = [...map.values()].sort((a, b) => a.order - b.order);
    return res.json({ success: true, count: publicProducts.length, categories });
  }

  return res.json({ success: true, count: publicProducts.length, products: publicProducts });
});

/** GET /api/products/:id — public */
const getProduct = asyncHandler(async (req, res) => {
  const product = await findProduct(req.params.id);
  if (!product) throw AppError.notFound('That product could not be found.');
  res.json({ success: true, product: product.toPublicJSON() });
});

/** POST /api/products — admin only */
const createProduct = asyncHandler(async (req, res) => {
  const b = req.body || {};

  let productId = Number.parseInt(b.productId ?? b.id, 10);
  if (!Number.isInteger(productId) || productId <= 0) {
    const highest = await Product.findOne().sort({ productId: -1 }).select('productId');
    productId = (highest?.productId || 0) + 1;
  } else {
    const clash = await Product.findOne({ productId });
    if (clash) throw AppError.conflict(`Product #${productId} already exists.`);
  }

  const product = await Product.create({
    productId,
    name: sanitize(b.name, 200),
    tamilName: sanitize(b.tamilName, 200),
    description: sanitize(b.description, 1000),
    content: sanitize(b.content, 50) || '1 BOX',
    image: sanitize(b.image, 300) || '/MVP.png',
    categoryId: sanitize(b.categoryId, 60),
    categoryTitle: sanitize(b.categoryTitle, 120),
    categoryOrder: Number(b.categoryOrder) || 0,
    price: Number(b.price),
    discountPercent: b.discountPercent === undefined || b.discountPercent === null ? null : Number(b.discountPercent),
    taxPercent: b.taxPercent === undefined || b.taxPercent === null ? null : Number(b.taxPercent),
    stock: b.stock === undefined ? 1000 : Number(b.stock),
    trackStock: b.trackStock === undefined ? true : Boolean(b.trackStock),
    isAvailable: b.isAvailable === undefined ? true : Boolean(b.isAvailable),
    isActive: b.isActive === undefined ? true : Boolean(b.isActive),
    sortOrder: Number(b.sortOrder) || 0,
  });

  res.status(201).json({ success: true, product: product.toPublicJSON() });
});

/** PUT /api/products/:id — admin only */
const updateProduct = asyncHandler(async (req, res) => {
  const product = await findProduct(req.params.id);
  if (!product) throw AppError.notFound('That product could not be found.');

  const b = req.body || {};
  const stringFields = {
    name: 200,
    tamilName: 200,
    description: 1000,
    content: 50,
    image: 300,
    categoryId: 60,
    categoryTitle: 120,
  };

  for (const [field, max] of Object.entries(stringFields)) {
    if (b[field] !== undefined) product[field] = sanitize(b[field], max);
  }
  for (const field of ['price', 'stock', 'sortOrder', 'categoryOrder']) {
    if (b[field] !== undefined) product[field] = Number(b[field]);
  }
  for (const field of ['discountPercent', 'taxPercent']) {
    if (b[field] !== undefined) product[field] = b[field] === null ? null : Number(b[field]);
  }
  for (const field of ['isAvailable', 'isActive', 'trackStock']) {
    if (b[field] !== undefined) product[field] = Boolean(b[field]);
  }

  await product.save();
  res.json({ success: true, product: product.toPublicJSON() });
});

/**
 * DELETE /api/products/:id — admin only.
 * Soft delete by default so historical orders keep a valid reference.
 * Pass ?hard=true to remove the document outright.
 */
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await findProduct(req.params.id);
  if (!product) throw AppError.notFound('That product could not be found.');

  if (req.query.hard === 'true') {
    await product.deleteOne();
    return res.json({ success: true, message: 'Product permanently deleted.', hard: true });
  }

  product.isActive = false;
  product.isAvailable = false;
  await product.save();
  return res.json({ success: true, message: 'Product deactivated.', product: product.toPublicJSON() });
});

module.exports = { listProducts, getProduct, createProduct, updateProduct, deleteProduct };
