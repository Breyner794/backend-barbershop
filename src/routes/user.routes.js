import express, { Router } from 'express';

import {
    getAllUser,
    getByIdUser,
    createUser,
    updateUser,
    deleteUser

} from '../controllers/user.controller.js'

const router = express.Router();

router.get("/", getAllUser);
router.get("/:id", getByIdUser);
router.post("/", createUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser)

export default router;