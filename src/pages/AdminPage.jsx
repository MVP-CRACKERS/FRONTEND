import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Loader2,
  LogOut,
  Search,
  RefreshCw,
  Eye,
  Download,
  AlertCircle,
  Package,
  IndianRupee,
  X,
  Lock,
  ClipboardList,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { ToastProvider, Modal, Field, fieldOk, useToast } from '../components/admin/AdminUI';
import CrackersPanel from './admin/CrackersPanel';
import OrderNotifications from '../components/admin/OrderNotifications';
import { useCatalog } from '../CatalogContext';
import {
  adminLogin,
  adminMe,
  adminListOrders,
  adminGetOrder,
  adminUpdateStatus,
  adminUpdatePaymentStatus,
  invoiceViewUrl,
  invoiceDownloadUrl,
  getToken,
  setToken,
  checkApiTarget,
  API_BASE,
} from '../api/client';

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

const STATUS_STYLES = {
  Pending: 'bg-gray-100 text-gray-700',
  Confirmed: 'bg-blue-100 text-blue-800',
  Processing: 'bg-indigo-100 text-indigo-800',
  Packed: 'bg-amber-100 text-amber-800',
  'Out for Delivery': 'bg-orange-100 text-orange-800',
  Delivered: 'bg-green-100 text-green-800',
  Cancelled: 'bg-red-100 text-red-800',
  Paid: 'bg-green-100 text-green-800',
  Failed: 'bg-red-100 text-red-800',
  Refunded: 'bg-purple-100 text-purple-800',
};

const Badge = ({ value }) => (
  <span
    className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
      STATUS_STYLES[value] || 'bg-gray-100 text-gray-700'
    }`}
  >
    {value}
  </span>
);

// Payment status, changeable straight from the orders table.
//
// The server refuses to mark an order Paid without a reference — the UPI
// transaction id, the cheque number, "cash on delivery". That is deliberate:
// once money is recorded as received there has to be something to check it
// against. So picking "Paid" here asks for that reference; the other
// statuses apply immediately.
function PaymentCell({ order, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const [reference, setReference] = useState('');
  const { notify } = useToast();

  const apply = async (paymentStatus, ref) => {
    setBusy(true);
    try {
      await adminUpdatePaymentStatus(order.id, paymentStatus, ref || '');
      notify(`${order.orderNumber} marked ${paymentStatus}.`, 'success');
      setAsking(false);
      setReference('');
      await onChanged?.();
    } catch (err) {
      notify(err.message || 'Could not update the payment status.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const onPick = (next) => {
    if (next === order.paymentStatus) return;
    if (next === 'Paid') {
      setReference(order.paymentReference || '');
      setAsking(true);
      return;
    }
    apply(next);
  };

  return (
    <>
      {/* The row opens the order drawer, so every click in here has to stop. */}
      <div onClick={(e) => e.stopPropagation()} className="relative inline-flex items-center">
        <select
          value={order.paymentStatus}
          disabled={busy}
          onChange={(e) => onPick(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Payment status for ${order.orderNumber}`}
          className={`appearance-none cursor-pointer rounded-full pl-2.5 pr-7 py-1 text-xs font-bold
            border-2 border-transparent hover:border-current/30 focus:outline-none
            focus:ring-2 focus:ring-[#0F3D1E]/20 disabled:opacity-50
            ${STATUS_STYLES[order.paymentStatus] || 'bg-gray-100 text-gray-700'}`}
        >
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {busy ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin absolute right-2 pointer-events-none" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 absolute right-2 pointer-events-none opacity-60" />
        )}
      </div>

      {/* The dialog is a child of the row in the React tree, so its clicks
          bubble to the row's onClick even though it paints over the page.
          Without this wrapper, confirming a payment also opens the order
          drawer behind the dialog. */}
      <div onClick={(e) => e.stopPropagation()}>
        <Modal
          open={asking}
          title={`Mark ${order.orderNumber} as Paid`}
          size="sm"
          onClose={() => !busy && setAsking(false)}
        >
          <p className="text-sm text-gray-600 mb-4">
            {order.customerName} · {money(order.grandTotal)}
          </p>
          <Field
            label="Payment reference"
            required
            hint="UPI transaction id, cheque number, or 'Cash on delivery'. This is stored with the order so the payment can be traced later."
          >
            <input
              autoFocus
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && reference.trim() && !busy) apply('Paid', reference.trim());
              }}
              placeholder="e.g. 402318844271"
              className={fieldOk}
            />
          </Field>

          <div className="mt-5 flex flex-col-reverse sm:flex-row justify-end gap-3">
            <button
              onClick={() => setAsking(false)}
              disabled={busy}
              className="px-5 py-2.5 border-2 border-gray-200 rounded-lg font-bold text-sm hover:bg-gray-50 disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={() => apply('Paid', reference.trim())}
              disabled={busy || !reference.trim()}
              className="px-5 py-2.5 bg-green-700 text-white rounded-lg font-bold text-sm hover:bg-green-800 disabled:opacity-40 inline-flex items-center justify-center gap-2"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              Mark Paid
            </button>
          </div>
        </Modal>
      </div>
    </>
  );
}

