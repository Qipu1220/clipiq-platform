import express from 'express';
import { getUserProfileByUsername } from '../controllers/user.controller.js';

const router = express.Router();

router.get('/:username', getUserProfileByUsername);

export default router;
