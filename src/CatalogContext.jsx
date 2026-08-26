import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { fetchCategories, fetchSiteConfig, checkApiTarget } from './api/client';

/**
 * The live price list, straight from MongoDB.
 *
 * There is deliberately NO built-in product list here. Prices and
 * products exist in exactly one place — the database — so an admin's
 * edit is the only thing that can change what a customer sees, and a
 * stale copy in the bundle can never contradict it. If the API is
 * unreachable the shop says so rather than showing prices it cannot
 * stand behind.
 */
const CatalogContext = createContext(null);

const DEFAULT_PRICING = {
  discountPercent: 10,
  taxPercent: 5.833,
  deliveryCharge: 0,
  freeDeliveryAbove: 0,
  whitebagCharge: 0,
  minOrderValue: 0,
};

export const CatalogProvider = ({ children }) => {
  const [categories, setCategories] = useState([]);
  const [pricing, setPricing] = useState(DEFAULT_PRICING);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [apiProblem, setApiProblem] = useState(null);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      const [catalogRes, configRes] = await Promise.all([
        fetchCategories(),
        fetchSiteConfig().catch(() => null),
      ]);

      setCategories(catalogRes?.categories || []);
      setError(null);
      setApiProblem(null);
      setLoaded(true);

      if (configRes?.pricing) setPricing({ ...DEFAULT_PRICING, ...configRes.pricing });
      if (configRes?.business) setBusiness(configRes.business);
    } catch (err) {
      setError(err);
      const diagnosis = await checkApiTarget();
      setApiProblem(diagnosis.ok ? null : diagnosis);
      // eslint-disable-next-line no-console
      console.warn('Could not load the price list:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Refresh when the tab regains focus, so a price an admin changed in
   * another tab shows up on the storefront without a manual reload.
   */
  useEffect(() => {
    const onFocus = () => load({ quiet: true });
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') onFocus();
    });
    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, [load]);

  const productsById = useMemo(() => {
    const map = new Map();
    for (const category of categories) {
      for (const item of category.items) {
        map.set(Number(item.id), { ...item, categoryId: category.id, categoryTitle: category.title });
      }
    }
    return map;
  }, [categories]);

  const getProduct = useCallback((id) => productsById.get(Number(id)) || null, [productsById]);

  const productCount = productsById.size;
  const isEmpty = loaded && productCount === 0;

  const value = useMemo(
    () => ({
      categories,
      productsById,
      getProduct,
      productCount,
      pricing,
      business,
      loading,
      loaded,
      isEmpty,
      error,
      apiProblem,
      refresh: () => load({ quiet: true }),
    }),
    [
      categories,
      productsById,
      getProduct,
      productCount,
      pricing,
      business,
      loading,
      loaded,
      isEmpty,
      error,
      apiProblem,
      load,
    ]
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
};

export const useCatalog = () => {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used inside <CatalogProvider>');
  return ctx;
};
