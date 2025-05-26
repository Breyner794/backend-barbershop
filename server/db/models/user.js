import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    last_name: {
    type: String,
    required: function() {
      return this.role === "barbero";
      },
    },
    phone: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
      minlength: 6,
      select: false // No devolver la contraseña en las consultas
    },
    role: {
      type: String,
      enum: ["admin", "barbero", "recepcionista", "superadmin"],
      required: true,
    },
    site_barber: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Site",
    required: function() {
      return this.role === "barbero";
    }
  },
  imageUrl: {
    type: String,
  },
    isActive: { type: Boolean, default: true },
  },
  {
    strict: true,
    timestamps: true,
  }
);

userSchema.pre('save', async function (next) {
  
  if (!this.isModified('password'))
    return next();

  try{

    const salt = await bcrypt.genSalt(10);

    this.password = await bcrypt.hash(this.password, salt);
    next();

  }catch (error){
    next(error);
  }
});

userSchema.methods.comparePassword = async function (candidatoContraseña) {
  return await bcrypt.compare(candidatoContraseña, this.password); 
}

const User = mongoose.model("User", userSchema);
export default User;