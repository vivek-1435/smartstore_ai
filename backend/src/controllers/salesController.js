const Sale = require('../models/Sale');
const Product = require('../models/Product');
const XLSX = require('xlsx');
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');

// ── Required fields ───────────────────────────────────────────────────────────
const REQUIRED_FIELDS = [
  'productName',
  'quantity',
  'unitPrice',
  'revenue',
  'channel',
  'status',
  'date',
  'customerName',
  'customerEmail',
  'customerLocation',
  'productCategory',
  'sku',
];

// In-memory cache to prevent redundant API calls for the same file structure
const mappingCache = new Map();

const buildMappingResponseSchema = (headers) => ({
  type: SchemaType.OBJECT,
  properties: {
    mapping: {
      type: SchemaType.OBJECT,
      properties: headers.reduce((props, header) => {
        props[header] = {
          type: SchemaType.STRING,
          format: 'enum',
          enum: REQUIRED_FIELDS,
          nullable: true,
        };
        return props;
      }, {}),
      required: headers,
    },
  },
  required: ['mapping'],
});

/**
 * Robustly extract JSON from an LLM response that may wrap it in markdown.
 */
const extractJSON = (text) => {
  // Strip markdown code fences
  let cleaned = text.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  // Try to find the first { ... } block in case of extra text
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }

  return JSON.parse(cleaned);
};

/**
 * Use Gemini to map arbitrary column headers → our required field names.
 * Returns an object like: { "Product": "productName", "Qty": "quantity", ... }
 * Columns that don't match any required field are mapped to null.
 */
