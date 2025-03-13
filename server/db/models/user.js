import mongoose, { mongo } from "mongoose";

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["admin", "barbero", "recepcionista", "superadmin"],
    required: true,
  },
  id_barber: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Barber",
    required: false, // No es requerido para todos los roles
  },
},{
    strict: true,
    timestamps: true,
});

const User = mongoose.model("User", userSchema);
export default User;

