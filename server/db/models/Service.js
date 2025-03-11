import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: [true, "Titulo Obligatorio para el servicio."],
    },
    price: {
      type: Number,
      required: [true, "Precio obligatorio."],
    },
    duration: {
      type: Number,
      required: [true, "Duracion del servicio requerido."],
    },
    includes: {
      type: [String],
      required: [true, "Require al menos un servicio."],
    },
    icon: {
      type: String,
    },
  },
  {
    strict: true,
    timestamps: true,
  }
);

const Service = mongoose.model("Service", serviceSchema);
export default Service;
