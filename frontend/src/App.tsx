import { useState } from 'react';
import { Provider, useSelector } from 'react-redux';
import { store, RootState } from './store/store';
import { LoginPage } from './components/LoginPage';
import { MaintenanceScreen } from './components/MaintenanceScreen';
import { Header } from './components/Header';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { StaffDashboard } from './components/staff/StaffDashboard';
import { HomePage } from './components/user/HomePage';
import { VideoPlayer } from './components/user/VideoPlayer';
import { UploadVideo } from './components/user/UploadVideo';
import { ReportUser } from './components/user/ReportUser';
import { UserProfile } from './components/user/UserProfile';
import { PublicUserProfile } from './components/user/PublicUserProfile';

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
    setCurrentPage('view-user-profile');
  };

  const renderPage = () => {
    // Admin routes
    if (currentUser?.role === 'admin') {
      if (currentPage === 'admin') {
        return <AdminDashboard />;
      }
      return <AdminDashboard />;
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
        return <UserProfile onVideoClick={handleVideoClick} />;
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
      return <HomePage onVideoClick={handleVideoClick} />;
    }

    return <HomePage onVideoClick={handleVideoClick} />;
  };

  return (
    <div className="min-h-screen bg-black">
      <Header onNavigate={handleNavigate} currentPage={currentPage} />
      {renderPage()}
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