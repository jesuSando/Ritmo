const express = require('express');
const authRoutes = require('./auth.routes');
const taskRoutes = require('./task.routes');
const routineRoutes = require('./routine.routes');
const timeBlockRoutes = require('./timeBlock.routes');
const statsRoutes = require('./stats.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/tasks', taskRoutes);
router.use('/routines', routineRoutes);
router.use('/time-blocks', timeBlockRoutes);
router.use('/stats', statsRoutes);

module.exports = router;