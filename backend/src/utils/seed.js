require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Product = require('../models/Product');
const Sale = require('../models/Sale');

const connectDB = async () => {
  const primaryUri = process.env.MONGODB_URI;
  const fallbackUri = 'mongodb://127.0.0.1:27017/smartstore';
  
  try {
    await mongoose.connect(primaryUri, { serverSelectionTimeoutMS: 2000 });
    console.log('✅ Connected to Primary MongoDB for seeding');
  } catch (error) {
    console.warn(`⚠️ Primary MongoDB connection failed: ${error.message}`);
    console.log(`🔌 Attempting seeding fallback to local MongoDB: ${fallbackUri}`);
    try {
      await mongoose.disconnect();
      await mongoose.connect(fallbackUri, { serverSelectionTimeoutMS: 2000 });
      console.log('✅ Connected to Local MongoDB for seeding');
    } catch (fallbackError) {
      console.error(`❌ Seeding fallback connection failed: ${fallbackError.message}`);
      process.exit(1);
    }
  }
};

const categories = ['Electronics', 'Clothing', 'Home & Garden', 'Beauty', 'Sports', 'Books', 'Toys', 'Food & Beverage'];
const channels = ['online', 'in-store', 'mobile', 'marketplace', 'social'];

const sampleProducts = [
  { name: 'Wireless Noise-Cancelling Headphones', category: 'Electronics', price: 299.99, stock: 45, totalSales: 132, totalRevenue: 39598.68, imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300' },
  { name: 'Organic Cotton T-Shirt', category: 'Clothing', price: 34.99, stock: 8, totalSales: 289, totalRevenue: 10112.11, imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300' },
  { name: 'Smart Home Security Camera', category: 'Electronics', price: 149.99, stock: 67, totalSales: 98, totalRevenue: 14699.02, imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300' },
  { name: 'Yoga Mat Premium', category: 'Sports', price: 79.99, stock: 3, totalSales: 201, totalRevenue: 16077.99, imageUrl: 'https://images.unsplash.com/photo-1601925228086-10d26dd80d17?w=300' },
  { name: 'Vitamin C Serum', category: 'Beauty', price: 49.99, stock: 15, totalSales: 445, totalRevenue: 22245.55, imageUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300' },
  { name: 'Stainless Steel Water Bottle', category: 'Home & Garden', price: 24.99, stock: 120, totalSales: 678, totalRevenue: 16942.22, imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=300' },
  { name: 'Bestselling Business Book', category: 'Books', price: 19.99, stock: 0, totalSales: 356, totalRevenue: 7116.44, imageUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300' },
  { name: 'Bluetooth Smart Watch', category: 'Electronics', price: 199.99, stock: 22, totalSales: 167, totalRevenue: 33398.33, imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300' },
  { name: 'Plant-Based Protein Powder', category: 'Food & Beverage', price: 59.99, stock: 5, totalSales: 234, totalRevenue: 14037.66, imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300' },
  { name: 'LEGO Architecture Set', category: 'Toys', price: 89.99, stock: 31, totalSales: 89, totalRevenue: 8009.11, imageUrl: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=300' },
];

const generateSales = (productId, productName, baseRevenue, daysBack = 90) => {
  const sales = [];
  const numSales = Math.floor(baseRevenue / 150) + Math.floor(Math.random() * 20);

  for (let i = 0; i < Math.min(numSales, 80); i++) {
    const daysAgo = Math.floor(Math.random() * daysBack);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    const quantity = Math.floor(Math.random() * 3) + 1;
    const unitPrice = Math.round((baseRevenue / numSales / quantity) * 100) / 100;
    const revenue = Math.round(unitPrice * quantity * 100) / 100;

    sales.push({
      product: productId,
      productName,
      quantity,
      unitPrice: unitPrice > 0 ? unitPrice : 10,
      revenue: revenue > 0 ? revenue : 10,
      channel: channels[Math.floor(Math.random() * channels.length)],
      status: Math.random() > 0.05 ? 'completed' : 'refunded',
      date,
    });
  }

  return sales;
};

const seed = async () => {
  try {
    await connectDB();

    // Clear existing data
    await User.deleteMany({});
    await Product.deleteMany({});
    await Sale.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create demo user
    const user = await User.create({
      name: 'Alex Johnson',
      email: 'demo@smartstore.ai',
      password: 'demo123456',
      storeName: 'SmartStore Demo Shop',
      role: 'admin',
    });
    console.log('👤 Created demo user: demo@smartstore.ai / demo123456');

    // Create products
    const createdProducts = [];
    for (const p of sampleProducts) {
      const product = await Product.create({
        ...p,
        description: `High-quality ${p.name.toLowerCase()} for modern consumers.`,
        aiDescription: '',
        tags: [p.category.toLowerCase(), 'trending', 'bestseller'],
        seoKeywords: [`buy ${p.name.toLowerCase()}`, `${p.category.toLowerCase()} online`],
        lowStockThreshold: 10,
        status: 'active',
        comparePrice: Math.round(p.price * 1.2 * 100) / 100,
        createdBy: user._id,
      });
      createdProducts.push(product);
    }
    console.log(`📦 Created ${createdProducts.length} products`);

    // Create sales data
    let totalSales = 0;
    for (const product of createdProducts) {
      const sales = generateSales(product._id, product.name, product.totalRevenue);
      const salesWithUser = sales.map(s => ({ ...s, createdBy: user._id }));
      if (salesWithUser.length > 0) {
        await Sale.insertMany(salesWithUser);
        totalSales += salesWithUser.length;
      }
    }
    console.log(`💰 Created ${totalSales} sale records`);

    console.log('\n✅ Database seeded successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Login: demo@smartstore.ai');
    console.log('🔑 Password: demo123456');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

seed();
