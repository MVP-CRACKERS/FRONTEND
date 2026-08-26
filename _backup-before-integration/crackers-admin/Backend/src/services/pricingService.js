const { config } = require('../config/env');
const { AppError } = require('../utils/AppError');
const Product = require('../models/Product');

/** Rounds to 2 decimals without binary-float drift (0.1+0.2 problems). */
const money = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * Loads the requested products from MongoDB, verifies each one can be
 * fulfilled, and computes every rupee of the order from the DB price.
 *
 * The frontend's totals are never read. If the price list changed since
 * the customer loaded the page, the DB price is what gets charged and
 * the response reports the difference.
 *
 * @param {Array<{productId:number, quantity:number}>} cartItems
 * @param {{includeWhitebag?:boolean}} options
 */
async function buildOrderPricing(cartItems, options = {}) {
  const ids = cartItems.map((i) => i.productId);

  const products = await Product.find({ productId: { $in: ids } });
  const byId = new Map(products.map((p) => [p.productId, p]));

  // ── 1. every id must exist ────────────────────────────────
  const missing = ids.filter((id) => !byId.has(id));
  if (missing.length) {
    throw AppError.badRequest(
      missing.length === 1
        ? `Product #${missing[0]} is no longer available. Please remove it from your cart.`
        : `${missing.length} products in your cart are no longer available. Please refresh your cart.`,
      { missingProductIds: missing }
    );
  }

  // ── 2. availability and stock ─────────────────────────────
  const unavailable = [];
  const insufficient = [];

  for (const { productId, quantity } of cartItems) {
    const product = byId.get(productId);
    if (!product.isActive || !product.isAvailable) {
      unavailable.push({ productId, name: product.name });
    } else if (product.trackStock && product.stock < quantity) {
      insufficient.push({
        productId,
        name: product.name,
        requested: quantity,
        available: product.stock,
      });
    }
  }

  if (unavailable.length) {
    throw AppError.conflict(
      `Currently out of stock: ${unavailable.map((u) => u.name).join(', ')}. Please remove ${
        unavailable.length === 1 ? 'it' : 'them'
      } to continue.`,
      { unavailable }
    );
  }

  if (insufficient.length) {
    const first = insufficient[0];
    throw AppError.conflict(
      `Only ${first.available} left of "${first.name}" (you asked for ${first.requested}). Please reduce the quantity.`,
      { insufficient }
    );
  }

  // ── 3. build line items from DB prices ────────────────────
  const orderDiscountPct = config.pricing.discountPercent;
  const orderTaxPct = config.pricing.taxPercent;

  const items = [];
  let subtotal = 0;
  let discountAmount = 0;
  let taxAmount = 0;

  for (const { productId, quantity } of cartItems) {
    const p = byId.get(productId);

    const unitPrice = money(p.price);
    const lineSubtotal = money(unitPrice * quantity);

    const lineDiscountPct = p.discountPercent === null ? orderDiscountPct : p.discountPercent;
    const lineDiscount = money((lineSubtotal * lineDiscountPct) / 100);
    const lineNet = money(lineSubtotal - lineDiscount);

    const lineTaxPct = p.taxPercent === null ? orderTaxPct : p.taxPercent;
    const lineTax = money((lineNet * lineTaxPct) / 100);

    items.push({
      product: p._id,
      productId: p.productId,
      name: p.name,
      tamilName: p.tamilName,
      content: p.content,
      categoryId: p.categoryId,
      categoryTitle: p.categoryTitle,
      image: p.image,
      quantity,
      unitPrice,
      discountPercent: lineDiscountPct,
      discountAmount: lineDiscount,
      taxPercent: lineTaxPct,
      taxAmount: lineTax,
      lineSubtotal,
      lineNet,
      lineTotal: money(lineNet + lineTax),
      _categoryOrder: p.categoryOrder,
      _sortOrder: p.sortOrder,
    });

    subtotal = money(subtotal + lineSubtotal);
    discountAmount = money(discountAmount + lineDiscount);
    taxAmount = money(taxAmount + lineTax);
  }

  // Keep invoice rows grouped by category, in price-list order
  items.sort(
    (a, b) => a._categoryOrder - b._categoryOrder || a._sortOrder - b._sortOrder || a.productId - b.productId
  );
  items.forEach((i) => {
    delete i._categoryOrder;
    delete i._sortOrder;
  });

  const netAmount = money(subtotal - discountAmount);

  if (config.pricing.minOrderValue > 0 && netAmount < config.pricing.minOrderValue) {
    throw AppError.badRequest(
      `Minimum order value is Rs. ${config.pricing.minOrderValue.toFixed(2)}. Your cart is Rs. ${netAmount.toFixed(2)}.`,
      { minOrderValue: config.pricing.minOrderValue, cartValue: netAmount }
    );
  }

  // ── 4. delivery + optional white-bag charge ───────────────
  let deliveryCharge = money(config.pricing.deliveryCharge);
  if (config.pricing.freeDeliveryAbove > 0 && netAmount >= config.pricing.freeDeliveryAbove) {
    deliveryCharge = 0;
  }

  const includeWhitebag = Boolean(options.includeWhitebag);
  const whitebagCharge = includeWhitebag ? money(config.pricing.whitebagCharge) : 0;

  const grandTotal = money(netAmount + taxAmount + deliveryCharge + whitebagCharge);

  return {
    items,
    subtotal,
    discountPercent: orderDiscountPct,
    discountAmount,
    netAmount,
    taxPercent: orderTaxPct,
    taxAmount,
    deliveryCharge,
    whitebagCharge,
    includeWhitebag,
    grandTotal,
    currency: 'INR',
    products: byId,
  };
}

/** Read-only quote used by POST /api/orders/quote — no order is created. */
async function quote(cartItems, options) {
  const pricing = await buildOrderPricing(cartItems, options);
  delete pricing.products;
  return pricing;
}

module.exports = { buildOrderPricing, quote, money };
