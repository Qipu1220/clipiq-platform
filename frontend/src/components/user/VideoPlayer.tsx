import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { likeVideo, addComment, incrementViews } from '../../store/videosSlice';
import { addVideoReport, addCommentReport } from '../../store/reportsSlice';
import { subscribeToUser, unsubscribeFromUser } from '../../store/notificationsSlice';
import { Heart, Eye, MessageCircle, Flag, ArrowLeft, User, Bell, BellOff, MoreVertical, Copy, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '../ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Label } from '../ui/label';
import { toast } from 'sonner';

// Helper function to copy text with fallback
const copyToClipboard = (text: string) => {
  // Try modern clipboard API first
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => {
        toast.success('Đã copy bình luận');
      })
      .catch(() => {
        // Fallback to older method
        fallbackCopy(text);
      });
  } else {
    // Use fallback method directly
    fallbackCopy(text);
  }
};

const fallbackCopy = (text: string) => {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    document.execCommand('copy');
    toast.success('Đã copy bình luận');
  } catch (err) {
    toast.error('Không thể copy bình luận');
  }
  
  document.body.removeChild(textArea);
};

interface VideoPlayerProps {
  videoId: string;
  onBack: () => void;
  onViewUserProfile?: (username: string) => void;
}

export function VideoPlayer({ videoId, onBack, onViewUserProfile }: VideoPlayerProps) {
  const dispatch = useDispatch();
  const video = useSelector((state: RootState) =>
    state.videos.videos.find(v => v.id === videoId)
  );
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);
  const users = useSelector((state: RootState) => state.users.allUsers);

  const [commentText, setCommentText] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [showCommentReportModal, setShowCommentReportModal] = useState(false);
  const [selectedComment, setSelectedComment] = useState<{ id: string; text: string; username: string } | null>(null);
  const [commentReportReason, setCommentReportReason] = useState('');
  const [showCommentReportConfirm, setShowCommentReportConfirm] = useState(false);
  const [showVideoReportConfirm, setShowVideoReportConfirm] = useState(false);

  // Find the uploader info from users
  const uploaderInfo = video ? users.find(u => u.username === video.uploader) : null;

  // Check if user is subscribed to the uploader
  const subscriptions = useSelector((state: RootState) => state.notifications.subscriptions);
  const isSubscribed = currentUser ? subscriptions[currentUser.username]?.includes(video.uploader) : false;

  useEffect(() => {
    // Increment views only once when component mounts with this videoId
    dispatch(incrementViews(videoId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, dispatch]);

  if (!video || !currentUser) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white">Video not found</p>
      </div>
    );
  }

  const isLiked = video.likes.includes(currentUser.username);

  const handleLike = () => {
    dispatch(likeVideo({ videoId, username: currentUser.username }));
  };

  const handleComment = () => {
    if (!commentText.trim()) return;
    dispatch(addComment({
      videoId,
      comment: {
        id: Date.now().toString(),
        username: currentUser.username,
        text: commentText,
        timestamp: Date.now(),
      },
    }));
    setCommentText('');
  };

  const handleReport = () => {
    if (!reportReason.trim()) {
      toast.error('Vui lòng nhập lý do báo cáo');
      return;
    }
    setShowVideoReportConfirm(true);
  };

  const submitVideoReport = () => {
    dispatch(addVideoReport({
      id: Date.now().toString(),
      videoId,
      videoTitle: video.title,
      reportedBy: currentUser.username,
      reason: reportReason,
      timestamp: Date.now(),
      status: 'pending',
    }));
    toast.success('Báo cáo video đã được gửi! Staff sẽ xem xét trong 24-48 giờ.');
    setReportReason('');
    setReportOpen(false);
    setShowVideoReportConfirm(false);
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  const handleSubscribe = () => {
    if (!currentUser || currentUser.username === video.uploader) return;
    
    if (isSubscribed) {
      dispatch(unsubscribeFromUser({
        follower: currentUser.username,
        following: video.uploader,
      }));
    } else {
      dispatch(subscribeToUser({
        follower: currentUser.username,
        following: video.uploader,
      }));
    }
  };

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-white hover:bg-zinc-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-zinc-900 rounded-lg overflow-hidden aspect-video">
                <ImageWithFallback
                  src={video.thumbnailUrl || `https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&h=450&fit=crop`}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <h1 className="text-white text-2xl mb-2">{video.title}</h1>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4 text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {formatViews(video.views)} views
                    </span>
                    <span>{new Date(video.uploadDate).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLike}
                      className={`border-zinc-700 bg-zinc-900 ${isLiked ? 'text-red-500 border-red-500' : 'text-white'} hover:bg-zinc-800`}
                    >
                      <Heart className={`w-4 h-4 mr-2 ${isLiked ? 'fill-red-500' : ''}`} />
                      {video.likes.length}
                    </Button>

                    <Dialog open={reportOpen} onOpenChange={setReportOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800"
                        >
                          <Flag className="w-4 h-4 mr-2" />
                          Report
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
                        <DialogHeader>
                          <DialogTitle>Report Video</DialogTitle>
                          <DialogDescription>
                            Please provide a reason for reporting this video.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3">
                          <div>
                            <Label>Reason for report</Label>
                            <Textarea
                              value={reportReason}
                              onChange={(e) => setReportReason(e.target.value)}
                              className="bg-zinc-800 border-zinc-700 text-white"
                              placeholder="Describe the issue..."
                              rows={4}
                            />
                          </div>
                          <Button onClick={handleReport} className="w-full bg-red-600 hover:bg-red-700">
                            Submit Report
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="p-4 bg-zinc-900 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div 
                      className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => onViewUserProfile?.(video.uploader)}
                    >
                      {uploaderInfo?.avatarUrl ? (
                        <img 
                          src={uploaderInfo.avatarUrl} 
                          alt={video.uploader}
                          className="w-10 h-10 rounded-full object-cover border-2 border-red-600"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-red-600 flex items-center justify-center">
                          <User className="w-5 h-5 text-red-600" />
                        </div>
                      )}
                      <p className="text-white hover:text-red-500 transition-colors">
                        {uploaderInfo?.displayName || video.uploader}
                      </p>
                    </div>
                    
                    {currentUser.username !== video.uploader && (
                      <Button
                        onClick={handleSubscribe}
                        className={isSubscribed 
                          ? "bg-zinc-700 hover:bg-zinc-600 text-white"
                          : "bg-red-600 hover:bg-red-700 text-white"
                        }
                        size="sm"
                      >
                        {isSubscribed ? (
                          <>
                            <BellOff className="w-4 h-4 mr-2" />
                            Subscribed
                          </>
                        ) : (
                          <>
                            <Bell className="w-4 h-4 mr-2" />
                            Subscribe
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  <p className="text-zinc-400">{video.description}</p>
                </div>
              </div>

              <div className="bg-zinc-900 rounded-lg p-4">
                <h2 className="text-white mb-4 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  {video.comments.length} Comments
                </h2>

                <div className="space-y-3 mb-4">
                  <Textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white"
                    placeholder="Add a comment..."
                    rows={2}
                  />
                  <Button onClick={handleComment} className="bg-red-600 hover:bg-red-700">
                    Comment
                  </Button>
                </div>

                <div className="space-y-3">
                  {video.comments.map(comment => (
                    <div key={comment.id} className="p-3 bg-zinc-800 rounded group hover:bg-zinc-700/50 transition-colors relative">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white">{comment.username}</p>
                        <p className="text-xs text-zinc-500">
                          {new Date(comment.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <p className="text-zinc-300 pr-8">{comment.text}</p>
                      
                      {/* More Options Button */}
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 hover:bg-zinc-600 rounded-lg transition-colors">
                              <MoreVertical className="w-4 h-4 text-zinc-400" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                            <DropdownMenuItem 
                              onClick={() => {
                                copyToClipboard(comment.text);
                              }}
                              className="text-zinc-300 hover:text-white hover:bg-zinc-800 focus:text-white focus:bg-zinc-800 cursor-pointer"
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Copy bình luận
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedComment({
                                  id: comment.id,
                                  text: comment.text,
                                  username: comment.username
                                });
                                setShowCommentReportModal(true);
                              }}
                              className="text-zinc-300 hover:text-white hover:bg-zinc-800 focus:text-white focus:bg-zinc-800 cursor-pointer"
                            >
                              <Flag className="w-4 h-4 mr-2" />
                              Báo cáo
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-white">Related Videos</h3>
              <p className="text-zinc-500">No related videos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Comment Report Modal */}
      {showCommentReportModal && selectedComment && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-2xl w-full max-w-lg border border-zinc-800">
            {/* Header */}
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-600">
                  <Flag className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-white text-xl">Báo cáo bình luận</h2>
              </div>
              <button
                onClick={() => {
                  setShowCommentReportModal(false);
                  setSelectedComment(null);
                  setCommentReportReason('');
                }}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="bg-zinc-800 p-3 rounded-lg">
                <p className="text-zinc-400 text-sm mb-1">Bình luận của:</p>
                <p className="text-white mb-2">{selectedComment.username}</p>
                <p className="text-zinc-300 text-sm italic">"{selectedComment.text}"</p>
              </div>

              <div>
                <Label className="text-white text-sm mb-2 block">Lý do báo cáo</Label>
                <Textarea
                  value={commentReportReason}
                  onChange={(e) => setCommentReportReason(e.target.value)}
                  placeholder="Mô tả lý do bạn báo cáo bình luận này..."
                  className="bg-zinc-800 border-zinc-700 text-white min-h-[120px] resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-zinc-800 flex gap-3">
              <Button
                onClick={() => {
                  setShowCommentReportModal(false);
                  setSelectedComment(null);
                  setCommentReportReason('');
                }}
                variant="outline"
                className="flex-1 bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700"
              >
                Hủy
              </Button>
              <Button
                onClick={() => {
                  if (!commentReportReason.trim()) {
                    toast.error('Vui lòng nhập lý do báo cáo');
                    return;
                  }
                  setShowCommentReportConfirm(true);
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                Gửi báo cáo
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Video Report Confirmation Dialog */}
      <AlertDialog open={showVideoReportConfirm} onOpenChange={setShowVideoReportConfirm}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <Flag className="w-5 h-5 text-red-500" />
              Xác nhận báo cáo video
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Bạn có chắc chắn muốn gửi báo cáo này không? Hành động này không thể hoàn tác.
              <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-500 text-sm">
                  ⚠️ <strong>Cảnh báo:</strong> Báo cáo sai sự thật có thể dẫn đến việc tài khoản của bạn bị hạn chế hoặc khóa vĩnh viễn. Staff sẽ xem xét kỹ lưỡng báo cáo này.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700">
              Hủy bỏ
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={submitVideoReport}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Xác nhận gửi báo cáo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Comment Report Confirmation Dialog */}
      <AlertDialog open={showCommentReportConfirm} onOpenChange={setShowCommentReportConfirm}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <Flag className="w-5 h-5 text-red-500" />
              Xác nhận báo cáo bình luận
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Bạn có chắc chắn muốn báo cáo bình luận của <strong className="text-white">{selectedComment?.username}</strong> không? Hành động này không thể hoàn tác.
              <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-500 text-sm">
                  ⚠️ <strong>Cảnh báo:</strong> Báo cáo sai có thể dẫn đến việc tài khoản của bạn bị hạn chế hoặc khóa vĩnh viễn. Hãy chắc chắn rằng bình luận này thực sự vi phạm quy định.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700">
              Hủy bỏ
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedComment && video) {
                  dispatch(addCommentReport({
                    id: Date.now().toString(),
                    commentId: selectedComment.id,
                    commentText: selectedComment.text,
                    commentUsername: selectedComment.username,
                    videoId: video.id,
                    videoTitle: video.title,
                    reportedBy: currentUser!.id,
                    reportedByUsername: currentUser!.username,
                    reason: commentReportReason,
                    timestamp: Date.now(),
                    status: 'pending',
                  }));
                  toast.success('Báo cáo bình luận đã được gửi! Staff sẽ xem xét trong 24-48 giờ.');
                  setShowCommentReportModal(false);
                  setShowCommentReportConfirm(false);
                  setSelectedComment(null);
                  setCommentReportReason('');
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Xác nhận gửi báo cáo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}