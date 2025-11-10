const express = require('express');
const timeBlockController = require('../controllers/timeBlock.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.post('/', timeBlockController.createTimeBlock);
router.get('/', timeBlockController.getUserTimeBlocks);
router.get('/check-availability', timeBlockController.checkAvailability);
router.put('/:id', timeBlockController.updateTimeBlock);
router.delete('/:id', timeBlockController.deleteTimeBlock);

module.exports = router;