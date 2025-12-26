import { ReactNode, useState } from 'react';
import { Home, Flag, MessageSquare, Users } from 'lucide-react';
import { Sidebar, SidebarItem, SidebarDivider } from '../common/Sidebar';
import { UserMenu } from '../common/UserMenu';

interface StaffLayoutProps {
  children: ReactNode;
  activeTab: 'dashboard' | 'video-reports' | 'user-reports' | 'comment-reports' | 'user-management' | 'profile';
  onTabChange: (tab: 'dashboard' | 'video-reports' | 'user-reports' | 'comment-reports' | 'user-management' | 'profile') => void;
  pendingVideoReports: number;
  pendingUserReports: number;
  pendingCommentReports: number;
}

export function StaffLayout({ 
  children, 
  activeTab, 
  onTabChange,
  pendingVideoReports,
  pendingUserReports,
  pendingCommentReports
}: StaffLayoutProps) {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="h-screen bg-black flex overflow-hidden">
      {/* Left Sidebar - Using shared Sidebar component */}
      <Sidebar 
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        variant="staff"
      >
        <SidebarItem
          icon={<Home className="w-5 h-5" />}
          label="Dashboard"
          active={activeTab === 'dashboard'}
          onClick={() => onTabChange('dashboard')}
        />
        
        <SidebarItem
          icon={<Flag className="w-5 h-5" />}
          label="Báo cáo Video"
          active={activeTab === 'video-reports'}
          onClick={() => onTabChange('video-reports')}
          badge={pendingVideoReports}
        />
        
        <SidebarItem
          icon={<Users className="w-5 h-5" />}
          label="Báo cáo User"
          active={activeTab === 'user-reports'}
          onClick={() => onTabChange('user-reports')}
          badge={pendingUserReports}
        />
        
        <SidebarItem
          icon={<MessageSquare className="w-5 h-5" />}
          label="Báo cáo Bình luận"
          active={activeTab === 'comment-reports'}
          onClick={() => onTabChange('comment-reports')}
          badge={pendingCommentReports}
        />
        
        <SidebarDivider />
        
        <SidebarItem
          icon={<Users className="w-5 h-5" />}
          label="Quản lý User"
          active={activeTab === 'user-management'}
          onClick={() => onTabChange('user-management')}
        />
      </Sidebar>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-black relative overflow-hidden">
        {/* Top Bar with UserMenu */}
        <div className="p-4 border-b border-zinc-900/50 flex justify-between items-center bg-black relative z-40 flex-shrink-0">
          <div>
            <h2 className="text-white text-xl font-medium">
              {activeTab === 'dashboard' && 'Dashboard'}
              {activeTab === 'video-reports' && 'Báo cáo Video'}
              {activeTab === 'user-reports' && 'Báo cáo User'}
              {activeTab === 'comment-reports' && 'Báo cáo Bình luận'}
              {activeTab === 'user-management' && 'Quản lý User'}
              {activeTab === 'profile' && 'Hồ sơ'}
            </h2>
          </div>

          <UserMenu 
            variant="staff" 
            onProfileClick={() => onTabChange('profile')}
          />
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
