import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { connectDB } from "./server/db/connection.js";
import dotenv from "dotenv";
import serviceRoutes from "./src/routes/service.routes.js";
import siteRoutes from "./src/routes/site.routes.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5050;
{
  /*middleware*/
}

app.use(express.json());

app.use("/api/services", serviceRoutes);
app.use("/api/site", siteRoutes);

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
