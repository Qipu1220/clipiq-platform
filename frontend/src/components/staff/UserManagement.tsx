import { useState } from 'react';
import { AlertTriangle, CheckCircle, Eye, Search, UserX, Users, Video } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import { fetchAllUsersApi, unbanUserApi, clearWarningsApi } from '../../api/admin';

interface UserManagementProps {
  displayUsers: Array<{
    id: string;
    username: string;
    displayName?: string;
    role: string;
    banned: boolean;
    banReason?: string;
    banExpiry?: string;
    warnings: number;
  }>;
  videos: Array<{ id: string; uploaderUsername: string }>;
  onViewUserProfile: (username: string) => void;
  onBanUser: (username: string) => void;
  onWarnUser: (username: string) => void;
  setShowConfirmModal: (show: boolean) => void;
  setConfirmAction: (action: any) => void;
  setApiUsers: (users: any[]) => void;
}

export function UserManagement({
  displayUsers,
  videos,
  onViewUserProfile,
  onBanUser,
  onWarnUser,
  setShowConfirmModal,
  setConfirmAction,
  setApiUsers
}: UserManagementProps) {
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'' | 'banned' | 'warned'>('');

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
            </div>
            <div className="text-2xl text-white font-medium mb-1">{displayUsers.filter(u => u.role === 'user').length}</div>
            <div className="text-sm text-zinc-500">Tổng users</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <UserX className="w-5 h-5 text-red-500" />
              </div>
            </div>
            <div className="text-2xl text-white font-medium mb-1">{displayUsers.filter(u => u.banned).length}</div>
            <div className="text-sm text-zinc-500">Đang bị cấm</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              </div>
            </div>
            <div className="text-2xl text-white font-medium mb-1">{displayUsers.filter(u => u.warnings > 0 && !u.banned).length}</div>
            <div className="text-sm text-zinc-500">Có cảnh báo</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
            </div>
            <div className="text-2xl text-white font-medium mb-1">{displayUsers.filter(u => !u.banned && u.warnings === 0 && u.role === 'user').length}</div>
            <div className="text-sm text-zinc-500">Tình trạng tốt</div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
        <Input
          value={userSearchQuery}
          onChange={(e) => setUserSearchQuery(e.target.value)}
          className="bg-zinc-900/50 border-zinc-800/50 text-white pl-13 pr-4 h-12 rounded-lg focus:border-[#ff3b5c]"
          placeholder="Tìm kiếm theo username hoặc display name..."
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <Button
          onClick={() => setFilterTab('')}
          className={`h-10 px-6 rounded-lg transition-colors ${
            filterTab === ''
              ? 'bg-[#ff3b5c] text-white'
              : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4 mr-2" />
          Tất cả ({displayUsers.filter(u => u.role === 'user').length})
        </Button>
        <Button
          onClick={() => setFilterTab('banned')}
          className={`h-10 px-6 rounded-lg transition-colors ${
            filterTab === 'banned'
              ? 'bg-[#ff3b5c] text-white'
              : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-white'
          }`}
        >
          <UserX className="w-4 h-4 mr-2" />
          Bị cấm ({displayUsers.filter(u => u.banned).length})
        </Button>
        <Button
          onClick={() => setFilterTab('warned')}
          className={`h-10 px-6 rounded-lg transition-colors ${
            filterTab === 'warned'
              ? 'bg-[#ff3b5c] text-white'
              : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-white'
          }`}
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Cảnh báo ({displayUsers.filter(u => u.warnings > 0 && !u.banned).length})
        </Button>
      </div>

      {/* Users List */}
      <div className="space-y-3">
        {displayUsers
          .filter(u => u.role === 'user')
          .filter(u => {
            if (filterTab === 'banned') return u.banned;
            if (filterTab === 'warned') return u.warnings > 0 && !u.banned;
            return true;
          })
          .filter(u => {
            if (!userSearchQuery) return true;
            const search = userSearchQuery.toLowerCase();
            return u.username.toLowerCase().includes(search) || 
                   u.displayName?.toLowerCase().includes(search);
          })
          .map(user => (
            <Card key={user.username} className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden hover:border-zinc-800/80 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  {/* User Info */}
                  <div className="flex items-start gap-4 flex-1">
                    {/* Avatar */}
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#ff3b5c] to-purple-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xl font-bold">
                        {user.displayName?.[0]?.toUpperCase() || user.username[0].toUpperCase()}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-white font-medium text-lg">{user.displayName || user.username}</h3>
                        {user.banned && (
                          <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded-md font-medium">BANNED</span>
                        )}
                        {!user.banned && user.warnings > 0 && (
                          <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-md font-medium">{user.warnings} cảnh báo</span>
                        )}
                        {!user.banned && user.warnings === 0 && (
                          <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-md font-medium">Tốt</span>
                        )}
                      </div>
                      <p className="text-zinc-400 text-sm mb-3">@{user.username}</p>
                      
                      {/* Stats */}
                      <div className="flex gap-4 text-xs">
                        <div className="flex items-center gap-1 text-zinc-500">
                          <Video className="w-3.5 h-3.5" />
                          <span>{videos.filter(v => v.uploaderUsername === user.username).length} videos</span>
                        </div>
                      </div>

                      {/* Ban Info */}
                      {user.banned && user.banReason && (
                        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                          <p className="text-red-400 text-xs">
                            <span className="font-medium">Lý do cấm:</span> {user.banReason}
                          </p>
                          {user.banExpiry && (
                            <p className="text-red-400/70 text-xs mt-1">
                              Hết hạn: {new Date(user.banExpiry).toLocaleString('vi-VN')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      onClick={() => onViewUserProfile(user.username)}
                      className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/30 h-9 rounded-lg whitespace-nowrap"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Xem profile
                    </Button>
                    
                    {user.banned ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          setConfirmAction({
                            type: 'ban-permanent',
                            title: 'Gỡ cấm người dùng',
                            message: `Bạn có chắc muốn gỡ cấm cho người dùng ${user.username}? Họ sẽ có thể đăng nhập và sử dụng hệ thống trở lại.`,
                            confirmText: 'Gỡ cấm',
                            confirmColor: '#22c55e',
                            onConfirm: async () => {
                              try {
                                await unbanUserApi(user.username);
                                toast.success(`Đã gỡ cấm người dùng ${user.username}`);
                                
                                // Refresh users list
                                const response = await fetchAllUsersApi({ page: 1, limit: 100 });
                                setApiUsers(response.data.users);
                                
                                setShowConfirmModal(false);
                              } catch (error: any) {
                                console.error('❌ Error unbanning user:', error);
                                if (error.response?.status === 404) {
                                  toast.error('Không tìm thấy người dùng');
                                } else if (error.response?.status === 400) {
                                  toast.error('Người dùng không bị cấm');
                                } else {
                                  toast.error('Không thể gỡ cấm người dùng. Vui lòng thử lại.');
                                }
                              }
                            }
                          });
                          setShowConfirmModal(true);
                        }}
                        className="bg-green-500/20 hover:bg-green-500/40 text-green-400 border-green-500/30 h-9 rounded-lg whitespace-nowrap transition-colors"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Gỡ cấm
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          onClick={() => onBanUser(user.username)}
                          className="bg-red-500/20 hover:bg-red-500/40 text-red-400 border-red-500/30 h-9 rounded-lg whitespace-nowrap transition-colors"
                        >
                          <UserX className="w-4 h-4 mr-2" />
                          Cấm
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => onWarnUser(user.username)}
                          className="bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-400 border-yellow-500/30 h-9 rounded-lg whitespace-nowrap transition-colors"
                        >
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Cảnh báo
                        </Button>
                      </>
                    )}
                    
                    {user.warnings > 0 && (
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            await clearWarningsApi(user.username);
                            toast.success(`Đã xóa cảnh báo của ${user.username}`);
                            
                            // Refresh users list
                            const response = await fetchAllUsersApi({ page: 1, limit: 100 });
                            setApiUsers(response.data.users);
                          } catch (error: any) {
                            console.error('❌ Error clearing warnings:', error);
                            if (error.response?.status === 404) {
                              toast.error('Không tìm thấy người dùng');
                            } else if (error.response?.status === 400) {
                              toast.error('Người dùng không có cảnh báo');
                            } else {
                              toast.error('Không thể xóa cảnh báo. Vui lòng thử lại.');
                            }
                          }
                        }}
                        className="bg-zinc-900/50 hover:bg-zinc-800 text-white border-zinc-800/50 h-9 rounded-lg whitespace-nowrap"
                      >
                        Xóa cảnh báo
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        
        {displayUsers.filter(u => u.role === 'user').filter(u => {
          if (filterTab === 'banned') return u.banned;
          if (filterTab === 'warned') return u.warnings > 0 && !u.banned;
          return true;
        }).length === 0 && (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-full bg-zinc-900/50 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-zinc-600" />
            </div>
            <p className="text-zinc-500 text-sm">Không có người dùng nào</p>
          </div>
        )}
      </div>
    </div>
  );
}
