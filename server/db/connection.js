import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.ATLAS_URI);
    console.log(`✅ Conectado a MongoDB exitosamente`);
  } catch (error) {
    console.error(`❌ Error de conexión a MongoDB: ${error.message}`);
    process.exit(1); // Termina el proceso con error
  }
};

// Si quieres exportar mongoose también
