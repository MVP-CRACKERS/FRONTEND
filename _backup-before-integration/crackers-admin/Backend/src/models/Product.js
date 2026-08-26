const mongoose = require('mongoose');

/**
 * Product — the single source of truth for pricing.
 *
 * `productId` is the numeric id the existing frontend already uses
 * (data.js items 1..101). It is kept so the current cart, which is
 * keyed by that number, keeps working without any change.
 */
const productSchema = new mongoose.Schema(
  {
    productId: {
      type: Number,
      required: [true, 'productId is required'],
      unique: true,
      index: true,
      min: [1, 'productId must be a positive number'],
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: 200,
    },
    tamilName: { type: String, trim: true, default: '', maxlength: 200 },
    description: { type: String, trim: true, default: '', maxlength: 1000 },

    // "1 BOX", "10 PKT", "1 PCS" — shown in the price list and on the invoice
    content: { type: String, trim: true, default: '1 BOX', maxlength: 50 },

    image: { type: String, trim: true, default: '/MVP.png' },

    categoryId: {
      type: String,
      required: [true, 'categoryId is required'],
      trim: true,
      index: true,
    },
    categoryTitle: {
      type: String,
      required: [true, 'categoryTitle is required'],
      trim: true,
    },
    categoryOrder: { type: Number, default: 0 },

    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },

    // Per-product override. null => order-level DISCOUNT_PERCENT applies.
    discountPercent: {
      type: Number,
      default: null,
      min: [0, 'Discount cannot be negative'],
      max: [100, 'Discount cannot exceed 100%'],
    },
    // Per-product override. null => order-level TAX_PERCENT applies.
    taxPercent: {
      type: Number,
      default: null,
      min: [0, 'Tax cannot be negative'],
      max: [100, 'Tax cannot exceed 100%'],
    },

    stock: {
      type: Number,
      default: 1000,
      min: [0, 'Stock cannot be negative'],
    },
    // When true, stock is not decremented and never blocks an order.
    trackStock: { type: Boolean, default: true },

    isAvailable: { type: Boolean, default: true, index: true },
    isActive: { type: Boolean, default: true, index: true },

    sortOrder: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

productSchema.index({ categoryOrder: 1, sortOrder: 1 });
productSchema.index({ name: 'text' });

/** Whether this product can currently be ordered in the requested quantity. */
productSchema.methods.canFulfil = function canFulfil(qty) {
  if (!this.isActive || !this.isAvailable) return false;
  if (!this.trackStock) return true;
  return this.stock >= qty;
};

/**
 * Shape sent to the frontend. Deliberately mirrors the old data.js item
 * shape ({ id, name, content, price }) so existing components keep working.
 */
productSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this.productId,
    _id: this._id,
    productId: this.productId,
    name: this.name,
    tamilName: this.tamilName,
    description: this.description,
    content: this.content,
    image: this.image,
    categoryId: this.categoryId,
    categoryTitle: this.categoryTitle,
    price: this.price,
    discountPercent: this.discountPercent,
    taxPercent: this.taxPercent,
    stock: this.trackStock ? this.stock : null,
    isAvailable: this.isAvailable && this.isActive,
  };
};

module.exports = mongoose.model('Product', productSchema);
