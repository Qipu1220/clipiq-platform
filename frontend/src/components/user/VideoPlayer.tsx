import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { likeVideo, addComment, incrementViews } from '../../store/videosSlice';
import { addVideoReport } from '../../store/reportsSlice';
import { subscribeToUser, unsubscribeFromUser } from '../../store/notificationsSlice';
import { Heart, Eye, MessageCircle, Flag, ArrowLeft, User, Bell, BellOff } from 'lucide-react';
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
import { Label } from '../ui/label';

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
    if (!reportReason.trim()) return;
    dispatch(addVideoReport({
      id: Date.now().toString(),
      videoId,
      videoTitle: video.title,
      reportedBy: currentUser.username,
      reason: reportReason,
      timestamp: Date.now(),
      status: 'pending',
    }));
    setReportReason('');
    setReportOpen(false);
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
    <div className="min-h-screen bg-black">
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
                  <div key={comment.id} className="p-3 bg-zinc-800 rounded">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-white">{comment.username}</p>
                      <p className="text-xs text-zinc-500">
                        {new Date(comment.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-zinc-300">{comment.text}</p>
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
  );
}