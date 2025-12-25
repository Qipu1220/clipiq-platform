/**
 * Session Manager
 * 
 * Manages user session ID for impression tracking.
 * Session ID is regenerated on each page load/refresh.
 */

const SESSION_KEY = 'clipiq_session_id';

/**
 * Generate a new UUID v4
 */
function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Get or create session ID
 * Session ID is stored in sessionStorage (cleared on tab close)
 */
export function getSessionId(): string {
    let sessionId = sessionStorage.getItem(SESSION_KEY);

    if (!sessionId) {
        sessionId = generateUUID();
        sessionStorage.setItem(SESSION_KEY, sessionId);
        console.log('[Session] New session created:', sessionId);
    }

    return sessionId;
}

/**
 * Force regenerate session ID
 * Useful for testing or manual session reset
 */
export function regenerateSessionId(): string {
    const sessionId = generateUUID();
    sessionStorage.setItem(SESSION_KEY, sessionId);
    console.log('[Session] Session regenerated:', sessionId);
    return sessionId;
}

/**
 * Clear session ID
 */
export function clearSessionId(): void {
    sessionStorage.removeItem(SESSION_KEY);
    console.log('[Session] Session cleared');
}

export default {
    getSessionId,
    regenerateSessionId,
    clearSessionId
};
