const express = require('express');
const routineController = require('../controllers/routine.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.post('/', routineController.createRoutine);
router.get('/', routineController.getUserRoutines);
router.post('/:id/generate-occurrences', routineController.generateOccurrences);
router.put('/:id', routineController.updateRoutine);
router.delete('/:id', routineController.deleteRoutine);
router.patch('/:id/toggle', routineController.toggleRoutine);

module.exports = router;