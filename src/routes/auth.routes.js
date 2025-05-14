import express, { Router } from "express";
import { login, protect, restrictTo } from "../controllers/auth.Controller.js";
import {
  createUser,
  getMe
  
} from "../controllers/user.controller.js";

const router = express.Router();

// Rutas públicasonc
router.post("/login", login);

router.post("/registro", createUser);

// Rutas protegidas

router.use(protect);

router.get('/me',getMe)

// router.use(restrictTo("admin"));

// router.route("/usuarios").get(getAllUser);

// router
//   .route("/usuarios/:id")
//   .get(getByIdUser)
//   .patch(updateUser)
//   .delete(deleteUser);

export default router;
