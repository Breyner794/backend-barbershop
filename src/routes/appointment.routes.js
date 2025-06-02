import express from "express";
import {
    getAvailableSlotsForBooking,
    getAppointmentsByBarber,
    getAppointmentByConfirmationDetails,
    getAppointmentById,
    createAppointment,
    updateAppointmentDetails,
    updateAppointmentStatus

} from "../controllers/appointment.Controller.js"

const router = express.Router();

router.get("/bookingslots", getAvailableSlotsForBooking); //Funcional faltan pruebas mas extremas.
router.post("/", createAppointment); 
router.get("/:appointmentId", getAppointmentById);
router.get("/barber/:barberId", getAppointmentsByBarber);
router.post("/lookup", getAppointmentByConfirmationDetails);
router.patch("/:appointmentId/status", updateAppointmentStatus);
router.patch("/:appointmentId" ,updateAppointmentDetails);

export default router;