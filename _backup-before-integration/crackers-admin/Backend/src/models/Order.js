const mongoose = require('mongoose');

const ORDER_STATUSES = [
  'Pending',
  'Confirmed',
  'Processing',
  'Packed',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

const PAYMENT_STATUSES = ['Pending', 'Paid', 'Failed', 'Refunded'];

/**
 * A frozen snapshot of one product at the moment the order was placed.
 * Name and price are copied in on purpose: if the price list changes
 * next week, an old invoice must still show what the customer paid.
 */
const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productId: { type: Number, required: true },
    name: { type: String, required: true },
    tamilName: { type: String, default: '' },
    content: { type: String, default: '' },
    categoryId: { type: String, default: '' },
    categoryTitle: { type: String, default: '' },
    image: { type: String, default: '' },

    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },

    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    discountAmount: { type: Number, default: 0, min: 0 },
    taxPercent: { type: Number, default: 0, min: 0, max: 100 },
    taxAmount: { type: Number, default: 0, min: 0 },

    // quantity * unitPrice, before discount/tax
    lineSubtotal: { type: Number, required: true, min: 0 },
    // lineSubtotal - discountAmount
    lineNet: { type: Number, required: true, min: 0 },
    // lineNet + taxAmount
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    doorNo: { type: String, trim: true, default: '', maxlength: 100 },
    street: { type: String, trim: true, default: '', maxlength: 200 },
    area: { type: String, trim: true, default: '', maxlength: 200 },
    city: { type: String, trim: true, required: true, maxlength: 100 },
    district: { type: String, trim: true, default: '', maxlength: 100 },
    state: { type: String, trim: true, default: '', maxlength: 100 },
    pincode: { type: String, trim: true, default: '', maxlength: 10 },
    // Full free-text address as typed in the existing checkout textarea
    fullAddress: { type: String, trim: true, default: '', maxlength: 1000 },
    deliveryNotes: { type: String, trim: true, default: '', maxlength: 1000 },
  },
  { _id: false }
);

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true, maxlength: 120 },
    mobile: { type: String, trim: true, required: true, maxlength: 20 },
    email: { type: String, trim: true, lowercase: true, default: '', maxlength: 160 },
  },
  { _id: false }
);

const statusEventSchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    note: { type: String, default: '' },
    at: { type: Date, default: Date.now },
    by: { type: String, default: 'system' },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    invoiceNumber: { type: String, required: true, unique: true, index: true },

    customer: { type: customerSchema, required: true },
    deliveryAddress: { type: addressSchema, required: true },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: [(v) => Array.isArray(v) && v.length > 0, 'Order must contain at least one item'],
    },

    // ── money, all computed server-side ──────────────────────
    subtotal: { type: Number, required: true, min: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    discountAmount: { type: Number, default: 0, min: 0 },
    taxPercent: { type: Number, default: 0, min: 0, max: 100 },
    taxAmount: { type: Number, default: 0, min: 0 },
    deliveryCharge: { type: Number, default: 0, min: 0 },
    whitebagCharge: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },

    includeWhitebag: { type: Boolean, default: false },

    orderStatus: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'Pending',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'Pending',
      index: true,
    },
    paymentMethod: { type: String, default: 'COD / WhatsApp' },
    paymentReference: { type: String, default: '' },
    paidAt: { type: Date, default: null },

    statusHistory: { type: [statusEventSchema], default: [] },

    // ── invoice ──────────────────────────────────────────────
    invoiceFileName: { type: String, default: '' },
    invoicePath: { type: String, default: '' },
    invoiceGeneratedAt: { type: Date, default: null },
    invoiceError: { type: String, default: '' },

    // ── duplicate-order protection ───────────────────────────
    // Client sends a UUID with the request; a retry of the same click
    // returns the original order instead of creating a second one.
    idempotencyKey: { type: String, default: null },

    // Audit trail
    clientIp: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    adminNotes: { type: String, default: '' },
    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, default: '' },
  },
  { timestamps: true }
);

// Partial unique index: enforces one order per idempotency key, while
// still allowing many documents with no key at all.
orderSchema.index(
  { idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'customer.mobile': 1 });
orderSchema.index({ 'customer.name': 'text', orderNumber: 'text', invoiceNumber: 'text' });

orderSchema.virtual('itemCount').get(function itemCount() {
  return this.items.reduce((sum, i) => sum + i.quantity, 0);
});

orderSchema.methods.invoiceUrl = function invoiceUrl(baseUrl) {
  return `${baseUrl}/api/orders/${this._id}/invoice`;
};

module.exports = mongoose.model('Order', orderSchema);
module.exports.ORDER_STATUSES = ORDER_STATUSES;
module.exports.PAYMENT_STATUSES = PAYMENT_STATUSES;
