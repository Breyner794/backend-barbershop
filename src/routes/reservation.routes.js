import express from "express";

import {
    getAllReservation,
    createReservation,
    updateReservation,
    updateReservationState,
    deleteReservation
} from "../controllers/reservation.controller.js";

const router = express.Router();

router.get("/", getAllReservation);
router.post("/", createReservation);
router.put("/:id", updateReservation);
router.patch("/:id/status", updateReservationState);
router.delete("/:id", deleteReservation);

export default router;
