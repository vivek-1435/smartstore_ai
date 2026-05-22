const { GoogleGenerativeAI } = require("@google/generative-ai");
const Product = require("../models/Product");

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper: call Gemini with error handling
const callGemini = async (prompt) => {
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

    const description = await callGemini(prompt);
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

    const raw = await callGemini(prompt);

    let parsed;
    try {
      parsed = parseJSON(raw);
    } catch {
      parsed = {
        tags: [],
        seoKeywords: [],
        metaTitle: "",
        metaDescription: raw,
      };
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

    const raw = await callGemini(prompt);

    let parsed;
    try {
      parsed = parseJSON(raw);
    } catch {
      parsed = { captions: [{ style: "General", text: raw }] };
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
  "pricingRecommendations": ["recommendation 1", "recommendation 2"],
  "riskAlerts": ["alert 1", "alert 2"],
  "growthOpportunities": ["opportunity 1", "opportunity 2"]
}

Return ONLY valid JSON. No markdown, no explanation.`;

    const raw = await callGemini(prompt);

    let parsed;
    try {
      parsed = parseJSON(raw);
    } catch {
      parsed = {
        summary: raw,
        trendingInsights: [],
        actionItems: ["Review your top products", "Restock low inventory"],
        pricingRecommendations: [],
        riskAlerts: [],
        growthOpportunities: [],
      };
    }

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
        ? `\n💰 Pricing:\n${parsed.pricingRecommendations.map((i) => `• ${i}`).join("\n")}`
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
  saveAIContent,
};
