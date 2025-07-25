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
    required: [true, 'El teléfono es requerido'],
    validate: {
            // Usamos una expresión regular para verificar que sea exactamente 10 dígitos.
            // Esto cubre el formato estándar de números móviles en Colombia.
            validator: function(v) {
                // Expresión regular: ^ (inicio de la cadena), \d{10} (exactamente 10 dígitos), $ (fin de la cadena)
                return /^\d{10}$/.test(v);
            },
            message: props => `${props.value} no es un número de teléfono válido. El teléfono debe tener exactamente 10 dígitos.`
        },
      trim: true,
  },
  clientEmail: String,
  notes: String,
  confirmationCode: {
    type: String,
    unique: true,
    sparse: true
  },
  status: {
    type: String,
    enum: ["pendiente", "confirmada", "completada", "cancelada", "no-asistio"],
    default: "pendiente"
  },
  isWalkIn: { // Para identificar registros manuales/sin cita
    type: Boolean,
    default: false 
  },
  completedAt: { // Fecha y hora exactas en que se marcó como completado
    type: Date 
  },
},{
  timestamps: true
});

const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;