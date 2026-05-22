const Sale = require('../models/Sale');

// @desc    Get order/sale records
// @route   GET /api/sales/orders
const getOrders = async (req, res) => {
  try {
    const { status, channel, search, page = 1, limit = 50 } = req.query;
    const query = { createdBy: req.user._id };

    if (status) query.status = status;
    if (channel) query.channel = channel;
    if (search) {
      query.$or = [
        { productName: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.email': { $regex: search, $options: 'i' } },
      ];
    }

    const [orders, total] = await Promise.all([
      Sale.find(query)
        .sort({ date: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .populate('product', 'name imageUrl category'),
      Sale.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: orders,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders.' });
  }
};

// @desc    Get customer analytics from sales
// @route   GET /api/sales/customers
const getCustomers = async (req, res) => {
  try {
    const { search } = req.query;
    const match = {
      createdBy: req.user._id,
      'customer.email': { $exists: true, $nin: ['', null] },
    };

    if (search) {
      match.$or = [
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.email': { $regex: search, $options: 'i' } },
        { 'customer.location': { $regex: search, $options: 'i' } },
      ];
    }

    const customers = await Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$customer.email',
          name: { $first: '$customer.name' },
          email: { $first: '$customer.email' },
          location: { $first: '$customer.location' },
          orders: { $sum: 1 },
          revenue: { $sum: '$revenue' },
          units: { $sum: '$quantity' },
          lastOrderAt: { $max: '$date' },
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    res.json({ success: true, data: customers });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch customers.' });
  }
};

module.exports = { getOrders, getCustomers };
