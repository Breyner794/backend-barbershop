import express from "express";
import { protect, restrictTo } from "../controllers/auth.Controller.js";
import {
  getAllServices,
  getByIdServices,
  createServices,
  updateServices,
  deleteServices,
} from "../controllers/service.controller.js";

const router = express.Router();

//Ruta publica para ver los servicios - pagina principal y dashboard
router.get("/", getAllServices);
router.get("/:id", getByIdServices);
//Ruta protegida - necesita autenticacion, un login
//router.use(protect);

//Ruta con permisos de roles seleccionados.
//router.use(restrictTo('admin', 'superadmin'));

router.post("/", createServices);
router.put("/:id", updateServices);
router.delete("/:id", deleteServices);

export default router;
