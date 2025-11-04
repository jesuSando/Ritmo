const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authController = {
    // Registro de usuario
    register: async (req, res) => {
        try {
            const { name, email, password } = req.body;

            // Verificar si el usuario ya existe
            const existingUser = await User.findOne({ where: { email } });
            if (existingUser) {
                return res.status(400).json({ error: 'El usuario ya existe' });
            }

            // Crear usuario (el hash se hace en el hook del modelo)
            const user = await User.create({
                name,
                email,
                password // Se hashea automáticamente
            });

            // Generar token
            const token = jwt.sign(
                { userId: user.id },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.status(201).json({
                message: 'Usuario registrado exitosamente',
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email
                }
            });
        } catch (error) {
            res.status(500).json({ error: 'Error en el servidor: ' + error.message });
        }
    },

    // Login de usuario
    login: async (req, res) => {
        try {
            const { email, password } = req.body;

            // Buscar usuario
            const user = await User.findOne({ where: { email } });
            if (!user) {
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }

            // Verificar password
            const isValidPassword = await user.verifyPassword(password);
            if (!isValidPassword) {
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }

            // Generar token
            const token = jwt.sign(
                { userId: user.id },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.json({
                message: 'Login exitoso',
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email
                }
            });
        } catch (error) {
            res.status(500).json({ error: 'Error en el servidor: ' + error.message });
        }
    },

    // Obtener perfil de usuario
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