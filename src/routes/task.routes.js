const express = require('express');
const taskController = require('../controllers/task.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.post('/', taskController.createTask);
router.get('/', taskController.getUserTasks);
router.get('/upcoming', taskController.getUpcomingTasks);
router.get('/:id', taskController.getTaskById);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);
router.patch('/:id/discard', taskController.discardTask);

module.exports = router;