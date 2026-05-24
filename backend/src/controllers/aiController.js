const { GoogleGenerativeAI } = require("@google/generative-ai");
const Product = require("../models/Product");
const Sale = require("../models/Sale");

// Helper: call Gemini with error handling
const callGemini = async (prompt) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash", // Free-tier model
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
  });
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
};

const callGeminiWithConfig = async (prompt, generationConfig = {}) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_ANALYST_MODEL || process.env.GEMINI_MAPPING_MODEL || "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1200,
      responseMimeType: "application/json",
      ...generationConfig,
    },
  });
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
};

const money = (value) => Number(value || 0).toFixed(2);

const localDescription = ({ pName, category, price, features, tags, tone }) => {
  const detail = features || tags?.join(", ") || "quality materials, reliable performance, everyday usefulness";
  return `Meet ${pName}, a ${tone} choice in ${category || "your store"} built for shoppers who want value without overthinking the decision. At $${money(price)}, it combines ${detail} with a clear, easy-to-understand offer.

Use this product to highlight practical benefits, reduce buyer hesitation, and give customers a confident reason to add it to their cart today.`;
};

const localTags = ({ pName, category, description }) => {
  const base = [pName, category, "best seller", "new arrival", "online shopping", "premium", "deal", "gift"]
    .filter(Boolean)
    .map((item) => String(item).toLowerCase());

  const words = String(description || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 4)
    .slice(0, 6);

  return {
    tags: [...new Set([...base, ...words])].slice(0, 8),
    seoKeywords: [
      `buy ${pName} online`,
      `${category || "product"} deals`,
      `${pName} price`,
      `best ${category || "store"} products`,
      `${pName} for sale`,
    ],
    metaTitle: `${pName} | SmartStore AI`,
    metaDescription: `Shop ${pName} from ${category || "our catalog"} with clear pricing, smart details, and fast product discovery.`,
  };
};

const localCaption = ({ pName, category, price, platform }) => ({
  captions: [
    {
      style: "Launch",
      text: `${pName} is ready for your next ${category || "shopping"} upgrade. Available now for $${money(price)}. Tap through and make it yours.`,
    },
    {
      style: "Value",
      text: `Smart pick, strong value: ${pName} brings the features customers care about at $${money(price)}. Add it to your cart today.`,
    },
    {
      style: platform || "Social",
      text: `Fresh in store: ${pName}. Built to stand out, priced to move, and perfect for shoppers browsing ${platform || "social"}.`,
    },
  ],
});

const localSalesInsights = ({ productList, lowStockList, totalRevenue, orders, period }) => {
  const topProduct = productList[0];
  const pricingBase = productList.filter((p) => Number(p.price || p.totalRevenue) > 0).slice(0, 2);

  return {
    summary: `For the last ${period}, the store generated $${money(totalRevenue)} across ${orders || 0} orders. ${topProduct ? `${topProduct.name} is the strongest product signal and should be featured in campaigns.` : "Add sales data to unlock stronger product-level recommendations."}`,
    trendingInsights: [
      topProduct ? `${topProduct.name} is leading current product performance.` : "Product performance is still developing.",
      lowStockList.length ? `${lowStockList.length} product(s) need inventory attention.` : "Inventory risk is currently low.",
      "Products with AI descriptions and SEO tags are better positioned for discovery.",
    ],
    actionItems: [
      topProduct ? `Promote ${topProduct.name} on the dashboard's best channel.` : "Add more product and sales data.",
      lowStockList[0] ? `Restock ${lowStockList[0].name} before demand is lost.` : "Review stock thresholds weekly.",
      "Generate descriptions, SEO tags, and captions for products without AI content.",
    ],
    pricingRecommendations: pricingBase.map((p) => {
      const current = Number(p.price || p.totalRevenue || 0);
      return {
        product: p.name,
        currentPrice: current,
        suggestedPrice: Math.round(current * 1.05 * 100) / 100,
        reason: "Test a small price increase while monitoring conversion.",
      };
    }),
    riskAlerts: lowStockList.map((p) => `${p.name} has only ${p.stock} left in stock.`).slice(0, 2),
    growthOpportunities: [
      "Bundle top products with slower-moving related items.",
      "Use platform-specific captions for weekly marketing pushes.",
    ],
  };
};

// Helper: parse JSON safely from Gemini response
// Gemini sometimes wraps JSON in ```json ... ```
const parseJSON = (raw) => {
  // Strip markdown code fences if present
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned);
};

