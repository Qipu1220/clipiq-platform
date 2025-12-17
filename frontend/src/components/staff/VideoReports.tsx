import { useState } from 'react';
import { Flag, CheckCircle, Eye, Trash2 } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { VideoReport } from '../../api/reports';

interface VideoReportsProps {
  apiVideoReports: VideoReport[];
  videos: Array<{ id: string; thumbnailUrl?: string }>;
  onVideoClick: (videoId: string) => void;
  onResolveReport: (reportId: string, videoId: string, shouldDelete: boolean) => void;
  getReportTypeName: (type: string) => string;
}

export function VideoReports({
  apiVideoReports,
  videos,
  onVideoClick,
  onResolveReport,
  getReportTypeName
}: VideoReportsProps) {
  const [videoReportsSubTab, setVideoReportsSubTab] = useState<'pending' | 'resolved'>('pending');

  return (
    <div className="space-y-4">
      {/* Sub-tabs for Video Reports */}
      <div className="flex gap-2 mb-6">
        <Button
          onClick={() => setVideoReportsSubTab('pending')}
          className={`h-10 px-6 rounded-lg transition-all ${
            videoReportsSubTab === 'pending'
              ? 'bg-[#ff3b5c] text-white'
              : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-white'
          }`}
        >
          <Flag className="w-4 h-4 mr-2" />
          Chưa xử lý ({apiVideoReports.filter((r: VideoReport) => r.status === 'pending').length})
        </Button>
        <Button
          onClick={() => setVideoReportsSubTab('resolved')}
          className={`h-10 px-6 rounded-lg transition-all ${
            videoReportsSubTab === 'resolved'
              ? 'bg-[#ff3b5c] text-white'
              : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-white'
          }`}
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Đã xử lý ({apiVideoReports.filter((r: VideoReport) => r.status === 'resolved').length})
        </Button>
      </div>

      {/* Reports List */}
      {apiVideoReports.filter((r: VideoReport) => r.status === videoReportsSubTab).map((report: VideoReport) => {
        const video = videos.find(v => v.id === report.video_id);
        return (
          <Card key={report.id} className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-32 h-20 bg-zinc-900/50 rounded-lg overflow-hidden">
                    {video?.thumbnailUrl && (
                      <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-medium mb-2">{report.video_title || 'Unknown'}</h3>
                  <div className="space-y-1 text-sm mb-4">
                    <p className="text-zinc-400">Báo cáo bởi: <span className="text-white">{report.reporter_username || 'Unknown'}</span></p>
                    <p className="text-zinc-400">Lý do: <span className="text-[#ff3b5c]">{getReportTypeName(report.reason)}</span></p>
                    <p className="text-zinc-600 text-xs">{new Date(report.created_at).toLocaleString()}</p>
                    {report.status === 'resolved' && report.resolution_note && (
                      <p className="text-green-400 text-xs mt-2">✓ {report.resolution_note}</p>
                    )}
                    {report.status === 'resolved' && report.reviewed_at && (
                      <p className="text-zinc-600 text-xs">Xử lý lúc: {new Date(report.reviewed_at).toLocaleString()}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => onVideoClick(report.video_id)}
                      className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/30 h-9 rounded-lg"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Xem video
                    </Button>
                    {report.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => onResolveReport(report.id, report.video_id, true)}
                          className="bg-[#ff3b5c]/20 hover:bg-[#ff3b5c]/30 text-[#ff3b5c] border-[#ff3b5c]/30 h-9 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Xóa video
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => onResolveReport(report.id, report.video_id, false)}
                          className="bg-zinc-900/50 hover:bg-zinc-800 text-white border-zinc-800/50 h-9 rounded-lg"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Bỏ qua
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
      {apiVideoReports.filter((r: VideoReport) => r.status === videoReportsSubTab).length === 0 && (
        <div className="text-center py-24">
          <div className="w-16 h-16 rounded-full bg-zinc-900/50 flex items-center justify-center mx-auto mb-4">
            {videoReportsSubTab === 'pending' ? (
              <Flag className="w-8 h-8 text-zinc-600" />
            ) : (
              <CheckCircle className="w-8 h-8 text-zinc-600" />
            )}
          </div>
          <p className="text-zinc-500 text-sm">
            {videoReportsSubTab === 'pending' 
              ? 'Không có báo cáo chưa xử lý' 
              : 'Không có báo cáo đã xử lý'}
          </p>
        </div>
      )}
    </div>
  );
}