const money = (n) => `Rs. ${Number(n || 0).toFixed(2)}`;
const when = (d) =>
  new Date(d).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

// ─────────────────────────────────────────────────────────────
//  Login
// ─────────────────────────────────────────────────────────────
function LoginScreen({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [apiProblem, setApiProblem] = useState(null);

  // If VITE_API_URL points at somebody else's server (port 5000 is a
  // common collision), say so up front instead of surfacing that
  // server's confusing error message.
  useEffect(() => {
    let cancelled = false;
    checkApiTarget().then((r) => {
      if (!cancelled && !r.ok) setApiProblem(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await adminLogin(email, password);
      setToken(res.token);
      onSuccess(res.admin);
    } catch (err) {
      const diagnosis = await checkApiTarget();
      if (!diagnosis.ok) {
        setApiProblem(diagnosis);
        setError('');
      } else {
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F3D1E] flex items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col gap-5"
      >
        <div className="flex flex-col items-center gap-3 mb-2">
          <img src="/MVP.png" alt="MVP Crackers" className="h-16 w-auto" />
          <h1 className="text-2xl font-bold text-[#0F3D1E] tracking-wide">ADMIN PANEL</h1>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
            className="w-full border-2 border-gray-200 rounded-lg p-3 focus:outline-none focus:border-green-600 focus:ring-4 focus:ring-green-600/10 font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full border-2 border-gray-200 rounded-lg p-3 focus:outline-none focus:border-green-600 focus:ring-4 focus:ring-green-600/10 font-medium"
          />
        </div>

        {apiProblem && (
          <div className="bg-amber-50 border-2 border-amber-300 text-amber-900 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span className="text-sm font-semibold leading-relaxed">{apiProblem.message}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-800 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span className="text-sm font-semibold">{error}</span>
          </div>
        )}

        <p className="text-xs text-gray-400 text-center -mt-1">API: {API_BASE}</p>

        <button
          type="submit"
          disabled={busy || Boolean(apiProblem)}
          className="w-full bg-[#0F3D1E] text-white font-bold py-4 rounded-xl hover:bg-green-900 disabled:opacity-60 transition-colors uppercase tracking-widest flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
          {busy ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Order detail drawer
// ─────────────────────────────────────────────────────────────
function OrderDetail({ orderId, onClose, onChanged, onSynced }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [paymentRef, setPaymentRef] = useState('');

  // Held in a ref so a parent that passes a fresh arrow function on
  // every render cannot change `load`'s identity and re-trigger the
  // fetch effect forever.
  const onSyncedRef = useRef(onSynced);
  onSyncedRef.current = onSynced;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminGetOrder(orderId);
      setOrder(res.order);
      setPaymentRef(res.order.paymentReference || '');
      setError('');

      // This drawer always shows the live document, while the table
      // behind it shows whatever was true when the page last loaded.
      // Hand the fresh values up so the row underneath cannot contradict
      // what is on screen right now. Patching one row rather than
      // refetching keeps this free, and cannot loop: `load` only ever
      // changes when `orderId` does.
      onSyncedRef.current?.(res.order);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (status) => {
    setBusy(true);
    setError('');
    try {
      await adminUpdateStatus(orderId, status);
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const changePayment = async (paymentStatus) => {
    if (paymentStatus === 'Paid' && !paymentRef.trim()) {
      setError('Enter a payment reference before marking this order as Paid.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await adminUpdatePaymentStatus(orderId, paymentStatus, paymentRef.trim());
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
      <div className="bg-gray-50 w-full max-w-3xl h-full overflow-y-auto shadow-2xl">
        <div className="bg-[#0F3D1E] text-white px-6 py-4 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-lg font-bold tracking-wide">
            {order ? order.orderNumber : 'Loading order...'}
          </h2>
          <button onClick={onClose} className="text-white/70 hover:text-white" aria-label="Close">
            <X className="w-6 h-6" />
          </button>
        </div>

        {loading && (
          <div className="p-16 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        )}

        {error && (
          <div className="m-6 bg-red-50 border-2 border-red-200 text-red-800 rounded-lg p-4 text-sm font-semibold">
            {error}
          </div>
        )}

        {order && (
          <div className="p-6 flex flex-col gap-5">
            {/* Customer */}
            <section className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Customer</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Name</span>
                  <div className="font-bold text-gray-900">{order.customer.name}</div>
                </div>
                <div>
                  <span className="text-gray-500">Mobile</span>
                  <div className="font-bold text-gray-900">
                    <a href={`tel:${order.customer.mobile}`} className="hover:underline">
                      {order.customer.mobile}
                    </a>
                  </div>
                </div>
                {order.customer.email && (
                  <div className="sm:col-span-2">
                    <span className="text-gray-500">Email</span>
                    <div className="font-bold text-gray-900">{order.customer.email}</div>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <span className="text-gray-500">Delivery Address</span>
                  <div className="font-medium text-gray-900 leading-relaxed">
                    {order.deliveryAddress.fullAddress}
                    <br />
                    {[order.deliveryAddress.city, order.deliveryAddress.district]
                      .filter(Boolean)
                      .join(', ')}
                    {order.deliveryAddress.state ? `, ${order.deliveryAddress.state}` : ''}
                    {order.deliveryAddress.pincode ? ` - ${order.deliveryAddress.pincode}` : ''}
                  </div>
                </div>
                {order.deliveryAddress.deliveryNotes && (
                  <div className="sm:col-span-2">
                    <span className="text-gray-500">Notes</span>
                    <div className="font-medium text-gray-900">
                      {order.deliveryAddress.deliveryNotes}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Items */}
            <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 px-5 pt-5 pb-3">
                Ordered Products
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[520px]">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="text-left px-5 py-2 font-bold">Product</th>
                      <th className="text-center px-3 py-2 font-bold">Qty</th>
                      <th className="text-right px-3 py-2 font-bold">Unit</th>
                      <th className="text-right px-5 py-2 font-bold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((i) => (
                      <tr key={i.productId} className="border-t border-gray-100">
                        <td className="px-5 py-2.5 font-semibold text-gray-800">
                          {i.name}
                          <span className="block text-xs text-gray-400 font-normal">{i.content}</span>
                        </td>
                        <td className="text-center px-3 py-2.5">{i.quantity}</td>
                        <td className="text-right px-3 py-2.5">{money(i.unitPrice)}</td>
                        <td className="text-right px-5 py-2.5 font-bold">{money(i.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-gray-100 p-5 flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{money(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-green-700 font-semibold">
                  <span>Discount ({order.discountPercent}%)</span>
                  <span>- {money(order.discountAmount)}</span>
                </div>
                {order.taxAmount > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>GST / Tax ({order.taxPercent}%)</span>
                    <span>{money(order.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Delivery</span>
                  <span>{order.deliveryCharge > 0 ? money(order.deliveryCharge) : 'FREE'}</span>
                </div>
                {order.whitebagCharge > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Whitebag</span>
                    <span>{money(order.whitebagCharge)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-black text-[#0F3D1E] border-t pt-3 mt-2">
                  <span>Grand Total</span>
                  <span>{money(order.grandTotal)}</span>
                </div>
              </div>
            </section>

            {/* Invoice */}
            <section className="bg-white rounded-xl border border-gray-200 p-5 flex flex-wrap gap-3 items-center">
              <div className="mr-auto">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Invoice</h3>
                <div className="font-bold text-gray-900">{order.invoiceNumber}</div>
              </div>
              <a
                href={invoiceViewUrl(order._id)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 border-2 border-gray-200 rounded-lg font-bold text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Eye className="w-4 h-4" /> View
              </a>
              <a
                href={invoiceDownloadUrl(order._id)}
                className="px-4 py-2.5 bg-[#0F3D1E] text-white rounded-lg font-bold text-sm hover:bg-green-900 flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Download
              </a>
            </section>

            {/* Status controls */}
            <section className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-5">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                  Order Status — currently <Badge value={order.orderStatus} />
                </h3>
                <div className="flex flex-wrap gap-2">
                  {ORDER_STATUSES.map((s) => (
                    <button
                      key={s}
                      disabled={busy || s === order.orderStatus}
                      onClick={() => changeStatus(s)}
                      className={`px-3 py-2 rounded-lg text-sm font-bold border-2 transition-colors ${
                        s === order.orderStatus
                          ? 'border-[#0F3D1E] bg-[#0F3D1E] text-white cursor-default'
                          : 'border-gray-200 text-gray-600 hover:border-[#0F3D1E] hover:text-[#0F3D1E]'
                      } disabled:opacity-60`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                  Payment Status — currently <Badge value={order.paymentStatus} />
                </h3>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="Payment reference (UPI ref / txn id / cash on delivery)"
                  className="w-full border-2 border-gray-200 rounded-lg p-3 text-sm font-medium mb-3 focus:outline-none focus:border-green-600"
                />
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_STATUSES.map((s) => (
                    <button
                      key={s}
                      disabled={busy || s === order.paymentStatus}
                      onClick={() => changePayment(s)}
                      className={`px-3 py-2 rounded-lg text-sm font-bold border-2 transition-colors ${
                        s === order.paymentStatus
                          ? 'border-[#0F3D1E] bg-[#0F3D1E] text-white cursor-default'
                          : 'border-gray-200 text-gray-600 hover:border-[#0F3D1E] hover:text-[#0F3D1E]'
                      } disabled:opacity-60`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  An order is only marked Paid once you record a reference — nothing marks it
                  automatically.
                </p>
              </div>
            </section>

            {/* History */}
            {order.statusHistory?.length > 0 && (
              <section className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                  History
                </h3>
                <ul className="flex flex-col gap-2 text-sm">
                  {order.statusHistory.map((h, idx) => (
                    <li key={idx} className="flex flex-wrap gap-2 items-center text-gray-600">
                      <Badge value={h.status} />
                      <span className="text-gray-500">{h.note}</span>
                      <span className="text-gray-400 text-xs ml-auto">
                        {when(h.at)} · {h.by}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Dashboard
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
//  Orders panel
// ─────────────────────────────────────────────────────────────
function OrdersPanel({ onUnauthorized, focusOrderId, refreshSignal }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  // Opening an order from the notification bell.
  useEffect(() => {
    if (focusOrderId) setSelectedId(focusOrderId);
  }, [focusOrderId]);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminListOrders({ search, status, paymentStatus, page, limit: 20 });
      setData(res);
      setError('');
    } catch (err) {
      setError(err.message);
      if (err.status === 401) onUnauthorized?.();
    } finally {
      setLoading(false);
    }
  }, [search, status, paymentStatus, page, onUnauthorized]);

  /**
   * Corrects one row from a live copy of the order, without a refetch.
   *
   * The table is a snapshot taken when the page loaded; the drawer
   * always fetches the current document. When a customer confirms their
   * own order by sharing the invoice, the two disagree — the row says
   * Pending while the drawer says Confirmed — and the row is the one
   * that is wrong.
   */
  const syncRow = useCallback((fresh) => {
    // The list projection exposes `id`; the drawer gets the raw
    // document, which has `_id`.
    const id = String(fresh?._id || fresh?.id || '');
    if (!id) return;
    setData((prev) => {
      if (!prev?.orders) return prev;
      let touched = false;
      const orders = prev.orders.map((o) => {
        if (String(o.id) !== id) return o;
        if (
          o.orderStatus === fresh.orderStatus &&
          o.paymentStatus === fresh.paymentStatus &&
          o.grandTotal === fresh.grandTotal
        ) {
          return o;
        }
        touched = true;
        return {
          ...o,
          orderStatus: fresh.orderStatus,
          paymentStatus: fresh.paymentStatus,
          paymentReference: fresh.paymentReference || '',
          grandTotal: fresh.grandTotal,
        };
      });
      // Returning `prev` unchanged when nothing moved keeps this from
      // re-rendering the table on every drawer open.
      return touched ? { ...prev, orders } : prev;
    });
  }, []);

  // A new order arrived while this list was on screen — pull it in.
  useEffect(() => {
    if (refreshSignal) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);

  // Debounced so typing in the search box doesn't hammer the API.
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <>
      {/* Stats */}
        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
              <Package className="w-8 h-8 text-[#0F3D1E]" />
              <div>
                <div className="text-xs uppercase tracking-wider text-gray-400 font-bold">Orders</div>
                <div className="text-2xl font-black text-gray-900">{data.stats.orderCount}</div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
              <IndianRupee className="w-8 h-8 text-[#0F3D1E]" />
              <div>
                <div className="text-xs uppercase tracking-wider text-gray-400 font-bold">Value</div>
                <div className="text-2xl font-black text-gray-900">{money(data.stats.revenue)}</div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
              <RefreshCw
                className={`w-8 h-8 text-[#0F3D1E] ${loading ? 'animate-spin' : 'cursor-pointer'}`}
                onClick={load}
              />
              <div>
                <div className="text-xs uppercase tracking-wider text-gray-400 font-bold">Page</div>
                <div className="text-2xl font-black text-gray-900">
                  {data.page} / {data.totalPages}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search order no, invoice no, name, mobile or email"
              className="w-full border-2 border-gray-200 rounded-lg py-2.5 pl-11 pr-3 font-medium focus:outline-none focus:border-green-600"
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="border-2 border-gray-200 rounded-lg px-3 py-2.5 font-medium focus:outline-none focus:border-green-600"
          >
            <option value="">All order statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={paymentStatus}
            onChange={(e) => {
              setPaymentStatus(e.target.value);
              setPage(1);
            }}
            className="border-2 border-gray-200 rounded-lg px-3 py-2.5 font-medium focus:outline-none focus:border-green-600"
          >
            <option value="">All payment statuses</option>
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-800 rounded-xl p-4 flex items-center gap-2 font-semibold">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-bold">Order</th>
                  <th className="text-left px-4 py-3 font-bold">Customer</th>
                  <th className="text-left px-4 py-3 font-bold">City</th>
                  <th className="text-center px-4 py-3 font-bold">Items</th>
                  <th className="text-right px-4 py-3 font-bold">Total</th>
                  <th className="text-left px-4 py-3 font-bold">Status</th>
                  <th className="text-left px-4 py-3 font-bold">Payment</th>
                  <th className="text-left px-4 py-3 font-bold">Placed</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading && !data && (
                  <tr>
                    <td colSpan={9} className="text-center py-16">
                      <Loader2 className="w-7 h-7 animate-spin text-gray-400 mx-auto" />
                    </td>
                  </tr>
                )}
                {data?.orders.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-16 text-gray-500 font-medium">
                      No orders match these filters yet.
                    </td>
                  </tr>
                )}
                {data?.orders.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => setSelectedId(o.id)}
                    className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="font-bold text-[#0F3D1E]">{o.orderNumber}</div>
                      <div className="text-xs text-gray-400">{o.invoiceNumber}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{o.customerName}</div>
                      <div className="text-xs text-gray-500">{o.customerMobile}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{o.city}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{o.itemCount}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                      {money(o.grandTotal)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={o.orderStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <PaymentCell order={o} onChanged={load} />
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {when(o.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={invoiceDownloadUrl(o.id)}
                        onClick={(e) => e.stopPropagation()}
                        title="Download invoice"
                        className="text-gray-400 hover:text-[#0F3D1E] inline-block"
                      >
                        <Download className="w-5 h-5" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data && data.totalPages > 1 && (
            <div className="border-t border-gray-100 p-4 flex justify-between items-center">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg font-bold text-sm disabled:opacity-40 hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500 font-medium">
                Page {data.page} of {data.totalPages} · {data.total} orders
              </span>
              <button
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg font-bold text-sm disabled:opacity-40 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      {selectedId && (
        <OrderDetail
          orderId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={load}
          onSynced={syncRow}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
//  Admin shell — auth, tabs, layout
// ─────────────────────────────────────────────────────────────
const TABS = [
  { id: 'orders', label: 'Orders', Icon: ClipboardList },
  { id: 'crackers', label: 'Crackers', Icon: Sparkles },
];

export default function AdminPage() {
  const [admin, setAdmin] = useState(null);
  const [checking, setChecking] = useState(true);
  const [focusOrderId, setFocusOrderId] = useState(null);
  const [refreshSignal, setRefreshSignal] = useState(0);

  const [tab, setTab] = useState(() => {
    try {
      return localStorage.getItem('mvp_admin_tab') || 'orders';
    } catch {
      return 'orders';
    }
  });

  const { refresh: refreshCatalog } = useCatalog();

  // Restore an existing session on load.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!getToken()) {
        setChecking(false);
        return;
      }
      try {
        const res = await adminMe();
        if (!cancelled) setAdmin(res.admin);
      } catch {
        setToken(null);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Stable identities: OrdersPanel's `load` and the notification poller
  // both depend on these, and a fresh arrow on every render restarts
  // their effects continuously.
  const selectTab = useCallback((id) => {
    setTab(id);
    try {
      localStorage.setItem('mvp_admin_tab', id);
    } catch {
      /* private browsing — the tab just won't be remembered */
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setAdmin(null);
  }, []);

  const bumpRefresh = useCallback(() => setRefreshSignal((n) => n + 1), []);
  const openOrderFromBell = useCallback(
    (id) => {
      selectTab('orders');
      setFocusOrderId(id);
    },
    [selectTab]
  );

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!admin) return <LoginScreen onSuccess={setAdmin} />;

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-[#0F3D1E] text-white sticky top-0 z-30 shadow-md">
          <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <img src="/MVP.png" alt="MVP Crackers" className="h-9 w-auto shrink-0" />
              <span className="font-bold tracking-wide hidden md:inline">ADMIN</span>
            </div>
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sm text-white/70 hidden lg:inline truncate">{admin.email}</span>
              <OrderNotifications onRefresh={bumpRefresh} onOpenOrder={openOrderFromBell} />
              <button
                onClick={logout}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-sm font-bold transition-colors shrink-0"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="max-w-[1400px] mx-auto px-4">
            <nav className="flex gap-1 -mb-px overflow-x-auto">
              {TABS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => selectTab(id)}
                  aria-current={tab === id ? 'page' : undefined}
                  className={`px-4 sm:px-5 py-3 font-bold text-sm flex items-center gap-2 border-b-4 transition-colors whitespace-nowrap ${
                    tab === id
                      ? 'border-accent-metallic text-white'
                      : 'border-transparent text-white/60 hover:text-white/90'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </header>

        <main className="max-w-[1400px] mx-auto p-4 sm:p-6 flex flex-col gap-5">
          {tab === 'orders' ? (
            <OrdersPanel
              onUnauthorized={logout}
              focusOrderId={focusOrderId}
              refreshSignal={refreshSignal}
            />
          ) : (
            <CrackersPanel onCatalogChanged={refreshCatalog} />
          )}
        </main>
      </div>
    </ToastProvider>
  );
}
