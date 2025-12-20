const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authController = {
    register: async (req, res) => {
        try {
            const { name, email, password } = req.body;

            if (!name || !email || !password) {
                return res.status(400).json({ error: 'Nombre, email y password son requeridos' });
            }

            if (password.length < 6) {
                return res.status(400).json({ error: 'El password debe tener al menos 6 caracteres' });
            }

            const existingUser = await User.findOne({ where: { email } });
            if (existingUser) {
                return res.status(400).json({ error: 'El usuario ya existe' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const user = await User.create({
                name,
                email,
                passwordHash: hashedPassword
            });

            res.status(201).json({
                message: 'Usuario registrado exitosamente',
                user: { name: user.name, email: user.email }
            });

        } catch (error) {
            console.error('Error en registro:', error);
            res.status(500).json({ error: 'Error en el servidor: ' + error.message });
        }
    },

    login: async (req, res) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ error: 'Email y password son requeridos' });
            }

            const user = await User.findOne({ where: { email } });
            if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

            const isValidPassword = await user.verifyPassword(password);
            if (!isValidPassword) return res.status(401).json({ error: 'Credenciales inválidas' });

            const accessToken = jwt.sign(
                { id: user.id },
                process.env.JWT_SECRET,
                { expiresIn: '30m' }
            );

            const refreshToken = jwt.sign(
                { id: user.id },
                process.env.JWT_REFRESH_SECRET,
                { expiresIn: '7d' }
            );

            res.cookie("access_token", accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: 30 * 60 * 1000
            });

            res.cookie("refresh_token", refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: 7 * 24 * 60 * 60 * 1000
            });

            res.json({
                message: "Login exitoso",
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email
                }
            });

        } catch (error) {
            res.status(500).json({ error: "Error interno" });
        }
    },

    logout: (req, res) => {
        res.clearCookie("access_token");
        res.clearCookie("refresh_token");
        res.json({ message: "Sesión cerrada" });
    },

    refresh: async (req, res) => {
        const token = req.cookies.refresh_token;
        if (!token) {
            return res.status(401).json({ error: "No autenticado" });
        }

        try {
            const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

            const newAccessToken = jwt.sign(
                { id: payload.id },
                process.env.JWT_SECRET,
                { expiresIn: "30m" }
            );

            res.cookie("access_token", newAccessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: 30 * 60 * 1000
            });

            res.json({ message: "Token refrescado" });

        } catch {
            return res.status(401).json({ error: "Refresh token inválido" });
        }
    }
};

module.exports = authController;