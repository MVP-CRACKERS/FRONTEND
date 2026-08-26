import React from 'react';
import { useCart } from '../CartContext';
import { useCatalog } from '../CatalogContext';
import {
  Minus,
  Plus,
  ShoppingBag,
  MapPin,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  Eye,
  Share2,
} from 'lucide-react';
import {
  placeOrder,
  invoiceViewUrl,
  invoiceDownloadUrl,
  fetchInvoiceFile,
  ApiError,
} from '../api/client';

const OutlinedField = ({ label, type = 'text', value, readOnly, className = '' }) => (
  <div className={`relative ${className}`}>
    <label className="absolute -top-2.5 left-3 bg-white px-2 text-xs text-gray-500 font-semibold tracking-wide">
      {label}
    </label>
    <input
      type={type}
      className="w-full border-2 border-gray-200 rounded-lg p-3 text-gray-800 focus:outline-none focus:border-green-600 focus:ring-4 focus:ring-green-600/10 font-bold bg-gray-50/50"
      readOnly={readOnly}
      value={value}
      tabIndex={-1}
    />
  </div>
);

const inputClass =
  'w-full border-2 border-gray-200 rounded-lg p-3 focus:outline-none focus:border-green-600 focus:ring-4 focus:ring-green-600/10 transition-all font-medium';
const errorInputClass =
  'w-full border-2 border-red-400 rounded-lg p-3 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all font-medium';

const FieldError = ({ message }) =>
  message ? (
    <p className="text-red-600 text-xs font-semibold mt-1 flex items-center gap-1">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      {message}
    </p>
  ) : null;

