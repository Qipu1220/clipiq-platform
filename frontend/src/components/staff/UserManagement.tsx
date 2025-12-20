import { useState } from 'react';
import { AlertTriangle, CheckCircle, Eye, Search, UserX, Users, Video, X } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { getAllUsersApi, unbanUserApi, clearWarningsApi, banUserApi, warnUserApi } from '../../api/admin';

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
}

export function UserManagement({
  displayUsers,
  videos,
  onViewUserProfile
}: UserManagementProps) {
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'' | 'banned' | 'warned'>('');
  
  // Modal states
  const [showBanModal, setShowBanModal] = useState(false);
  const [banUsername, setBanUsername] = useState('');
  const [banDuration, setBanDuration] = useState('');
  const [banReason, setBanReason] = useState('');
  
  const [showWarnModal, setShowWarnModal] = useState(false);
  const [warnUsername, setWarnUsername] = useState('');
  const [warnReason, setWarnReason] = useState('');
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: string;
    title: string;
    message: string;
    confirmText: string;
    confirmColor: string;
    onConfirm: () => void;
  } | null>(null);
  
  const [apiUsers, setApiUsers] = useState<any[]>([]);
  
  // Refresh users list
  const refreshUsers = async () => {
    try {
      const response = await getAllUsersApi({ page: 1, limit: 100 });
      setApiUsers(response.users);
    } catch (error) {
      console.error('Error refreshing users:', error);
    }
  };
  
  // Ban user handler
  const handleBanUser = async () => {
    if (!banUsername) {
      toast.error('Vui lòng nhập tên người dùng!');
      return;
    }
    // Reason is optional - can be empty
    
    const durationValue = banDuration ? parseInt(banDuration, 10) : null;
    if (durationValue !== null && (Number.isNaN(durationValue) || durationValue <= 0)) {
      toast.error('Thời hạn cấm phải là số ngày hợp lệ!');
      return;
    }
    const isPermanent = !durationValue;
    
    setConfirmAction({
      type: isPermanent ? 'ban-permanent' : 'ban-temp',
      title: isPermanent ? 'Cấm vĩnh viễn người dùng' : 'Cấm tạm thời người dùng',
      message: isPermanent 
        ? `Bạn có chắc muốn cấm vĩnh viễn người dùng ${banUsername}?`
        : `Bạn có chắc muốn cấm người dùng ${banUsername} trong ${durationValue} ngày?`,
      confirmText: isPermanent ? 'Cấm vĩnh viễn' : 'Cấm tạm thời',
      confirmColor: '#ff3b5c',
      onConfirm: async () => {
        try {
          await banUserApi(banUsername, banReason, durationValue);
          toast.success(isPermanent ? `Đã cấm vĩnh viễn người dùng ${banUsername}` : `Đã cấm người dùng ${banUsername} trong ${durationValue} ngày`);
          await refreshUsers();
          setBanUsername('');
          setBanDuration('');
          setBanReason('');
          setShowConfirmModal(false);
          setShowBanModal(false);
        } catch (error: any) {
          if (error.response?.status === 404) {
            toast.error('Không tìm thấy người dùng');
          } else {
            toast.error('Không thể cấm người dùng. Vui lòng thử lại.');
          }
        }
      }
    });
    setShowConfirmModal(true);
  };
  
  // Warn user handler
  const handleWarnUser = async () => {
    if (!warnUsername) {
      toast.error('Vui lòng nhập tên người dùng!');
      return;
    }
    // Reason is optional - can be empty
    
    const user = displayUsers.find(u => u.username === warnUsername);
    const currentWarnings = user?.warnings || 0;
    const durationValue = currentWarnings === 0 ? 30 : currentWarnings === 1 ? 60 : 90;
    const warningLevel = currentWarnings + 1;
    
    setConfirmAction({
      type: 'warn-user',
      title: 'Cảnh báo người dùng',
      message: `Bạn có chắc muốn cảnh báo người dùng ${warnUsername}?\n\nĐây sẽ là cảnh báo lần ${warningLevel}.\n\nThời hạn: ${durationValue} ngày (tự động xóa sau ${durationValue} ngày không vi phạm).`,
      confirmText: 'Cảnh báo',
      confirmColor: '#eab308',
      onConfirm: async () => {
        try {
          await warnUserApi(warnUsername, warnReason, durationValue);
          toast.success(`Đã cảnh báo người dùng ${warnUsername}`);
          await refreshUsers();
          setWarnUsername('');
          setWarnReason('');
          setShowConfirmModal(false);
          setShowWarnModal(false);
        } catch (error: any) {
          if (error.response?.status === 404) {
            toast.error('Không tìm thấy người dùng');
          } else {
            toast.error('Không thể cảnh báo người dùng. Vui lòng thử lại.');
          }
        }
      }
    });
    setShowConfirmModal(true);
  };

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
                      onClick={() => onViewUserProfile(user.username, 'user-management')}
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
                                await refreshUsers();
                                
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
                          onClick={() => {
                            setBanUsername(user.username);
                            setBanReason('');
                            setBanDuration('');
                            setShowBanModal(true);
                          }}
                          className="bg-red-500/20 hover:bg-red-500/40 text-red-400 border-red-500/30 h-9 rounded-lg whitespace-nowrap transition-colors"
                        >
                          <UserX className="w-4 h-4 mr-2" />
                          Cấm
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setWarnUsername(user.username);
                            setWarnReason('');
                            setShowWarnModal(true);
                          }}
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
                            await refreshUsers();
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
      
      {/* Ban User Modal */}
      {showBanModal && banUsername && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-[#ff3b5c]/30 rounded-xl w-full max-w-lg shadow-2xl">
            <div className="px-6 py-3 border-b border-zinc-900/50 bg-[#ff3b5c]/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#ff3b5c]/20 flex items-center justify-center">
                    <UserX className="w-5 h-5 text-[#ff3b5c]" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium text-lg">Cấm người dùng</h3>
                    <p className="text-zinc-500 text-xs">@{banUsername}</p>
                  </div>
                </div>
                <button onClick={() => setShowBanModal(false)} className="text-zinc-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-3">
              <div>
                <Label className="text-zinc-400 mb-2 block text-sm">Thời hạn (ngày)</Label>
                <Input
                  type="number"
                  value={banDuration}
                  onChange={(e) => setBanDuration(e.target.value)}
                  className="bg-zinc-900/50 border-zinc-800/50 text-white focus:border-[#ff3b5c] h-10"
                  placeholder="Để trống = vĩnh viễn"
                />
                <p className="text-zinc-600 text-xs mt-1">Để trống để cấm vĩnh viễn</p>
              </div>
              
              <div>
                <Label className="text-zinc-400 mb-2 block text-sm">Lý do cấm (tùy chọn)</Label>
                <Input
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  className="bg-zinc-900/50 border-zinc-800/50 text-white focus:border-[#ff3b5c] h-10"
                  placeholder="Có thể để trống hoặc nhập lý do..."
                />
              </div>
            </div>

            <div className="px-5 py-3 border-t border-zinc-900/50 flex gap-3 justify-end">
              <Button onClick={() => setShowBanModal(false)} className="bg-zinc-900/50 hover:bg-zinc-800 text-white border-zinc-800/50 h-10 rounded-lg">
                Hủy
              </Button>
              <Button onClick={handleBanUser} className="bg-[#ff3b5c] hover:bg-[#ff3b5c]/90 text-white h-10 rounded-lg">
                Xác nhận cấm
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Warn User Modal */}
      {showWarnModal && warnUsername && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-yellow-500/30 rounded-xl w-full max-w-lg shadow-2xl">
            <div className="px-6 py-3 border-b border-zinc-900/50 bg-yellow-500/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium text-lg">Cảnh báo người dùng</h3>
                    <p className="text-zinc-500 text-xs">@{warnUsername}</p>
                  </div>
                </div>
                <button onClick={() => setShowWarnModal(false)} className="text-zinc-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-3">
              <div>
                <Label className="text-zinc-400 mb-2 block text-sm">Lý do cảnh báo (tùy chọn)</Label>
                <Input
                  value={warnReason}
                  onChange={(e) => setWarnReason(e.target.value)}
                  className="bg-zinc-900/50 border-zinc-800/50 text-white focus:border-yellow-500 h-10"
                  placeholder="Có thể để trống hoặc nhập lý do..."
                />
                {warnReason.length > 500 && (
                  <p className="text-red-400 text-xs mt-1">Nội dung cảnh báo không được quá 500 ký tự</p>
                )}
              </div>
              
              <div>
                <Label className="text-zinc-400 mb-2 block text-sm">Thông tin cảnh báo</Label>
                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-3">
                  {(() => {
                    const user = displayUsers.find(u => u.username === warnUsername);
                    const currentWarnings = user?.warnings || 0;
                    const warningLevel = currentWarnings + 1;
                    const duration = currentWarnings === 0 ? 30 : currentWarnings === 1 ? 60 : 90;
                    return (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-zinc-400 text-sm">Cảnh báo lần:</span>
                          <span className="text-white font-semibold">{warningLevel}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400 text-sm">Thời hạn:</span>
                          <span className="text-yellow-400 font-semibold">{duration} ngày</span>
                        </div>
                        <p className="text-zinc-600 text-xs mt-2">Tự động xóa sau {duration} ngày không vi phạm</p>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-zinc-900/50 flex gap-3 justify-end">
              <Button onClick={() => setShowWarnModal(false)} className="bg-zinc-900/50 hover:bg-zinc-800 text-white border-zinc-800/50 h-10 rounded-lg">
                Hủy
              </Button>
              <Button onClick={handleWarnUser} className="bg-yellow-500 hover:bg-yellow-500/90 text-white h-10 rounded-lg">
                Xác nhận cảnh báo
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && confirmAction && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-900/50 rounded-xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-zinc-900/50">
              <h3 className="text-white font-medium text-lg">{confirmAction.title}</h3>
            </div>

            <div className="p-5">
              <p className="text-zinc-400 whitespace-pre-line">{confirmAction.message}</p>
            </div>

            <div className="px-5 py-3 border-t border-zinc-900/50 flex gap-3 justify-end">
              <Button onClick={() => setShowConfirmModal(false)} className="bg-zinc-900/50 hover:bg-zinc-800 text-white border-zinc-800/50 h-10 rounded-lg">
                Hủy
              </Button>
              <Button
                onClick={confirmAction.onConfirm}
                style={{ backgroundColor: confirmAction.confirmColor }}
                className="hover:opacity-90 text-white h-10 rounded-lg"
              >
                {confirmAction.confirmText}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
