import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import cookieParser from 'cookie-parser';
import { scheduleTasks } from "./server/cron/jobs.js";
import { connectDB } from "./server/db/connection.js";
import dotenv from "dotenv";
import serviceRoutes from "./src/routes/service.routes.js";
import siteRoutes from "./src/routes/site.routes.js";
import barberRoutes from "./src/routes/barber.routes.js";
import userRoutes from "./src/routes/user.routes.js";
import reservationRoutes from "./src/routes/reservation.routes.js"
import authRoutes from "./src/routes/auth.routes.js"
import availabilityExceptionRoutes from "./src/routes/availabilityException.routes.js"
import barberAvailability from "./src/routes/barbersAvailability.routes.js"
import appointmentRoutes from "./src/routes/appointment.routes.js"
import analyticsRoutes from "./src/routes/analytics.Routes.js"

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5050;
{
  /*middleware*/
}

scheduleTasks();

const frontendUrl = process.env.FRONTEND_URL;
const cleanedFrontendUrl = frontendUrl ? frontendUrl.replace(/\$/, '') : 'http://localhost:5173';

app.use(cors({
  origin: cleanedFrontendUrl, // ¡Importante! El origen de tu frontend React
  credentials: true // Permite que el navegador envíe cookies o cabeceras de autorización
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb'}))
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/site", siteRoutes);
app.use("/api/barber", barberRoutes);
app.use("/api/user", userRoutes);
app.use("/api/reservation", reservationRoutes);
app.use("/api/availability/exceptions", availabilityExceptionRoutes);
app.use("/api/availability/", barberAvailability);
app.use("/api/appointments", appointmentRoutes);
app.use("/api", analyticsRoutes);

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
