const rateLimit = require("express-rate-limit");

const publicAuthLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 50, // 50 requests por IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: "Demasiadas solicitudes. Intenta más tarde."
    }
});

module.exports = {
    publicAuthLimiter
};
