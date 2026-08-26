const express = require('express');
const ctrl = require('../controllers/productController');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ── Public ────────────────────────────────────────────────
router.get('/', ctrl.listProducts);
router.get('/:id', ctrl.getProduct);

// ── Admin only ────────────────────────────────────────────
router.post('/', requireAdmin, ctrl.createProduct);
router.put('/:id', requireAdmin, ctrl.updateProduct);
router.delete('/:id', requireAdmin, ctrl.deleteProduct);

module.exports = router;
