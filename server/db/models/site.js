import mongoose from "mongoose";

const siteSchema = new mongoose.Schema(
  {
    name_site: {
      type: String,
      required: [true, "Se requiere nombre de la sede."],
    },
    address_site: {
      type: String,
      required: [true, "Se requiere la direccion exacta de la sede"],
    },
    phone_site: {
      type: String,
      required: [true, "Se require un numero de telefono valido."],
    },
    headquarter_time: {
      type: String,
      required: [true, "Se require un horario general de atencion."],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    strict: true,
    timestamps: true,
  }
);

const Site = mongoose.model("Site", siteSchema);
export default Site;
