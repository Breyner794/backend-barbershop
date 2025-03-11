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
      type: Number,
      required: [true, "Se require un numero de telefono valido."],
    },
    headquarter_time: {
      type: Date,
      required: [true, "Se require una fecha."],
    },
  },
  {
    strict: true,
    timestamps: true,
  }
);

const Site = mongoose.model("Site", siteSchema);
export default Site;
