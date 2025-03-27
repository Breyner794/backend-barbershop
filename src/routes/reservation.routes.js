import express from "express";

import {
    getAllReservation,
    createReservation,
    updateReservation,
    deleteReservation
} from "../controllers/reservation.controller.js";

const router = express.Router();

router.get("/", getAllReservation);
router.post("/", createReservation);
router.put("/:id", updateReservation);
router.delete("/:id", deleteReservation);

export default router;