/** Stable per-checkout id, so a double click can never create two orders. */
const newIdempotencyKey = () =>
  `mvp-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

export default function CheckoutModal() {
  const {
    cartItems,
    orderItems,
    updateQuantity,
    setQuantity,
    cartTotal,
    estimate,
    isCheckoutOpen,
    closeCheckout,
    clearCart,
  } = useCart();
  const { pricing } = useCatalog();

  const [submitting, setSubmitting] = React.useState(false);
  const [formErrors, setFormErrors] = React.useState({});
  const [submitError, setSubmitError] = React.useState('');
  const [confirmation, setConfirmation] = React.useState(null);
  const [includeWhitebag, setIncludeWhitebag] = React.useState(false);
  const [shareBusy, setShareBusy] = React.useState(false);
  const [shareNote, setShareNote] = React.useState('');

  // One key per opening of the checkout. Kept in a ref so re-renders,
  // validation failures and retries all reuse the SAME key — the backend
  // then returns the original order instead of creating another.
  const idempotencyKeyRef = React.useRef(newIdempotencyKey());

  React.useEffect(() => {
    if (isCheckoutOpen && !confirmation) {
      idempotencyKeyRef.current = newIdempotencyKey();
      setFormErrors({});
      setSubmitError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCheckoutOpen]);

  if (!isCheckoutOpen) return null;

  const rate = cartTotal;
  const offerPrice = estimate.discount;
  const taxAmount = estimate.tax;
  const finalTotal = estimate.grandTotal;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return; // guards the double click

    setSubmitError('');
    setFormErrors({});

    if (!orderItems.length) {
      setSubmitError('Your cart is empty. Please add at least one product before ordering.');
      return;
    }

    const fd = new FormData(e.target);
    const payload = {
      name: (fd.get('name') || '').toString().trim(),
      phone: (fd.get('phone') || '').toString().trim(),
      email: (fd.get('email') || '').toString().trim(),
      state: (fd.get('state') || '').toString().trim(),
      city: (fd.get('city') || '').toString().trim(),
      pincode: (fd.get('pincode') || '').toString().trim(),
      address: (fd.get('address') || '').toString().trim(),
      deliveryNotes: (fd.get('deliveryNotes') || '').toString().trim(),
      items: orderItems,
      includeWhitebag,
      idempotencyKey: idempotencyKeyRef.current,
    };

    setSubmitting(true);
    try {
      const result = await placeOrder(payload);
      setConfirmation(result);
      clearCart();
    } catch (err) {
      if (err instanceof ApiError && err.errors && typeof err.errors === 'object') {
        const fieldErrors = Object.fromEntries(
          Object.entries(err.errors).filter(([, v]) => typeof v === 'string')
        );
        if (Object.keys(fieldErrors).length) setFormErrors(fieldErrors);
      }
      setSubmitError(err.message || 'We could not place your order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setConfirmation(null);
    setSubmitError('');
    setFormErrors({});
    setShareNote('');
    closeCheckout();
  };

  const handleDownload = () => {
    if (!confirmation) return;
    window.open(invoiceDownloadUrl(confirmation.orderId), '_blank', 'noopener');
  };

  /**
   * Mobile: hand the actual PDF to the OS share sheet so the customer can
   * pick WhatsApp and send the file itself.
   * Desktop: open WhatsApp Web with the message (which carries the invoice
   * link) pre-filled, and download the PDF so it can be attached manually.
   */
  const handleWhatsApp = async () => {
    if (!confirmation || shareBusy) return;
    setShareBusy(true);
    setShareNote('');

    const fileName = `${confirmation.invoiceNumber}.pdf`;

    try {
      const file = await fetchInvoiceFile(confirmation.orderId, fileName);

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Invoice ${confirmation.invoiceNumber}`,
          text: confirmation.whatsappMessage,
        });
        setShareBusy(false);
        return;
      }

      // Desktop fallback: download the PDF, then open WhatsApp Web.
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);

      window.open(confirmation.whatsappUrl, '_blank', 'noopener');
      setShareNote(
        'Your invoice has been downloaded and WhatsApp has opened with the message ready. Attach the PDF from your Downloads folder if you would like to send the file too.'
      );
    } catch (err) {
      if (err?.name === 'AbortError') {
        // The customer dismissed the share sheet — not an error.
        setShareBusy(false);
        return;
      }
      window.open(confirmation.whatsappUrl, '_blank', 'noopener');
      setShareNote(
        'WhatsApp has opened with your order message. The invoice link is included — use "Download Invoice" if you need the PDF file.'
      );
    } finally {
      setShareBusy(false);
    }
  };

  // ───────────────────────────────────────────────────────────
  //  ORDER CONFIRMED
  // ───────────────────────────────────────────────────────────
  if (confirmation) {
    const order = confirmation.order || {};
    const address = order.deliveryAddress || {};
    const addressLine = [
      address.fullAddress,
      address.city,
      address.state,
      address.pincode,
    ]
      .filter(Boolean)
      .join(', ');

    return (
      <div className="fixed inset-0 bg-neutral-dark/90 backdrop-blur-md z-50 flex justify-center items-center p-4 sm:p-6 transition-all duration-300">
        <div className="bg-white rounded-2xl w-full max-w-5xl h-[95vh] flex flex-col overflow-hidden animate-in zoom-in shadow-2xl">
          <div className="bg-gradient-to-r from-[#0F3D1E] to-[#1B7A3E] px-6 py-4 flex justify-between items-center shadow-md z-10">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-accent-electric" />
              <h2 className="text-white text-xl sm:text-2xl font-bold tracking-wide">ORDER CONFIRMED</h2>
            </div>
            <button
              onClick={handleClose}
              className="text-white/70 hover:text-white transition-colors text-3xl leading-none"
              aria-label="Close"
            >
              &times;
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden bg-gray-50 flex flex-col">
            {/* Order details strip */}
            <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 lg:min-h-0">
              <div className="lg:col-span-4 flex flex-col gap-3 lg:overflow-y-auto lg:pr-1">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Order Number</div>
                    <div className="text-lg font-black text-[#0F3D1E]">{confirmation.orderNumber}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Invoice Number</div>
                    <div className="text-lg font-black text-[#0F3D1E]">{confirmation.invoiceNumber}</div>
                  </div>
                  <div className="border-t border-gray-100 pt-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Amount</div>
                    <div className="text-3xl font-black text-[#d32f2f]">
                      Rs. {Number(confirmation.totalAmount).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Delivering To
                  </div>
                  <div className="font-bold text-gray-800">{order.customer?.name}</div>
                  <div className="text-sm text-gray-600 mt-1">{order.customer?.mobile}</div>
                  {order.customer?.email && (
                    <div className="text-sm text-gray-600">{order.customer.email}</div>
                  )}
                  <div className="text-sm text-gray-600 mt-2 leading-relaxed">{addressLine}</div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-900 font-medium">
                  We have saved your order. Our team will confirm delivery details with you on WhatsApp shortly.
                </div>
              </div>

              {/* Invoice preview */}
              <div className="lg:col-span-8 bg-gray-200 rounded-xl overflow-hidden min-h-[420px] lg:min-h-0 lg:h-full flex">
                {confirmation.invoiceReady === false ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8 bg-white">
                    <AlertCircle className="w-10 h-10 text-amber-500" />
                    <p className="font-bold text-gray-800">Your order is saved and confirmed.</p>
                    <p className="text-sm text-gray-600 max-w-sm">
                      The invoice PDF is still being prepared. Use the buttons below — it will be
                      generated the moment you open it.
                    </p>
                  </div>
                ) : (
                  <iframe
                    src={invoiceViewUrl(confirmation.orderId)}
                    className="w-full h-full min-h-[420px] border-0 bg-white"
                    title={`Invoice ${confirmation.invoiceNumber}`}
                  />
                )}
              </div>
            </div>

            {shareNote && (
              <div className="shrink-0 mx-4 sm:mx-6 mb-4 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-4 text-sm font-medium">
                {shareNote}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-4 sm:p-6 bg-white border-t-2 border-gray-100 flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
            <a
              href={invoiceViewUrl(confirmation.orderId)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-4 border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all uppercase tracking-wide flex justify-center items-center gap-2"
            >
              <Eye className="w-5 h-5" />
              View Invoice
            </a>

            <button
              onClick={handleDownload}
              type="button"
              className="px-6 py-4 border-2 border-[#0F3D1E] text-[#0F3D1E] font-bold rounded-xl hover:bg-[#0F3D1E] hover:text-white transition-all uppercase tracking-wide flex justify-center items-center gap-2"
            >
              <Download className="w-5 h-5" />
              Download Invoice
            </button>

            <button
              onClick={handleWhatsApp}
              type="button"
              disabled={shareBusy}
              className="px-8 py-4 bg-[#25D366] text-white font-black rounded-xl hover:bg-green-600 disabled:opacity-70 disabled:cursor-not-allowed transition-all uppercase tracking-widest text-lg flex justify-center items-center shadow-md gap-3"
            >
              {shareBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Share2 className="w-5 h-5" />}
              <span>{shareBusy ? 'Preparing...' : 'Order in Whats App'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────
  //  CHECKOUT
  // ───────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-neutral-dark/80 backdrop-blur-sm z-50 flex justify-center items-center p-4 sm:p-6 transition-all duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[95vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0F3D1E] to-[#1B7A3E] text-white px-6 py-4 flex justify-between items-center shadow-md z-10">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-6 h-6 text-accent-electric" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-wide">SECURE CHECKOUT</h2>
          </div>
          <button
            onClick={handleClose}
            type="button"
            className="text-white/70 hover:text-white transition-colors text-3xl leading-none"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="overflow-y-auto flex-1 bg-gray-50/50">
          <div className="p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            {/* LEFT COLUMN: Order Summary */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="flex items-center gap-2 border-b-2 border-gray-100 pb-3">
                <ShieldCheck className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-bold text-gray-800 uppercase tracking-wide">Order Summary</h3>
              </div>

              {/* Cart Items List */}
              <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-12 h-12 shrink-0 bg-gray-50 border border-gray-100 rounded p-1 overflow-hidden">
                        <img
                          src={item.image || '/MVP.png'}
                          alt={item.name}
                          className={`w-full h-full object-contain ${item.image ? '' : 'opacity-50'}`}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="text-red-700 font-bold uppercase text-sm">{item.name}</div>
                        <div className="text-gray-500 text-xs font-medium mt-1">
                          Rs. {item.price.toFixed(2)} / item
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg h-9 w-24">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-8 h-full flex items-center justify-center text-gray-600 hover:text-red-600 hover:bg-gray-200 rounded-l-lg transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          value={item.qty}
                          onChange={(e) => setQuantity(item.id, e.target.value)}
                          className="w-full h-full text-center text-sm font-bold border-x border-gray-200 bg-transparent appearance-none focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-8 h-full flex items-center justify-center text-gray-600 hover:text-green-600 hover:bg-gray-200 rounded-r-lg transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-right text-gray-800 font-bold w-20">
                        Rs. {(item.price * item.qty).toFixed(0)}
                      </div>
                    </div>
                  </div>
                ))}
                {cartItems.length === 0 && (
                  <div className="text-center py-8 text-gray-500 font-medium">Your cart is empty.</div>
                )}
              </div>

              {/* Pricing Grid */}
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm mt-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                  <OutlinedField label="Rate" value={rate.toFixed(2)} readOnly />
                  <OutlinedField
                    label={`Offer Price (${pricing.discountPercent}%)`}
                    value={offerPrice.toFixed(2)}
                    readOnly
                    className="text-green-600"
                  />
                  <OutlinedField label="Tax (GST)" value={taxAmount.toFixed(2)} readOnly />
                </div>
                <div className="mt-5 pt-5 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-gray-500 font-bold uppercase tracking-wider text-sm">Grand Total</span>
                  <span className="text-3xl font-black text-[#d32f2f]">Rs. {finalTotal.toFixed(2)}</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Final amount is confirmed by our server when you place the order.
                </p>
              </div>
            </div>

            {/* RIGHT COLUMN: Delivery & Details */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="flex items-center gap-2 border-b-2 border-gray-100 pb-3">
                <MapPin className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-bold text-gray-800 uppercase tracking-wide">Delivery Details</h3>
              </div>

              {/* User Details Form */}
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <input
                      type="text"
                      name="name"
                      placeholder="Full Name"
                      required
                      className={formErrors.name ? errorInputClass : inputClass}
                    />
                    <FieldError message={formErrors.name} />
                  </div>
                  <div>
                    <input
                      type="tel"
                      name="phone"
                      inputMode="numeric"
                      placeholder="Mobile Number"
                      required
                      className={formErrors.mobile ? errorInputClass : inputClass}
                    />
                    <FieldError message={formErrors.mobile} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <input
                      type="email"
                      name="email"
                      placeholder="Email Address (Optional)"
                      className={formErrors.email ? errorInputClass : inputClass}
                    />
                    <FieldError message={formErrors.email} />
                  </div>
                  <div>
                    <input
                      type="text"
                      name="state"
                      placeholder="State"
                      className={formErrors.state ? errorInputClass : inputClass}
                    />
                    <FieldError message={formErrors.state} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <input
                      type="text"
                      name="city"
                      placeholder="Delivery City"
                      required
                      className={formErrors.city ? errorInputClass : inputClass}
                    />
                    <FieldError message={formErrors.city} />
                  </div>
                  <div>
                    <input
                      type="text"
                      name="pincode"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Pincode"
                      className={formErrors.pincode ? errorInputClass : inputClass}
                    />
                    <FieldError message={formErrors.pincode} />
                  </div>
                </div>

                <div>
                  <textarea
                    name="address"
                    placeholder="Complete Delivery Address (door no, street, area)"
                    required
                    className={`${formErrors.address ? errorInputClass : inputClass} min-h-[100px] resize-y`}
                  />
                  <FieldError message={formErrors.address} />
                </div>

                <textarea
                  name="deliveryNotes"
                  placeholder="Delivery Notes (landmark, preferred time — optional)"
                  className={`${inputClass} min-h-[60px] resize-y`}
                />

                {/* Checkboxes */}
                <div className="flex flex-col gap-3 mt-2 bg-gray-50 p-4 rounded-lg">
                  <label className="flex items-center gap-3 text-sm font-semibold text-gray-700 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={includeWhitebag}
                      onChange={(e) => setIncludeWhitebag(e.target.checked)}
                      className="w-5 h-5 border-2 border-gray-300 rounded text-green-600 focus:ring-green-600 transition-all cursor-pointer"
                    />
                    <span className="group-hover:text-green-700 transition-colors">
                      Include Whitebag Charge?
                    </span>
                  </label>
                  <label className="flex items-center gap-3 text-sm font-semibold text-gray-700 cursor-pointer group">
                    <input
                      type="checkbox"
                      required
                      className="w-5 h-5 border-2 border-gray-300 rounded text-green-600 focus:ring-green-600 transition-all cursor-pointer"
                    />
                    <span className="group-hover:text-green-700 transition-colors">
                      I confirm this order details
                    </span>
                  </label>
                </div>
              </div>

              {submitError && (
                <div className="bg-red-50 border-2 border-red-200 text-red-800 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold leading-relaxed">{submitError}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-4 mt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={submitting}
                  className="w-1/3 px-6 py-4 bg-white border-2 border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-all uppercase tracking-wide"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || cartItems.length === 0}
                  className="w-2/3 px-6 py-4 bg-[#113e21] border-[4px] border-[#0066cc] text-white font-black rounded-2xl hover:bg-green-900 disabled:opacity-60 disabled:cursor-not-allowed transition-all uppercase tracking-widest text-xl flex justify-center items-center gap-3 shadow-md"
                >
                  {submitting && <Loader2 className="w-6 h-6 animate-spin" />}
                  {submitting ? 'PLACING ORDER...' : 'CONFIRM ORDER'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
