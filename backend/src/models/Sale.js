const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
    },
    revenue: {
      type: Number,
      required: true,
    },
    channel: {
      type: String,
      enum: ['online', 'in-store', 'mobile', 'marketplace', 'social'],
      default: 'online',
    },
    customer: {
      name: String,
      email: String,
      location: String,
    },
    status: {
      type: String,
      enum: ['completed', 'pending', 'refunded', 'cancelled'],
      default: 'completed',
    },
    date: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Sale', saleSchema);
