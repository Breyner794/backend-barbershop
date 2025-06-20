import express from 'express';

import { protect, restrictTo } from "../controllers/auth.Controller.js";

import {
    getMyProfile,
    updateMyProfile,
    changeMyPassword,
    getAllUser,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    superUpdateUser,
    hardDeleteUser
} from '../controllers/user.controller.js'

const router = express.Router();

router.use(protect);
// --- RUTAS PARA EL PROPIO USUARIO (logueado) ---
router.get("/me", getMyProfile);
router.patch("/update-my-profile", updateMyProfile);
router.patch("/change-my-password", changeMyPassword);

// --- RUTAS PARA ADMINISTRADORES ---
router.route("/")
    .get(restrictTo('admin', 'superadmin'), getAllUser);

router.route("/create-new-user")
    .post(restrictTo('admin', 'superadmin'), createUser);
    //.post(createUser); 

router.route("/user/:id") // Ruta para obtener un usuario por ID
    .get(restrictTo('admin', 'superadmin'), getUserById);

router.route("/admin/update/:id")
    .patch(restrictTo('admin', 'superadmin'), updateUser);

router.route("/admin/delete/:id")
    .delete(restrictTo('admin', 'superadmin'), deleteUser);

// --- RUTAS EXCLUSIVAS PARA SUPERADMIN ---
router.route("/superadmin/update/:id")
    .patch(restrictTo('superadmin'), superUpdateUser);

router.route("/superadmin/delete/:id")
    .delete(restrictTo('superadmin'), hardDeleteUser);

export default router;

// // Rutas públicas (sin protección)
// // Si necesitas alguna ruta pública, ponla aquí antes del protect

// // Aplicar protección a todas las rutas siguientes
// //router.use(protect);

// // Ruta específica para el usuario actual (no necesita permisos de admin)
// //router.get("/me", getMe);

// // Aplicar restricción de admin/superadmin a las siguientes rutas
// //router.use(restrictTo('admin', 'superadmin'));

// // Rutas con parámetros específicos ANTES de las rutas con parámetros genéricos
// router.get("/role/:role", getUsersByRole);           // /users/role/barbero
// //router.get("/site/:siteId", getBarbersBySite);      // /users/site/64a1b2c3d4e5f6789

// // Rutas CRUD principales
// router.get("/", getAllUser);                        // /users/
// router.post("/", createUser);                       // /users/
// router.get("/:id", getUserById);                    // /users/64a1b2c3d4e5f6789
// router.put("/:id", updateUser);                     // /users/64a1b2c3d4e5f6789
// router.delete("/:id", deleteUser);                  // /users/64a1b2c3d4e5f6789



