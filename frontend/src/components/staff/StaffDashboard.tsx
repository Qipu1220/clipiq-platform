import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { resolveVideoReport, resolveUserReport, updateAppealStatus } from '../../store/reportsSlice';
import { banUser, unbanUser, warnUser, clearWarnings } from '../../store/usersSlice';
import { deleteVideo } from '../../store/videosSlice';
import { Shield, AlertTriangle, Flag, MessageSquare, UserX, Trash2, CheckCircle, Eye, UserCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface StaffDashboardProps {
  onVideoClick: (videoId: string) => void;
  onViewUserProfile: (username: string) => void;
}

export function StaffDashboard({ onVideoClick, onViewUserProfile }: StaffDashboardProps) {
  const dispatch = useDispatch();
  const videoReports = useSelector((state: RootState) => state.reports.videoReports);
  const userReports = useSelector((state: RootState) => state.reports.userReports);
  const appeals = useSelector((state: RootState) => state.reports.appeals);
  const videos = useSelector((state: RootState) => state.videos.videos);
  const allUsers = useSelector((state: RootState) => state.users.allUsers);

  const [banUsername, setBanUsername] = useState('');
  const [banDuration, setBanDuration] = useState('');

  const handleResolveVideoReport = (reportId: string, videoId: string, shouldDelete: boolean) => {
    if (shouldDelete) {
      if (confirm('Are you sure you want to delete this video?')) {
        dispatch(deleteVideo(videoId));
      }
    }
    dispatch(resolveVideoReport(reportId));
  };

  const handleResolveUserReport = (reportId: string, username: string, shouldWarn: boolean) => {
    if (shouldWarn) {
      dispatch(warnUser(username));
    }
    dispatch(resolveUserReport(reportId));
  };

  const handleBanUser = (permanent: boolean) => {
    if (!banUsername) return;
    if (permanent) {
      dispatch(banUser({ username: banUsername }));
    } else {
      const duration = parseInt(banDuration);
      if (duration > 0) {
        dispatch(banUser({ username: banUsername, duration }));
      }
    }
    setBanUsername('');
    setBanDuration('');
  };

  const handleAppeal = (appealId: string, status: 'approved' | 'denied', username?: string) => {
    dispatch(updateAppealStatus({ id: appealId, status }));
    if (status === 'approved' && username) {
      dispatch(unbanUser(username));
      dispatch(clearWarnings(username));
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-red-600" />
          <h1 className="text-white text-3xl">Staff Dashboard</h1>
        </div>

        <Tabs defaultValue="video-reports" className="space-y-6">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="video-reports" className="data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=inactive]:text-zinc-300">
              Video Reports ({videoReports.filter(r => r.status === 'pending').length})
            </TabsTrigger>
            <TabsTrigger value="user-reports" className="data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=inactive]:text-zinc-300">
              User Reports ({userReports.filter(r => r.status === 'pending').length})
            </TabsTrigger>
            <TabsTrigger value="appeals" className="data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=inactive]:text-zinc-300">
              Appeals ({appeals.filter(a => a.status === 'pending').length})
            </TabsTrigger>
            <TabsTrigger value="moderation" className="data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=inactive]:text-zinc-300">
              Moderation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="video-reports">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Flag className="w-5 h-5 text-red-600" />
                  Video Reports
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {videoReports.filter(r => r.status === 'pending').map(report => {
                  const video = videos.find(v => v.id === report.videoId);
                  return (
                    <div key={report.id} className="p-4 bg-zinc-800 rounded border border-zinc-700">
                      <div className="mb-3">
                        <p className="text-white">Video: {report.videoTitle}</p>
                        <p className="text-sm text-zinc-400">Reported by: {report.reportedBy}</p>
                        <p className="text-sm text-zinc-400">Reason: {report.reason}</p>
                        <p className="text-xs text-zinc-500">
                          {new Date(report.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => onVideoClick(report.videoId)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Video
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleResolveVideoReport(report.id, report.videoId, true)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Video
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResolveVideoReport(report.id, report.videoId, false)}
                          className="border-zinc-600 bg-zinc-900 text-white hover:bg-zinc-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Dismiss Report
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {videoReports.filter(r => r.status === 'pending').length === 0 && (
                  <p className="text-zinc-500 text-center py-8">No pending video reports</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="user-reports">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  User Reports
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {userReports.filter(r => r.status === 'pending').map(report => (
                  <div key={report.id} className="p-4 bg-zinc-800 rounded border border-zinc-700">
                    <div className="mb-3">
                      <p className="text-white">Reported User: {report.reportedUser}</p>
                      <p className="text-sm text-zinc-400">Reported by: {report.reportedBy}</p>
                      <p className="text-sm text-zinc-400">Reason: {report.reason}</p>
                      <p className="text-xs text-zinc-500">
                        {new Date(report.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => onViewUserProfile(report.reportedUser)}
                      >
                        <UserCircle className="w-4 h-4 mr-2" />
                        View Profile
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleResolveUserReport(report.id, report.reportedUser, true)}
                      >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Warn User
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolveUserReport(report.id, report.reportedUser, false)}
                        className="border-zinc-600 bg-zinc-900 text-white hover:bg-zinc-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Dismiss Report
                      </Button>
                    </div>
                  </div>
                ))}
                {userReports.filter(r => r.status === 'pending').length === 0 && (
                  <p className="text-zinc-500 text-center py-8">No pending user reports</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appeals">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-red-600" />
                  User Appeals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {appeals.filter(a => a.status === 'pending').map(appeal => (
                  <div key={appeal.id} className="p-4 bg-zinc-800 rounded border border-zinc-700">
                    <div className="mb-3">
                      <p className="text-white">User: {appeal.username}</p>
                      <p className="text-sm text-zinc-400">Reason: {appeal.reason}</p>
                      <p className="text-xs text-zinc-500">
                        {new Date(appeal.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleAppeal(appeal.id, 'approved', appeal.username)}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleAppeal(appeal.id, 'denied')}
                      >
                        Deny
                      </Button>
                    </div>
                  </div>
                ))}
                {appeals.filter(a => a.status === 'pending').length === 0 && (
                  <p className="text-zinc-500 text-center py-8">No pending appeals</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="moderation">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <UserX className="w-5 h-5 text-red-600" />
                    Ban User
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-zinc-300">Username</Label>
                    <Input
                      value={banUsername}
                      onChange={(e) => setBanUsername(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white"
                      placeholder="Enter username to ban"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-300">Duration (days)</Label>
                    <Input
                      type="number"
                      value={banDuration}
                      onChange={(e) => setBanDuration(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white"
                      placeholder="Leave empty for permanent"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleBanUser(false)}
                      className="bg-orange-600 hover:bg-orange-700 flex-1"
                    >
                      Temporary Ban
                    </Button>
                    <Button
                      onClick={() => handleBanUser(true)}
                      variant="destructive"
                      className="flex-1"
                    >
                      Permanent Ban
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white">User Status Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {allUsers.filter(u => u.role === 'user').map(user => (
                    <div key={user.username} className="p-3 bg-zinc-800 rounded border border-zinc-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white">{user.username}</p>
                          <div className="flex gap-2 text-sm">
                            {user.banned && (
                              <span className="text-red-500">BANNED</span>
                            )}
                            {user.warnings > 0 && (
                              <span className="text-yellow-500">{user.warnings} warnings</span>
                            )}
                            {!user.banned && user.warnings === 0 && (
                              <span className="text-green-500">Good standing</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {user.banned && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => dispatch(unbanUser(user.username))}
                              className="border-zinc-600 bg-zinc-900 text-white hover:bg-zinc-700"
                            >
                              Unban
                            </Button>
                          )}
                          {user.warnings > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => dispatch(clearWarnings(user.username))}
                              className="border-zinc-600 bg-zinc-900 text-white hover:bg-zinc-700"
                            >
                              Clear Warnings
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}