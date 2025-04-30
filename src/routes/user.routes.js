import express from 'express';

import { protect, restrictTo } from "../controllers/auth.Controller.js";

import {
    getAllUser,
    getByIdUser,
    createUser,
    updateUser,
    deleteUser

} from '../controllers/user.controller.js'

const router = express.Router();

router.use(protect);

router.use(restrictTo('admin', 'superadmin'));

router.get("/", getAllUser);
router.get("/:id", getByIdUser);
router.post("/", createUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser)

export default router;