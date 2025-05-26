import mongoose from "mongoose";

const availabilityExceptionSchema = new mongoose.Schema(
  {
    barberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    isWorkingDay: {
      type: Boolean,
      default: false,
    },
    timeSlots: [
      {
        startTime: String,
        endTime: String,
      },
    ],
    reason: String,
  },
  {
    strict: true,
    timestamps: true,
  }
);

const Availabilityexception = mongoose.model("Availabilityexception", availabilityExceptionSchema);
export default Availabilityexception;