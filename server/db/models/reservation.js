import mongoose from "mongoose";

const ReservationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    date: {
      type: Date,
      required: false,
    },
    hour: {
      type: String,
      required: false,
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    site: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
    },

    barber: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Barber",
      require: true,
    },
    state: {
      type: String,
      enum: ["pendiente", "confirmada", "completada", "cancelada"],
      default: "pendiente",
    },
    notes: {
      type: String,
    },
  },
  {
    strict: true,
    timestamps: true,
  }
);

const Reservation = mongoose.model("Reservation", ReservationSchema);
export default Reservation;
