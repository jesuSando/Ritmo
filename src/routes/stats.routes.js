const express = require('express');
const statsController = require('../controllers/stats.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', statsController.getUserStats);
router.get('/productivity', statsController.getProductivity);

module.exports = router;