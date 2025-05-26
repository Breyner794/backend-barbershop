import express from 'express';

import { protect, restrictTo } from "../controllers/auth.Controller.js";

import {
    getAllUser,
    getByIdUser,
    createUser,
    updateUser,
    deleteUser,
    getMe,
    getUsersByRole,
    getBarbersBySite
} from '../controllers/user.controller.js'

const router = express.Router();

// Rutas públicas (sin protección)
// Si necesitas alguna ruta pública, ponla aquí antes del protect

// Aplicar protección a todas las rutas siguientes
//router.use(protect);

// Ruta específica para el usuario actual (no necesita permisos de admin)
//router.get("/me", getMe);

// Aplicar restricción de admin/superadmin a las siguientes rutas
//router.use(restrictTo('admin', 'superadmin'));

// Rutas con parámetros específicos ANTES de las rutas con parámetros genéricos
router.get("/role/:role", getUsersByRole);           // /users/role/barbero
router.get("/site/:siteId", getBarbersBySite);      // /users/site/64a1b2c3d4e5f6789

// Rutas CRUD principales
router.get("/", getAllUser);                        // /users/
router.post("/", createUser);                       // /users/
router.get("/:id", getByIdUser);                    // /users/64a1b2c3d4e5f6789
router.put("/:id", updateUser);                     // /users/64a1b2c3d4e5f6789
router.delete("/:id", deleteUser);                  // /users/64a1b2c3d4e5f6789

export default router;