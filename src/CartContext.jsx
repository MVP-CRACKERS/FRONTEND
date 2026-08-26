import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useCatalog } from './CatalogContext';

const CartContext = createContext();

const STORAGE_KEY = 'mvp_cart_v1';

const readStoredCart = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const CartProvider = ({ children }) => {
  // Surviving a refresh means a customer who reloads mid-checkout does
  // not silently lose their cart.
  const [cart, setCart] = useState(readStoredCart);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const { getProduct, pricing } = useCatalog();

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      /* storage unavailable — the cart just won't persist */
    }
  }, [cart]);

  const openCheckout = useCallback(() => setIsCheckoutOpen(true), []);
  const closeCheckout = useCallback(() => setIsCheckoutOpen(false), []);

  const updateQuantity = useCallback((id, delta) => {
    setCart((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const newCart = { ...prev };
        delete newCart[id];
        return newCart;
      }
      return { ...prev, [id]: next };
    });
  }, []);

  const setQuantity = useCallback((id, value) => {
    const val = Math.max(0, Math.min(9999, parseInt(value, 10) || 0));
    setCart((prev) => {
      if (val === 0) {
        const newCart = { ...prev };
        delete newCart[id];
        return newCart;
      }
      return { ...prev, [id]: val };
    });
  }, []);

  const removeItem = useCallback((id) => {
    setCart((prev) => {
      const newCart = { ...prev };
      delete newCart[id];
      return newCart;
    });
  }, []);

  const clearCart = useCallback(() => setCart({}), []);

  /** Cart lines resolved against the live price list. */
  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => {
          const product = getProduct(id);
          return product ? { ...product, qty } : null;
        })
        .filter(Boolean),
    [cart, getProduct]
  );

  const cartTotal = useMemo(
    () => cartItems.reduce((total, item) => total + item.price * item.qty, 0),
    [cartItems]
  );

  /** What a line actually costs today, honouring any offer price. */
  const unitPriceOf = (item) =>
    item.offerPrice !== null && item.offerPrice !== undefined && item.offerPrice < item.price
      ? item.offerPrice
      : item.price;

  const cartCount = useMemo(
    () => Object.values(cart).reduce((a, b) => a + b, 0),
    [cart]
  );

  /**
   * Display-only estimate using the same percentages the backend uses.
   * The authoritative figure always comes back from POST /api/orders.
   */
  const estimate = useMemo(() => {
    let subtotal = 0;
    let discount = 0;

    // Per item, exactly as the server does it: an explicit offer price
    // wins over the order-wide percentage. Doing this line by line is
    // what keeps the figure on screen equal to the figure charged.
    for (const item of cartItems) {
      const lineSubtotal = item.price * item.qty;
      subtotal += lineSubtotal;

      const unit = unitPriceOf(item);
      if (unit < item.price) {
        discount += (item.price - unit) * item.qty;
      } else {
        const pct =
          item.discountPercent === null || item.discountPercent === undefined
            ? pricing.discountPercent || 0
            : item.discountPercent;
        discount += (lineSubtotal * pct) / 100;
      }
    }

    const net = subtotal - discount;
    const tax = (net * (pricing.taxPercent || 0)) / 100;

    let delivery = pricing.deliveryCharge || 0;
    if (pricing.freeDeliveryAbove > 0 && net >= pricing.freeDeliveryAbove) delivery = 0;

    return { subtotal, discount, net, tax, delivery, grandTotal: net + tax + delivery };
  }, [cartItems, pricing]);

  /** Payload shape the order API expects. */
  const orderItems = useMemo(
    () => Object.entries(cart).map(([id, qty]) => ({ productId: Number(id), quantity: qty })),
    [cart]
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        cartItems,
        orderItems,
        updateQuantity,
        setQuantity,
        removeItem,
        clearCart,
        cartTotal,
        cartCount,
        estimate,
        unitPriceOf,
        isCheckoutOpen,
        openCheckout,
        closeCheckout,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
