/**
 * Analytics Service
 * Business logic for analytics and statistics
 */

import { Analytics } from '../models/Analytics.js';
import ApiError from '../utils/apiError.js';

/**
 * Get comprehensive analytics statistics
 * Returns current month stats with month-over-month comparison
 * @returns {Promise<Object>} Analytics statistics object
 */
export async function getAnalyticsStats() {
  try {
    // Get current month stats
    const [
      totalViewsCurrent,
      totalViewsPrevious,
      videosUploadedCurrent,
      videosUploadedPrevious,
      activeUsersCurrent,
      activeUsersPrevious,
      avgWatchTimeCurrent,
      avgWatchTimePrevious,
      engagementRateCurrent,
      engagementRatePrevious,
      topVideos
    ] = await Promise.all([
      Analytics.getTotalViews(true),
      Analytics.getTotalViews(false),
      Analytics.getTotalVideosUploaded(true),
      Analytics.getTotalVideosUploaded(false),
      Analytics.getActiveUsers(true),
      Analytics.getActiveUsers(false),
      Analytics.getAverageWatchTime(true),
      Analytics.getAverageWatchTime(false),
      Analytics.getEngagementRate(true),
      Analytics.getEngagementRate(false),
      Analytics.getTopVideos(5)
    ]);

    // Calculate percentage changes
    const totalViewsChange = Analytics.calculatePercentageChange(
      totalViewsCurrent,
      totalViewsPrevious
    );
    const videosUploadedChange = Analytics.calculatePercentageChange(
      videosUploadedCurrent,
      videosUploadedPrevious
    );
    const activeUsersChange = Analytics.calculatePercentageChange(
      activeUsersCurrent,
      activeUsersPrevious
    );
    const avgWatchTimeChange = Analytics.calculatePercentageChange(
      avgWatchTimeCurrent,
      avgWatchTimePrevious
    );
    const engagementRateChange = Analytics.calculatePercentageChange(
      engagementRateCurrent,
      engagementRatePrevious
    );

    return {
      totalViews: {
        current: totalViewsCurrent,
        previous: totalViewsPrevious,
        change: totalViewsChange
      },
      videosUploaded: {
        current: videosUploadedCurrent,
        previous: videosUploadedPrevious,
        change: videosUploadedChange
      },
      activeUsers: {
        current: activeUsersCurrent,
        previous: activeUsersPrevious,
        change: activeUsersChange
      },
      averageWatchTime: {
        current: avgWatchTimeCurrent, // in seconds
        previous: avgWatchTimePrevious, // in seconds
        change: avgWatchTimeChange
      },
      engagementRate: {
        current: engagementRateCurrent,
        previous: engagementRatePrevious,
        change: engagementRateChange
      },
      topVideos
    };
  } catch (error) {
    throw new ApiError(500, 'Failed to fetch analytics statistics', error.message);
  }
}

