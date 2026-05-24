const express = require('express');
const router = express.Router();
const {
  getProducts, getProduct, createProduct, updateProduct, deleteProduct, deleteAllProducts, getCategories
} = require('../controllers/productController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/categories', getCategories);
router.route('/').get(getProducts).post(createProduct).delete(deleteAllProducts);
router.route('/:id').get(getProduct).put(updateProduct).delete(deleteProduct);

module.exports = router;
