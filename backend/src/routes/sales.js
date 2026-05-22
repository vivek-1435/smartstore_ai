const express = require('express');
const router = express.Router();
const { getOrders, getCustomers } = require('../controllers/salesController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/orders', getOrders);
router.get('/customers', getCustomers);

module.exports = router;
