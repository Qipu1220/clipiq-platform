/**
 * useVideoImpression Hook
 * 
 * Tracks video impressions and watch events for the RCM system.
 * 
 * Usage:
 * ```tsx
 * const { trackImpression, trackWatch } = useVideoImpression();
 * 
 * // When video becomes visible >= 600ms
 * trackImpression(videoId, position, 'personal');
 * 
 * // When user leaves video
 * trackWatch(videoId, watchDuration, completed);
 * ```
 */

import { useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { logImpression, logWatchEvent } from '../api/impressions';
import { getSessionId } from '../utils/sessionManager';
import { RootState } from '../store/store';

interface ImpressionTracker {
    videoId: string;
    impressionId: string | null;
    startTime: number;
    visibilityTimer: NodeJS.Timeout | null;
}

export function useVideoImpression() {
    const user = useSelector((state: RootState) => state.auth.currentUser);
    const trackersRef = useRef<Map<string, ImpressionTracker>>(new Map());

    /**
     * Track impression when video becomes visible >= 600ms
     */
    const trackImpression = useCallback(async (
        videoId: string,
        position: number,
        source: 'personal' | 'trending' | 'random' = 'personal'
    ) => {
        if (!user?.id) {
            console.warn('[Impression] User not logged in, skipping impression tracking');
            return null;
        }

        // Check if already tracking this video
        if (trackersRef.current.has(videoId)) {
            console.log('[Impression] Already tracking video:', videoId);
            return trackersRef.current.get(videoId)?.impressionId || null;
        }

        const sessionId = getSessionId();
        const startTime = Date.now();

        // Create tracker entry
        const tracker: ImpressionTracker = {
            videoId,
            impressionId: null,
            startTime,
            visibilityTimer: null
        };

        trackersRef.current.set(videoId, tracker);

        // Wait 600ms before logging impression
        tracker.visibilityTimer = setTimeout(async () => {
            try {
                const response = await logImpression({
                    user_id: user.id,
                    video_id: videoId,
                    session_id: sessionId,
                    position,
                    source,
                    model_version: 'v0'
                });

                tracker.impressionId = response.impression_id;
                console.log('[Impression] Logged:', {
                    videoId,
                    impressionId: response.impression_id,
                    position,
                    source
                });
            } catch (error) {
                console.error('[Impression] Failed to log:', error);
                trackersRef.current.delete(videoId);
            }
        }, 600);

        return null; // Impression ID will be available after 600ms
    }, [user]);

    /**
     * Track watch event when user leaves video
     */
    const trackWatch = useCallback(async (
        videoId: string,
        watchDuration?: number,
        completed: boolean = false
    ) => {
        if (!user?.id) {
            console.warn('[Watch] User not logged in, skipping watch tracking');
            return;
        }

        const tracker = trackersRef.current.get(videoId);

        // Clear visibility timer if still pending
        if (tracker?.visibilityTimer) {
            clearTimeout(tracker.visibilityTimer);
        }

        // Calculate watch duration if not provided
        const duration = watchDuration ?? (tracker ? (Date.now() - tracker.startTime) / 1000 : 0);

        try {
            await logWatchEvent({
                impression_id: tracker?.impressionId || undefined,
                user_id: user.id,
                video_id: videoId,
                watch_duration: Math.floor(duration),
                completed
            });

            console.log('[Watch] Logged:', {
                videoId,
                impressionId: tracker?.impressionId,
                watchDuration: Math.floor(duration),
                completed
            });
        } catch (error) {
            console.error('[Watch] Failed to log:', error);
        } finally {
            // Clean up tracker
            trackersRef.current.delete(videoId);
        }
    }, [user]);

    /**
     * Cancel impression tracking for a video
     * Useful when video is scrolled away before 600ms
     */
    const cancelImpression = useCallback((videoId: string) => {
        const tracker = trackersRef.current.get(videoId);

        if (tracker?.visibilityTimer) {
            clearTimeout(tracker.visibilityTimer);
            trackersRef.current.delete(videoId);
            console.log('[Impression] Cancelled:', videoId);
        }
    }, []);

    /**
     * Get impression ID for a video (if already tracked)
     */
    const getImpressionId = useCallback((videoId: string): string | null => {
        return trackersRef.current.get(videoId)?.impressionId || null;
    }, []);

    return {
        trackImpression,
        trackWatch,
        cancelImpression,
        getImpressionId
    };
}

export default useVideoImpression;
