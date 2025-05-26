import express from "express";
import {
  addTimeSlot,
  createOrUpdateAvailability,
  deleteAllAvailability,
  getBarberAvailability,
  getBarberAvailabilityByDay,
  removeTimeSlot,
  toggleWorkingDay,
} from "../controllers/barbersAvailability.Controller.js";

const router = express.Router();

// GET - Obtener toda la disponibilidad de un barbero
router.get("/barber/:barberId", getBarberAvailability);

// GET - Obtener disponibilidad de un barbero para un día específico
router.get("/barber/:barberId/day/:dayOfWeek", getBarberAvailabilityByDay);

// POST - Crear o actualizar disponibilidad completa para un día
router.post("/barber/:barberId/day/:dayOfWeek", createOrUpdateAvailability);

// POST - Añadir un slot de tiempo específico
router.post("/barber/:barberId/day/:dayOfWeek/timeslot", addTimeSlot);

// DELETE - Eliminar un slot de tiempo específico
router.delete("/barber/:barberId/day/:dayOfWeek/timeslot/:slotId", removeTimeSlot);

// PATCH - Cambiar estado de día laborable/no laborable
router.patch("/barber/:barberId/day/:dayOfWeek/toggle", toggleWorkingDay);

// DELETE - Eliminar toda la configuración de disponibilidad de un barbero
router.delete("/barber/:barberId", deleteAllAvailability);

export default router;