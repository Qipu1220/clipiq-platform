import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toggleMaintenanceMode } from '../../store/authSlice';
import { addUser, deleteUser, changePassword, changeUserRole } from '../../store/usersSlice';
import { RootState } from '../../store/store';
import { Shield, Power, Users, Trash2, KeyRound, UserPlus } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export function AdminDashboard() {
  const dispatch = useDispatch();
  const maintenanceMode = useSelector((state: RootState) => state.auth.maintenanceMode);
  const allUsers = useSelector((state: RootState) => state.users.allUsers);

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'staff' | 'user'>('user');
  
  const [changePassUsername, setChangePassUsername] = useState('');
  const [changePassNew, setChangePassNew] = useState('');

  const handleAddUser = () => {
    if (!newUsername || !newPassword) return;
    dispatch(addUser({
      username: newUsername,
      password: newPassword,
      role: newRole,
      warnings: 0,
    }));
    setNewUsername('');
    setNewPassword('');
    setNewRole('user');
  };

  const handleDeleteUser = (username: string) => {
    if (confirm(`Are you sure you want to delete ${username}?`)) {
      dispatch(deleteUser(username));
    }
  };

  const handleChangePassword = () => {
    if (!changePassUsername || !changePassNew) return;
    dispatch(changePassword({
      username: changePassUsername,
      newPassword: changePassNew,
    }));
    setChangePassUsername('');
    setChangePassNew('');
  };

  const handleChangeUserRole = (username: string, newRole: 'admin' | 'staff' | 'user') => {
    dispatch(changeUserRole({
      username: username,
      role: newRole,
    }));
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-red-600" />
          <h1 className="text-white text-3xl">Admin Dashboard</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Power className="w-5 h-5 text-red-600" />
                Maintenance Mode
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-zinc-400">
                  {maintenanceMode ? 'Maintenance is currently ACTIVE' : 'Site is operating normally'}
                </p>
                <Button
                  onClick={() => dispatch(toggleMaintenanceMode())}
                  variant={maintenanceMode ? 'destructive' : 'default'}
                  className={maintenanceMode ? '' : 'bg-red-600 hover:bg-red-700'}
                >
                  {maintenanceMode ? 'Disable' : 'Enable'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-red-600" />
                Add New User
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-zinc-300">Username</Label>
                <Input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  placeholder="Enter username"
                />
              </div>
              <div>
                <Label className="text-zinc-300">Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  placeholder="Enter password"
                />
              </div>
              <div>
                <Label className="text-zinc-300">Role</Label>
                <Select value={newRole} onValueChange={(val: any) => setNewRole(val)}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-zinc-700">
                    <SelectItem value="user" className="text-white hover:bg-zinc-800 focus:bg-zinc-800">User</SelectItem>
                    <SelectItem value="staff" className="text-white hover:bg-zinc-800 focus:bg-zinc-800">Staff</SelectItem>
                    <SelectItem value="admin" className="text-white hover:bg-zinc-800 focus:bg-zinc-800">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddUser} className="w-full bg-red-600 hover:bg-red-700">
                Add User
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-zinc-900 border-zinc-800 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-red-600" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-zinc-300">Username</Label>
                <Input
                  value={changePassUsername}
                  onChange={(e) => setChangePassUsername(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  placeholder="Enter username"
                />
              </div>
              <div>
                <Label className="text-zinc-300">New Password</Label>
                <Input
                  type="password"
                  value={changePassNew}
                  onChange={(e) => setChangePassNew(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  placeholder="Enter new password"
                />
              </div>
            </div>
            <Button onClick={handleChangePassword} className="bg-red-600 hover:bg-red-700">
              Change Password
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-red-600" />
              User Management ({allUsers.length} users)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {allUsers.map(user => (
                <div
                  key={user.username}
                  className="flex items-center justify-between p-3 bg-zinc-800 rounded border border-zinc-700"
                >
                  <div>
                    <p className="text-white">{user.username}</p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-zinc-400">Role: {user.role}</span>
                      {user.banned && (
                        <span className="text-red-500">• BANNED</span>
                      )}
                      {user.warnings > 0 && (
                        <span className="text-yellow-500">• {user.warnings} warnings</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={user.role} onValueChange={(val: any) => handleChangeUserRole(user.username, val)}>
                      <SelectTrigger className="bg-zinc-700 border-zinc-600 text-white w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-black border-zinc-600">
                        <SelectItem value="user" className="text-white hover:bg-zinc-800 focus:bg-zinc-800 cursor-pointer">User</SelectItem>
                        <SelectItem value="staff" className="text-white hover:bg-zinc-800 focus:bg-zinc-800 cursor-pointer">Staff</SelectItem>
                        <SelectItem value="admin" className="text-white hover:bg-zinc-800 focus:bg-zinc-800 cursor-pointer">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteUser(user.username)}
                      className="text-red-500 hover:text-red-400 hover:bg-red-950"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
