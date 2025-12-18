import express from 'express';
import { getUserProfileByUsername, searchUsers } from '../controllers/user.controller.js';

const router = express.Router();

router.get('/search', searchUsers);
router.get('/:username', getUserProfileByUsername);

export default router;
