import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { fetchCategories, fetchSiteConfig, checkApiTarget } from './api/client';
import { CATEGORIES as FALLBACK_CATEGORIES } from './data';

/**
 * Holds the live price list from MongoDB.
 *
 * The static list in data.js is kept only as an offline fallback so the
 * page still renders if the API is briefly unreachable — the backend
 * always recalculates the real total when the order is placed, so a
 * stale fallback price can never affect what a customer is charged.
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
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [pricing, setPricing] = useState(DEFAULT_PRICING);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState(null);
  const [apiProblem, setApiProblem] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [catalogRes, configRes] = await Promise.all([
        fetchCategories(),
        fetchSiteConfig().catch(() => null),
      ]);

      if (catalogRes?.categories?.length) {
        setCategories(catalogRes.categories);
        setIsLive(true);
        setError(null);
        setApiProblem(null);
      }
      if (configRes?.pricing) setPricing({ ...DEFAULT_PRICING, ...configRes.pricing });
      if (configRes?.business) setBusiness(configRes.business);
    } catch (err) {
      setIsLive(false);
      setError(err);
      // Work out WHY, so the banner can say something useful.
      const diagnosis = await checkApiTarget();
      setApiProblem(diagnosis.ok ? null : diagnosis);
      // Keep showing the fallback list rather than an empty shop.
      // eslint-disable-next-line no-console
      console.warn('Live price list unavailable, using the offline copy:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
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

  const value = useMemo(
    () => ({ categories, productsById, getProduct, pricing, business, loading, isLive, error, apiProblem, refresh: load }),
    [categories, productsById, getProduct, pricing, business, loading, isLive, error, apiProblem, load]
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
};

export const useCatalog = () => {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used inside <CatalogProvider>');
  return ctx;
};
