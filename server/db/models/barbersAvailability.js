import mongoose from "mongoose";

const barberAvailabilitySchema = new mongoose.Schema(
  {
    barberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    dayOfWeek: {
      type: Number, // 0 (domingo) a 6 (sábado)
      required: true,
    },
    timeSlots: [
      {
        startTime: String, // Formato "HH:MM"
        endTime: String, // Formato "HH:MM"
      },
    ],
    isWorkingDay: {
      type: Boolean,
      default: true,
    },
  },
  {
    strict: true,
    timestamps: true,
  }
);

const Availabilitybarber = mongoose.model("Availabilitybarber", barberAvailabilitySchema);
export default Availabilitybarber;