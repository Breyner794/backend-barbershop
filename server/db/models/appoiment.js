import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema({
  barberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Service",
    required: true
  },
  siteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Site",
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,  // Formato "HH:MM"
    required: true
  },
  endTime: {
    type: String,  // Calculado a partir de startTime + (opcional-buena idea pero no.) duración del servicio
    required: true
  },
  // Información del cliente
  clientName: {
    type: String,
    required: true
  },
  clientPhone: {
    type: String,
    required: true
  },
  clientEmail: String,
  notes: String,
  confirmationCode: {
    type: String,
    unique: true
  },
  status: {
    type: String,
    enum: ["pendiente", "confirmada", "completada", "cancelada", "no-asistió"],
    default: "pendiente"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;