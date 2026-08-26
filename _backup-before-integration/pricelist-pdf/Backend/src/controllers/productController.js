const Product = require('../models/Product');
const Order = require('../models/Order');
const { AppError, asyncHandler } = require('../utils/AppError');
const { sanitize } = require('../utils/validators');

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const money = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/** Accepts either the numeric productId (1..n) or a Mongo _id. */
async function findProduct(idParam) {
  const raw = String(idParam ?? '').trim();
  const asNumber = Number.parseInt(raw, 10);
  if (Number.isInteger(asNumber) && String(asNumber) === raw) {
    return Product.findOne({ productId: asNumber });
  }
  if (/^[0-9a-fA-F]{24}$/.test(raw)) {
    return Product.findById(raw);
  }
  return null;
}

const slugify = (str) =>
  sanitize(str, 60)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'uncategorised';

/**
 * Validates an admin's product payload.
 *
 * `partial` = true for edits, where only the supplied fields are checked.
 * Returns { data, errors } — the caller decides how to react.
 */
function validateProductPayload(body = {}, { partial = false } = {}) {
  const errors = {};
  const data = {};

  const has = (key) => body[key] !== undefined && body[key] !== null;

  // ── name ──
  if (has('name') || !partial) {
    const name = sanitize(body.name, 200);
    if (!name) errors.name = 'Product name is required';
    else if (name.length < 2) errors.name = 'Product name is too short';
    else data.name = name;
  }

  // ── category ──
  if (has('categoryTitle') || has('categoryId') || !partial) {
    const categoryTitle = sanitize(body.categoryTitle, 120);
    const categoryId = slugify(body.categoryId || categoryTitle);
    if (!categoryTitle) errors.categoryTitle = 'Category is required';
    else {
      data.categoryTitle = categoryTitle;
      data.categoryId = categoryId;
    }
  }

  // ── price ──
  if (has('price') || !partial) {
    const price = Number(body.price);
    if (!Number.isFinite(price)) errors.price = 'Price is required';
    else if (price < 0) errors.price = 'Price cannot be negative';
    else if (price > 10_000_000) errors.price = 'Price looks too large';
    else data.price = money(price);
  }

  // ── offer price ──
  if (has('offerPrice') || body.offerPrice === null) {
    if (body.offerPrice === null || body.offerPrice === '') {
      data.offerPrice = null;
    } else {
      const offer = Number(body.offerPrice);
      if (!Number.isFinite(offer)) errors.offerPrice = 'Offer price must be a number';
      else if (offer < 0) errors.offerPrice = 'Offer price cannot be negative';
      else data.offerPrice = money(offer);
    }
  }

  // ── stock ──
  if (has('stock')) {
    const stock = Number(body.stock);
    if (!Number.isInteger(stock)) errors.stock = 'Stock must be a whole number';
    else if (stock < 0) errors.stock = 'Stock cannot be negative';
    else data.stock = stock;
  }

  // ── unit / quantity label ──
  if (has('content')) {
    const content = sanitize(body.content, 50);
    if (!content) errors.content = 'Unit is required (e.g. "1 BOX", "10 PKT")';
    else data.content = content;
  } else if (!partial) {
    data.content = '1 BOX';
  }

  // ── optional strings ──
  if (has('description')) data.description = sanitize(body.description, 1000);
  if (has('tamilName')) data.tamilName = sanitize(body.tamilName, 200);

  if (has('image')) {
    const image = sanitize(body.image, 300);
    if (image && !/^(\/|https?:\/\/)/.test(image)) {
      errors.image = 'Image must be a path like /images/name.png or a full URL';
    } else {
      data.image = image || '/MVP.png';
    }
  } else if (!partial) {
    data.image = '/MVP.png';
  }

  // ── optional numbers ──
  for (const field of ['discountPercent', 'taxPercent']) {
    if (has(field) || body[field] === null) {
      if (body[field] === null || body[field] === '') {
        data[field] = null;
      } else {
        const v = Number(body[field]);
        if (!Number.isFinite(v) || v < 0 || v > 100) {
          errors[field] = `${field === 'taxPercent' ? 'Tax' : 'Discount'} must be between 0 and 100`;
        } else {
          data[field] = v;
        }
      }
    }
  }

  for (const field of ['categoryOrder', 'sortOrder']) {
    if (has(field)) {
      const v = Number(body[field]);
      if (Number.isFinite(v)) data[field] = v;
    }
  }

  // ── booleans ──
  for (const field of ['isActive', 'isAvailable', 'trackStock']) {
    if (has(field)) data[field] = Boolean(body[field]);
  }

  // ── cross-field: an offer must actually be an offer ──
  const finalPrice = data.price !== undefined ? data.price : Number(body.__currentPrice);
  if (
    data.offerPrice !== undefined &&
    data.offerPrice !== null &&
    Number.isFinite(finalPrice) &&
    data.offerPrice >= finalPrice
  ) {
    errors.offerPrice = `Offer price must be below the normal price (Rs. ${finalPrice.toFixed(2)})`;
  }

  return { data, errors };
}

