const express = require('express');
const router = express.Router();
const financeController = require('../controllers/finance.controller');
const { authenticate } = require('../middleware/auth');


router.use(authenticate);

router.post('/accounts', financeController.createAccount);
router.get('/accounts', financeController.getAccounts);

router.post('/transactions', financeController.createTransaction);
router.get('/transactions', financeController.getTransactions);

router.post('/budgets', financeController.createBudget);
router.get('/budgets', financeController.getBudgets);
router.get('/budgets/:id/progress', financeController.getBudgetProgress);

router.get('/stats', financeController.getFinanceStats);

module.exports = router;