const normalizeSalesInsights = (parsed) => ({
  summary: parsed.summary || "",
  trendingInsights: Array.isArray(parsed.trendingInsights) ? parsed.trendingInsights : [],
  actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
  pricingRecommendations: Array.isArray(parsed.pricingRecommendations)
    ? parsed.pricingRecommendations.map((item) => {
        if (typeof item === "string") {
          return {
            product: "Store catalog",
            currentPrice: 0,
            suggestedPrice: 0,
            reason: item,
          };
        }
        return item;
      })
    : [],
  riskAlerts: Array.isArray(parsed.riskAlerts) ? parsed.riskAlerts : [],
  growthOpportunities: Array.isArray(parsed.growthOpportunities) ? parsed.growthOpportunities : [],
});

const localDataAnalystAnswer = ({ question, summary, topProducts, byChannel, byLocation, periodDays }) => {
  const topProduct = topProducts[0];
  const topChannel = byChannel[0];
  const topLocation = byLocation[0];

  return {
    answer: `For the last ${periodDays} day(s), revenue is $${money(summary.revenue)} across ${summary.orders || 0} orders. ${topProduct ? `${topProduct._id} is the strongest product contributor.` : "There is not enough product movement yet for a strong product-level conclusion."}`,
    supportingNumbers: [
      `Total revenue: $${money(summary.revenue)}`,
      `Orders: ${summary.orders || 0}`,
      `Units sold: ${summary.units || 0}`,
      topProduct ? `Top product: ${topProduct._id} ($${money(topProduct.revenue)})` : "Top product: unavailable",
      topChannel ? `Top channel: ${topChannel._id} ($${money(topChannel.revenue)})` : "Top channel: unavailable",
      topLocation ? `Top location: ${topLocation._id} ($${money(topLocation.revenue)})` : "Top location: unavailable",
    ],
    recommendations: [
      topProduct ? `Feature ${topProduct._id} in campaigns and bundles.` : "Import more sales data for stronger product recommendations.",
      topChannel ? `Prioritize promotions on ${topChannel._id}, then compare conversion against other channels.` : "Keep channel data clean during imports.",
      "Review refunded and cancelled rows before making pricing decisions.",
    ],
    caveats: [
      "This answer is based on stored sales records for the selected period.",
      "Correlation in sales data does not prove the exact cause of changes.",
    ],
  };
};

const buildAnalystDataset = async ({ userId, periodDays }) => {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const previousStartDate = new Date(startDate.getTime() - periodDays * 24 * 60 * 60 * 1000);

  const baseMatch = {
    createdBy: userId,
    date: { $gte: startDate, $lte: endDate },
    status: { $ne: "cancelled" },
  };

  const [
    summaryRows,
    previousRows,
    topProducts,
    byChannel,
    byCategory,
    byLocation,
    statusBreakdown,
    dailyTrend,
    lowStock,
    productCount,
  ] = await Promise.all([
    Sale.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$revenue" },
          orders: { $sum: 1 },
          units: { $sum: "$quantity" },
          avgOrderValue: { $avg: "$revenue" },
        },
      },
    ]),
    Sale.aggregate([
      {
        $match: {
          createdBy: userId,
          date: { $gte: previousStartDate, $lt: startDate },
          status: { $ne: "cancelled" },
        },
      },
      { $group: { _id: null, revenue: { $sum: "$revenue" }, orders: { $sum: 1 }, units: { $sum: "$quantity" } } },
    ]),
    Sale.aggregate([
      { $match: baseMatch },
      { $group: { _id: "$productName", revenue: { $sum: "$revenue" }, orders: { $sum: 1 }, units: { $sum: "$quantity" } } },
      { $sort: { revenue: -1 } },
      { $limit: 8 },
    ]),
    Sale.aggregate([
      { $match: baseMatch },
      { $group: { _id: "$channel", revenue: { $sum: "$revenue" }, orders: { $sum: 1 }, units: { $sum: "$quantity" } } },
      { $sort: { revenue: -1 } },
    ]),
    Sale.aggregate([
      { $match: baseMatch },
      { $lookup: { from: "products", localField: "product", foreignField: "_id", as: "productData" } },
      { $addFields: { category: { $ifNull: [{ $arrayElemAt: ["$productData.category", 0] }, "Uncategorized"] } } },
      { $group: { _id: "$category", revenue: { $sum: "$revenue" }, orders: { $sum: 1 }, units: { $sum: "$quantity" } } },
      { $sort: { revenue: -1 } },
      { $limit: 8 },
    ]),
    Sale.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: { $ifNull: ["$customer.location", "Unknown"] },
          revenue: { $sum: "$revenue" },
          orders: { $sum: 1 },
          units: { $sum: "$quantity" },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 8 },
    ]),
    Sale.aggregate([
      { $match: { createdBy: userId, date: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: "$status", revenue: { $sum: "$revenue" }, orders: { $sum: 1 } } },
      { $sort: { orders: -1 } },
    ]),
    Sale.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          revenue: { $sum: "$revenue" },
          orders: { $sum: 1 },
          units: { $sum: "$quantity" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Product.find({
      createdBy: userId,
      status: "active",
      $expr: { $lte: ["$stock", "$lowStockThreshold"] },
    }).select("name category stock lowStockThreshold price").limit(8).lean(),
    Product.countDocuments({ createdBy: userId }),
  ]);

  const summary = summaryRows[0] || { revenue: 0, orders: 0, units: 0, avgOrderValue: 0 };
  const previous = previousRows[0] || { revenue: 0, orders: 0, units: 0 };
  const revenueGrowth = previous.revenue > 0 ? ((summary.revenue - previous.revenue) / previous.revenue) * 100 : null;
  const orderGrowth = previous.orders > 0 ? ((summary.orders - previous.orders) / previous.orders) * 100 : null;

  const peakDay = dailyTrend.reduce((best, item) => (!best || item.revenue > best.revenue ? item : best), null);
  const weakestDay = dailyTrend.reduce((best, item) => (!best || item.revenue < best.revenue ? item : best), null);

  return {
    periodDays,
    dateRange: {
      start: startDate.toISOString().slice(0, 10),
      end: endDate.toISOString().slice(0, 10),
    },
    summary: {
      revenue: Number(summary.revenue || 0),
      orders: Number(summary.orders || 0),
      units: Number(summary.units || 0),
      avgOrderValue: Number(summary.avgOrderValue || 0),
      revenueGrowth: revenueGrowth === null ? null : Math.round(revenueGrowth * 10) / 10,
      orderGrowth: orderGrowth === null ? null : Math.round(orderGrowth * 10) / 10,
      productCount,
    },
    topProducts,
    byChannel,
    byCategory,
    byLocation,
    statusBreakdown,
    dailyTrend: dailyTrend.slice(-30),
    peakDay,
    weakestDay,
    lowStock,
  };
};

