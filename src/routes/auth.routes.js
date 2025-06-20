import express from 'express';

import {
    login,
    forgotPassword,
    resetPassword
} from '../controllers/auth.Controller.js';

const router = express.Router();

// --- DEFINICIÓN DE RUTAS PÚBLICAS DE AUTENTICACIÓN ---

// @desc    Iniciar sesión de un usuario
// @route   POST /api/auth/login
// @access  Public
router.post('/login', login);

// @desc    Solicitar un email para restablecer la contraseña
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', forgotPassword);

// @desc    Restablecer la contraseña usando un token enviado por email
// @route   PATCH /api/auth/reset-password/:token
// @access  Public
router.patch('/reset-password/:token', resetPassword);


export default router;