import mongoose from "mongoose";
import bcrypt from "bcrypt";
import crypto from "crypto";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    last_name: {
    type: String,
    required: true, // Todos los usuarios deben tener apellido
    trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
      minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
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
    isActive: {
      type: Boolean,
      default: true 
    },
    last_login: {
      type: Date
    },
    // Para reseteo de contraseñas
    reset_password_token: String,
    reset_password_expires: Date,
    // Para verificación de email
    email_verified: {
      type: Boolean,
      default: false
    },
    email_verification_token: String
  },
  {
    strict: true,
    timestamps: true,
  }
);

userSchema.index({email: 1}, {unique: true});
userSchema.index({role: 1});
userSchema.index({isActive: 1});
userSchema.index({site_barber: 1})

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

userSchema.methods.generatePasswordResetToken = function (){
  
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.reset_password_token = crypto
  .createHash('sha256')
  .update(resetToken)
  .digest('hex');

  this.reset_password_expires = Date.now() + 10 * 50 * 1000; //10 minutos

  return resetToken;
}

userSchema.methods.getPublicProfile = function() {
  const userObjet = this.toObject();
  delete userObjet.password;
  delete userObjet.reset_password_token;
  delete userObjet.reset_password_expires;
  delete userObjet.email_verification_token;
  return userObjet;
};

userSchema.virtual('full_name').get(function(){
  return `${this.name}, ${this.last_name}`;
});

userSchema.set('toJSON', {virtuals:true});

const User = mongoose.model("User", userSchema);
export default User;