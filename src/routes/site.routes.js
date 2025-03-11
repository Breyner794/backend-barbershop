import express from "express";

import {
  createSite,
  deleteSite,
  getAllSite,
  getByIdSite,
  updateSite,
} from "../controllers/site.controller.js";

const router = express.Router();

router.get("/", getAllSite);
router.get("/:id", getByIdSite);
router.post("/", createSite);
router.put("/:id", updateSite);
router.delete("/:id", deleteSite);

export default router;
