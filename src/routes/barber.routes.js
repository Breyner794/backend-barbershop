import express from "express";

import {
  getAllBarber,
  getByIdBarber,
  createBarber,
  updateBarber,
  deleteBarber,
} from "../controllers/barber.controller.js";

const router = express.Router();

router.get("/", getAllBarber);
router.get("/:id", getByIdBarber);
router.post("/", createBarber);
router.put("/:id", updateBarber);
router.delete("/:id", deleteBarber);

export default router;
