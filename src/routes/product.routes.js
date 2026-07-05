const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { createProduct, listProducts, getProductById, updateProduct, deleteProduct } = require('../controllers/product.controller');

router.get('/', listProducts);
router.get('/:id', getProductById);
router.post('/', authenticate, authorize('FARMER', 'ADMIN'), createProduct);
router.put('/:id', authenticate, updateProduct);
router.delete('/:id', authenticate, deleteProduct);

module.exports = router;