// @desc    Generate AI product description
// @route   POST /api/ai/generate-description
const generateDescription = async (req, res) => {
  try {
    const {
      name,
      productName,
      category,
      price,
      features,
      tags,
      tone = "professional",
    } = req.body;
    const pName = name || productName;

    if (!pName) {
      return res
        .status(400)
        .json({ success: false, message: "Product name is required." });
    }

    const prompt = `You are an expert e-commerce copywriter. Write a compelling, SEO-optimized product description for the following product:

Product Name: ${pName}
Category: ${category || "General"}
Price: $${price || "N/A"}
Features/Tags: ${features || tags?.join(", ") || "Not specified"}
Tone: ${tone}

Write a description that:
1. Starts with a strong hook
2. Highlights key benefits (not just features)
3. Uses sensory language and emotional triggers
4. Includes natural keyword placement
5. Ends with a subtle call-to-action

Length: 2-3 paragraphs. Do not include a title. Return plain text only.`;

    let description;
    try {
      description = await callGemini(prompt);
    } catch (error) {
      console.warn("Using local description fallback:", error.message);
      description = localDescription({ pName, category, price, features, tags, tone });
    }
    res.json({ success: true, description, data: { description } });
  } catch (error) {
    console.error("Gemini description error:", error.message);
    res
      .status(500)
      .json({
        success: false,
        message: "AI generation failed. Check your Gemini API key.",
      });
  }
};

// @desc    Generate SEO tags
// @route   POST /api/ai/generate-tags
const generateTags = async (req, res) => {
  try {
    const { name, productName, category, description } = req.body;
    const pName = name || productName;

    if (!pName) {
      return res
        .status(400)
        .json({ success: false, message: "Product name is required." });
    }

    const prompt = `You are an SEO expert for e-commerce. Generate SEO tags and keywords for this product:

Product Name: ${pName}
Category: ${category || "General"}
Description: ${description || "No description provided"}

Return a JSON object with this exact structure:
{
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8"],
  "seoKeywords": ["keyword phrase 1", "keyword phrase 2", "keyword phrase 3", "keyword phrase 4", "keyword phrase 5"],
  "metaTitle": "SEO optimized title under 60 characters",
  "metaDescription": "SEO meta description under 160 characters"
}

Return ONLY valid JSON. No markdown, no explanation.`;

    let parsed;
    try {
      const raw = await callGemini(prompt);
      parsed = parseJSON(raw);
    } catch (error) {
      console.warn("Using local SEO fallback:", error.message);
      parsed = localTags({ pName, category, description });
    }

    res.json({ success: true, tags: parsed.tags || [], data: parsed });
  } catch (error) {
    console.error("Gemini tags error:", error.message);
    res
      .status(500)
      .json({
        success: false,
        message: "AI tag generation failed. Check your Gemini API key.",
      });
  }
};

