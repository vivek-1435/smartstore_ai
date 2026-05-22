const express = require('express');
const router = express.Router();
const {
  getRevenue, getTopProducts, getRevenueByCategory, getLowStock, getSummary, getSalesByChannel
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/summary', getSummary);
router.get('/revenue', getRevenue);
router.get('/top-products', getTopProducts);
router.get('/by-category', getRevenueByCategory);
router.get('/by-channel', getSalesByChannel);
router.get('/low-stock', getLowStock);

module.exports = router;
