/**
 * This file no longer contains any product data.
 * ---------------------------------------------------------------
 * Products and prices live in MongoDB and are served by the backend
 * (GET /api/products). Nothing in the app reads a price from code, so
 * an admin's edit in the Crackers panel is the single thing that can
 * change what a customer sees.
 *
 * The seed list used to populate MongoDB now lives at:
 *     Backend/src/data/catalog.json     (loaded by `npm run seed`)
 *
 * To add or change a cracker, use the Admin Panel -> Crackers tab.
 * To bulk-load the original list into a fresh database, run
 * `npm run seed` in the Backend folder.
 *
 * Kept as a file (rather than deleted) only so any stray import fails
 * loudly instead of silently pulling in a stale price list.
 */

export const CATEGORIES = [];

/** @deprecated Use `useCatalog().getProduct(id)` — it reads the live list. */
export const getProductById = () => {
  throw new Error(
    'getProductById() was removed. Product data now comes from the backend — use useCatalog().getProduct(id).'
  );
};

/** @deprecated Category artwork is stored on each product in MongoDB. */
export const getCategoryImage = () => '/MVP.png';
