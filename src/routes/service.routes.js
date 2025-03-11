import express from "express";

import {
  getAllServices,
  getByIdServices,
  createServices,
  updateServices,
  deleteServices,
} from "../controllers/service.controller.js";

const router = express.Router();

router.get("/", getAllServices);
router.get("/:id", getByIdServices);
router.post("/", createServices);
router.put("/:id", updateServices);
router.delete("/:id", deleteServices);

export default router;
