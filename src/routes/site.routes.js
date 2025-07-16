import express from "express";
import { protect, restrictTo } from "../controllers/auth.Controller.js";
import {
  createSite,
  deleteSite,
  getAllSite,
  getSiteDashboard,
  getByIdSite,
  updateSite,
  getBarbersBySite
} from "../controllers/site.controller.js";

const router = express.Router();

router.get("/", getAllSite);
router.get("/site/dashboard", getSiteDashboard);

router.use(protect);

router.get("/:id", getByIdSite);
router.get('/:siteId/barbers', getBarbersBySite);

router.route("/")
        .post(restrictTo("admin", "superadmin"), createSite);

router.route("/:id")
        .put(restrictTo("admin", "superadmin"), updateSite)

router.delete("/:id", deleteSite);

export default router;
