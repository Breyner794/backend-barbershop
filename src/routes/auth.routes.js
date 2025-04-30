import express from "express";
import { login, protect, restrictTo } from "../controllers/auth.Controller.js";
import {
  getAllUser,
  getByIdUser,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/user.controller.js";

const router = express.Router();

// Rutas públicas
router.post("/login", login);

router.post("/registro", createUser);

// Rutas protegidas

// router.use(protect);

// router.use(restrictTo("admin"));

// router.route("/usuarios").get(getAllUser);

// router
//   .route("/usuarios/:id")
//   .get(getByIdUser)
//   .patch(updateUser)
//   .delete(deleteUser);

export default router;
