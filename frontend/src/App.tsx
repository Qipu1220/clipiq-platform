import { useState, useEffect } from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { store, RootState, AppDispatch } from './store/store';
import { restoreSessionThunk } from './store/authSlice';
import { fetchVideosThunk } from './store/videosSlice';
import { isSignInWithEmailLink } from 'firebase/auth';
import { auth } from './config/firebase';
import { Toaster } from 'sonner';
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
import { EmailSignInCallback } from './components/auth/EmailSignInCallback';

function AppContent() {
  const dispatch = useDispatch<AppDispatch>();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);
  const maintenanceMode = useSelector((state: RootState) => state.auth.maintenanceMode);
  const loading = useSelector((state: RootState) => state.auth.loading);

  const [currentPage, setCurrentPage] = useState('home');
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  const [intendedVideoId, setIntendedVideoId] = useState<string | null>(null);
  const [homeTab, setHomeTab] = useState<'for-you' | 'following'>('for-you');
  const [showExplorer, setShowExplorer] = useState(false);
  const [isEmailSignInCallback, setIsEmailSignInCallback] = useState(() => {
    // Check sessionStorage for pending password setup (persists across re-renders)
    if (window.sessionStorage.getItem('emailLinkNeedPasswordSetup') === 'true') {
      return true;
    }
    return false;
  });

  // Check if current URL is email sign-in callback
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/auth/email-signin' && isSignInWithEmailLink(auth, window.location.href)) {
      setIsEmailSignInCallback(true);
    }
  }, []);

  // Check URL for video ID on app load (for shared links)
  useEffect(() => {
    const path = window.location.pathname;
    const videoMatch = path.match(/\/video\/([a-zA-Z0-9-]+)/);
    
    if (videoMatch && videoMatch[1]) {
      const videoId = videoMatch[1];
      console.log('🔗 Detected video ID from URL:', videoId);
      
      // If not authenticated, save for after login
      if (!isAuthenticated) {
        setIntendedVideoId(videoId);
        console.log('💾 Saved intended video ID for after login');
      } else {
        // If already authenticated, navigate to video immediately
        setSelectedVideoId(videoId);
        setCurrentPage('video-player');
      }
      
      // Clean URL without reload
      window.history.replaceState({}, '', '/');
    }
  }, [isAuthenticated]);

  // Restore session and fetch videos on app load
  useEffect(() => {
    dispatch(restoreSessionThunk());
    // Fetch videos on app load
    console.log('🚀 Dispatching fetchVideosThunk');
    dispatch(fetchVideosThunk()).then((result: any) => {
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
      dispatch(fetchVideosThunk());
      
      // If there was an intended video from shared link, navigate to it
      if (intendedVideoId) {
        console.log('🎯 Navigating to intended video:', intendedVideoId);
        setSelectedVideoId(intendedVideoId);
        setCurrentPage('video-player');
        setIntendedVideoId(null); // Clear after use
      }
    }
  }, [isAuthenticated, dispatch, intendedVideoId]);

  // Show loading screen while checking session
  if (loading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Đang tải...</div>
      </div>
    );
  }

  // Handle email sign-in callback
  if (isEmailSignInCallback) {
    return (
      <EmailSignInCallback 
        onComplete={() => {
          setIsEmailSignInCallback(false);
          window.history.replaceState({}, document.title, '/');
        }} 
      />
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Show maintenance screen for non-admin users when maintenance is active
  if (maintenanceMode && currentUser?.role !== 'admin') {
    return <MaintenanceScreen />;
  }

  const handleNavigate = (page: string, tab?: 'for-you' | 'following') => {
    // Handle explorer navigation
    if (page === 'explorer') {
      setCurrentPage('home');
      setShowExplorer(true);
      setSelectedVideoId(null);
      setSelectedUsername(null);
      return;
    }
    // Handle home-following navigation
    if (page === 'home-following') {
      setCurrentPage('home');
      setHomeTab('following');
      setShowExplorer(false);
    } else if (page === 'home') {
      setCurrentPage('home');
      setHomeTab(tab || 'for-you');
      setShowExplorer(false);
    } else {
      setCurrentPage(page);
      setShowExplorer(false);
    }
    setSelectedVideoId(null);
    setSelectedUsername(null);
  };

  const handleVideoClick = (videoId: string) => {
    setSelectedVideoId(videoId);
    setCurrentPage('video-player');
  };

  const handleUploadComplete = () => {
    setCurrentPage('profile');
  };

  const handleViewUserProfile = (username: string) => {
    setSelectedUsername(username);
    // If viewing own profile, go to profile page, otherwise go to public profile page
    if (username === currentUser?.username) {
      setCurrentPage('profile');
    } else {
      setCurrentPage('view-user-profile');
    }
  };

  const renderPage = () => {
    // Admin routes
    if (currentUser?.role === 'admin') {
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
    if (currentUser?.role === 'user') {
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
        return <PublicUserProfile username={selectedUsername} onVideoClick={() => setCurrentPage('home')} onBack={() => handleNavigate('home')} />;
      }
      if (currentPage === 'profile') {
        return <UserProfile onVideoClick={() => setCurrentPage('home')} onNavigateHome={() => handleNavigate('home')} onNavigateUpload={() => handleNavigate('upload')} onViewUserProfile={handleViewUserProfile} onNavigate={handleNavigate} />;
      }
      // Use TikTok-style layout for home page
      return <TikTokStyleHome onViewUserProfile={handleViewUserProfile} onNavigate={handleNavigate} initialTab={homeTab} onTabChange={setHomeTab} initialShowExplorer={showExplorer} onExplorerChange={setShowExplorer} />;
    }

    if (currentPage === 'profile') {
      return <UserProfile onVideoClick={() => setCurrentPage('home')} onNavigateHome={() => handleNavigate('home')} onNavigateUpload={() => handleNavigate('upload')} onViewUserProfile={handleViewUserProfile} onNavigate={handleNavigate} />;
    }

    return <TikTokStyleHome onViewUserProfile={handleViewUserProfile} onNavigate={handleNavigate} initialTab={homeTab} onTabChange={setHomeTab} initialShowExplorer={showExplorer} onExplorerChange={setShowExplorer} />;
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
    <Provider store={store}>
      <AppContent />
      <Toaster
        position="top-right"
        theme="dark"
        richColors
        expand={false}
        closeButton
      />
    </Provider>
  );
}