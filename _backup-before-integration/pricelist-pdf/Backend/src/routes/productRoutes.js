const express = require('express');
const ctrl = require('../controllers/productController');
const { requireAdmin, optionalAdmin } = require('../middleware/auth');

const router = express.Router();

// ── Public ────────────────────────────────────────────────
// `optionalAdmin` lets a signed-in admin get the full product shape
// (including inactive items) from the same endpoint, without ever
// rejecting an ordinary customer.
router.get('/categories', ctrl.listCategories);
router.get('/', optionalAdmin, ctrl.listProducts);

// ── Admin only ────────────────────────────────────────────
// Declared before '/:id' so "bulk-price" is not read as an id.
router.post('/bulk-price', requireAdmin, ctrl.bulkUpdatePrice);
router.post('/', requireAdmin, ctrl.createProduct);

router.put('/:id/price', requireAdmin, ctrl.updatePrice);
router.put('/:id/status', requireAdmin, ctrl.updateStatus);
router.put('/:id/stock', requireAdmin, ctrl.updateStock);
router.put('/:id', requireAdmin, ctrl.updateProduct);
router.delete('/:id', requireAdmin, ctrl.deleteProduct);

router.get('/:id', optionalAdmin, ctrl.getProduct);

module.exports = router;
