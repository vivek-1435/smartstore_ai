const express = require('express');
const router = express.Router();
const {
  generateDescription, generateTags, generateCaption, generateSalesInsights, saveAIContent
} = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/generate-description', generateDescription);
router.post('/generate-tags', generateTags);
router.post('/generate-caption', generateCaption);
router.post('/sales-insights', generateSalesInsights);
router.put('/save/:productId', saveAIContent);

module.exports = router;
