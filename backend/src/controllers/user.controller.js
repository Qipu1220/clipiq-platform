import pool from '../config/database.js';
import ApiError from '../utils/apiError.js';

/**
 * GET /api/v1/users/:username
 * Get user public profile by username
 */
export async function getUserProfileByUsername(req, res, next) {
    try {
        const { username } = req.params;

        const query = `
      SELECT id, username, email, role, display_name, bio, avatar_url, warnings, banned, created_at
      FROM users
      WHERE username = $1
    `;

        const result = await pool.query(query, [username]);

        if (result.rows.length === 0) {
            throw new ApiError(404, 'User not found');
        }

        const user = result.rows[0];

        // Map DB fields to response format
        const userProfile = {
            id: user.id,
            username: user.username,
            email: user.email, // Consider hiding email for public profile
            role: user.role,
            displayName: user.display_name,
            bio: user.bio,
            avatarUrl: user.avatar_url,
            warnings: user.warnings,
            banned: user.banned,
            createdAt: user.created_at
        };

        return res.status(200).json({
            success: true,
            data: userProfile
        });
    } catch (error) {
        next(error);
    }
}
