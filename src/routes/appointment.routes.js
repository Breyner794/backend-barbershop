import express from "express";
import {
    getAllAppointments,
    getAvailableSlotsForBooking,
    getAppointmentsByBarber,
    getAppointmentByConfirmationDetails,
    getAppointmentById,
    createAppointment,
    updateAppointmentDetails,
    updateAppointmentStatus,
    creacteCompletedService,
    updateAppointment,
    deleteAppointment,
    getUpcomingAppointmentsForDashboard
} from "../controllers/appointment.Controller.js"
import { canUpdateAppointment, isOwnerOrAdmin } from "../middleware/authMiddleware.js";
import { protect, restrictTo } from "../controllers/auth.Controller.js";

const router = express.Router();

router.get("/bookingslots", getAvailableSlotsForBooking); //Funcional faltan pruebas mas extremas.
router.post("/lookup", getAppointmentByConfirmationDetails);



router.use(protect);

router.get('/upcoming-dashboard', getUpcomingAppointmentsForDashboard);

router.get("/", getAllAppointments)
router.post("/", createAppointment); 
router.get("/:appointmentId", getAppointmentById);
router.route("/updateappointment/:appointmentId")
    .patch(updateAppointment)

router.route('/completed-service')
    .post(creacteCompletedService);
    
router.route('/barber/:barberId')
    .get(isOwnerOrAdmin, getAppointmentsByBarber)

router.route('/:appointmentId/status')
    .patch(canUpdateAppointment, updateAppointmentStatus)

router.patch("/:appointmentId" ,updateAppointmentDetails);

router.route("/delete/:appointmentId")
    .delete(restrictTo("admin", "superadmin", "barbero"), deleteAppointment)

export default router;