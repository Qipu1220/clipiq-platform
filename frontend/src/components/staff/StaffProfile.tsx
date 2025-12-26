import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { User, Mail, Shield, Calendar, Edit2, Save, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { getCurrentUserProfileApi, getStaffStatsApi, updateUserProfileApi, StaffStats } from '../../api/users';
import { setCurrentUser } from '../../store/authSlice';

export function StaffProfile() {
  const dispatch = useDispatch<AppDispatch>();
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);
  
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [displayName, setDisplayName] = useState(currentUser?.displayName || currentUser?.username || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  
  const [stats, setStats] = useState<StaffStats>({
    reportsProcessed: 0,
    usersWarned: 0,
    usersBanned: 0,
    daysActive: 0,
    lastActivity: null
  });

  // Load profile and stats on mount
  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    setIsLoading(true);
    try {
      // Load current profile
      const profileRes = await getCurrentUserProfileApi();
      if (profileRes.data.success) {
        const userData = profileRes.data.data;
        setDisplayName(userData.displayName || userData.username);
        setEmail(userData.email || '');
        setBio(userData.bio || '');
      }

      // Load staff stats if user is staff/admin
      if (currentUser?.role === 'staff' || currentUser?.role === 'admin') {
        const statsRes = await getStaffStatsApi();
        if (statsRes.data.success) {
          setStats(statsRes.data.data);
        }
      }
    } catch (error) {
      console.error('Failed to load profile data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentUser?.username) return;

    setIsSaving(true);
    try {
      const response = await updateUserProfileApi(currentUser.username, {
        displayName,
        email,
        bio
      });

      if (response.data.success) {
        // Update Redux store with new user data
        dispatch(setCurrentUser(response.data.data));
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Không thể cập nhật hồ sơ. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDisplayName(currentUser?.displayName || currentUser?.username || '');
    setEmail(currentUser?.email || '');
    setBio(currentUser?.bio || '');
    setIsEditing(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
        <CardContent className="p-8">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              {currentUser?.avatarUrl ? (
                <img 
                  src={currentUser.avatarUrl} 
                  alt={currentUser.username}
                  className="w-28 h-28 rounded-full object-cover ring-4 ring-zinc-800"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-zinc-900 flex items-center justify-center ring-4 ring-zinc-800">
                  <User className="w-14 h-14 text-zinc-500" />
                </div>
              )}
              <div className="absolute bottom-0 right-0 bg-[#ff3b5c] p-2 rounded-full">
                <Shield className="w-5 h-5 text-white" />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-white text-2xl mb-1">
                    {currentUser?.displayName || currentUser?.username}
                  </h2>
                  <p className="text-zinc-500">@{currentUser?.username}</p>
                </div>
                {!isEditing && (
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="bg-zinc-900/50 hover:bg-zinc-800 text-white border-zinc-800/50 h-10 rounded-lg"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Chỉnh sửa
                  </Button>
                )}
              </div>
              
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Mail className="w-4 h-4" />
                  <span>{currentUser?.email || 'staff@clipiq.com'}</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-400">
                  <Calendar className="w-4 h-4" />
                  <span>Tham gia {new Date().toLocaleDateString('vi-VN')}</span>
                </div>
              </div>

              <div className="mt-4">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#ff3b5c]/10 rounded-lg">
                  <Shield className="w-4 h-4 text-[#ff3b5c]" />
                  <span className="text-[#ff3b5c] font-medium">Staff Member</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile */}
      {isEditing && (
        <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
          <CardHeader className="border-b border-zinc-900/50">
            <CardTitle className="text-white text-lg flex items-center justify-between">
              <span>Chỉnh sửa thông tin</span>
              <div className="flex gap-2">
                <Button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="bg-zinc-900/50 hover:bg-zinc-800 text-white border-zinc-800/50 h-9 rounded-lg"
                >
                  <X className="w-4 h-4 mr-2" />
                  Hủy
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-[#ff3b5c]/20 hover:bg-[#ff3b5c]/30 text-[#ff3b5c] border-[#ff3b5c]/30 h-9 rounded-lg"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Đang lưu...' : 'Lưu'}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label className="text-zinc-400 mb-2 block text-sm">Tên hiển thị</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-zinc-900/50 border-zinc-800/50 text-white h-11 rounded-lg focus:border-zinc-700"
                placeholder="Nhập tên hiển thị"
              />
            </div>
            <div>
              <Label className="text-zinc-400 mb-2 block text-sm">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-zinc-900/50 border-zinc-800/50 text-white h-11 rounded-lg focus:border-zinc-700"
                placeholder="Nhập email"
              />
            </div>
            <div>
              <Label className="text-zinc-400 mb-2 block text-sm">Bio</Label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-zinc-900/50 border border-zinc-800/50 text-white p-3 rounded-lg focus:border-zinc-700 focus:outline-none resize-none"
                rows={4}
                placeholder="Viết vài dòng về bạn..."
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-3">
                <Shield className="w-6 h-6 text-blue-500" />
              </div>
              <div className="text-2xl text-white font-medium mb-1">
                {isLoading ? '...' : stats.reportsProcessed}
              </div>
              <div className="text-sm text-zinc-500">Báo cáo đã xử lý</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                <User className="w-6 h-6 text-green-500" />
              </div>
              <div className="text-2xl text-white font-medium mb-1">
                {isLoading ? '...' : stats.usersWarned}
              </div>
              <div className="text-sm text-zinc-500">Người dùng đã cảnh báo</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6 text-yellow-500" />
              </div>
              <div className="text-2xl text-white font-medium mb-1">
                {isLoading ? '...' : stats.daysActive}
              </div>
              <div className="text-sm text-zinc-500">Ngày làm việc</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Permissions */}
      <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
        <CardHeader className="border-b border-zinc-900/50">
          <CardTitle className="text-white text-lg">Quyền hạn</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg">
              <span className="text-white text-sm">Quản lý báo cáo video</span>
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg">
              <span className="text-white text-sm">Quản lý báo cáo người dùng</span>
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg">
              <span className="text-white text-sm">Xử lý khiếu nại</span>
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg">
              <span className="text-white text-sm">Cấm người dùng</span>
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg">
              <span className="text-white text-sm">Xóa nội dung</span>
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