const aiMapColumns = async (headers) => {
  if (!process.env.GEMINI_API_KEY || !headers || headers.length === 0) return null;

  // Cache key: sorted headers string
  const cacheKey = [...headers].sort().join('|');
  if (mappingCache.has(cacheKey)) {
    console.log('[AI Mapping] Cache hit for headers:', cacheKey);
    return mappingCache.get(cacheKey);
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MAPPING_MODEL || 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
        responseSchema: buildMappingResponseSchema(headers),
      },
    });

    const prompt = `Map spreadsheet headers to sales fields.
Headers: ${JSON.stringify(headers)}
Fields: productName,item/title/name; quantity,qty/units/count; unitPrice,price/rate/unit cost; revenue,total/amount/sales/gmv; channel,platform/source; status,state/fulfillment; date,order/sale/transaction date; customerName,buyer/client/customer name; customerEmail,email/mail; customerLocation,city/region/address/country; productCategory,category/department/type; sku,item/product code/barcode.
Rules: return every header once; value must be one field name or null; do not map age/phone/gender; no duplicate field values; client/buyer/customer names are customerName, not productName.
JSON only: {"mapping":{"header":"field|null"}}`;

    // Retry logic for rate limits
    let result;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        result = await model.generateContent(prompt);
        break;
      } catch (err) {
        if ((err.message?.includes('429') || err.status === 429) && attempt < 3) {
          console.log(`[AI Mapping] Rate limit hit. Retrying attempt ${attempt + 1} in ${attempt * 2}s...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
        } else {
          throw err;
        }
      }
    }

    const raw = result.response.text();
    console.log('[AI Mapping] Raw response:', raw.substring(0, 200));

    const parsed = extractJSON(raw);

    if (!parsed.mapping || typeof parsed.mapping !== 'object') {
      throw new Error('Invalid mapping structure from AI');
    }

    const cleanMapping = normalizeMapping(parsed.mapping, headers);

    // Cache result (limit size to prevent memory leaks)
    if (mappingCache.size > 50) mappingCache.clear();
    mappingCache.set(cacheKey, cleanMapping);

    console.log('[AI Mapping] Success:', cleanMapping);
    return cleanMapping;
  } catch (err) {
    console.warn('[AI Mapping] Failed, using fuzzy fallback:', err.message);
    return null;
  }
};

/**
 * Fuzzy fallback: map headers using string similarity heuristics.
 */
const fuzzyMapColumns = (headers) => {
  const rules = {
    productName: ['product name', 'item name', 'product title', 'item title', 'product', 'item', 'productname', 'title', 'description'],
    quantity: ['qty', 'quantity', 'units', 'count', 'units sold', 'items sold', 'num units', 'number sold'],
    unitPrice: ['unit price', 'price per unit', 'unit cost', 'unit rate', 'sale price', 'selling price', 'unitprice', 'price', 'cost', 'rate'],
    revenue: ['total revenue', 'total sales', 'gross sales', 'net sales', 'line total', 'order total', 'subtotal', 'total amount', 'amount paid', 'revenue', 'sales', 'gmv', 'amount', 'value', 'total'],
    channel: ['channel', 'platform', 'source', 'medium', 'store type', 'sales channel', 'marketplace'],
    status: ['status', 'order status', 'payment status', 'state', 'fulfillment', 'fulfillment status'],
    date: ['date', 'order date', 'sale date', 'transaction date', 'created', 'purchased', 'purchase date', 'ordered'],
    customerName: ['customer name', 'client name', 'buyer name', 'customer', 'client', 'purchaser', 'full name', 'customername', 'buyer'],
    customerEmail: ['email', 'customer email', 'buyer email', 'contact email', 'mail', 'customeremail', 'e-mail'],
    customerLocation: ['location', 'city', 'address', 'region', 'country', 'state', 'area', 'customer location', 'buyer region', 'customerlocation', 'zip', 'postal'],
    productCategory: ['product category', 'category', 'department', 'collection', 'product type', 'item category', 'type'],
    sku: ['sku', 'item code', 'product code', 'variant sku', 'code', 'barcode'],
  };

  // Track used fields to prevent duplicate assignments
  const usedFields = new Set();
  const mapping = {};

  for (const header of headers) {
    const normalizedHeader = header.toLowerCase().replace(/[-_]/g, ' ').trim();
    const headerWords = normalizedHeader.split(/\s+/);

    let matched = null;
    let bestMatchLength = 0;

    for (const [field, keywords] of Object.entries(rules)) {
      if (usedFields.has(field)) continue; // skip already-matched fields

      for (const kw of keywords) {
        const normalizedKw = kw.toLowerCase().trim();
        let isMatch = false;

        if (normalizedHeader === normalizedKw) {
          isMatch = true;
        } else if (normalizedKw.indexOf(' ') === -1 && headerWords.includes(normalizedKw)) {
          isMatch = true;
        } else if (normalizedHeader.includes(normalizedKw) && normalizedKw.length > 4) {
          isMatch = true;
        }

        if (isMatch && normalizedKw.length > bestMatchLength) {
          matched = field;
          bestMatchLength = normalizedKw.length;
        }
      }
    }

    if (matched) usedFields.add(matched);
    mapping[header] = matched;
  }

  return mapping;
};

const normalizeText = (value) => String(value ?? '').trim();

const parseMoney = (value) => {
  const cleaned = normalizeText(value).replace(/[^\d.-]/g, '');
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
};

const parsePositiveNumber = (value) => {
  const num = Number(normalizeText(value).replace(/,/g, ''));
  return Number.isFinite(num) && num > 0 ? num : 0;
};

const parseDateValue = (value) => {
  if (value instanceof Date && !isNaN(value.getTime())) return value;

  const raw = normalizeText(value);
  if (!raw) return new Date();

  const dateNum = Number(raw);
  if (!isNaN(dateNum) && dateNum > 40000 && dateNum < 60000) {
    return new Date((dateNum - 25569) * 86400 * 1000);
  }

  const parsed = new Date(raw);
  return !isNaN(parsed.getTime()) ? parsed : new Date();
};

const normalizeChannel = (value) => {
  const raw = normalizeText(value).toLowerCase();
  const aliases = {
    ecommerce: 'online',
    'e-commerce': 'online',
    web: 'online',
    website: 'online',
    retail: 'in-store',
    store: 'in-store',
    offline: 'in-store',
    pos: 'in-store',
    app: 'mobile',
    amazon: 'marketplace',
    ebay: 'marketplace',
    shopify: 'online',
    instagram: 'social',
    facebook: 'social',
  };
  const normalized = aliases[raw] || raw;
  return ['online', 'in-store', 'mobile', 'marketplace', 'social'].includes(normalized) ? normalized : 'online';
};

const normalizeStatus = (value) => {
  const raw = normalizeText(value).toLowerCase();
  const aliases = {
    complete: 'completed',
    paid: 'completed',
    delivered: 'completed',
    shipped: 'completed',
    processing: 'pending',
    open: 'pending',
    return: 'refunded',
    returned: 'refunded',
    refund: 'refunded',
    void: 'cancelled',
    canceled: 'cancelled',
  };
  const normalized = aliases[raw] || raw;
  return ['completed', 'pending', 'refunded', 'cancelled'].includes(normalized) ? normalized : 'completed';
};

const normalizeMapping = (mapping, headers) => {
  const validFields = new Set(REQUIRED_FIELDS);
  const usedFields = new Set();
  const normalized = {};

  for (const header of headers) {
    const field = mapping?.[header];
    if (field && validFields.has(field) && !usedFields.has(field)) {
      normalized[header] = field;
      usedFields.add(field);
    } else {
      normalized[header] = null;
    }
  }

  return normalized;
};

const getMissingRequiredFields = (mapping) => {
  const mappedFields = Object.values(mapping).filter(Boolean);
  const missing = [];

  if (!mappedFields.includes('productName') && !mappedFields.includes('sku')) {
    missing.push('productName');
  }

  const numericMatches = ['quantity', 'unitPrice', 'revenue'].filter(field => mappedFields.includes(field));
  if (numericMatches.length < 2) {
    for (const field of ['quantity', 'unitPrice', 'revenue']) {
      if (!mappedFields.includes(field)) missing.push(field);
    }
  }

  return [...new Set(missing)];
};

const getMappedValue = (row, mapping, fieldName) => {
  const header = Object.entries(mapping).find(([, v]) => v === fieldName)?.[0];
  return header ? row[header] : '';
};

// ── Helper: update product stats after sales ──────────────────────────────────
/**
 * After inserting sale docs, update each product's totalSales and totalRevenue.
 * Groups sale docs by product _id and performs a single bulkWrite.
 */
const updateProductStats = async (saleDocs) => {
  if (!saleDocs || saleDocs.length === 0) return;

  // Aggregate by product
  const statsMap = {};
  for (const doc of saleDocs) {
    const pid = String(doc.product);
    if (!statsMap[pid]) statsMap[pid] = { totalSales: 0, totalRevenue: 0 };
    statsMap[pid].totalSales += doc.quantity;
    statsMap[pid].totalRevenue += doc.revenue;
  }

  const bulkOps = Object.entries(statsMap).map(([productId, stats]) => ({
    updateOne: {
      filter: { _id: productId },
      update: {
        $inc: {
          totalSales: stats.totalSales,
          totalRevenue: parseFloat(stats.totalRevenue.toFixed(2)),
        },
      },
    },
  }));

  try {
    await Product.bulkWrite(bulkOps);
  } catch (err) {
    console.error('[updateProductStats] Failed:', err.message);
  }
};

const adjustProductStats = async (saleDocs, multiplier = 1) => {
  const adjustedDocs = saleDocs.map((doc) => ({
    product: doc.product,
    quantity: (doc.quantity || 0) * multiplier,
    revenue: (doc.revenue || 0) * multiplier,
  }));
  await updateProductStats(adjustedDocs);
};

// ── Controllers ───────────────────────────────────────────────────────────────

// @desc    Get order/sale records
// @route   GET /api/sales/orders
const getOrders = async (req, res) => {
  try {
    const { status, channel, search, page = 1, limit = 100 } = req.query;
    const query = { createdBy: req.user._id };

    if (status) query.status = status;
    if (channel) query.channel = channel;
    if (search) {
      query.$or = [
        { productName: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.email': { $regex: search, $options: 'i' } },
        { 'customer.location': { $regex: search, $options: 'i' } },
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

    res.json({ success: true, data: orders, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
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

// @desc    Create a single sale record
// @route   POST /api/sales
const createSale = async (req, res) => {
  try {
    const {
      productId, quantity, unitPrice,
      channel = 'online', status = 'completed', date,
      customerName, customerEmail, customerLocation,
    } = req.body;

    if (!productId || !quantity || !unitPrice) {
      return res.status(400).json({ success: false, message: 'productId, quantity, and unitPrice are required.' });
    }

    const product = await Product.findOne({ _id: productId, createdBy: req.user._id });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    const qty = Number(quantity);
    const price = Number(unitPrice);
    const revenue = parseFloat((qty * price).toFixed(2));

    const sale = await Sale.create({
      product: product._id,
      productName: product.name,
      quantity: qty,
      unitPrice: price,
      revenue,
      channel,
      status,
      date: date ? new Date(date) : new Date(),
      customer: {
        name: customerName || '',
        email: customerEmail || '',
        location: customerLocation || '',
      },
      createdBy: req.user._id,
    });

    // Update product stats (non-blocking)
    updateProductStats([{ product: product._id, quantity: qty, revenue }]).catch(() => {});

    res.status(201).json({ success: true, data: sale });
  } catch (error) {
    console.error('Create sale error:', error);
    res.status(500).json({ success: false, message: 'Failed to create sale.' });
  }
};

// @desc    Update a single sale record
// @route   PUT /api/sales/:id
const updateSale = async (req, res) => {
  try {
    const existing = await Sale.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!existing) return res.status(404).json({ success: false, message: 'Sale not found.' });

    const {
      productId,
      quantity,
      unitPrice,
      channel,
      status,
      date,
      customerName,
      customerEmail,
      customerLocation,
    } = req.body;

    let product = null;
    if (productId && String(productId) !== String(existing.product)) {
      product = await Product.findOne({ _id: productId, createdBy: req.user._id });
      if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const qty = quantity !== undefined ? Number(quantity) : existing.quantity;
    const price = unitPrice !== undefined ? Number(unitPrice) : existing.unitPrice;
    if (!Number.isFinite(qty) || qty < 1) {
      return res.status(400).json({ success: false, message: 'quantity must be >= 1.' });
    }
    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ success: false, message: 'unitPrice must be > 0.' });
    }

    const beforeStats = {
      product: existing.product,
      quantity: existing.quantity,
      revenue: existing.revenue,
    };

    existing.product = product ? product._id : existing.product;
    existing.productName = product ? product.name : existing.productName;
    existing.quantity = qty;
    existing.unitPrice = price;
    existing.revenue = parseFloat((qty * price).toFixed(2));
    if (channel !== undefined) existing.channel = normalizeChannel(channel);
    if (status !== undefined) existing.status = normalizeStatus(status);
    if (date !== undefined) existing.date = parseDateValue(date);
    existing.customer = {
      name: customerName !== undefined ? normalizeText(customerName) : existing.customer?.name || '',
      email: customerEmail !== undefined ? normalizeText(customerEmail) : existing.customer?.email || '',
      location: customerLocation !== undefined ? normalizeText(customerLocation) : existing.customer?.location || '',
    };

    const updated = await existing.save();
    await adjustProductStats([beforeStats], -1);
    await adjustProductStats([updated], 1);

    res.json({ success: true, data: updated, message: 'Sale updated.' });
  } catch (error) {
    console.error('Update sale error:', error);
    res.status(500).json({ success: false, message: 'Failed to update sale.' });
  }
};

// @desc    Delete a single sale record
// @route   DELETE /api/sales/:id
const deleteSale = async (req, res) => {
  try {
    const sale = await Sale.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found.' });

    await adjustProductStats([sale], -1);
    res.json({ success: true, message: 'Sale deleted.' });
  } catch (error) {
    console.error('Delete sale error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete sale.' });
  }
};

// @desc    AI-preview column mapping for an uploaded file (no data saved)
// @route   POST /api/sales/preview-mapping
const previewMapping = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Use object mode to get consistent header extraction
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

    if (!rows.length) return res.status(400).json({ success: false, message: 'File is empty or has no data rows.' });

    // Extract headers from the first row's keys
    const headers = Object.keys(rows[0]).filter(h => h && String(h).trim());
    const totalRows = rows.length;

    if (headers.length === 0) {
      return res.status(400).json({ success: false, message: 'Could not detect column headers.' });
    }

    console.log('[Preview Mapping] Headers detected:', headers);

    // Try AI mapping, fall back to fuzzy
    let mapping = await aiMapColumns(headers);
    const usedAI = !!mapping;
    if (!mapping) mapping = fuzzyMapColumns(headers);
    mapping = normalizeMapping(mapping, headers);

    // Summarise: which required fields are mapped / unmapped
    const unmappedHeaders = Object.entries(mapping).filter(([, v]) => !v).map(([k]) => k);
    const missingRequired = getMissingRequiredFields(mapping);

    res.json({
      success: true,
      headers,
      totalRows,
      mapping,        // { "Original Header": "fieldName" | null }
      usedAI,
      unmappedHeaders,
      missingRequired,
    });
  } catch (error) {
    console.error('Preview mapping error:', error);
    res.status(500).json({ success: false, message: 'Failed to analyse file.' });
  }
};

// @desc    Bulk import sales from CSV or Excel (with AI column mapping)
// @route   POST /api/sales/bulk-import
const bulkImportSales = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

    if (!rows.length) return res.status(400).json({ success: false, message: 'File is empty or has no data rows.' });

    // Extract headers
    const headers = Object.keys(rows[0]).filter(h => h && String(h).trim());

    console.log('[Bulk Import] Headers:', headers);

    let clientMapping = null;
    if (req.body?.mapping) {
      try {
        clientMapping = typeof req.body.mapping === 'string' ? JSON.parse(req.body.mapping) : req.body.mapping;
      } catch {
        clientMapping = null;
      }
    }

    // Reuse preview mapping when available; otherwise AI mapping → fuzzy fallback.
    let mapping = clientMapping ? normalizeMapping(clientMapping, headers) : await aiMapColumns(headers);
    const usedAI = !clientMapping && !!mapping;
    if (!mapping) mapping = fuzzyMapColumns(headers);
    mapping = normalizeMapping(mapping, headers);

    console.log('[Bulk Import] Mapping:', mapping, '| Used AI:', usedAI);

    // Fetch products for name matching
    const products = await Product.find({ createdBy: req.user._id }).select('_id name price sku category');
    const productMap = {};
    const productSkuMap = {};
    for (const p of products) {
      productMap[p.name.toLowerCase().trim()] = p;
      if (p.sku) productSkuMap[p.sku.toLowerCase().trim()] = p;
    }

    const saleDocs = [];
    const errors = [];

    for (const [idx, row] of rows.entries()) {
      const rowNum = idx + 2;

      const productName = normalizeText(getMappedValue(row, mapping, 'productName'));
      const sku = normalizeText(getMappedValue(row, mapping, 'sku'));
      const category = normalizeText(getMappedValue(row, mapping, 'productCategory')) || 'Imported';
      const qtyRaw = getMappedValue(row, mapping, 'quantity');
      const priceRaw = getMappedValue(row, mapping, 'unitPrice');
      const revenueRaw = getMappedValue(row, mapping, 'revenue');

      if (!productName && !sku) {
        errors.push({ row: rowNum, error: 'Missing product name or SKU' });
        continue;
      }

      let qty = parsePositiveNumber(qtyRaw);
      let price = parseMoney(priceRaw);
      let revenue = parseMoney(revenueRaw);

      if (!revenue && qty > 0 && price > 0) revenue = qty * price;
      if (!price && qty > 0 && revenue > 0) price = revenue / qty;
      if (!qty && price > 0 && revenue > 0) qty = revenue / price;

      qty = Math.round(qty);
      price = parseFloat(price.toFixed(2));
      revenue = parseFloat(revenue.toFixed(2));

      if (!qty || qty < 1) {
        errors.push({ row: rowNum, error: 'Could not derive a valid quantity' });
        continue;
      }
      if (!price || price <= 0) {
        errors.push({ row: rowNum, error: 'Could not derive a valid unit price' });
        continue;
      }
      if (!revenue || revenue <= 0) revenue = parseFloat((qty * price).toFixed(2));

      let product = sku ? productSkuMap[sku.toLowerCase()] : null;
      if (!product && productName) product = productMap[productName.toLowerCase()];

      if (!product) {
        try {
          const createPayload = {
            name: productName || sku,
            price,
            stock: 0,
            category,
            status: 'active',
            createdBy: req.user._id,
          };
          if (sku && !productSkuMap[sku.toLowerCase()]) createPayload.sku = sku;

          product = await Product.create(createPayload);
          productMap[product.name.toLowerCase().trim()] = product;
          if (product.sku) productSkuMap[product.sku.toLowerCase().trim()] = product;
        } catch (err) {
          errors.push({ row: rowNum, error: `Could not create product "${productName || sku}": ${err.message}` });
          continue;
        }
      }

      saleDocs.push({
        product: product._id,
        productName: product.name,
        quantity: qty,
        unitPrice: price,
        revenue,
        channel: normalizeChannel(getMappedValue(row, mapping, 'channel')),
        status: normalizeStatus(getMappedValue(row, mapping, 'status')),
        date: parseDateValue(getMappedValue(row, mapping, 'date')),
        customer: {
          name: normalizeText(getMappedValue(row, mapping, 'customerName')),
          email: normalizeText(getMappedValue(row, mapping, 'customerEmail')),
          location: normalizeText(getMappedValue(row, mapping, 'customerLocation')),
        },
        createdBy: req.user._id,
      });
    }

    let inserted = [];
    if (saleDocs.length > 0) {
      inserted = await Sale.insertMany(saleDocs, { ordered: false });

      // Update product totalSales and totalRevenue (non-blocking)
      updateProductStats(saleDocs).catch(err => console.error('[Bulk Import] Product stats update failed:', err.message));
    }

    res.status(201).json({
      success: true,
      imported: inserted.length,
      errors,
      mapping,
      usedAI,
      message: `Imported ${inserted.length} sale(s)${errors.length ? `, ${errors.length} row(s) had errors` : ''}.`,
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ success: false, message: 'Failed to import sales data.' });
  }
};

// @desc    Download CSV template
// @route   GET /api/sales/template
const downloadTemplate = (req, res) => {
  const headers = ['productName', 'quantity', 'unitPrice', 'channel', 'status', 'date', 'customerName', 'customerEmail', 'customerLocation'];
  const exampleRows = [
    ['Apple Mac Book Pro Max M3', '2', '2999.99', 'online', 'completed', '2024-01-15', 'Jane Smith', 'jane@example.com', 'New York'],
    ['Wireless Headphone', '5', '99.99', 'in-store', 'completed', '2024-01-20', 'Bob Lee', 'bob@example.com', 'Chicago'],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sales');
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

  res.setHeader('Content-Disposition', 'attachment; filename="sales_import_template.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
};

module.exports = {
  getOrders,
  getCustomers,
  createSale,
  updateSale,
  deleteSale,
  previewMapping,
  bulkImportSales,
  downloadTemplate,
};
