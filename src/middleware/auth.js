const jwt = require("jsonwebtoken");
const { User } = require("../models");

const authenticate = async (req, res, next) => {
    try {
        const token = req.cookies?.token;

        if (!token) {
            return res.status(401).json({ error: "No autenticado. Falta token." });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findByPk(decoded.id);
        if (!user) {
            return res.status(401).json({ error: "Token inválido. Usuario no encontrado." });
        }

        req.user = user;
        next();

    } catch (error) {
        console.error("Error en authenticate middleware:", error);
        return res.status(401).json({ error: "Token inválido o expirado." });
    }
};

module.exports = { authenticate };
