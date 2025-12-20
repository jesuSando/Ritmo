const express = require("express");
const authController = require("../controllers/auth.controller");
const { publicAuthLimiter } = require("../middleware/rateLimit");

const router = express.Router();

router.post("/register", publicAuthLimiter, authController.register);
router.post("/login", publicAuthLimiter, authController.login);
router.post("/refresh", publicAuthLimiter, authController.refresh);

router.post("/logout", authController.logout);

module.exports = router;
