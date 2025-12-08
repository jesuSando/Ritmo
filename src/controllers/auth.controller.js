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

            // Hashear password
            const hashedPassword = await bcrypt.hash(password, 10);

            const user = await User.create({
                name,
                email,
                passwordHash: hashedPassword
            });

            const token = jwt.sign(
                { id: user.id, name: user.name, email: user.email },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.status(201).json({
                message: 'Usuario registrado exitosamente',
                user: { id: user.id, name: user.name, email: user.email }
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

            const user = await User.findOne({
                where: { email },
                attributes: ['id', 'name', 'email', 'passwordHash']
            });

            if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

            const isValidPassword = await user.verifyPassword(password);
            if (!isValidPassword) return res.status(401).json({ error: 'Credenciales inválidas' });

            const accessToken = jwt.sign(
                { id: user.id, name: user.name, email: user.email },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            const refreshToken = jwt.sign(
                { id: user.id },
                process.env.JWT_REFRESH_SECRET,
                { expiresIn: '7d' }
            );

            res.cookie("refreshToken", refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: "none",
                maxAge: 7 * 24 * 60 * 60 * 1000
            });

            res.json({
                message: 'Login exitoso',
                accessToken,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email
                }
            });

        } catch (error) {
            console.error('Error en login:', error);
            res.status(500).json({ error: 'Error en el servidor: ' + error.message });
        }
    },

    logout: (req, res) => {
        res.clearCookie("token", {
            httpOnly: true,
            secure: true,
            sameSite: "none"
        });

        res.json({ message: "Sesión cerrada" });
    },

    refresh: async (req, res) => {
        const tokenFromCookie = req.cookies.refreshToken;
        if (!tokenFromCookie) {
            return res.status(401).json({ error: "No hay refresh token" });
        }

        try {
            const data = jwt.verify(tokenFromCookie, process.env.JWT_REFRESH_SECRET);

            const newAccessToken = jwt.sign(
                { id: data.id },
                process.env.JWT_SECRET,
                { expiresIn: "1h" }
            );

            res.json({ accessToken: newAccessToken });

        } catch (err) {
            console.error("Error refrescando token:", err.message);
            return res.status(401).json({ error: "Refresh token inválido o expirado" });
        }
    },

    getProfile: async (req, res) => {
        try {
            res.json({
                user: {
                    id: req.user.id,
                    name: req.user.name,
                    email: req.user.email
                }
            });
        } catch (error) {
            res.status(500).json({ error: 'Error en el servidor: ' + error.message });
        }
    }
};

module.exports = authController;