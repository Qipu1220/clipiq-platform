/**
 * VideoImpressionTracker Component
 * 
 * Wrapper component that automatically tracks impressions and watch events
 * using IntersectionObserver.
 * 
 * Usage:
 * ```tsx
 * <VideoImpressionTracker
 *   videoId={video.id}
 *   position={index}
 *   source="personal"
 *   onImpressionLogged={(impressionId) => console.log('Logged:', impressionId)}
 * >
 *   <VideoPlayer video={video} />
 * </VideoImpressionTracker>
 * ```
 */

import React, { useEffect, useRef, useState } from 'react';
import { useVideoImpression } from '../hooks/useVideoImpression';

interface VideoImpressionTrackerProps {
    videoId: string;
    position: number;
    source?: 'personal' | 'trending' | 'random';
    threshold?: number; // Visibility threshold (0-1), default 0.5
    onImpressionLogged?: (impressionId: string) => void;
    onWatchLogged?: (watchDuration: number) => void;
    children: React.ReactNode;
}

export const VideoImpressionTracker: React.FC<VideoImpressionTrackerProps> = ({
    videoId,
    position,
    source = 'personal',
    threshold = 0.5,
    onImpressionLogged,
    onWatchLogged,
    children
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [watchStartTime, setWatchStartTime] = useState<number | null>(null);
    const { trackImpression, trackWatch, cancelImpression } = useVideoImpression();

    // Track visibility with IntersectionObserver
    useEffect(() => {
        const element = containerRef.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                setIsVisible(entry.isIntersecting);

                if (entry.isIntersecting) {
                    // Video became visible
                    console.log(`[Tracker] Video ${videoId} became visible`);
                    setWatchStartTime(Date.now());

                    // Track impression (will wait 600ms internally)
                    trackImpression(videoId, position, source).then((impressionId) => {
                        if (impressionId && onImpressionLogged) {
                            onImpressionLogged(impressionId);
                        }
                    });
                } else {
                    // Video became invisible
                    if (watchStartTime) {
                        const watchDuration = (Date.now() - watchStartTime) / 1000;
                        console.log(`[Tracker] Video ${videoId} became invisible, watch: ${watchDuration.toFixed(1)}s`);

                        // Only track if watched for at least 0.6s (impression threshold)
                        if (watchDuration >= 0.6) {
                            trackWatch(videoId, watchDuration, false).then(() => {
                                if (onWatchLogged) {
                                    onWatchLogged(watchDuration);
                                }
                            });
                        } else {
                            // Cancel impression if not visible long enough
                            cancelImpression(videoId);
                        }

                        setWatchStartTime(null);
                    }
                }
            },
            {
                threshold,
                rootMargin: '0px'
            }
        );

        observer.observe(element);

        return () => {
            observer.disconnect();

            // Track watch event on unmount if video was visible
            if (watchStartTime) {
                const watchDuration = (Date.now() - watchStartTime) / 1000;
                if (watchDuration >= 0.6) {
                    trackWatch(videoId, watchDuration, false);
                } else {
                    cancelImpression(videoId);
                }
            }
        };
    }, [videoId, position, source, threshold, watchStartTime, trackImpression, trackWatch, cancelImpression, onImpressionLogged, onWatchLogged]);

    return (
        <div ref={containerRef} data-video-id={videoId} data-visible={isVisible}>
            {children}
        </div>
    );
};

export default VideoImpressionTracker;
