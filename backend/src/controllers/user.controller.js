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

/**
 * GET /api/v1/users/search
 * Search users by query
 */
export async function searchUsers(req, res, next) {
    try {
        const { q, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        if (!q) {
            return res.status(200).json({
                success: true,
                data: {
                    users: [],
                    pagination: { total: 0, page: parseInt(page), pages: 0 }
                }
            });
        }

        const query = `
            SELECT id, username, display_name, avatar_url, bio, role, created_at,
            (SELECT COUNT(*) FROM subscriptions WHERE following_id = users.id) as followers_count
            FROM users
            WHERE username ILIKE $1 OR display_name ILIKE $1
            ORDER BY followers_count DESC, created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const countQuery = `
            SELECT COUNT(*) 
            FROM users 
            WHERE username ILIKE $1 OR display_name ILIKE $1
        `;

        const searchPattern = `%${q}%`;

        const [result, countResult] = await Promise.all([
            pool.query(query, [searchPattern, limit, offset]),
            pool.query(countQuery, [searchPattern])
        ]);

        const total = parseInt(countResult.rows[0].count);
        const pages = Math.ceil(total / limit);

        // Process users to include full avatar URL if needed
        const users = result.rows.map(user => ({
            ...user,
            avatarUrl: user.avatar_url, // camelCase for frontend
            displayName: user.display_name,
            followersCount: parseInt(user.followers_count)
        }));

        return res.status(200).json({
            success: true,
            data: {
                users,
                pagination: {
                    total,
                    page: parseInt(page),
                    pages
                }
            }
        });
    } catch (error) {
        next(error);
    }
}
