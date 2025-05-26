import express from "express";
import {
    createOrUpdateAvailability,
    getAvailabilityByBarberId,
    removeTimeSlotException,
    getAvailabilityByBarberIdAndDate
} from "../controllers/availabilityExceptions.controller.js"

const router = express.Router();

router.get("/barber/:barberId", getAvailabilityByBarberId);
router.get("/barber/:barberId/:date", getAvailabilityByBarberIdAndDate);
router.post("/", createOrUpdateAvailability);
router.delete("/timeslot", removeTimeSlotException);

export default router;    