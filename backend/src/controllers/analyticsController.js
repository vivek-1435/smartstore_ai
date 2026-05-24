const Sale = require('../models/Sale');
const Product = require('../models/Product');

// @desc    Get revenue analytics (last N days)
// @route   GET /api/analytics/revenue
const getRevenue = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const revenueData = await Sale.aggregate([
      {
        $match: {
          date: { $gte: startDate },
          status: { $ne: 'cancelled' },
          createdBy: req.user._id,
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          revenue: { $sum: '$revenue' },
          orders: { $sum: 1 },
          units: { $sum: '$quantity' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill missing days with zeros
    const filledData = [];
    for (let i = Number(days) - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const found = revenueData.find(r => r._id === dateStr);
      filledData.push({
        date: dateStr,
        revenue: found ? parseFloat(found.revenue.toFixed(2)) : 0,
        orders: found ? found.orders : 0,
        units: found ? found.units : 0,
      });
    }

    const totalRevenue = filledData.reduce((sum, d) => sum + d.revenue, 0);
    const totalOrders = filledData.reduce((sum, d) => sum + d.orders, 0);

    res.json({
      success: true,
      data: {
        chart: filledData,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalOrders,
        avgOrderValue: totalOrders > 0 ? parseFloat((totalRevenue / totalOrders).toFixed(2)) : 0,
        period: `${days} days`,
      },
    });
  } catch (error) {
    console.error('Revenue analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch revenue data.' });
  }
};

// @desc    Get top selling products (computed from Sale records, not stale Product fields)
// @route   GET /api/analytics/top-products
const getTopProducts = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    // Aggregate from actual Sale records so data is always fresh
    const topFromSales = await Sale.aggregate([
      {
        $match: {
          createdBy: req.user._id,
          status: { $ne: 'cancelled' },
        },
      },
      {
        $group: {
          _id: '$product',
          productName: { $first: '$productName' },
          totalRevenue: { $sum: '$revenue' },
          totalSales: { $sum: '$quantity' },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: Number(limit) },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productData',
        },
      },
      {
        $addFields: {
          productInfo: { $arrayElemAt: ['$productData', 0] },
        },
      },
      {
        $project: {
          _id: '$_id',
          name: { $ifNull: ['$productInfo.name', '$productName'] },
          category: { $ifNull: ['$productInfo.category', 'Unknown'] },
          price: { $ifNull: ['$productInfo.price', 0] },
          imageUrl: { $ifNull: ['$productInfo.imageUrl', ''] },
          stock: { $ifNull: ['$productInfo.stock', 0] },
          totalRevenue: 1,
          totalSales: 1,
          orderCount: 1,
        },
      },
    ]);

    res.json({ success: true, data: topFromSales });
  } catch (error) {
    console.error('Top products analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch top products.' });
  }
};

// @desc    Get revenue by category
// @route   GET /api/analytics/by-category
const getRevenueByCategory = async (req, res) => {
  try {
    const data = await Sale.aggregate([
      { $match: { createdBy: req.user._id, status: { $ne: 'cancelled' } } },
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'productData',
        },
      },
      {
        $addFields: {
          category: {
            $ifNull: [
              { $arrayElemAt: ['$productData.category', 0] },
              'Uncategorized',
            ],
          },
        },
      },
      {
        $group: {
          _id: '$category',
          revenue: { $sum: '$revenue' },
          totalRevenue: { $sum: '$revenue' },
          orders: { $sum: 1 },
          units: { $sum: '$quantity' },
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch category data.' });
  }
};

// @desc    Get low stock products
// @route   GET /api/analytics/low-stock
const getLowStock = async (req, res) => {
  try {
    const products = await Product.find({
      createdBy: req.user._id,
      status: 'active',
      $expr: { $lte: ['$stock', '$lowStockThreshold'] },
    }).select('name stock lowStockThreshold category price');

    res.json({ success: true, data: products, count: products.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch low stock data.' });
  }
};

// @desc    Get KPI summary
// @route   GET /api/analytics/summary
const getSummary = async (req, res) => {
  try {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [
      totalProducts,
      activeProducts,
      lowStockCount,
      currentPeriodSales,
      previousPeriodSales,
      recentSales,
    ] = await Promise.all([
      Product.countDocuments({ createdBy: req.user._id }),
      Product.countDocuments({ createdBy: req.user._id, status: 'active' }),
      Product.countDocuments({
        createdBy: req.user._id,
        status: 'active',
        $expr: { $lte: ['$stock', '$lowStockThreshold'] },
      }),
      Sale.aggregate([
        { $match: { createdBy: req.user._id, date: { $gte: thirtyDaysAgo }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, revenue: { $sum: '$revenue' }, orders: { $sum: 1 }, units: { $sum: '$quantity' } } },
      ]),
      Sale.aggregate([
        { $match: { createdBy: req.user._id, date: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, revenue: { $sum: '$revenue' }, orders: { $sum: 1 } } },
      ]),
      Sale.find({ createdBy: req.user._id, status: { $ne: 'cancelled' } })
        .sort({ date: -1 })
        .limit(5)
        .populate('product', 'name imageUrl'),
    ]);

    const curr = currentPeriodSales[0] || { revenue: 0, orders: 0, units: 0 };
    const prev = previousPeriodSales[0] || { revenue: 0, orders: 0 };

    const revenueGrowth = prev.revenue > 0 ? ((curr.revenue - prev.revenue) / prev.revenue) * 100 : 0;
    const ordersGrowth = prev.orders > 0 ? ((curr.orders - prev.orders) / prev.orders) * 100 : 0;

    res.json({
      success: true,
      data: {
        totalProducts,
        activeProducts,
        lowStockCount,
        revenue: parseFloat(curr.revenue.toFixed(2)),
        revenueGrowth: Math.round(revenueGrowth * 10) / 10,
        totalOrders: curr.orders,
        ordersGrowth: Math.round(ordersGrowth * 10) / 10,
        avgOrderValue: curr.orders > 0 ? parseFloat((curr.revenue / curr.orders).toFixed(2)) : 0,
        recentSales,
      },
    });
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch summary.' });
  }
};

// @desc    Get sales by channel
// @route   GET /api/analytics/by-channel
const getSalesByChannel = async (req, res) => {
  try {
    const data = await Sale.aggregate([
      { $match: { createdBy: req.user._id, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: '$channel',
          revenue: { $sum: '$revenue' },
          totalRevenue: { $sum: '$revenue' },
          orders: { $sum: 1 },
          units: { $sum: '$quantity' },
        },
      },
      { $sort: { revenue: -1 } },
    ]);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch channel data.' });
  }
};

module.exports = { getRevenue, getTopProducts, getRevenueByCategory, getLowStock, getSummary, getSalesByChannel };
