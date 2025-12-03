import { useState } from 'react';
import { Provider, useSelector } from 'react-redux';
import { store, RootState } from './store/store';
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
import { UserProfile } from './components/user/UserProfile';
import { PublicUserProfile } from './components/user/PublicUserProfile';
import { Toaster } from 'sonner@2.0.3';

function AppContent() {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);
  const maintenanceMode = useSelector((state: RootState) => state.auth.maintenanceMode);

  const [currentPage, setCurrentPage] = useState('home');
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Show maintenance screen for non-admin users when maintenance is active
  if (maintenanceMode && currentUser?.role !== 'admin') {
    return <MaintenanceScreen />;
  }

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    setSelectedVideoId(null);
    setSelectedUsername(null);
  };

  const handleVideoClick = (videoId: string) => {
    setSelectedVideoId(videoId);
    setCurrentPage('video-player');
  };

  const handleUploadComplete = () => {
    setCurrentPage('home');
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
      if (currentPage === 'profile') {
        return <UserProfile onVideoClick={handleVideoClick} onNavigateHome={() => handleNavigate('home')} onNavigateUpload={() => handleNavigate('upload')} />;
      }
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
        return <PublicUserProfile username={selectedUsername} onVideoClick={handleVideoClick} onBack={() => handleNavigate('home')} />;
      }
      // Use TikTok-style layout for home page
      return <TikTokStyleHome onViewUserProfile={handleViewUserProfile} onNavigate={handleNavigate} />;
    }

    return <TikTokStyleHome onViewUserProfile={handleViewUserProfile} />;
  };

  return (
    <div className="h-screen bg-black overflow-hidden">
      {/* Header is now completely hidden - all roles have their own navigation */}
      {renderPage()}
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#18181b',
            border: '1px solid #27272a',
            color: '#fff',
          },
          className: 'toast-custom',
          duration: 5000,
        }}
        theme="dark"
        richColors
        expand={true}
        visibleToasts={5}
        style={{ zIndex: 999999 }}
      />
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