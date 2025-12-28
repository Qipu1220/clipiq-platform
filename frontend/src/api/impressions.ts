/**
 * Impression API Client
 * 
 * Handles impression logging and watch event tracking for the RCM system.
 */

import apiClient from './client';

// Note: Using /events endpoint instead of /impressions to avoid ad blocker issues
const EVENTS_ENDPOINT = '/events';

/**
 * Impression data interface
 */
export interface ImpressionData {
    user_id: string;
    video_id: string;
    session_id: string;
    position: number;
    source: 'personal' | 'trending' | 'random';
    model_version?: string;
}

/**
 * Watch event data interface
 */
export interface WatchEventData {
    impression_id?: string;
    user_id: string;
    video_id: string;
    watch_duration: number;
    completed: boolean;
}

/**
 * Impression response interface
 */
export interface ImpressionResponse {
    success: boolean;
    impression_id: string;
    data: {
        id: string;
        user_id: string;
        video_id: string;
        session_id: string;
        position: number;
        source: string;
        model_version: string | null;
        shown_at: string;
    };
}

/**
 * Watch event response interface
 */
export interface WatchEventResponse {
    success: boolean;
    data: {
        id: string;
        user_id: string;
        video_id: string;
        watch_duration: number;
        completed: boolean;
        impression_id: string | null;
        created_at: string;
    };
}

/**
 * Log an impression when video is shown >= 600ms
 */
export const logImpression = async (data: ImpressionData): Promise<ImpressionResponse> => {
    const response = await apiClient.post<ImpressionResponse>(EVENTS_ENDPOINT, data);
    return response.data;
};

/**
 * Log a watch event when user leaves video
 */
export const logWatchEvent = async (data: WatchEventData): Promise<WatchEventResponse> => {
    const response = await apiClient.post<WatchEventResponse>(`${EVENTS_ENDPOINT}/watch`, data);
    return response.data;
};

/**
 * Get user's impression history
 */
export const getImpressionHistory = async (limit = 50, offset = 0) => {
    const response = await apiClient.get(`${EVENTS_ENDPOINT}/history`, {
        params: { limit, offset }
    });
    return response.data;
};

export default {
    logImpression,
    logWatchEvent,
    getImpressionHistory
};
