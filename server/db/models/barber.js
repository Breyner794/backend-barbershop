import mongoose from "mongoose";

const barberSchema = new mongoose.Schema(
  {
    id_barber: {
      type: Number,
      required: true,
      unique: [true, "El codigo debe de ser unico"],
    },
    name_barber: {
      type: String,
      required: true,
    },
    last_name_barber: {
      type: String,
      required: true,
    },
    site_barber: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
    },
    imageUrl: {
      type: String,
    },
  },
  {
    strict: true,
    timestamps: true,
  }
);

const Barber = mongoose.model("Barber", barberSchema);
export default Barber;
