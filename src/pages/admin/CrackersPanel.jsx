import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Loader2,
  Search,
  Plus,
  Pencil,
  Trash2,
  IndianRupee,
  Eye,
  EyeOff,
  Package,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
  adminListProducts,
  fetchCategoryList,
  adminCreateProduct,
  adminUpdateProduct,
  adminUpdatePrice,
  adminSetProductStatus,
  adminDeleteProduct,
} from '../../api/client';
import {
  Modal,
  ConfirmDialog,
  Field,
  fieldOk,
  fieldBad,
  EmptyState,
  useToast,
} from '../../components/admin/AdminUI';

const rs = (n) => `Rs. ${Number(n || 0).toFixed(2)}`;

const STATUS_FILTERS = [
  { value: '', label: 'All products' },
  { value: 'active', label: 'Active only' },
  { value: 'inactive', label: 'Inactive only' },
  { value: 'unavailable', label: 'Not orderable' },
  { value: 'on_offer', label: 'On offer' },
  { value: 'out_of_stock', label: 'Out of stock' },
];

const emptyForm = {
  name: '',
  categoryTitle: '',
  description: '',
  image: '',
  content: '1 BOX',
  price: '',
  offerPrice: '',
  stock: '500',
  isActive: true,
  isAvailable: true,
};

// ─────────────────────────────────────────────────────────────
//  Add / Edit form
// ─────────────────────────────────────────────────────────────
function ProductForm({ open, product, categories, onClose, onSaved }) {
  const { notify } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [topError, setTopError] = useState('');

  const isEdit = Boolean(product);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setTopError('');
    setForm(
      product
        ? {
            name: product.name ?? '',
            categoryTitle: product.categoryTitle ?? '',
            description: product.description ?? '',
            image: product.image ?? '',
            content: product.content ?? '1 BOX',
            price: product.price ?? '',
            offerPrice: product.offerPrice ?? '',
            stock: product.stock ?? 0,
            isActive: product.isActive ?? true,
            isAvailable: product.isAvailable ?? true,
          }
        : emptyForm
    );
  }, [open, product]);

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  /** Client-side checks mirror the server so mistakes surface instantly. */
  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Product name is required';
    if (!form.categoryTitle.trim()) e.categoryTitle = 'Category is required';

    const price = Number(form.price);
    if (form.price === '' || !Number.isFinite(price)) e.price = 'Price is required';
    else if (price < 0) e.price = 'Price cannot be negative';

    if (form.offerPrice !== '' && form.offerPrice !== null) {
      const offer = Number(form.offerPrice);
      if (!Number.isFinite(offer)) e.offerPrice = 'Offer price must be a number';
      else if (offer < 0) e.offerPrice = 'Offer price cannot be negative';
      else if (Number.isFinite(price) && offer >= price)
        e.offerPrice = `Must be below the normal price (${rs(price)})`;
    }

    if (form.stock !== '' && !Number.isInteger(Number(form.stock)))
      e.stock = 'Stock must be a whole number';
    if (!String(form.content).trim()) e.content = 'Unit is required';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setTopError('');
    if (!validate()) return;

    const payload = {
      name: form.name.trim(),
      categoryTitle: form.categoryTitle.trim(),
      description: form.description.trim(),
      image: form.image.trim() || '/MVP.png',
      content: String(form.content).trim(),
      price: Number(form.price),
      offerPrice: form.offerPrice === '' ? null : Number(form.offerPrice),
      stock: form.stock === '' ? 0 : Number(form.stock),
      isActive: form.isActive,
      isAvailable: form.isAvailable,
    };

    setBusy(true);
    try {
      const res = isEdit
        ? await adminUpdateProduct(product.productId, payload)
        : await adminCreateProduct(payload);
      notify(res.message || 'Saved.', 'success');
      onSaved();
      onClose();
    } catch (err) {
      if (err.errors && typeof err.errors === 'object') {
        setErrors(Object.fromEntries(Object.entries(err.errors).filter(([, v]) => typeof v === 'string')));
      }
      setTopError(err.message || 'Could not save the product.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title={isEdit ? `Edit — ${product?.name}` : 'Add Cracker'}
      onClose={busy ? () => {} : onClose}
      size="md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-5 py-3 border-2 border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="product-form"
            disabled={busy}
            className="px-6 py-3 bg-[#0F3D1E] text-white rounded-xl font-bold hover:bg-green-900 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Add Cracker'}
          </button>
        </>
      }
    >
      <form id="product-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        {topError && (
          <div className="bg-red-50 border-2 border-red-200 text-red-800 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span className="text-sm font-semibold">{topError}</span>
          </div>
        )}

        <Field label="Cracker / Product Name" required error={errors.name}>
          <input
            value={form.name}
            onChange={set('name')}
            className={errors.name ? fieldBad : fieldOk}
            placeholder="e.g. 10 CM Electric Sparkler 10 Pcs"
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Category"
            required
            error={errors.categoryTitle}
            hint="Pick an existing one or type a new name"
          >
            <input
              list="admin-category-list"
              value={form.categoryTitle}
              onChange={set('categoryTitle')}
              className={errors.categoryTitle ? fieldBad : fieldOk}
              placeholder="e.g. SPARKLER ITEMS"
            />
            <datalist id="admin-category-list">
              {categories.map((c) => (
                <option key={c.id} value={c.title} />
              ))}
            </datalist>
          </Field>

          <Field label="Unit / Quantity" required error={errors.content} hint='e.g. "1 BOX", "10 PKT"'>
            <input
              value={form.content}
              onChange={set('content')}
              className={errors.content ? fieldBad : fieldOk}
            />
          </Field>
        </div>

        <Field label="Description" error={errors.description}>
          <textarea
            value={form.description}
            onChange={set('description')}
            rows={2}
            className={`${errors.description ? fieldBad : fieldOk} resize-y`}
            placeholder="Optional — shown to customers"
          />
        </Field>

        <Field
          label="Image"
          error={errors.image}
          hint="Path under /public, e.g. /images/my_cracker.png — or a full URL"
        >
          <div className="flex gap-3 items-start">
            <input
              value={form.image}
              onChange={set('image')}
              className={errors.image ? fieldBad : fieldOk}
              placeholder="/images/my_cracker.png"
            />
            <div className="w-14 h-14 shrink-0 border-2 border-gray-200 rounded-lg p-1 bg-gray-50 overflow-hidden">
              <img
                src={form.image || '/MVP.png'}
                alt=""
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.src = '/MVP.png';
                }}
              />
            </div>
          </div>
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
          <Field label="Price (Rs.)" required error={errors.price}>
            <input
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              value={form.price}
              onChange={set('price')}
              className={errors.price ? fieldBad : fieldOk}
            />
          </Field>

          <Field label="Offer Price (Rs.)" error={errors.offerPrice} hint="Leave blank for none">
            <input
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              value={form.offerPrice ?? ''}
              onChange={set('offerPrice')}
              className={errors.offerPrice ? fieldBad : fieldOk}
              placeholder="—"
            />
          </Field>

          <Field label="Stock" error={errors.stock}>
            <input
              type="number"
              step="1"
              min="0"
              inputMode="numeric"
              value={form.stock}
              onChange={set('stock')}
              className={errors.stock ? fieldBad : fieldOk}
            />
          </Field>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <label className="flex items-center gap-3 text-sm font-semibold text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={set('isActive')}
              className="w-5 h-5 rounded border-2 border-gray-300 text-green-600"
            />
            Active — visible in the shop
          </label>
          <label className="flex items-center gap-3 text-sm font-semibold text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isAvailable}
              onChange={set('isAvailable')}
              className="w-5 h-5 rounded border-2 border-gray-300 text-green-600"
            />
            Available to order
          </label>
        </div>
      </form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
