import express from "express";
import { protect, restrictTo } from "../controllers/auth.Controller.js";
import {
    getAllReservation,
    createReservation,
    updateReservation,
    updateReservationState,
    deleteReservation
} from "../controllers/reservation.controller.js";

const router = express.Router();

router.post("/", createReservation);

//Ruta protegida
router.use(protect);
//Ruta protegida para los autenticados, solo podran ver las reservas mas
//no las funcionalidades
router.get("/", getAllReservation);

//Ruta para dar acceso a las funcionalidades, como barberos, admin y superadmin
//podran hacer las funcionalidades, menos eliminar...
router.use(restrictTo('barbero','admin','superadmin'));

router.put("/:id", updateReservation);
router.patch("/:id/status", updateReservationState);

//Ruta para la funcionalidad de eliminar, solo lo podran hacer los admin y superadmin
router.use(restrictTo('admin','superadmin'));

router.delete("/:id", deleteReservation);

export default router;
