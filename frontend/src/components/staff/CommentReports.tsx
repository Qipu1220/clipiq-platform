import { useState } from 'react';
import { MessageSquare, CheckCircle, Trash2 } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { CommentReport } from '../../api/reports';

interface CommentReportsProps {
  apiCommentReports: CommentReport[];
  onResolveReport: (reportId: string, commentId: string, shouldDelete: boolean) => void;
  getReportTypeName: (type: string) => string;
}

export function CommentReports({
  apiCommentReports,
  onResolveReport,
  getReportTypeName
}: CommentReportsViewProps) {
  const [commentReportsSubTab, setCommentReportsSubTab] = useState<'pending' | 'resolved'>('pending');

  return (
    <div className="space-y-4">
      {/* Sub-tabs for Comment Reports */}
      <div className="flex gap-2 mb-6">
        <Button
          onClick={() => setCommentReportsSubTab('pending')}
          className={`h-10 px-6 rounded-lg transition-all ${
            commentReportsSubTab === 'pending'
              ? 'bg-[#ff3b5c] text-white'
              : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Chưa xử lý ({apiCommentReports.filter((r: CommentReport) => r.status === 'pending').length})
        </Button>
        <Button
          onClick={() => setCommentReportsSubTab('resolved')}
          className={`h-10 px-6 rounded-lg transition-all ${
            commentReportsSubTab === 'resolved'
              ? 'bg-[#ff3b5c] text-white'
              : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-white'
          }`}
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Đã xử lý ({apiCommentReports.filter((r: CommentReport) => r.status === 'resolved').length})
        </Button>
      </div>

      {/* Reports List */}
      {apiCommentReports.filter((r: CommentReport) => r.status === commentReportsSubTab).map((report: CommentReport) => (
        <Card key={report.id} className="bg-zinc-950/50 border-zinc-900/50 rounded-xl overflow-hidden">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Comment Content */}
              <div className="bg-zinc-900/30 p-4 rounded-lg border border-zinc-800/50">
                <p className="text-zinc-400 text-xs mb-2">Nội dung bình luận:</p>
                <p className="text-white text-sm">{report.comment_text || 'Bình luận đã bị xóa'}</p>
              </div>

              {/* Report Details */}
              <div className="flex-1">
                <div className="space-y-1 text-sm mb-4">
                  <p className="text-zinc-400">Bình luận bởi: <span className="text-white">{report.commenter_username || 'Unknown'}</span></p>
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
                
                {/* Action Buttons */}
                <div className="flex gap-2">
                  {report.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => onResolveReport(report.id, report.comment_id, true)}
                        className="bg-[#ff3b5c]/20 hover:bg-[#ff3b5c]/30 text-[#ff3b5c] border-[#ff3b5c]/30 h-9 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Xóa bình luận
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => onResolveReport(report.id, report.comment_id, false)}
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
      ))}
      {apiCommentReports.filter((r: CommentReport) => r.status === commentReportsSubTab).length === 0 && (
        <div className="text-center py-24">
          <div className="w-16 h-16 rounded-full bg-zinc-900/50 flex items-center justify-center mx-auto mb-4">
            {commentReportsSubTab === 'pending' ? (
              <MessageSquare className="w-8 h-8 text-zinc-600" />
            ) : (
              <CheckCircle className="w-8 h-8 text-zinc-600" />
            )}
          </div>
          <p className="text-zinc-500 text-sm">
            {commentReportsSubTab === 'pending' 
              ? 'Không có báo cáo chưa xử lý' 
              : 'Không có báo cáo đã xử lý'}
          </p>
        </div>
      )}
    </div>
  );
}
