import { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { User, Mail, Crown, Calendar, Edit2, Save, X, Shield, Lock, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export function AdminProfile() {
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(currentUser?.displayName || currentUser?.username || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [bio, setBio] = useState('');

  const handleSave = () => {
    // TODO: Dispatch update user profile action
    console.log('Save profile', { displayName, email, bio });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDisplayName(currentUser?.displayName || currentUser?.username || '');
    setEmail(currentUser?.email || '');
    setBio('');
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
              <div className="absolute bottom-0 right-0 bg-yellow-500 p-2 rounded-full">
                <Crown className="w-5 h-5 text-black" />
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
                  <span>{currentUser?.email || 'admin@clipiq.com'}</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-400">
                  <Calendar className="w-4 h-4" />
                  <span>Tham gia {new Date().toLocaleDateString('vi-VN')}</span>
                </div>
              </div>

              <div className="mt-4">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 rounded-lg">
                  <Crown className="w-4 h-4 text-yellow-500" />
                  <span className="text-yellow-500 font-medium">Administrator</span>
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
                  className="bg-zinc-900/50 hover:bg-zinc-800 text-white border-zinc-800/50 h-9 rounded-lg"
                >
                  <X className="w-4 h-4 mr-2" />
                  Hủy
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-[#ff3b5c]/20 hover:bg-[#ff3b5c]/30 text-[#ff3b5c] border-[#ff3b5c]/30 h-9 rounded-lg"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Lưu
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-3">
                <Activity className="w-6 h-6 text-blue-500" />
              </div>
              <div className="text-2xl text-white font-medium mb-1">0</div>
              <div className="text-sm text-zinc-500">Hành động hôm nay</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                <User className="w-6 h-6 text-green-500" />
              </div>
              <div className="text-2xl text-white font-medium mb-1">0</div>
              <div className="text-sm text-zinc-500">Users đã quản lý</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-3">
                <Shield className="w-6 h-6 text-purple-500" />
              </div>
              <div className="text-2xl text-white font-medium mb-1">0</div>
              <div className="text-sm text-zinc-500">Staff đã thêm</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6 text-yellow-500" />
              </div>
              <div className="text-2xl text-white font-medium mb-1">0</div>
              <div className="text-sm text-zinc-500">Ngày làm việc</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Permissions */}
      <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
        <CardHeader className="border-b border-zinc-900/50">
          <CardTitle className="text-white text-lg">Quyền hạn Admin</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg">
              <span className="text-white text-sm">Quản lý người dùng</span>
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg">
              <span className="text-white text-sm">Quản lý staff</span>
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg">
              <span className="text-white text-sm">Xem thống kê</span>
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg">
              <span className="text-white text-sm">Quản lý hệ thống</span>
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg">
              <span className="text-white text-sm">Bật/tắt bảo trì</span>
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg">
              <span className="text-white text-sm">Xem logs hệ thống</span>
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg">
              <span className="text-white text-sm">Cấu hình ứng dụng</span>
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg">
              <span className="text-white text-sm">Toàn quyền truy cập</span>
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
        <CardHeader className="border-b border-zinc-900/50">
          <CardTitle className="text-white flex items-center gap-2 text-lg">
            <Lock className="w-5 h-5 text-[#ff3b5c]" />
            Bảo mật
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg">
            <div>
              <div className="text-white text-sm font-medium">Xác thực hai yếu tố</div>
              <div className="text-zinc-500 text-xs mt-0.5">Bảo vệ tài khoản với 2FA</div>
            </div>
            <Button className="bg-zinc-900/50 hover:bg-zinc-800 text-white border-zinc-800/50 h-9 rounded-lg text-xs">
              Kích hoạt
            </Button>
          </div>
          <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg">
            <div>
              <div className="text-white text-sm font-medium">Đổi mật khẩu</div>
              <div className="text-zinc-500 text-xs mt-0.5">Cập nhật mật khẩu của bạn</div>
            </div>
            <Button className="bg-zinc-900/50 hover:bg-zinc-800 text-white border-zinc-800/50 h-9 rounded-lg text-xs">
              Thay đổi
            </Button>
          </div>
          <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg">
            <div>
              <div className="text-white text-sm font-medium">Lịch sử đăng nhập</div>
              <div className="text-zinc-500 text-xs mt-0.5">Xem các phiên đăng nhập gần đây</div>
            </div>
            <Button className="bg-zinc-900/50 hover:bg-zinc-800 text-white border-zinc-800/50 h-9 rounded-lg text-xs">
              Xem
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
