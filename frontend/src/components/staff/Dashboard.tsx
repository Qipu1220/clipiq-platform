import { Flag, AlertTriangle, MessageSquare, FileText, CheckCircle, Clock, TrendingUp, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { VideoReport, UserReport } from '../../api/reports';

interface DashboardProps {
  pendingVideoReports: number;
  pendingUserReports: number;
  pendingCommentReports: number;
  pendingAppeals: number;
  resolvedToday: number;
  apiVideoReports: VideoReport[];
  apiUserReports: UserReport[];
  allUsers: Array<{
    username: string;
    warnings: number;
    banned: boolean;
  }>;
  onViewUserProfile: (username: string) => void;
}

export function Dashboard({
  pendingVideoReports,
  pendingUserReports,
  pendingCommentReports,
  pendingAppeals,
  resolvedToday,
  apiVideoReports,
  allUsers,
  onViewUserProfile
}: DashboardProps) {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg bg-[#ff3b5c]/10 flex items-center justify-center">
                <Flag className="w-5 h-5 text-[#ff3b5c]" />
              </div>
              <TrendingUp className="w-4 h-4 text-zinc-600" />
            </div>
            <div className="text-2xl text-white font-medium mb-1">{pendingVideoReports}</div>
            <div className="text-sm text-zinc-500">Báo cáo video chờ xử lý</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              </div>
              <TrendingUp className="w-4 h-4 text-zinc-600" />
            </div>
            <div className="text-2xl text-white font-medium mb-1">{pendingUserReports}</div>
            <div className="text-sm text-zinc-500">Báo cáo user chờ xử lý</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-purple-500" />
              </div>
              <TrendingUp className="w-4 h-4 text-zinc-600" />
            </div>
            <div className="text-2xl text-white font-medium mb-1">{pendingCommentReports}</div>
            <div className="text-sm text-zinc-500">Báo cáo comment chờ xử lý</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-500" />
              </div>
              <Clock className="w-4 h-4 text-zinc-600" />
            </div>
            <div className="text-2xl text-white font-medium mb-1">{pendingAppeals}</div>
            <div className="text-sm text-zinc-500">Khiếu nại chờ xử lý</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <Clock className="w-4 h-4 text-zinc-600" />
            </div>
            <div className="text-2xl text-white font-medium mb-1">{resolvedToday}</div>
            <div className="text-sm text-zinc-500">Đã xử lý hôm nay</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
          <CardHeader className="border-b border-zinc-900/50 pb-4">
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <Flag className="w-5 h-5 text-[#ff3b5c]" />
              Báo cáo Video gần đây
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {apiVideoReports.filter((r: VideoReport) => r.status === 'pending').slice(0, 5).map((report: VideoReport) => (
                <div key={report.id} className="p-3 bg-zinc-900/30 rounded-lg border border-zinc-900/50">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-white text-sm truncate flex-1">{report.video_title || 'Unknown'}</p>
                    <span className="text-xs text-zinc-500 ml-2">
                      {new Date(report.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">Báo cáo bởi: {report.reporter_username || 'Unknown'}</p>
                </div>
              ))}
              {apiVideoReports.filter((r: VideoReport) => r.status === 'pending').length === 0 && (
                <p className="text-zinc-600 text-sm text-center py-8">Không có báo cáo nào</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
          <CardHeader className="border-b border-zinc-900/50 pb-4">
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <Users className="w-5 h-5 text-yellow-500" />
              Người dùng cảnh báo
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {allUsers.filter(u => u.warnings > 0 || u.banned).slice(0, 5).map(user => (
                <div key={user.username} className="p-3 bg-zinc-900/30 rounded-lg border border-zinc-900/50">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-white text-sm">{user.username}</p>
                      <div className="flex gap-2 mt-1">
                        {user.banned && (
                          <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">BANNED</span>
                        )}
                        {user.warnings > 0 && (
                          <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">{user.warnings} cảnh báo</span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onViewUserProfile(user.username)}
                      className="bg-zinc-900/50 hover:bg-zinc-800 text-white border-zinc-800/50 h-8 text-xs"
                    >
                      Xem
                    </Button>
                  </div>
                </div>
              ))}
              {allUsers.filter(u => u.warnings > 0 || u.banned).length === 0 && (
                <p className="text-zinc-600 text-sm text-center py-8">Không có người dùng nào</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
