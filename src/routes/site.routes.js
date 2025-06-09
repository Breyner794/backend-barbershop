import express from "express";
import { protect, restrictTo } from "../controllers/auth.Controller.js";
import {
  createSite,
  deleteSite,
  getAllSite,
  getByIdSite,
  updateSite,
  getBarbersBySite
} from "../controllers/site.controller.js";

const router = express.Router();

router.get("/", getAllSite);

//router.use(protect);

//router.use(restrictTo('admin','superadmin'));

router.get("/:id", getByIdSite);
router.get('/:siteId/barbers', getBarbersBySite);
router.post("/", createSite);
router.put("/:id", updateSite);
router.delete("/:id", deleteSite);

export default router;