// @desc    Generate marketing caption
// @route   POST /api/ai/generate-caption
const generateCaption = async (req, res) => {
  try {
    const {
      name,
      productName,
      category,
      price,
      platform = "instagram",
    } = req.body;
    const pName = name || productName;

    if (!pName) {
      return res
        .status(400)
        .json({ success: false, message: "Product name is required." });
    }

    const prompt = `You are a social media marketing expert. Write 3 different engaging marketing captions for ${platform} for this product:

Product: ${pName}
Category: ${category || "General"}
Price: $${price || "N/A"}
Platform: ${platform}

For each caption:
- Be engaging and platform-appropriate
- Include relevant emojis
- Include a call-to-action
- For Instagram: include 5-8 relevant hashtags
- Keep it punchy and scroll-stopping

Return ONLY this valid JSON structure:
{
  "captions": [
    {"style": "Emotional", "text": "...full caption here..."},
    {"style": "Humorous", "text": "...full caption here..."},
    {"style": "Informative", "text": "...full caption here..."}
  ]
}

No markdown, no explanation, just the JSON.`;

    let parsed;
    try {
      const raw = await callGemini(prompt);
      parsed = parseJSON(raw);
    } catch (error) {
      console.warn("Using local caption fallback:", error.message);
      parsed = localCaption({ pName, category, price, platform });
    }

    // Also expose caption as flat string for simpler frontend usage
    const captionText =
      parsed.captions?.map((c) => `${c.style}:\n${c.text}`).join("\n\n") || raw;

    res.json({ success: true, caption: captionText, data: parsed });
  } catch (error) {
    console.error("Gemini caption error:", error.message);
    res
      .status(500)
      .json({
        success: false,
        message: "AI caption generation failed. Check your Gemini API key.",
      });
  }
};

