import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { store, RootState, AppDispatch } from './store/store';
import { restoreSessionThunk, getCurrentUserThunk } from './store/authSlice';
import { setMaintenanceMode, setServiceMaintenanceMode } from './store/systemSlice';
import { fetchVideosThunk } from './store/videosSlice';
import { getSystemStatusApi } from './api/auth';
import { LoginPage } from './components/LoginPage';
import { MaintenanceScreen } from './components/MaintenanceScreen';
import { BannedModal } from './components/BannedModal';
import { WarningBanner } from './components/WarningBanner';
import { Header } from './components/Header';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { StaffDashboard } from './components/staff/StaffDashboard';
import { VideoReportReview } from './components/staff/VideoReportReview';
import { HomePage } from './components/user/HomePage';
import { TikTokStyleHome } from './components/user/TikTokStyleHome';
import { VideoPlayer } from './components/user/VideoPlayer';
import { UploadVideo } from './components/user/UploadVideo';
import { ReportUser } from './components/user/ReportUser';
import { PublicUserProfile } from './components/user/PublicUserProfile';
import { UserProfile } from './components/user/UserProfile';
import { banUserApi, warnUserApi } from './api/admin';
import { toast } from 'sonner';

function AppContent() {
  const dispatch = useDispatch<AppDispatch>();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);
  const maintenanceMode = useSelector((state: RootState) => state.system?.maintenanceMode || false);
  const serviceMaintenanceMode = useSelector((state: RootState) => state.system?.serviceMaintenanceMode || false);
  const isStatusLoaded = useSelector((state: RootState) => state.system?.isStatusLoaded || false);
  const loading = useSelector((state: RootState) => state.auth.loading);

  const NAV_STATE_KEY = 'appNavigationState';

  // Helper functions - memoized to avoid re-creating on every render
  const loadNavState = useCallback(() => {
    try {
      const raw = sessionStorage.getItem(NAV_STATE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as { page: string; videoId: string | null; username: string | null };
    } catch {
      return null;
    }
  }, []);

  const persistNavState = useCallback((page: string, videoId: string | null, username: string | null) => {
    try {
      const payload = { page, videoId, username };
      sessionStorage.setItem(NAV_STATE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const parseHash = useCallback(() => {
    const hash = window.location.hash.substring(1); // Remove #
    const params = new URLSearchParams(hash);
    return {
      page: params.get('page') || null,
      videoId: params.get('videoId') || null,
      username: params.get('username') || null
    };
  }, []);

  const updateHash = useCallback((page: string, videoId: string | null = null, username: string | null = null) => {
    const params = new URLSearchParams();
    params.set('page', page);
    if (videoId) params.set('videoId', videoId);
    if (username) params.set('username', username);
    window.location.hash = params.toString();
  }, []);

  const getDefaultPage = useCallback(() => {
    if (currentUser?.role === 'admin') return 'admin';
    if (currentUser?.role === 'staff') return 'staff';
    return 'home';
  }, [currentUser?.role]);

  // Init state from hash first, then sessionStorage, fallback to home
  // Compute initial state once using useMemo
  const initialState = useMemo(() => {
    try {
      const hashParams = parseHash();
      if (hashParams.page) {
        return {
          page: hashParams.page,
          videoId: hashParams.videoId,
          username: hashParams.username,
        };
      }
      const stored = loadNavState();
      if (stored?.page) {
        return {
          page: stored.page,
          videoId: stored.videoId,
          username: stored.username,
        };
      }
      return { page: 'home', videoId: null, username: null };
    } catch (error) {
      console.error('Γ¥î [Navigation] Error in initial state:', error);
      return { page: 'home', videoId: null, username: null };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only compute once on mount

  const [currentPage, setCurrentPage] = useState(initialState.page);
  const [selectedVideoId, setSelectedVideoId] = useState(initialState.videoId as string | null);
  const [selectedUsername, setSelectedUsername] = useState(initialState.username as string | null);
  const [previousTab, setPreviousTab] = useState<string | undefined>(undefined);
  const [isInitialized, setIsInitialized] = useState(false);

  // Restore session and fetch videos on app load
  useEffect(() => {
    dispatch(restoreSessionThunk());
    
    // Check maintenance mode status
    getSystemStatusApi()
      .then(response => {
        dispatch(setMaintenanceMode(response.data.maintenanceMode));
        dispatch(setServiceMaintenanceMode(response.data.serviceMaintenanceMode));
      })
      .catch(error => {
        console.error('Failed to fetch system status:', error);
      });
    
    // Fetch videos on app load
    console.log('≡ƒÜÇ Dispatching fetchVideosThunk');
    dispatch(fetchVideosThunk({})).then((result: any) => {
      console.log('Γ£à fetchVideosThunk result:', result);
      console.log('≡ƒôè Redux state after dispatch:', store.getState().videos);
    }).catch((error: any) => {
      console.error('Γ¥î fetchVideosThunk error:', error);
    });
  }, [dispatch]);

  // Refetch videos when user logs in to ensure like status is correct
  useEffect(() => {
    if (isAuthenticated) {
      console.log('≡ƒöä User authenticated, refetching videos to update like status');
      dispatch(fetchVideosThunk({}));
      // Also refresh user data immediately after login to ensure warnings are shown
      dispatch(getCurrentUserThunk());
    }
  }, [isAuthenticated, dispatch]);

  // Periodically refresh user data to get updated warnings, ban status, etc.
  useEffect(() => {
    if (!isAuthenticated) return;

    // Refresh user data every 30 seconds, but skip when modal is open to prevent interference
    const intervalId = setInterval(() => {
      // Check if any modal is open before refreshing
      if (!document.querySelector('[data-modal-open="true"]')) {
        dispatch(getCurrentUserThunk());
      }
    }, 30000); // 30 seconds

    return () => clearInterval(intervalId);
  }, [isAuthenticated, dispatch]);

  // Restore page state from URL hash when authenticated and user info is available
  useEffect(() => {
    if (isAuthenticated && currentUser && !isInitialized) {
      console.log('≡ƒöº [Navigation] Restoring page state - isAuthenticated:', isAuthenticated, 'currentUser:', currentUser?.role);
      const hashParams = parseHash();
      const defaultPage = getDefaultPage();
      const stored = loadNavState();
      
      console.log('≡ƒöì [Navigation] Hash params:', hashParams, 'Stored:', stored, 'Default:', defaultPage);
      
      if (hashParams.page) {
        // Restore from URL hash
        console.log('Γ£à [Navigation] Restoring from hash:', hashParams);
        setCurrentPage(hashParams.page);
        if (hashParams.videoId) setSelectedVideoId(hashParams.videoId);
        if (hashParams.username) setSelectedUsername(hashParams.username);
        persistNavState(hashParams.page, hashParams.videoId, hashParams.username);
      } else if (stored?.page) {
        // Fallback to session storage
        console.log('Γ£à [Navigation] Restoring from sessionStorage:', stored);
        setCurrentPage(stored.page);
        if (stored.videoId) setSelectedVideoId(stored.videoId);
        if (stored.username) setSelectedUsername(stored.username);
        updateHash(stored.page, stored.videoId, stored.username);
      } else {
        // No hash, set default page and update URL
        console.log('ΓÜá∩╕Å [Navigation] No saved state, using default page:', defaultPage);
        setCurrentPage(defaultPage);
        updateHash(defaultPage);
        persistNavState(defaultPage, null, null);
      }
      setIsInitialized(true);
      console.log('Γ£à [Navigation] Navigation initialized');
    }
  }, [isAuthenticated, currentUser, isInitialized, parseHash, getDefaultPage, loadNavState, updateHash, persistNavState]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handleHashChange = () => {
      if (isAuthenticated && currentUser && isInitialized) {
        const hashParams = parseHash();
        if (hashParams.page) {
          setCurrentPage(hashParams.page);
          setSelectedVideoId(hashParams.videoId);
          setSelectedUsername(hashParams.username);
          persistNavState(hashParams.page, hashParams.videoId, hashParams.username);
        } else {
          // No hash: fallback to stored nav or default, but do not push new history entry
          const stored = loadNavState();
          if (stored?.page) {
            setCurrentPage(stored.page);
            setSelectedVideoId(stored.videoId);
            setSelectedUsername(stored.username);
          } else {
            const defaultPage = getDefaultPage();
            setCurrentPage(defaultPage);
            setSelectedVideoId(null);
            setSelectedUsername(null);
          }
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isAuthenticated, currentUser, isInitialized, parseHash, persistNavState, loadNavState, getDefaultPage]);

  // Define all handlers BEFORE any early returns - REQUIRED by Rules of Hooks!
  const handleNavigate = useCallback((page: string) => {
    setCurrentPage(page);
    setSelectedVideoId(null);
    setSelectedUsername(null);
    updateHash(page);
    persistNavState(page, null, null);
  }, [updateHash, persistNavState]);

  const handleVideoClick = useCallback((videoId: string) => {
    setSelectedVideoId(videoId);
    setCurrentPage('video-player');
    updateHash('video-player', videoId, null);
    persistNavState('video-player', videoId, null);
  }, [updateHash, persistNavState]);

  const handleUploadComplete = useCallback(() => {
    const defaultPage = getDefaultPage();
    setCurrentPage(defaultPage);
    updateHash(defaultPage);
    persistNavState(defaultPage, null, null);
  }, [getDefaultPage, updateHash, persistNavState]);

  const handleViewUserProfile = useCallback((username: string) => {
    setSelectedUsername(username);
    // If viewing own profile, go to profile page, otherwise go to public profile page
    if (username === currentUser?.username) {
      setCurrentPage('profile');
      updateHash('profile', null, null);
      persistNavState('profile', null, null);
    } else {
      setCurrentPage('view-user-profile');
      updateHash('view-user-profile', null, username);
      persistNavState('view-user-profile', null, username);
    }
  }, [currentUser?.username, updateHash, persistNavState]);

  // Show loading screen while checking session or system status
  // MUST wait for status to be loaded before showing anything
  if (loading || !isStatusLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Đang tải...</div>
      </div>
    );
  }

  // Show login page if not authenticated
  // Allow everyone to see login page, even during maintenance
  // Admin needs to login first to bypass maintenance mode
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // After login, check maintenance mode based on user role
  // System maintenance: only admin can access
  if (maintenanceMode && currentUser?.role !== 'admin') {
    return <MaintenanceScreen />;
  }
  
  // Check service maintenance mode
  // Service maintenance: admin and staff can access, regular users cannot
  if (serviceMaintenanceMode && currentUser?.role === 'user') {
    return <MaintenanceScreen />;
  }

  // Show banned modal if user is banned (staff and admin bypass this)
  if (currentUser?.banned && currentUser?.role === 'user') {
    const isBanActive = !currentUser.banExpiry || new Date(currentUser.banExpiry) > new Date();
    
    if (isBanActive) {
      return (
        <BannedModal
          banReason={currentUser.banReason}
          banExpiry={currentUser.banExpiry}
          isPermanent={!currentUser.banExpiry}
        />
      );
    }
  }

  // Show maintenance screen for non-admin users when maintenance is active
  if (maintenanceMode && currentUser?.role !== 'admin') {
    return <MaintenanceScreen />;
  }

  const handleBanUser = async (userId: string, username: string, reason: string) => {
    try {
      await banUserApi(userId, reason || '');
      toast.success(`Đã cấm người dùng ${username}`);
      // @ts-ignore
      dispatch(getCurrentUserThunk());
    } catch (error) {
      toast.error('Không thể cấm người dùng');
    }
  };

  const handleWarnUser = async (userId: string, username: string, reason: string) => {
    try {
      await warnUserApi(userId, reason || '');
      toast.success(`Đã cảnh báo người dùng ${username}`);
      // @ts-ignore
      dispatch(getCurrentUserThunk());
    } catch (error) {
      toast.error('Không thể cảnh báo người dùng');
    }
  };

  const renderPage = () => {
    // Admin routes
    if (currentUser.role === 'admin') {
      if (currentPage === 'admin' || currentPage === 'profile') {
        return <AdminDashboard onVideoClick={handleVideoClick} onViewUserProfile={handleViewUserProfile} />;
      }
      if (currentPage === 'video-player' && selectedVideoId) {
        return <VideoPlayer videoId={selectedVideoId} onBack={() => handleNavigate('admin')} onViewUserProfile={handleViewUserProfile} />;
      }
      if (currentPage === 'view-user-profile' && selectedUsername) {
        return <PublicUserProfile username={selectedUsername} onVideoClick={handleVideoClick} onBack={() => handleNavigate('admin')} />;
      }
      return <AdminDashboard onVideoClick={handleVideoClick} onViewUserProfile={handleViewUserProfile} />;
    }

    // Staff routes
    if (currentUser?.role === 'staff') {
      if (currentPage === 'video-report-review' && selectedVideoId) {
        return (
          <VideoReportReview
            videoId={selectedVideoId}
            onBack={() => {
              setCurrentPage('staff');
              // Keep previousTab as is - it was set when opening VideoReportReview
              setSelectedVideoId(null);
            }}
          />
        );
      }
      if (currentPage === 'video-player' && selectedVideoId) {
        return <VideoPlayer videoId={selectedVideoId} onBack={() => {
          setCurrentPage('staff');
          setPreviousTab('video-reports');
          setSelectedVideoId(null);
        }} onViewUserProfile={handleViewUserProfile} returnTab={previousTab} isStaffReview={true} />;
      }
      if (currentPage === 'view-user-profile' && selectedUsername) {
        return <PublicUserProfile 
          username={selectedUsername} 
          onVideoClick={(videoId) => {
            setSelectedVideoId(videoId);
            setCurrentPage('video-report-review');
            // previousTab is already set from handleViewUserProfile
          }} 
          onBack={() => {
            setCurrentPage('staff');
            // Keep previousTab as is - it was set when viewing profile
          }}
          isStaffView={true}
          onBanUser={handleBanUser}
          onWarnUser={handleWarnUser}
        />;
      }
      return <StaffDashboard 
        onVideoClick={handleVideoClick} 
        onViewUserProfile={handleViewUserProfile} 
        initialTab={previousTab}
        onReviewVideoReport={(videoId) => {
          setSelectedVideoId(videoId);
          setCurrentPage('video-report-review');
          setPreviousTab('video-reports');
        }}
      />;
    }

    // User routes
    if (currentUser.role === 'user') {
      if (currentPage === 'upload') {
        return <UploadVideo onUploadComplete={handleUploadComplete} />;
      }
      if (currentPage === 'report-user') {
        return <ReportUser />;
      }
      if (currentPage === 'video-player' && selectedVideoId) {
        return <VideoPlayer videoId={selectedVideoId} onBack={() => handleNavigate('home')} onViewUserProfile={handleViewUserProfile} />;
      }
      if (currentPage === 'view-user-profile' && selectedUsername) {
        return <PublicUserProfile username={selectedUsername} onVideoClick={() => handleNavigate('home')} onBack={() => handleNavigate('home')} />;
      }
      if (currentPage === 'profile') {
        return <UserProfile onVideoClick={() => handleNavigate('home')} onNavigateHome={() => handleNavigate('home')} onNavigateUpload={() => handleNavigate('upload')} />;
      }
      // Use TikTok-style layout for home page
      return <TikTokStyleHome onViewUserProfile={handleViewUserProfile} onNavigate={handleNavigate} />;
    }

    // Fallback for unknown role
    console.warn('ΓÜá∩╕Å [Navigation] Unknown user role:', currentUser.role);
    return <TikTokStyleHome onViewUserProfile={handleViewUserProfile} onNavigate={handleNavigate} />;
  };

  return (
    <div className="h-screen bg-black overflow-hidden">
      {/* Header is now completely hidden - all roles have their own navigation */}
      {renderPage()}
      
      {/* Warning banner for users with warnings (only show for regular users, not staff/admin) */}
      <WarningBanner 
        warnings={currentUser?.warnings || 0} 
        username={currentUser?.username || ''} 
        userRole={currentUser?.role || 'user'}
      />
    </div>
  );
}

export default function App() {
  return (
    <Provider store={store} children={<AppContent />} />
  );
}
