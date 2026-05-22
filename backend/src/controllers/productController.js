const Product = require('../models/Product');

// @desc    Get all products
// @route   GET /api/products
const getProducts = async (req, res) => {
  try {
    const { category, status, search, sort = '-createdAt', page = 1, limit = 50 } = req.query;
    const query = { createdBy: req.user._id };

    if (category) query.category = category;
    if (status) query.status = status;
    if (search) query.name = { $regex: search, $options: 'i' };

    const products = await Product.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: products,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch products.' });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
const getProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch product.' });
  }
};

// @desc    Create product
// @route   POST /api/products
const createProduct = async (req, res) => {
  try {
    const { name, description, price, comparePrice, stock, lowStockThreshold, category, tags, imageUrl, sku, status } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({ success: false, message: 'Name, price, and category are required.' });
    }

    const product = await Product.create({
      name,
      description,
      price,
      comparePrice,
      stock: stock || 0,
      lowStockThreshold: lowStockThreshold || 10,
      category,
      tags: tags || [],
      imageUrl: imageUrl || '',
      sku,
      status: status || 'active',
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, message: 'Product created!', data: product });
  } catch (error) {
    console.error('Create product error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'SKU already exists.' });
    }
    res.status(500).json({ success: false, message: 'Failed to create product.' });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    res.json({ success: true, message: 'Product updated!', data: product });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ success: false, message: 'Failed to update product.' });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    res.json({ success: true, message: 'Product deleted!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete product.' });
  }
};

// @desc    Get categories summary
// @route   GET /api/products/categories
const getCategories = async (req, res) => {
  try {
    const categories = await Product.aggregate([
      { $match: { createdBy: req.user._id } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch categories.' });
  }
};

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct, getCategories };
