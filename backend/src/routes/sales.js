const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  getOrders, getCustomers, createSale,
  updateSale, deleteSale, deleteAllOrders,
  previewMapping, bulkImportSales, downloadTemplate,
} = require('../controllers/salesController');
const { protect } = require('../middleware/auth');

// Multer — memory storage, accept CSV and Excel
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (req, file, cb) => {
    const allowed = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream',
    ];
    const allowedExt = ['.csv', '.xlsx', '.xls'];
    const ext = '.' + file.originalname.split('.').pop().toLowerCase();
    if (allowed.includes(file.mimetype) || allowedExt.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed.'));
    }
  },
});

router.use(protect);

router.get('/orders', getOrders);
router.delete('/orders', deleteAllOrders); // Mount above /:id to prevent shadowing
router.get('/customers', getCustomers);
router.get('/template', downloadTemplate);
router.post('/', createSale);
router.put('/:id', updateSale);
router.delete('/:id', deleteSale);
router.post('/preview-mapping', upload.single('file'), previewMapping);
router.post('/bulk-import', upload.single('file'), bulkImportSales);

module.exports = router;
