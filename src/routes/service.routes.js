import express from "express";
import { protect, restrictTo } from "../controllers/auth.Controller.js";
import {
  getAllServices,
  getServicesDashboard,
  createServices,
  updateServices,
  deleteServices,
} from "../controllers/service.controller.js";
import { uploadServiceImage } from "../../utils/multerConfig.js";

const router = express.Router();

router.get("/", getAllServices);

router.use(protect);

router.route("/dashboard-services")
        .get(restrictTo("admin", "superadmin", "barbero"), getServicesDashboard)
router.route("/")
        .post(restrictTo("admin", "superadmin"),uploadServiceImage, createServices)
router.route("/:id")
        .put(restrictTo("admin", "superadmin"),uploadServiceImage, updateServices);
router.route("/:id")
        .delete(restrictTo("admin", "superadmin"), deleteServices);

export default router;