// ─────────────────────────────────────────────────────────────
//  Public
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/products
 *
 * Public by default: only active products, customer-safe fields.
 * `?admin=true` (with a valid token) returns everything, paginated.
 */
const listProducts = asyncHandler(async (req, res) => {
  const wantsAdmin = req.query.admin === 'true' && Boolean(req.admin);
  const filter = {};

  if (!wantsAdmin) {
    // Customers never see deactivated products.
    filter.isActive = true;
  } else {
    if (req.query.status === 'active') filter.isActive = true;
    if (req.query.status === 'inactive') filter.isActive = false;
    if (req.query.status === 'unavailable') filter.isAvailable = false;
    if (req.query.status === 'out_of_stock') {
      filter.trackStock = true;
      filter.stock = { $lte: 0 };
    }
    if (req.query.status === 'on_offer') filter.offerPrice = { $ne: null, $gt: 0 };
  }

  if (req.query.category) filter.categoryId = sanitize(req.query.category, 60);

  const search = sanitize(req.query.search, 80);
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    const asId = Number.parseInt(search, 10);
    filter.$or = [{ name: rx }, { categoryTitle: rx }, { description: rx }];
    if (Number.isInteger(asId)) filter.$or.push({ productId: asId });
  }

  const sort = { categoryOrder: 1, sortOrder: 1, productId: 1 };

  if (wantsAdmin) {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));

    const [products, total, stats] = await Promise.all([
      Product.find(filter).sort(sort).skip((page - 1) * limit).limit(limit),
      Product.countDocuments(filter),
      Product.aggregate([
        {
          $group: {
            _id: null,
            all: { $sum: 1 },
            active: { $sum: { $cond: ['$isActive', 1, 0] } },
            onOffer: {
              $sum: { $cond: [{ $and: [{ $ne: ['$offerPrice', null] }, { $gt: ['$offerPrice', 0] }] }, 1, 0] },
            },
            outOfStock: {
              $sum: { $cond: [{ $and: ['$trackStock', { $lte: ['$stock', 0] }] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    return res.json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      stats: {
        all: stats[0]?.all || 0,
        active: stats[0]?.active || 0,
        inactive: (stats[0]?.all || 0) - (stats[0]?.active || 0),
        onOffer: stats[0]?.onOffer || 0,
        outOfStock: stats[0]?.outOfStock || 0,
      },
      products: products.map((p) => p.toAdminJSON()),
    });
  }

  const products = await Product.find(filter).sort(sort);
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

/** GET /api/products/categories — used by the admin form and the storefront. */
const listCategories = asyncHandler(async (req, res) => {
  const rows = await Product.aggregate([
    {
      $group: {
        _id: '$categoryId',
        title: { $first: '$categoryTitle' },
        order: { $min: '$categoryOrder' },
        count: { $sum: 1 },
        activeCount: { $sum: { $cond: ['$isActive', 1, 0] } },
      },
    },
    { $sort: { order: 1, title: 1 } },
  ]);

  res.json({
    success: true,
    categories: rows.map((r) => ({
      id: r._id,
      title: r.title,
      order: r.order,
      count: r.count,
      activeCount: r.activeCount,
    })),
  });
});

/** GET /api/products/:id — public */
const getProduct = asyncHandler(async (req, res) => {
  const product = await findProduct(req.params.id);
  if (!product) throw AppError.notFound('That product could not be found.');
  res.json({
    success: true,
    product: req.admin ? product.toAdminJSON() : product.toPublicJSON(),
  });
});

// ─────────────────────────────────────────────────────────────
//  Admin
// ─────────────────────────────────────────────────────────────

/** POST /api/products */
const createProduct = asyncHandler(async (req, res) => {
  const { data, errors } = validateProductPayload(req.body, { partial: false });
  if (Object.keys(errors).length) {
    throw AppError.validation('Please correct the highlighted fields.', errors);
  }

  let productId = Number.parseInt(req.body.productId ?? req.body.id, 10);
  if (!Number.isInteger(productId) || productId <= 0) {
    const highest = await Product.findOne().sort({ productId: -1 }).select('productId');
    productId = (highest?.productId || 0) + 1;
  } else if (await Product.findOne({ productId })) {
    throw AppError.conflict(`Product #${productId} already exists.`);
  }

  // Slot a new category in after the existing ones unless told otherwise.
  if (data.categoryOrder === undefined) {
    const sibling = await Product.findOne({ categoryId: data.categoryId }).select('categoryOrder');
    if (sibling) {
      data.categoryOrder = sibling.categoryOrder;
    } else {
      const last = await Product.findOne().sort({ categoryOrder: -1 }).select('categoryOrder');
      data.categoryOrder = (last?.categoryOrder || 0) + 1;
    }
  }

  const product = await Product.create({
    productId,
    stock: data.stock ?? 500,
    trackStock: data.trackStock ?? true,
    isActive: data.isActive ?? true,
    isAvailable: data.isAvailable ?? true,
    createdBy: req.admin?.email || 'admin',
    updatedBy: req.admin?.email || 'admin',
    ...data,
  });

  product.recordPriceChange(null, null, req.admin?.email, 'Product created');
  await product.save();

  res.status(201).json({
    success: true,
    message: `"${product.name}" added.`,
    product: product.toAdminJSON(),
  });
});

/** PUT /api/products/:id */
const updateProduct = asyncHandler(async (req, res) => {
  const product = await findProduct(req.params.id);
  if (!product) throw AppError.notFound('That product could not be found.');

  const { data, errors } = validateProductPayload(
    { ...req.body, __currentPrice: req.body.price ?? product.price },
    { partial: true }
  );
  if (Object.keys(errors).length) {
    throw AppError.validation('Please correct the highlighted fields.', errors);
  }

  const previousPrice = product.price;
  const previousOfferPrice = product.offerPrice;

  Object.assign(product, data);
  product.updatedBy = req.admin?.email || 'admin';

  const priceChanged =
    product.price !== previousPrice || (product.offerPrice ?? null) !== (previousOfferPrice ?? null);
  if (priceChanged) {
    product.recordPriceChange(previousPrice, previousOfferPrice, req.admin?.email, 'Edited');
  }

  await product.save();

  res.json({
    success: true,
    message: `"${product.name}" updated.`,
    priceChanged,
    product: product.toAdminJSON(),
  });
});

/**
 * PUT /api/products/:id/price
 * Dedicated price endpoint, so changing a price is a deliberate,
 * separately-audited action rather than a side effect of an edit.
 */
const updatePrice = asyncHandler(async (req, res) => {
  const product = await findProduct(req.params.id);
  if (!product) throw AppError.notFound('That product could not be found.');

  const errors = {};
  const hasPrice = req.body.price !== undefined && req.body.price !== null && req.body.price !== '';
  const hasOffer = 'offerPrice' in req.body;

  if (!hasPrice && !hasOffer) {
    throw AppError.badRequest('Send a new price, an offer price, or both.');
  }

  let newPrice = product.price;
  if (hasPrice) {
    const v = Number(req.body.price);
    if (!Number.isFinite(v)) errors.price = 'Price must be a number';
    else if (v < 0) errors.price = 'Price cannot be negative';
    else if (v > 10_000_000) errors.price = 'Price looks too large';
    else newPrice = money(v);
  }

  let newOffer = product.offerPrice;
  if (hasOffer) {
    if (req.body.offerPrice === null || req.body.offerPrice === '') {
      newOffer = null;
    } else {
      const v = Number(req.body.offerPrice);
      if (!Number.isFinite(v)) errors.offerPrice = 'Offer price must be a number';
      else if (v < 0) errors.offerPrice = 'Offer price cannot be negative';
      else newOffer = money(v);
    }
  }

  if (newOffer !== null && newOffer >= newPrice) {
    errors.offerPrice = `Offer price must be below the normal price (Rs. ${newPrice.toFixed(2)})`;
  }

  if (Object.keys(errors).length) {
    throw AppError.validation('Please correct the highlighted fields.', errors);
  }

  const previousPrice = product.price;
  const previousOfferPrice = product.offerPrice;

  if (previousPrice === newPrice && (previousOfferPrice ?? null) === newOffer) {
    return res.json({
      success: true,
      message: 'Price is unchanged.',
      changed: false,
      product: product.toAdminJSON(),
    });
  }

  product.price = newPrice;
  product.offerPrice = newOffer;
  product.updatedBy = req.admin?.email || 'admin';
  product.recordPriceChange(
    previousPrice,
    previousOfferPrice,
    req.admin?.email,
    sanitize(req.body.note, 200) || 'Price updated'
  );
  await product.save();

  res.json({
    success: true,
    changed: true,
    message: `Price of "${product.name}" updated from Rs. ${previousPrice.toFixed(
      2
    )} to Rs. ${newPrice.toFixed(2)}.`,
    previousPrice,
    previousOfferPrice: previousOfferPrice ?? null,
    newPrice,
    newOfferPrice: newOffer,
    product: product.toAdminJSON(),
  });
});

/**
 * PUT /api/products/:id/status
 * Enable or disable a product without deleting it.
 */
const updateStatus = asyncHandler(async (req, res) => {
  const product = await findProduct(req.params.id);
  if (!product) throw AppError.notFound('That product could not be found.');

  if ('isActive' in req.body) product.isActive = Boolean(req.body.isActive);
  else product.isActive = !product.isActive; // plain toggle

  if ('isAvailable' in req.body) product.isAvailable = Boolean(req.body.isAvailable);

  product.updatedBy = req.admin?.email || 'admin';
  await product.save();

  res.json({
    success: true,
    message: `"${product.name}" is now ${product.isActive ? 'active' : 'inactive'}.`,
    product: product.toAdminJSON(),
  });
});

/** PUT /api/products/:id/stock */
const updateStock = asyncHandler(async (req, res) => {
  const product = await findProduct(req.params.id);
  if (!product) throw AppError.notFound('That product could not be found.');

  const stock = Number(req.body.stock);
  if (!Number.isInteger(stock) || stock < 0) {
    throw AppError.validation('Please correct the highlighted fields.', {
      stock: 'Stock must be a whole number of 0 or more',
    });
  }

  product.stock = stock;
  if ('trackStock' in req.body) product.trackStock = Boolean(req.body.trackStock);
  product.updatedBy = req.admin?.email || 'admin';
  await product.save();

  res.json({ success: true, message: `Stock updated.`, product: product.toAdminJSON() });
});

/**
 * DELETE /api/products/:id
 *
 * Soft-deletes by default. A product that already appears on an order is
 * never hard-deleted, because the order snapshot references it.
 */
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await findProduct(req.params.id);
  if (!product) throw AppError.notFound('That product could not be found.');

  const hard = req.query.hard === 'true';

  if (hard) {
    const usedIn = await Order.countDocuments({ 'items.productId': product.productId });
    if (usedIn > 0) {
      throw AppError.conflict(
        `"${product.name}" appears on ${usedIn} order${usedIn === 1 ? '' : 's'} and cannot be permanently deleted. It has been deactivated instead, so past invoices stay intact.`,
        { orderCount: usedIn }
      );
    }
    const name = product.name;
    await product.deleteOne();
    return res.json({ success: true, hard: true, message: `"${name}" permanently deleted.` });
  }

  product.isActive = false;
  product.isAvailable = false;
  product.updatedBy = req.admin?.email || 'admin';
  await product.save();

  return res.json({
    success: true,
    hard: false,
    message: `"${product.name}" removed from the shop. It can be re-activated at any time.`,
    product: product.toAdminJSON(),
  });
});

/** POST /api/products/bulk-price — apply a change across a category. */
const bulkUpdatePrice = asyncHandler(async (req, res) => {
  const categoryId = sanitize(req.body.categoryId, 60);
  const percent = Number(req.body.percent);

  if (!categoryId) throw AppError.badRequest('Choose a category.');
  if (!Number.isFinite(percent) || percent === 0) {
    throw AppError.badRequest('Enter a percentage change, e.g. 10 to raise by 10% or -5 to cut 5%.');
  }
  if (Math.abs(percent) > 90) throw AppError.badRequest('That change is too large (max 90%).');

  const products = await Product.find({ categoryId });
  if (!products.length) throw AppError.notFound('No products in that category.');

  let updated = 0;
  for (const p of products) {
    const previousPrice = p.price;
    const previousOffer = p.offerPrice;
    const next = money(p.price * (1 + percent / 100));
    if (next === previousPrice) continue;

    p.price = next;
    if (p.offerPrice !== null && p.offerPrice >= next) p.offerPrice = null;
    p.updatedBy = req.admin?.email || 'admin';
    p.recordPriceChange(previousPrice, previousOffer, req.admin?.email, `Bulk ${percent > 0 ? '+' : ''}${percent}%`);
    await p.save();
    updated += 1;
  }

  res.json({
    success: true,
    message: `${updated} product${updated === 1 ? '' : 's'} repriced by ${percent > 0 ? '+' : ''}${percent}%.`,
    updated,
  });
});

module.exports = {
  listProducts,
  listCategories,
  getProduct,
  createProduct,
  updateProduct,
  updatePrice,
  updateStatus,
  updateStock,
  deleteProduct,
  bulkUpdatePrice,
};
