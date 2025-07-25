import express from "express";
import { protect, restrictTo } from "../controllers/auth.Controller.js";
import {
  createSite,
  deleteSite,
  getAllSite,
  getSiteDashboard,
  getByIdSite,
  updateSite,
  getBarbersBySite,
  getActiveSitesCount
} from "../controllers/site.controller.js";

const router = express.Router();

router.get("/", getAllSite);
router.get('/:siteId/barbers', getBarbersBySite);

router.use(protect);

router.get("/site/dashboard", getSiteDashboard);
router.get('/active-count', getActiveSitesCount);
router.get("/:id", getByIdSite);

router.route("/")
        .post(restrictTo("admin", "superadmin"), createSite);

router.route("/:id")
        .put(restrictTo("admin", "superadmin"), updateSite)

router.delete("/:id", deleteSite);

export default router;