// @desc    Generate AI sales insights
// @route   POST /api/ai/sales-insights
const generateSalesInsights = async (req, res) => {
  try {
    const {
      products,
      topProducts,
      salesData,
      totalRevenue,
      orders,
      lowStock,
      period = "30 days",
    } = req.body;

    const productList = (topProducts || products || []).slice(0, 8);
    const productSummary =
      productList.length > 0
        ? productList
            .map(
              (p) =>
                `- ${p.name}: Revenue $${p.totalRevenue || p.price || 0}, Stock: ${p.stock ?? "N/A"}`,
            )
            .join("\n")
        : "No product data provided";

    const lowStockList = (lowStock || []).slice(0, 5);
    const lowStockSummary =
      lowStockList.length > 0
        ? lowStockList
            .map((p) => `- ${p.name}: ${p.stock} remaining`)
            .join("\n")
        : "None";

    const prompt = `You are an AI business analyst for an e-commerce store. Analyze this store data and provide clear, actionable business insights.

Analysis Period: ${period}
Total Revenue: $${totalRevenue || 0}
Total Orders: ${orders || 0}

Top Products by Revenue:
${productSummary}

Low Stock Items:
${lowStockSummary}

Provide practical insights in this exact JSON format:
{
  "summary": "2-3 sentence executive summary of store performance",
  "trendingInsights": ["insight 1", "insight 2", "insight 3"],
  "actionItems": ["action 1", "action 2", "action 3"],
  "pricingRecommendations": [
    {"product": "Product name", "currentPrice": 29.99, "suggestedPrice": 31.49, "reason": "why this price should be tested"}
  ],
  "riskAlerts": ["alert 1", "alert 2"],
  "growthOpportunities": ["opportunity 1", "opportunity 2"]
}

Return ONLY valid JSON. No markdown, no explanation.`;

    let parsed;
    try {
      const raw = await callGemini(prompt);
      parsed = parseJSON(raw);
    } catch (error) {
      console.warn("Using local sales insights fallback:", error.message);
      parsed = localSalesInsights({ productList, lowStockList, totalRevenue, orders, period });
    }

    parsed = normalizeSalesInsights(parsed);

    // Build a readable insights string for simple display
    const insights = [
      `📊 Summary: ${parsed.summary || ""}`,
      parsed.trendingInsights?.length
        ? `\n📈 Trends:\n${parsed.trendingInsights.map((i) => `• ${i}`).join("\n")}`
        : "",
      parsed.actionItems?.length
        ? `\n✅ Action Items:\n${parsed.actionItems.map((i) => `• ${i}`).join("\n")}`
        : "",
      parsed.pricingRecommendations?.length
        ? `\n💰 Pricing:\n${parsed.pricingRecommendations.map((i) => `• ${i.product}: $${i.currentPrice} -> $${i.suggestedPrice} (${i.reason})`).join("\n")}`
        : "",
      parsed.riskAlerts?.length
        ? `\n⚠️ Risks:\n${parsed.riskAlerts.map((i) => `• ${i}`).join("\n")}`
        : "",
      parsed.growthOpportunities?.length
        ? `\n🚀 Opportunities:\n${parsed.growthOpportunities.map((i) => `• ${i}`).join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("");

    res.json({ success: true, insights, data: parsed });
  } catch (error) {
    console.error("Gemini insights error:", error.message);
    res
      .status(500)
      .json({
        success: false,
        message: "AI insights generation failed. Check your Gemini API key.",
      });
  }
};

// @desc    Ask an AI analyst about the store's uploaded sales data
// @route   POST /api/ai/data-analyst
const askDataAnalyst = async (req, res) => {
  try {
    const question = String(req.body.question || "").trim();
    const periodDays = Math.max(1, Math.min(3650, Number(req.body.days || 30)));

    if (!question) {
      return res.status(400).json({ success: false, message: "Question is required." });
    }

    const dataset = await buildAnalystDataset({ userId: req.user._id, periodDays });

    if (!dataset.summary.orders) {
      return res.json({
        success: true,
        data: {
          answer: "There are no sales records in the selected period yet. Import or record sales first, then ask again.",
          supportingNumbers: [
            `Period: ${dataset.dateRange.start} to ${dataset.dateRange.end}`,
            "Orders: 0",
            "Revenue: $0.00",
          ],
          recommendations: ["Upload a sales CSV or Excel file.", "Use Orders to verify imported rows before analyzing trends."],
          caveats: ["No sales rows matched the selected period."],
        },
        datasetSummary: dataset,
      });
    }

    const prompt = `You are SmartStore AI's data analyst. Answer the user's question using only this JSON dataset summary. Be specific, numeric, and concise.

Question: ${question}

Dataset summary:
${JSON.stringify(dataset)}

Return ONLY valid JSON:
{
  "answer": "direct answer in 3-5 sentences",
  "supportingNumbers": ["metric or comparison 1", "metric or comparison 2", "metric or comparison 3"],
  "recommendations": ["action 1", "action 2", "action 3"],
  "caveats": ["short limitation or data-quality note"]
}`;

    let parsed;
    try {
      const raw = await callGeminiWithConfig(prompt);
      parsed = parseJSON(raw);
    } catch (error) {
      console.warn("Using local data analyst fallback:", error.message);
      parsed = localDataAnalystAnswer({
        question,
        summary: dataset.summary,
        topProducts: dataset.topProducts,
        byChannel: dataset.byChannel,
        byLocation: dataset.byLocation,
        periodDays,
      });
    }

    const data = {
      answer: parsed.answer || "",
      supportingNumbers: Array.isArray(parsed.supportingNumbers) ? parsed.supportingNumbers : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      caveats: Array.isArray(parsed.caveats) ? parsed.caveats : [],
    };

    res.json({ success: true, data, datasetSummary: dataset });
  } catch (error) {
    console.error("Data analyst error:", error.message);
    res.status(500).json({ success: false, message: "AI data analyst failed." });
  }
};

// @desc    Save AI content to product
// @route   PUT /api/ai/save/:productId
const saveAIContent = async (req, res) => {
  try {
    const {
      description,
      aiDescription,
      tags,
      seoKeywords,
      caption,
      aiCaption,
      marketingCaption,
    } = req.body;

    const updateData = {};
    if (description || aiDescription)
      updateData.aiDescription = description || aiDescription;
    if (tags?.length) updateData.tags = tags;
    if (seoKeywords?.length) updateData.seoKeywords = seoKeywords;
    if (caption || aiCaption || marketingCaption)
      updateData.aiCaption = caption || aiCaption || marketingCaption;

    const product = await Product.findOneAndUpdate(
      { _id: req.params.productId, createdBy: req.user._id },
      updateData,
      { new: true },
    );

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }

    res.json({ success: true, message: "AI content saved!", data: product });
  } catch (error) {
    console.error("Save AI content error:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Failed to save AI content." });
  }
};

module.exports = {
  generateDescription,
  generateTags,
  generateCaption,
  generateSalesInsights,
  askDataAnalyst,
  saveAIContent,
};
