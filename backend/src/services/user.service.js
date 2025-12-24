import pool from '../config/database.js';
import ApiError from '../utils/apiError.js';

/**
 * Get user profile by username
 */
export async function getUserByUsername(username) {
    const query = `
        SELECT id, username, email, role, display_name, bio, avatar_url, warnings, banned, created_at
        FROM users
        WHERE username = $1
    `;
    
    const result = await pool.query(query, [username]);
    
    if (result.rows.length === 0) {
        return null;
    }
    
    return result.rows[0];
}

/**
 * Format user profile response
 */
export function formatUserProfile(user) {
    return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        displayName: user.display_name,
        bio: user.bio,
        avatarUrl: user.avatar_url,
        warnings: user.warnings,
        banned: user.banned,
        createdAt: user.created_at
    };
}
