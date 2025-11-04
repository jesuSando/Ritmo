const express = require('express');
const authRoutes = require('./auth.routes');
const taskRoutes = require('./task.routes');
const routineRoutes = require('./routine.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/tasks', taskRoutes);
router.use('/routines', routineRoutes);

module.exports = router;