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
  
  serviceNameSnapshot: {
    type: String,
    required: true, 
  },
  servicePriceSnapshot: {
    type: Number, 
    required: true, 
  },
  serviceDurationSnapshot: {
    type: Number, 
    required: false, 
  },

  barberNameSnapshot: {
    type: String,
    required: true,
  },

  siteNameSnapshot: {
    type: String,
    required: true,
  },

  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },

  clientName: {
    type: String,
    required: true
  },
  clientPhone: {
    type: String,
    required: [true, 'El teléfono es requerido'],
    validate: {
            validator: function(v) {

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
  isWalkIn: {
    type: Boolean,
    default: false 
  },
  completedAt: {
    type: Date 
  },
},{
  timestamps: true
});

const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;