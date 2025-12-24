import * as userService from '../services/user.service.js';
import ApiError from '../utils/apiError.js';

/**
 * GET /api/v1/users/:username
 * Get user public profile by username
 */
export async function getUserProfileByUsername(req, res, next) {
    try {
        const { username } = req.params;

        const user = await userService.getUserByUsername(username);
        
        if (!user) {
            throw new ApiError(404, 'User not found');
        }

        const userProfile = userService.formatUserProfile(user);

        return res.status(200).json({
            success: true,
            data: userProfile
        });
    } catch (error) {
        next(error);
    }
}
