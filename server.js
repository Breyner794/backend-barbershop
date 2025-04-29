import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import cookieParser from 'cookie-parser';
import { connectDB } from "./server/db/connection.js";
import dotenv from "dotenv";
import serviceRoutes from "./src/routes/service.routes.js";
import siteRoutes from "./src/routes/site.routes.js";
import barberRoutes from "./src/routes/barber.routes.js";
import userRoutes from "./src/routes/user.routes.js";
import reservationRoutes from "./src/routes/reservation.routes.js"
import authRoutes from "./src/routes/auth.routes.js"

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5050;
{
  /*middleware*/
}

app.use(cors());

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/site", siteRoutes);
app.use("/api/barber", barberRoutes);
app.use("/api/user", userRoutes);
app.use("/api/reservation", reservationRoutes);

// Middleware para manejar rutas no encontradas
app.all('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `No se encontró la ruta: ${req.originalUrl}`
  });
});

app.get("/", (req, res) => {
  res.send("API del sistema de servicios esta funcionando");
});

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`💡 Servidor ejecutándose en http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("⚠️ Error al iniciar la aplicación:", error);
  });
