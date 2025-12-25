import { useState, useEffect } from 'react';
import { ArrowLeft, Eye, Heart, MessageCircle, AlertTriangle, UserX, User, Calendar, Mail, Shield, Flag, Ban, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { getVideoReportDetailsApi, banUserApi, warnUserApi } from '../../api/admin';
import { toast } from 'sonner';

interface VideoReportReviewProps {
  videoId: string;
  onBack: () => void;
}

interface VideoDetails {
  video: {
    id: string;
    title: string;
    description: string;
    videoUrl: string;
    thumbnailUrl: string;
    views: number;
    likes: number;
    commentCount: number;
    uploadDate: string;
    status: string;
  };
  uploader: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    email: string;
    role: string;
    banned: boolean;
    warnings: number;
    joinedDate: string;
  };
  reports: Array<{
    id: string;
    reason: string;
    evidenceUrl: string;
    status: string;
    createdAt: string;
    reporter: {
      username: string;
      displayName: string;
      avatarUrl: string;
    };
  }>;
  comments: Array<{
    id: string;
    text: string;
    createdAt: string;
    user: {
      username: string;
      displayName: string;
      avatarUrl: string;
    };
  }>;
  reportCount: number;
}

export function VideoReportReview({ videoId, onBack }: VideoReportReviewProps) {
  const [details, setDetails] = useState<VideoDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  
  // Modal states
  const [showBanModal, setShowBanModal] = useState(false);
  const [banDuration, setBanDuration] = useState('');
  const [banReason, setBanReason] = useState('');
  
  const [showWarnModal, setShowWarnModal] = useState(false);
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

  useEffect(() => {
    fetchVideoDetails();
  }, [videoId]);

  const fetchVideoDetails = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching video report details for videoId:', videoId);
      const data = await getVideoReportDetailsApi(videoId);
      console.log('✅ Video report details received:', data);
      console.log('📹 Video URL:', data?.video?.videoUrl);
      console.log('🖼️ Thumbnail URL:', data?.video?.thumbnailUrl);
      setDetails(data);
      setVideoError(false);
    } catch (error) {
      console.error('❌ Error fetching video report details:', error);
      toast.error('Không thể tải thông tin báo cáo video');
    } finally {
      setLoading(false);
    }
  };

  const getReportTypeName = (type: string): string => {
    const typeMap: Record<string, string> = {
      'spam': 'Spam hoặc quảng cáo',
      'harassment': 'Quấy rối hoặc bắt nạt',
      'hate': 'Ngôn từ gây thù ghét',
      'violence': 'Bạo lực hoặc nguy hiểm',
      'nudity': 'Nội dung không phù hợp',
      'copyright': 'Vi phạm bản quyền',
      'misleading': 'Thông tin sai lệch',
      'other': 'Khác'
    };
    return typeMap[type] || type;
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  const handleBanUser = async () => {
    if (!details) return;
    
    if (!banReason) {
      toast.error('Vui lòng nhập lý do cấm!');
      return;
    }
    
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
        ? `Bạn có chắc muốn cấm vĩnh viễn người dùng ${details.uploader.username}?`
        : `Bạn có chắc muốn cấm người dùng ${details.uploader.username} trong ${durationValue} ngày?`,
      confirmText: isPermanent ? 'Cấm vĩnh viễn' : 'Cấm tạm thời',
      confirmColor: '#ff3b5c',
      onConfirm: async () => {
        try {
          await banUserApi(details.uploader.username, banReason, durationValue);
          toast.success(isPermanent ? `Đã cấm vĩnh viễn người dùng ${details.uploader.username}` : `Đã cấm người dùng ${details.uploader.username} trong ${durationValue} ngày`);
          setBanDuration('');
          setBanReason('');
          setShowConfirmModal(false);
          setShowBanModal(false);
          // Refresh details
          await fetchVideoDetails();
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

  const handleWarnUser = async () => {
    if (!details) return;
    
    if (!warnReason) {
      toast.error('Vui lòng nhập lý do cảnh báo!');
      return;
    }
    
    const currentWarnings = details.uploader.warnings || 0;
    const durationValue = currentWarnings === 0 ? 30 : currentWarnings === 1 ? 60 : 90;
    const warningLevel = currentWarnings + 1;
    
    setConfirmAction({
      type: 'warn-user',
      title: 'Cảnh báo người dùng',
      message: `Bạn có chắc muốn cảnh báo người dùng ${details.uploader.username}?\n\nĐây sẽ là cảnh báo lần ${warningLevel}.\nThời hạn: ${durationValue} ngày (tự động xóa sau ${durationValue} ngày không vi phạm).`,
      confirmText: 'Cảnh báo',
      confirmColor: '#eab308',
      onConfirm: async () => {
        try {
          await warnUserApi(details.uploader.username, warnReason, durationValue);
          toast.success(`Đã cảnh báo người dùng ${details.uploader.username}`);
          setWarnReason('');
          setShowConfirmModal(false);
          setShowWarnModal(false);
          // Refresh details
          await fetchVideoDetails();
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

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Đang tải...</div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Không tìm thấy video</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 bg-gradient-to-r from-zinc-900/80 to-zinc-900/40 border border-zinc-800/50 rounded-xl p-4">
            <Button
              onClick={onBack}
              className="bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 h-10 px-4 rounded-lg transition-all"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại danh sách
            </Button>
            <div className="flex items-center gap-3 bg-[#ff3b5c]/10 border border-[#ff3b5c]/30 px-6 py-2.5 rounded-lg">
              <Shield className="w-5 h-5 text-[#ff3b5c]" />
              <span className="text-[#ff3b5c] font-semibold text-sm">Xem xét video</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Video Player & Info */}
            <div className="lg:col-span-2 space-y-5">
              {/* Video Player */}
              <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-xl overflow-hidden aspect-video border border-zinc-800/50 shadow-2xl flex items-center justify-center relative">
                {details.video.videoUrl && !videoError ? (
                  <video
                    src={details.video.videoUrl}
                    poster={details.video.thumbnailUrl}
                    controls
                    className="w-full h-full"
                    onError={(e) => {
                      console.error('❌ Video load error:', e);
                      console.error('Failed video URL:', details.video.videoUrl);
                      setVideoError(true);
                    }}
                    onLoadedData={() => console.log('✅ Video loaded successfully')}
                  />
                ) : (
                  <div className="text-zinc-200 text-sm flex flex-col items-center justify-center gap-2">
                    <div className="bg-zinc-800/70 px-3 py-2 rounded-lg border border-zinc-700/70 text-center">
                      <p className="font-semibold text-white">Không tải được video</p>
                      <p className="text-zinc-400 text-xs">Kiểm tra URL nguồn hoặc thử lại sau</p>
                      {details?.video?.videoUrl && (
                        <p className="text-zinc-500 text-xs mt-1 break-all">URL: {details.video.videoUrl}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Video Title & Stats */}
              <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 border border-zinc-800/50 rounded-xl p-5 shadow-lg">
                <h1 className="text-white text-2xl font-bold mb-4">{details.video.title}</h1>
                <div className="flex items-center gap-6 text-zinc-400 mb-4 pb-4 border-b border-zinc-800/50">
                  <div className="flex items-center gap-2 bg-blue-500/10 px-3 py-1.5 rounded-lg">
                    <Eye className="w-4 h-4 text-blue-400" />
                    <span className="text-blue-400 font-medium text-sm">{formatViews(details.video.views)}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-pink-500/10 px-3 py-1.5 rounded-lg">
                    <Heart className="w-4 h-4 text-pink-400" />
                    <span className="text-pink-400 font-medium text-sm">{details.video.likes}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-green-500/10 px-3 py-1.5 rounded-lg">
                    <MessageCircle className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 font-medium text-sm">{details.video.commentCount}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-zinc-800/50 px-3 py-1.5 rounded-lg">
                    <Calendar className="w-4 h-4 text-zinc-400" />
                    <span className="text-zinc-300 text-sm">
                      {new Date(details.video.uploadDate).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                </div>
                {details.video.description && (
                  <p className="text-zinc-300 text-sm leading-relaxed">{details.video.description}</p>
                )}
              </div>

              {/* Report Details */}
              <div className="bg-gradient-to-br from-red-950/30 to-zinc-950/50 border border-red-900/50 rounded-xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-red-900/30">
                  <div className="flex items-center gap-3">
                    <div className="bg-red-500/20 p-2 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                    <h2 className="text-white font-bold text-lg">
                      Danh sách báo cáo
                    </h2>
                  </div>
                  <div className="bg-red-500/20 border border-red-500/30 px-4 py-1.5 rounded-lg">
                    <span className="text-red-400 font-bold text-sm">{details.reportCount} báo cáo</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {details.reports.map((report) => (
                    <div key={report.id} className="bg-zinc-900/50 rounded-lg p-4 border border-red-900/30 hover:border-red-800/50 transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <ImageWithFallback
                            src={report.reporter.avatarUrl}
                            alt={report.reporter.username}
                            className="w-6 h-6 rounded-full"
                          />
                          <span className="text-zinc-300 text-sm font-medium">
                            @{report.reporter.username}
                          </span>
                        </div>
                        <span className="text-xs text-zinc-500">
                          {new Date(report.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">
                          {getReportTypeName(report.reason)}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          report.status === 'pending' 
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-green-500/20 text-green-400'
                        }`}>
                          {report.status === 'pending' ? 'Chờ xử lý' : 'Đã xử lý'}
                        </span>
                      </div>
                      {report.evidenceUrl && (
                        <p className="text-zinc-400 text-sm">{report.evidenceUrl}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Comments Section */}
              <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 border border-zinc-800/50 rounded-xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800/50">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-500/20 p-2 rounded-lg">
                      <MessageCircle className="w-5 h-5 text-blue-400" />
                    </div>
                    <h2 className="text-white font-bold text-lg">
                      Bình luận
                    </h2>
                  </div>
                  <div className="bg-blue-500/20 border border-blue-500/30 px-4 py-1.5 rounded-lg">
                    <span className="text-blue-400 font-bold text-sm">{details.comments.length} bình luận</span>
                  </div>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {details.comments.length === 0 ? (
                    <p className="text-zinc-500 text-sm">Chưa có bình luận nào</p>
                  ) : (
                    details.comments.map((comment) => (
                      <div key={comment.id} className="bg-zinc-800/30 rounded-lg p-3">
                        <div className="flex items-start gap-3">
                          <ImageWithFallback
                            src={comment.user.avatarUrl}
                            alt={comment.user.username}
                            className="w-8 h-8 rounded-full"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-white text-sm font-medium">
                                {comment.user.displayName || comment.user.username}
                              </span>
                              <span className="text-zinc-500 text-xs">
                                @{comment.user.username}
                              </span>
                              <span className="text-zinc-500 text-xs">
                                · {new Date(comment.createdAt).toLocaleDateString('vi-VN')}
                              </span>
                            </div>
                            <p className="text-zinc-300 text-sm">{comment.text}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right: Uploader Info & Actions */}
            <div className="space-y-5">
              {/* Uploader Profile */}
              <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 border border-zinc-800/50 rounded-xl p-5 shadow-lg">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-zinc-800/50">
                  <div className="bg-purple-500/20 p-2 rounded-lg">
                    <User className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="text-white font-bold text-lg">
                    Người đăng video
                  </h2>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <ImageWithFallback
                      src={details.uploader.avatarUrl}
                      alt={details.uploader.username}
                      className="w-16 h-16 rounded-full border-2 border-zinc-700"
                    />
                    <div className="flex-1">
                      <h3 className="text-white font-semibold">
                        {details.uploader.displayName || details.uploader.username}
                      </h3>
                      <p className="text-zinc-400 text-sm">@{details.uploader.username}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Mail className="w-4 h-4" />
                      <span>{details.uploader.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Shield className="w-4 h-4" />
                      <span className="capitalize">{details.uploader.role}</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Calendar className="w-4 h-4" />
                      <span>Tham gia {new Date(details.uploader.joinedDate).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>

                  {/* User Status */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {details.uploader.banned && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-red-500 text-red-500 text-xs font-semibold shadow-md">
                        <Ban className="w-4 h-4" />
                        Đã bị cấm
                      </div>
                    )}
                    {details.uploader.warnings > 0 && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-yellow-500 text-yellow-500 text-xs font-semibold shadow-md">
                        <AlertTriangle className="w-4 h-4" />
                        {details.uploader.warnings} cảnh báo
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Staff Actions */}
              <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 border border-zinc-800/50 rounded-xl p-5 shadow-lg">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-zinc-800/50">
                  <div className="bg-orange-500/20 p-2 rounded-lg">
                    <Shield className="w-5 h-5 text-orange-400" />
                  </div>
                  <h2 className="text-white font-bold text-lg">Hành động quản lý</h2>
                </div>
                <div className="space-y-3">
                  <Button
                    onClick={() => setShowWarnModal(true)}
                    className="w-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 hover:from-yellow-500/30 hover:to-orange-500/30 text-yellow-400 border border-yellow-500/30 h-11 rounded-lg font-semibold transition-all shadow-lg hover:shadow-yellow-500/20"
                  >
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Cảnh báo người dùng
                  </Button>
                  <Button
                    onClick={() => setShowBanModal(true)}
                    className="w-full bg-gradient-to-r from-[#ff3b5c]/20 to-red-600/20 hover:from-[#ff3b5c]/30 hover:to-red-600/30 text-[#ff3b5c] border border-[#ff3b5c]/30 h-11 rounded-lg font-semibold transition-all shadow-lg hover:shadow-red-500/20"
                  >
                    <Ban className="w-5 h-5 mr-2" />
                    Cấm người dùng này
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ban User Modal */}
      {showBanModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-100 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <UserX className="w-6 h-6 text-[#ff3b5c]" />
                Cấm người dùng
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowBanModal(false);
                  setBanDuration('');
                  setBanReason('');
                }}
                className="text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
                <p className="text-zinc-300 text-sm">
                  <span className="text-zinc-500">Người dùng:</span> <span className="text-white font-medium">@{details.uploader.username}</span>
                </p>
              </div>

              <div>
                <Label className="text-zinc-300 mb-2 block">Thời hạn cấm (ngày)</Label>
                <Input
                  type="number"
                  placeholder="Để trống = vĩnh viễn"
                  value={banDuration}
                  onChange={(e) => setBanDuration(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                />
                <p className="text-zinc-500 text-xs mt-1">Để trống để cấm vĩnh viễn</p>
              </div>

              <div>
                <Label className="text-zinc-300 mb-2 block">Lý do cấm *</Label>
                <Input
                  placeholder="Nhập lý do cấm..."
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => {
                    setShowBanModal(false);
                    setBanDuration('');
                    setBanReason('');
                  }}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700"
                >
                  Hủy
                </Button>
                <Button
                  onClick={handleBanUser}
                  className="flex-1 bg-[#ff3b5c] hover:bg-[#ff2847] text-white font-semibold"
                >
                  Cấm người dùng
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warn User Modal */}
      {showWarnModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-100 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-yellow-400" />
                Cảnh báo người dùng
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowWarnModal(false);
                  setWarnReason('');
                }}
                className="text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
                <p className="text-zinc-300 text-sm">
                  <span className="text-zinc-500">Người dùng:</span> <span className="text-white font-medium">@{details.uploader.username}</span>
                </p>
                <p className="text-zinc-300 text-sm mt-1">
                  <span className="text-zinc-500">Cảnh báo hiện tại:</span> <span className="text-yellow-400 font-medium">{details.uploader.warnings}</span>
                </p>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-yellow-400 text-xs">
                  Cảnh báo này sẽ tồn tại {details.uploader.warnings === 0 ? '30' : details.uploader.warnings === 1 ? '60' : '90'} ngày và tự động xóa nếu không có vi phạm mới.
                </p>
              </div>

              <div>
                <Label className="text-zinc-300 mb-2 block">Lý do cảnh báo *</Label>
                <Input
                  placeholder="Nhập lý do cảnh báo..."
                  value={warnReason}
                  onChange={(e) => setWarnReason(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => {
                    setShowWarnModal(false);
                    setWarnReason('');
                  }}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700"
                >
                  Hủy
                </Button>
                <Button
                  onClick={handleWarnUser}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                >
                  Cảnh báo
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Action Modal */}
      {showConfirmModal && confirmAction && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-100 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">{confirmAction.title}</h3>
            <p className="text-zinc-300 mb-6 whitespace-pre-line">{confirmAction.message}</p>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmAction(null);
                }}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700"
              >
                Hủy
              </Button>
              <Button
                onClick={confirmAction.onConfirm}
                style={{ backgroundColor: confirmAction.confirmColor }}
                className="flex-1 text-white font-semibold hover:opacity-90"
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
