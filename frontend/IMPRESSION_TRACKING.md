# Video Impression Tracking - Frontend Integration

## Overview

This module implements client-side impression tracking and watch event logging for the RCM (Recommendation) system.

## Features

- ✅ **Session Management**: Auto-generate session ID on page load
- ✅ **Impression Tracking**: Log when video is visible >= 600ms
- ✅ **Watch Event Tracking**: Log watch duration when user leaves video
- ✅ **Automatic Cleanup**: Handle unmount and visibility changes
- ✅ **TypeScript Support**: Full type safety

## Files Created

```
frontend/src/
├── api/
│   └── impressions.ts          # API client for impressions
├── utils/
│   └── sessionManager.ts       # Session ID management
├── hooks/
│   └── useVideoImpression.ts   # React hook for tracking
└── components/
    └── VideoImpressionTracker.tsx  # Auto-tracking wrapper component
```

## Usage

### Method 1: Using the Wrapper Component (Recommended)

Wrap your video component with `VideoImpressionTracker`:

```tsx
import { VideoImpressionTracker } from './components/VideoImpressionTracker';

function VideoFeed({ videos }) {
  return (
    <div>
      {videos.map((video, index) => (
        <VideoImpressionTracker
          key={video.id}
          videoId={video.id}
          position={index}
          source="personal"
          onImpressionLogged={(impressionId) => {
            console.log('Impression logged:', impressionId);
          }}
          onWatchLogged={(duration) => {
            console.log('Watch duration:', duration);
          }}
        >
          <VideoPlayer video={video} />
        </VideoImpressionTracker>
      ))}
    </div>
  );
}
```

### Method 2: Using the Hook Manually

For more control, use the `useVideoImpression` hook directly:

```tsx
import { useVideoImpression } from './hooks/useVideoImpression';
import { useEffect } from 'react';

function VideoPlayer({ video, position }) {
  const { trackImpression, trackWatch } = useVideoImpression();

  useEffect(() => {
    // Track impression when component mounts
    trackImpression(video.id, position, 'personal');

    // Track watch event on unmount
    return () => {
      trackWatch(video.id, undefined, false);
    };
  }, [video.id, position]);

  return <div>...</div>;
}
```

### Method 3: Manual API Calls

For complete control, use the API client directly:

```tsx
import { logImpression, logWatchEvent } from './api/impressions';
import { getSessionId } from './utils/sessionManager';

// Log impression
const response = await logImpression({
  user_id: user.id,
  video_id: video.id,
  session_id: getSessionId(),
  position: 0,
  source: 'personal',
  model_version: 'v0'
});

console.log('Impression ID:', response.impression_id);

// Log watch event
await logWatchEvent({
  impression_id: response.impression_id,
  user_id: user.id,
  video_id: video.id,
  watch_duration: 15,
  completed: false
});
```

## Session Management

Session ID is automatically generated and stored in `sessionStorage`:

```tsx
import { getSessionId, regenerateSessionId, clearSessionId } from './utils/sessionManager';

// Get current session ID (auto-creates if not exists)
const sessionId = getSessionId();

// Force regenerate (useful for testing)
const newSessionId = regenerateSessionId();

// Clear session
clearSessionId();
```

## API Reference

### `useVideoImpression()`

React hook for tracking impressions and watch events.

**Returns:**
- `trackImpression(videoId, position, source)` - Track impression after 600ms
- `trackWatch(videoId, watchDuration?, completed)` - Track watch event
- `cancelImpression(videoId)` - Cancel pending impression
- `getImpressionId(videoId)` - Get impression ID for a video

### `VideoImpressionTracker`

Wrapper component that auto-tracks impressions using IntersectionObserver.

**Props:**
- `videoId: string` - Video UUID (required)
- `position: number` - Position in feed (required)
- `source?: 'personal' | 'trending' | 'random'` - Source type (default: 'personal')
- `threshold?: number` - Visibility threshold 0-1 (default: 0.5)
- `onImpressionLogged?: (impressionId) => void` - Callback when impression logged
- `onWatchLogged?: (duration) => void` - Callback when watch event logged
- `children: ReactNode` - Child components

## How It Works

### Impression Tracking Flow

1. **Video becomes visible** (>= 50% in viewport by default)
2. **Wait 600ms** to ensure user actually sees the video
3. **Log impression** to backend API
4. **Store impression_id** for later watch event

### Watch Event Tracking Flow

1. **Video becomes invisible** or component unmounts
2. **Calculate watch duration** from start time
3. **Log watch event** to backend API (only if visible >= 600ms)
4. **Clean up tracker** state

### Session Management

- **Session ID** is generated on first access
- Stored in `sessionStorage` (cleared on tab close)
- Regenerated on page refresh (F5)
- Used to group impressions in the same browsing session

## Testing

### Test with Browser DevTools

1. Open DevTools → Network tab
2. Filter by "impressions"
3. Scroll to a video and wait 600ms
4. Should see POST request to `/api/v1/impressions`
5. Scroll away from video
6. Should see POST request to `/api/v1/impressions/watch`

### Test Session ID

```tsx
import { getSessionId } from './utils/sessionManager';

console.log('Session ID:', getSessionId());
// Refresh page (F5)
console.log('New Session ID:', getSessionId()); // Different ID
```

### Debug Logging

All tracking events are logged to console:

```
[Session] New session created: abc-123-def-456
[Tracker] Video video-id became visible
[Impression] Logged: { videoId, impressionId, position, source }
[Tracker] Video video-id became invisible, watch: 15.2s
[Watch] Logged: { videoId, impressionId, watchDuration, completed }
```

## Integration Checklist

- [ ] Import `VideoImpressionTracker` in video feed component
- [ ] Wrap each video with the tracker component
- [ ] Pass correct `videoId`, `position`, and `source` props
- [ ] Test impression logging (wait 600ms)
- [ ] Test watch event logging (scroll away)
- [ ] Verify session ID regenerates on F5
- [ ] Check Network tab for API calls
- [ ] Verify data in database

## Notes

- **Minimum visibility**: 600ms (configurable in hook)
- **Visibility threshold**: 50% of video in viewport (configurable in component)
- **Session storage**: Cleared on tab close, not on page refresh
- **Watch duration**: Automatically calculated from visibility time
- **Completed flag**: Set to `true` only if video played to end (implement in video player)

## Next Steps

After implementing impression tracking:

1. **Test with real videos** in the feed
2. **Verify database records** in `impressions` and `view_history` tables
3. **Check metrics** using the analytics queries
4. **Implement feed v0** using impression data for anti-repeat logic
5. **Build ML training dataset** from impression + watch history
