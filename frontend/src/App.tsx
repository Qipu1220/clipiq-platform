import React, { useState, useEffect, useMemo } from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { store, RootState, AppDispatch } from './store/store';
import { restoreSessionThunk } from './store/authSlice';
import { fetchVideosThunk } from './store/videosSlice';
import { LoginPage } from './components/LoginPage';
import { MaintenanceScreen } from './components/MaintenanceScreen';
import { Header } from './components/Header';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { StaffDashboard } from './components/staff/StaffDashboard';
import { HomePage } from './components/user/HomePage';
import { TikTokStyleHome } from './components/user/TikTokStyleHome';
import { VideoPlayer } from './components/user/VideoPlayer';
import { UploadVideo } from './components/user/UploadVideo';
import { ReportUser } from './components/user/ReportUser';
import { PublicUserProfile } from './components/user/PublicUserProfile';
import { UserProfile } from './components/user/UserProfile';

function AppContent() {
  const dispatch = useDispatch<AppDispatch>();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);
  const maintenanceMode = useSelector((state: RootState) => state.auth.maintenanceMode);
  const serviceMaintenanceMode = useSelector((state: RootState) => state.system?.serviceMaintenanceMode || false);
  const loading = useSelector((state: RootState) => state.auth.loading);

  const NAV_STATE_KEY = 'appNavigationState';

  // Load navigation state from sessionStorage (defined first)
  const loadNavState = () => {
    try {
      const raw = sessionStorage.getItem(NAV_STATE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as { page: string; videoId: string | null; username: string | null };
    } catch {
      return null;
    }
  };

  // Persist navigation state to sessionStorage
  const persistNavState = (page: string, videoId: string | null, username: string | null) => {
    try {
      const payload = { page, videoId, username };
      sessionStorage.setItem(NAV_STATE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage errors
    }
  };

  // Helper function to parse URL hash
  const parseHash = () => {
    const hash = window.location.hash.substring(1); // Remove #
    const params = new URLSearchParams(hash);
    return {
      page: params.get('page') || null,
      videoId: params.get('videoId') || null,
      username: params.get('username') || null
    };
  };

  // Helper function to update URL hash
  const updateHash = (page: string, videoId: string | null = null, username: string | null = null) => {
    const params = new URLSearchParams();
    params.set('page', page);
    if (videoId) params.set('videoId', videoId);
    if (username) params.set('username', username);
    window.location.hash = params.toString();
  };

  // Get default page based on user role
  const getDefaultPage = () => {
    if (currentUser?.role === 'admin') return 'admin';
    if (currentUser?.role === 'staff') return 'staff';
    return 'home';
  };

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
      console.error('❌ [Navigation] Error in initial state:', error);
      return { page: 'home', videoId: null, username: null };
    }
  }, []); // Empty deps - only compute once on mount

  const [currentPage, setCurrentPage] = useState(initialState.page);
  const [selectedVideoId, setSelectedVideoId] = useState(initialState.videoId as string | null);
  const [selectedUsername, setSelectedUsername] = useState(initialState.username as string | null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Restore session and fetch videos on app load
  useEffect(() => {
    dispatch(restoreSessionThunk());
    // Fetch videos on app load
    console.log('🚀 Dispatching fetchVideosThunk');
    dispatch(fetchVideosThunk({})).then((result: any) => {
      console.log('✅ fetchVideosThunk result:', result);
      console.log('📊 Redux state after dispatch:', store.getState().videos);
    }).catch((error: any) => {
      console.error('❌ fetchVideosThunk error:', error);
    });
  }, [dispatch]);

  // Refetch videos when user logs in to ensure like status is correct
  useEffect(() => {
    if (isAuthenticated) {
      console.log('🔄 User authenticated, refetching videos to update like status');
      dispatch(fetchVideosThunk({}));
    }
  }, [isAuthenticated, dispatch]);

  // Restore page state from URL hash when authenticated and user info is available
  useEffect(() => {
    if (isAuthenticated && currentUser && !isInitialized) {
      console.log('🔧 [Navigation] Restoring page state - isAuthenticated:', isAuthenticated, 'currentUser:', currentUser?.role);
      const hashParams = parseHash();
      const defaultPage = getDefaultPage();
      const stored = loadNavState();
      
      console.log('🔍 [Navigation] Hash params:', hashParams, 'Stored:', stored, 'Default:', defaultPage);
      
      if (hashParams.page) {
        // Restore from URL hash
        console.log('✅ [Navigation] Restoring from hash:', hashParams);
        setCurrentPage(hashParams.page);
        if (hashParams.videoId) setSelectedVideoId(hashParams.videoId);
        if (hashParams.username) setSelectedUsername(hashParams.username);
        persistNavState(hashParams.page, hashParams.videoId, hashParams.username);
      } else if (stored?.page) {
        // Fallback to session storage
        console.log('✅ [Navigation] Restoring from sessionStorage:', stored);
        setCurrentPage(stored.page);
        if (stored.videoId) setSelectedVideoId(stored.videoId);
        if (stored.username) setSelectedUsername(stored.username);
        updateHash(stored.page, stored.videoId, stored.username);
      } else {
        // No hash, set default page and update URL
        console.log('⚠️ [Navigation] No saved state, using default page:', defaultPage);
        setCurrentPage(defaultPage);
        updateHash(defaultPage);
        persistNavState(defaultPage, null, null);
      }
      setIsInitialized(true);
      console.log('✅ [Navigation] Navigation initialized');
    }
  }, [isAuthenticated, currentUser, isInitialized]);

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
  }, [isAuthenticated, currentUser, isInitialized]);

  // Show loading screen while checking session
  if (loading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Đang tải...</div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Show maintenance screen based on maintenance mode type
  // System maintenance: only admin can access
  // Service maintenance: admin and staff can access, regular users cannot
  if (maintenanceMode && currentUser?.role !== 'admin') {
    return <MaintenanceScreen />;
  }
  
  // Check service maintenance mode (from dashboard stats, will be loaded from API)
  // If service maintenance is enabled and user is regular user, show maintenance screen
  // Note: serviceMaintenanceMode will be synced from API response in AdminDashboard
  if (serviceMaintenanceMode && currentUser?.role === 'user') {
    return <MaintenanceScreen />;
  }

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    setSelectedVideoId(null);
    setSelectedUsername(null);
    updateHash(page);
    persistNavState(page, null, null);
  };

  const handleVideoClick = (videoId: string) => {
    setSelectedVideoId(videoId);
    setCurrentPage('video-player');
    updateHash('video-player', videoId, null);
    persistNavState('video-player', videoId, null);
  };

  const handleUploadComplete = () => {
    const defaultPage = getDefaultPage();
    setCurrentPage(defaultPage);
    updateHash(defaultPage);
    persistNavState(defaultPage, null, null);
  };

  const handleViewUserProfile = (username: string) => {
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
  };

  const renderPage = () => {
    console.log('📄 [Navigation] Rendering page - currentPage:', currentPage, 'role:', currentUser?.role, 'videoId:', selectedVideoId, 'username:', selectedUsername);
    
    // If user is not loaded yet, show loading
    if (!currentUser) {
      console.log('⏳ [Navigation] Waiting for user data...');
      return (
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-white text-xl">Đang tải...</div>
        </div>
      );
    }
    
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
    if (currentUser.role === 'staff') {
      if (currentPage === 'staff') {
        return <StaffDashboard onVideoClick={handleVideoClick} onViewUserProfile={handleViewUserProfile} />;
      }
      if (currentPage === 'video-player' && selectedVideoId) {
        return <VideoPlayer videoId={selectedVideoId} onBack={() => handleNavigate('staff')} onViewUserProfile={handleViewUserProfile} />;
      }
      if (currentPage === 'view-user-profile' && selectedUsername) {
        return <PublicUserProfile username={selectedUsername} onVideoClick={handleVideoClick} onBack={() => handleNavigate('staff')} />;
      }
      return <StaffDashboard onVideoClick={handleVideoClick} onViewUserProfile={handleViewUserProfile} />;
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
    console.warn('⚠️ [Navigation] Unknown user role:', currentUser.role);
    return <TikTokStyleHome onViewUserProfile={handleViewUserProfile} onNavigate={handleNavigate} />;
  };

  return (
    <div className="h-screen bg-black overflow-hidden">
      {/* Header is now completely hidden - all roles have their own navigation */}
      {renderPage()}
    </div>
  );
}

export default function App() {
  return (
    <Provider store={store} children={<AppContent />} />
  );
}