//  Price management
// ─────────────────────────────────────────────────────────────
function PriceDialog({ open, product, onClose, onSaved }) {
  const { notify } = useToast();
  const [price, setPrice] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [errors, setErrors] = useState({});
  const [stage, setStage] = useState('edit'); // 'edit' | 'confirm'
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !product) return;
    setPrice(String(product.price ?? ''));
    setOfferPrice(product.offerPrice === null || product.offerPrice === undefined ? '' : String(product.offerPrice));
    setErrors({});
    setStage('edit');
  }, [open, product]);

  if (!product) return null;

  const newPrice = Number(price);
  const newOffer = offerPrice === '' ? null : Number(offerPrice);
  const priceChanged = Number.isFinite(newPrice) && newPrice !== product.price;
  const offerChanged = newOffer !== (product.offerPrice ?? null);
  const anythingChanged = priceChanged || offerChanged;
  const delta = Number.isFinite(newPrice) ? newPrice - product.price : 0;

  const validate = () => {
    const e = {};
    if (price === '' || !Number.isFinite(newPrice)) e.price = 'Enter a price';
    else if (newPrice < 0) e.price = 'Price cannot be negative';
    if (newOffer !== null) {
      if (!Number.isFinite(newOffer)) e.offerPrice = 'Offer price must be a number';
      else if (newOffer < 0) e.offerPrice = 'Offer price cannot be negative';
      else if (Number.isFinite(newPrice) && newOffer >= newPrice)
        e.offerPrice = `Must be below ${rs(newPrice)}`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const review = (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    if (!anythingChanged) {
      notify('That is the same price — nothing to update.', 'info');
      return;
    }
    setStage('confirm');
  };

  const commit = async () => {
    setBusy(true);
    try {
      const res = await adminUpdatePrice(product.productId, {
        price: newPrice,
        offerPrice: newOffer,
      });
      notify(res.message || 'Price updated.', 'success');
      onSaved();
      onClose();
    } catch (err) {
      if (err.errors) setErrors(err.errors);
      notify(err.message || 'Could not update the price.', 'error');
      setStage('edit');
    } finally {
      setBusy(false);
    }
  };

  // ── Step 2: the explicit confirmation ──
  if (stage === 'confirm') {
    return (
      <ConfirmDialog
        open={open}
        tone="primary"
        title="Confirm price change"
        confirmLabel="Yes, update price"
        cancelLabel="Go back"
        busy={busy}
        onCancel={() => (busy ? null : setStage('edit'))}
        onConfirm={commit}
        message={
          priceChanged
            ? `Are you sure you want to update the price of "${product.name}" from ₹${product.price.toFixed(
                2
              )} to ₹${newPrice.toFixed(2)}?`
            : `Are you sure you want to update the offer price of "${product.name}"?`
        }
        detail={
          offerChanged
            ? `Offer price: ${
                product.offerPrice === null || product.offerPrice === undefined
                  ? 'none'
                  : `₹${Number(product.offerPrice).toFixed(2)}`
              } → ${newOffer === null ? 'none' : `₹${newOffer.toFixed(2)}`}. This takes effect immediately for every customer. Invoices already issued are not affected.`
            : 'This takes effect immediately for every customer. Invoices already issued are not affected.'
        }
      />
    );
  }

  // ── Step 1: enter the new price ──
  return (
    <Modal
      open={open}
      title={`Change Price — ${product.name}`}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-5 py-3 border-2 border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="price-form"
            disabled={!anythingChanged}
            className="px-6 py-3 bg-[#0F3D1E] text-white rounded-xl font-bold hover:bg-green-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Review Change
          </button>
        </>
      }
    >
      <form id="price-form" onSubmit={review} noValidate className="flex flex-col gap-4">
        {/* Current price, shown before any change is made */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
            Current price
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-black text-[#0F3D1E]">{rs(product.price)}</span>
            {product.offerPrice !== null && product.offerPrice !== undefined && (
              <span className="text-sm font-bold text-green-700">
                offer {rs(product.offerPrice)}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Unit: {product.content} · Category: {product.categoryTitle}
          </div>
        </div>

        <Field label="New Price (Rs.)" required error={errors.price}>
          <input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={price}
            onChange={(e) => {
              setPrice(e.target.value);
              setErrors((p) => ({ ...p, price: undefined }));
            }}
            className={errors.price ? fieldBad : fieldOk}
            autoFocus
          />
        </Field>

        <Field
          label="New Offer Price (Rs.)"
          error={errors.offerPrice}
          hint="Leave blank to remove the offer"
        >
          <input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={offerPrice}
            onChange={(e) => {
              setOfferPrice(e.target.value);
              setErrors((p) => ({ ...p, offerPrice: undefined }));
            }}
            className={errors.offerPrice ? fieldBad : fieldOk}
            placeholder="—"
          />
        </Field>

        {priceChanged && Number.isFinite(newPrice) && (
          <div
            className={`rounded-lg px-4 py-3 text-sm font-bold flex items-center gap-2 ${
              delta > 0 ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-800'
            }`}
          >
            {delta > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {delta > 0 ? 'Increase' : 'Decrease'} of {rs(Math.abs(delta))} (
            {product.price > 0 ? ((delta / product.price) * 100).toFixed(1) : '—'}%)
          </div>
        )}

        {product.priceHistory?.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer font-bold text-gray-600 hover:text-gray-900">
              Recent price history ({product.priceHistory.length})
            </summary>
            <ul className="mt-2 flex flex-col gap-1.5 text-xs text-gray-500">
              {product.priceHistory.map((h, i) => (
                <li key={i} className="flex justify-between gap-3 border-b border-gray-100 pb-1">
                  <span>
                    {h.previousPrice != null ? `${rs(h.previousPrice)} → ` : ''}
                    <strong className="text-gray-700">{rs(h.price)}</strong>
                    {h.note ? ` · ${h.note}` : ''}
                  </span>
                  <span className="shrink-0">{new Date(h.at).toLocaleDateString('en-IN')}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
//  Main panel
// ─────────────────────────────────────────────────────────────
export default function CrackersPanel({ onCatalogChanged }) {
  const { notify } = useToast();

  const [data, setData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pricing, setPricing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [rowBusy, setRowBusy] = useState(null);

  const firstLoad = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminListProducts({ search, status, category, page, limit: 50 });
      setData(res);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      firstLoad.current = false;
    }
  }, [search, status, category, page]);

  useEffect(() => {
    const t = setTimeout(load, firstLoad.current ? 0 : 300);
    return () => clearTimeout(t);
  }, [load]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetchCategoryList();
      setCategories(res.categories || []);
    } catch {
      /* the form still works with free text */
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  /** Called after any mutation: refresh the table and the storefront. */
  const refreshAll = useCallback(() => {
    load();
    loadCategories();
    onCatalogChanged?.();
  }, [load, loadCategories, onCatalogChanged]);

  const toggleActive = async (product) => {
    setRowBusy(product.productId);
    try {
      const res = await adminSetProductStatus(product.productId, !product.isActive);
      notify(res.message, 'success');
      refreshAll();
    } catch (err) {
      notify(err.message || 'Could not change the status.', 'error');
    } finally {
      setRowBusy(null);
    }
  };

  const doDelete = async () => {
    if (!confirm) return;
    setRowBusy(confirm.productId);
    try {
      const res = await adminDeleteProduct(confirm.productId, false);
      notify(res.message, 'success');
      setConfirm(null);
      refreshAll();
    } catch (err) {
      notify(err.message || 'Could not delete the product.', 'error');
    } finally {
      setRowBusy(null);
    }
  };

  const products = data?.products || [];
  const stats = data?.stats;
  const filtersActive = Boolean(search || status || category);

  // Position of this page within the whole result set.
  const rangeStart = data && products.length ? (data.page - 1) * data.limit + 1 : 0;
  const rangeEnd = data ? rangeStart + products.length - 1 : 0;

  const categoryOptions = useMemo(
    () => [{ id: '', title: 'All categories' }, ...categories],
    [categories]
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: 'Products', value: stats.all, Icon: Package },
            { label: 'Active', value: stats.active, Icon: Eye },
            { label: 'Inactive', value: stats.inactive, Icon: EyeOff },
            { label: 'On offer', value: stats.onOffer, Icon: IndianRupee },
          ].map(({ label, value, Icon }) => (
            <div
              key={label}
              className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3"
            >
              <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-[#0F3D1E] shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs uppercase tracking-wider text-gray-400 font-bold truncate">
                  {label}
                </div>
                <div className="text-xl sm:text-2xl font-black text-gray-900">{value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, category or product number"
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
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          className="border-2 border-gray-200 rounded-lg px-3 py-2.5 font-medium focus:outline-none focus:border-green-600 max-w-full lg:max-w-[220px]"
        >
          {categoryOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>

        {/* Kept on one row on small screens so neither button stretches */}
        <div className="flex gap-3">
          <button
            onClick={load}
            title="Refresh"
            aria-label="Refresh"
            className="px-3 py-2.5 border-2 border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 shrink-0"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="flex-1 lg:flex-none px-5 py-2.5 bg-[#0F3D1E] text-white rounded-lg font-bold hover:bg-green-900 flex items-center justify-center gap-2 shrink-0 whitespace-nowrap"
          >
            <Plus className="w-5 h-5" /> Add Cracker
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 text-red-800 rounded-xl p-4 flex items-center gap-2 font-semibold">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Row count — makes it obvious the ID column is not a row number */}
      {data && products.length > 0 && (
        <p className="text-sm text-gray-500 -mb-1">
          Showing <strong className="text-gray-700">{rangeStart}</strong>–
          <strong className="text-gray-700">{rangeEnd}</strong> of{' '}
          <strong className="text-gray-700">{data.total}</strong> crackers
          {filtersActive ? ' (filtered)' : ''}. Sorted by category, so the ID column runs out of
          order.
        </p>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading && !data ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={Package}
            title={filtersActive ? 'No crackers match those filters' : 'No crackers yet'}
            message={
              filtersActive
                ? 'Try a different search term, or clear the filters to see everything.'
                : 'Add your first cracker and it will appear in the shop straight away.'
            }
            action={
              filtersActive ? (
                <button
                  onClick={() => {
                    setSearch('');
                    setStatus('');
                    setCategory('');
                    setPage(1);
                  }}
                  className="px-5 py-3 border-2 border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50"
                >
                  Clear filters
                </button>
              ) : (
                <button
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                  className="px-5 py-3 bg-[#0F3D1E] text-white rounded-xl font-bold hover:bg-green-900 inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" /> Add Cracker
                </button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th
                    className="text-left px-4 py-3 font-bold"
                    title="Product ID — the permanent number for this cracker. Rows are sorted by category, so IDs are not sequential."
                  >
                    ID
                  </th>
                  <th className="text-left px-4 py-3 font-bold">Cracker</th>
                  <th className="text-left px-4 py-3 font-bold">Category</th>
                  <th className="text-center px-4 py-3 font-bold">Unit</th>
                  <th className="text-right px-4 py-3 font-bold">Price</th>
                  <th className="text-center px-4 py-3 font-bold">Stock</th>
                  <th className="text-center px-4 py-3 font-bold">Status</th>
                  <th className="text-right px-4 py-3 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr
                    key={p._id || p.productId}
                    className={`border-t border-gray-100 hover:bg-gray-50 ${
                      p.isActive ? '' : 'opacity-60'
                    }`}
                  >
                    <td className="px-4 py-3 text-gray-400 font-bold">{p.productId}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 shrink-0 bg-gray-50 border border-gray-200 rounded p-1 overflow-hidden">
                          <img
                            src={p.image || '/MVP.png'}
                            alt=""
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.src = '/MVP.png';
                            }}
                          />
                        </div>
                        <span className="font-semibold text-gray-900">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.categoryTitle}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{p.content}</td>
                    <td className="px-4 py-3 text-right">
                      {p.hasOffer ? (
                        <div>
                          <div className="font-bold text-green-700">{rs(p.offerPrice)}</div>
                          <div className="text-xs text-gray-400 line-through">{rs(p.price)}</div>
                        </div>
                      ) : (
                        <span className="font-bold text-gray-900">{rs(p.price)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {!p.trackStock ? (
                        <span className="text-gray-400 text-xs">not tracked</span>
                      ) : (
                        <span
                          className={`font-bold ${p.stock <= 0 ? 'text-red-600' : 'text-gray-700'}`}
                        >
                          {p.stock}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {/* Three real states, not two. A product can be active
                          yet not orderable, and hiding that is what made an
                          "Active" row show as out of stock in the shop. */}
                      {!p.isActive ? (
                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-gray-200 text-gray-600">
                          Inactive
                        </span>
                      ) : !p.isAvailable ? (
                        <span
                          className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800"
                          title="Visible in the shop but shown as unavailable. Tick 'Available to order' in Edit to put it back on sale."
                        >
                          Not orderable
                        </span>
                      ) : p.trackStock && p.stock <= 0 ? (
                        <span
                          className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800"
                          title="Stock has run down to zero, so customers cannot order it."
                        >
                          Out of stock
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setPricing(p)}
                          title="Change price"
                          className="p-2 rounded-lg text-gray-500 hover:text-[#0F3D1E] hover:bg-gray-100"
                        >
                          <IndianRupee className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditing(p);
                            setFormOpen(true);
                          }}
                          title="Edit"
                          className="p-2 rounded-lg text-gray-500 hover:text-blue-700 hover:bg-gray-100"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleActive(p)}
                          disabled={rowBusy === p.productId}
                          title={p.isActive ? 'Deactivate' : 'Activate'}
                          className="p-2 rounded-lg text-gray-500 hover:text-amber-700 hover:bg-gray-100 disabled:opacity-40"
                        >
                          {rowBusy === p.productId ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : p.isActive ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setConfirm(p)}
                          title="Delete"
                          className="p-2 rounded-lg text-gray-500 hover:text-red-700 hover:bg-gray-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.totalPages > 1 && (
          <div className="border-t border-gray-100 p-4 flex justify-between items-center">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-4 py-2 border-2 border-gray-200 rounded-lg font-bold text-sm disabled:opacity-40 hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500 font-medium text-center">
              Page {data.page} of {data.totalPages} · showing {rangeStart}–{rangeEnd} of {data.total}
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

      <ProductForm
        open={formOpen}
        product={editing}
        categories={categories}
        onClose={() => setFormOpen(false)}
        onSaved={refreshAll}
      />

      <PriceDialog
        open={Boolean(pricing)}
        product={pricing}
        onClose={() => setPricing(null)}
        onSaved={refreshAll}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Delete cracker"
        confirmLabel="Yes, remove it"
        busy={rowBusy === confirm?.productId}
        onCancel={() => setConfirm(null)}
        onConfirm={doDelete}
        message={`Are you sure you want to delete "${confirm?.name}"?`}
        detail="It will be removed from the shop immediately. Past orders and invoices keep their own copy of the product, so nothing historical changes — and you can re-activate it later from the Inactive filter."
      />
    </div>
  );
}
