import { useState } from 'react';
import { AlertTriangle, CheckCircle, UserCircle } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { UserReport } from '../../api/reports';

interface UserReportsProps {
  apiUserReports: UserReport[];
  onViewUserProfile: (username: string) => void;
  onResolveReport: (reportId: string, username: string, shouldWarn: boolean) => void;
  getReportTypeName: (type: string) => string;
}

export function UserReports({
  apiUserReports,
  onViewUserProfile,
  onResolveReport,
  getReportTypeName
}: UserReportsProps) {
  const [userReportsSubTab, setUserReportsSubTab] = useState<'pending' | 'resolved'>('pending');

  return (
    <div className="space-y-4">
      {/* Sub-tabs for User Reports */}
      <div className="flex gap-2 mb-6">
        <Button
          onClick={() => setUserReportsSubTab('pending')}
          className={`h-10 px-6 rounded-lg transition-all ${
            userReportsSubTab === 'pending'
              ? 'bg-[#ff3b5c] text-white'
              : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-white'
          }`}
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Chưa xử lý ({apiUserReports.filter((r: UserReport) => r.status === 'pending').length})
        </Button>
        <Button
          onClick={() => setUserReportsSubTab('resolved')}
          className={`h-10 px-6 rounded-lg transition-all ${
            userReportsSubTab === 'resolved'
              ? 'bg-[#ff3b5c] text-white'
              : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-white'
          }`}
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Đã xử lý ({apiUserReports.filter((r: UserReport) => r.status === 'resolved').length})
        </Button>
      </div>

      {/* Reports List */}
      {apiUserReports.filter((r: UserReport) => r.status === userReportsSubTab).map((report: UserReport) => (
        <Card key={report.id} className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-white font-medium mb-2">Người dùng: {report.reported_username || 'Unknown'}</h3>
                <div className="space-y-1 text-sm">
                  <p className="text-zinc-400">Báo cáo bởi: <span className="text-white">{report.reporter_username || 'Unknown'}</span></p>
                  <p className="text-zinc-400">Lý do: <span className="text-[#ff3b5c]">{getReportTypeName(report.reason)}</span></p>
                  <p className="text-zinc-600 text-xs">{new Date(report.created_at).toLocaleString('vi-VN')}</p>
                  {report.status === 'resolved' && report.resolution_note && (
                    <p className="text-green-400 text-xs mt-2">✓ {report.resolution_note}</p>
                  )}
                  {report.status === 'resolved' && report.reviewed_at && (
                    <p className="text-zinc-600 text-xs">Xử lý lúc: {new Date(report.reviewed_at).toLocaleString('vi-VN')}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => onViewUserProfile(report.reported_username || '', 'user-reports')}
                className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/30 h-9 rounded-lg"
              >
                <UserCircle className="w-4 h-4 mr-2" />
                Xem profile
              </Button>
              {report.status === 'pending' && (
                <Button
                  size="sm"
                  onClick={() => onResolveReport(report.id, report.reported_username || '', false)}
                  className="bg-zinc-900/50 hover:bg-zinc-800 text-white border-zinc-800/50 h-9 rounded-lg"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Bỏ qua
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
      {apiUserReports.filter((r: UserReport) => r.status === userReportsSubTab).length === 0 && (
        <div className="text-center py-24">
          <div className="w-16 h-16 rounded-full bg-zinc-900/50 flex items-center justify-center mx-auto mb-4">
            {userReportsSubTab === 'pending' ? (
              <AlertTriangle className="w-8 h-8 text-zinc-600" />
            ) : (
              <CheckCircle className="w-8 h-8 text-zinc-600" />
            )}
          </div>
          <p className="text-zinc-500 text-sm">
            {userReportsSubTab === 'pending' 
              ? 'Không có báo cáo chưa xử lý' 
              : 'Không có báo cáo đã xử lý'}
          </p>
        </div>
      )}
    </div>
  );
}
