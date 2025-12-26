import { useState, useEffect } from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { store, RootState, AppDispatch } from './store/store';
import { restoreSessionThunk, getCurrentUserThunk } from './store/authSlice';
import { fetchVideosThunk } from './store/videosSlice';
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
  const maintenanceMode = useSelector((state: RootState) => state.auth.maintenanceMode);
  const loading = useSelector((state: RootState) => state.auth.loading);

  const [currentPage, setCurrentPage] = useState('home');
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  const [previousTab, setPreviousTab] = useState<string>('dashboard');

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
      dispatch(fetchVideosThunk());
      // Also refresh user data immediately after login to ensure warnings are shown
      dispatch(getCurrentUserThunk());
    }
  }, [isAuthenticated, dispatch]);

  // Periodically refresh user data to get updated warnings, ban status, etc.
  useEffect(() => {
    if (!isAuthenticated) return;

    // Refresh user data every 30 seconds
    const intervalId = setInterval(() => {
      dispatch(getCurrentUserThunk());
    }, 30000); // 30 seconds

    return () => clearInterval(intervalId);
  }, [isAuthenticated, dispatch]);

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

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    setSelectedVideoId(null);
    setSelectedUsername(null);
  };

  const handleVideoClick = (videoId: string, fromTab?: string) => {
    setSelectedVideoId(videoId);
    setCurrentPage('video-player');
    if (fromTab) {
      setPreviousTab(fromTab);
    }
  };

  const handleUploadComplete = () => {
    setCurrentPage('home');
  };

  const handleViewUserProfile = (username: string, fromTab?: string) => {
    setSelectedUsername(username);
    // Remember which tab is viewing the profile
    if (fromTab && currentUser?.role === 'staff') {
      setPreviousTab(fromTab);
    }
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
        return <UserProfile onVideoClick={() => setCurrentPage('home')} onNavigateHome={() => handleNavigate('home')} onNavigateUpload={() => handleNavigate('upload')} />;
      }
      // Use TikTok-style layout for home page
      return <TikTokStyleHome onViewUserProfile={handleViewUserProfile} onNavigate={handleNavigate} />;
    }

    if (currentPage === 'profile') {
      return <UserProfile onVideoClick={() => setCurrentPage('home')} onNavigateHome={() => handleNavigate('home')} onNavigateUpload={() => handleNavigate('upload')} />;
    }

    return <TikTokStyleHome onViewUserProfile={handleViewUserProfile} onNavigate={handleNavigate} />;
  };

  return (
    <div className="h-screen bg-black overflow-hidden">
      {/* Header is now completely hidden - all roles have their own navigation */}
      {renderPage()}
      
      {/* Warning banner for users with warnings (only show for regular users, not staff/admin) */}
      {currentUser?.role === 'user' && currentUser?.warnings > 0 && (
        <WarningBanner warnings={currentUser.warnings} username={currentUser.username} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}