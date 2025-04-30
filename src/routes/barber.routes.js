import express from "express";
import { protect, restrictTo } from "../controllers/auth.Controller.js";
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

router.use(protect);

router.use(restrictTo('admin','superadmin'));

router.post("/", createBarber);
router.put("/:id", updateBarber);
router.delete("/:id", deleteBarber);

export default router;
