import express from 'express';

import {
    getAllServices,
    createServices,
    updateServices,
    deleteServices
} from '../controllers/service.controller.js'

const router = express.Router();

router.get('/', getAllServices);
router.post('/', createServices);
router.put('/:id', updateServices);
router.delete('/:id', deleteServices);

export default router;