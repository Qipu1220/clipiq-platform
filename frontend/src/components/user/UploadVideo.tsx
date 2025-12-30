import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addVideo } from '../../store/videosSlice';
import { addNotification } from '../../store/notificationsSlice';
import { RootState } from '../../store/store';
import { Upload, Video, ArrowLeft, X, FileVideo, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface UploadVideoProps {
  onUploadComplete: () => void;
}

export function UploadVideo({ onUploadComplete }: UploadVideoProps) {
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);
  const subscriptions = useSelector((state: RootState) => state.notifications.subscriptions);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      if (!file.type.startsWith('video/')) {
        setError('Vui lòng chọn file video');
        return;
      }

      setVideoFile(file);
      setError('');
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      if (!file.type.startsWith('image/')) {
        setError('Vui lòng chọn file ảnh');
        return;
      }
      setThumbnailFile(file);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!title.trim() || !videoFile || !currentUser) {
      setError('Vui lòng điền đầy đủ thông tin và chọn video');
      return;
    }

    // Get token from localStorage
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setError('Vui lòng đăng nhập lại');
      return;
    }

    setUploading(true);
    setError('');

    // Show loading toast
    const toastId = toast.loading('Đang tải lên video...');

    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('title', title);
      formData.append('description', description);
      if (thumbnailFile) {
        formData.append('thumbnail', thumbnailFile);
      }

      const response = await fetch('http://localhost:5000/api/v1/videos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Upload thất bại');
      }

      const result = await response.json();

      // Validate response structure
      if (!result.data?.video) {
        throw new Error('Server returned invalid response');
      }

      const uploadedVideo = result.data.video;

      // Validate required fields
      if (!uploadedVideo.id) {
        throw new Error('Server did not return video ID');
      }

      // Dismiss loading toast
      toast.dismiss(toastId);

      // Show success toast
      toast.success('Video đang được xử lý', {
        description: 'Video sẽ sẵn sàng trong 2-5 phút',
        duration: 4000,
      });

      // Add to Redux store
      dispatch(addVideo({
        id: uploadedVideo.id,
        title: uploadedVideo.title,
        description: uploadedVideo.description,
        uploader: currentUser.username,
        thumbnailUrl: uploadedVideo.thumbnail_url || '',
        videoUrl: uploadedVideo.video_url,
        views: 0,
        likes: [],
        uploadDate: Date.now(),
        comments: [],
        processing_status: uploadedVideo.processing_status || 'processing', // Track processing state
      }));

      // Send notifications to followers
      Object.entries(subscriptions).forEach(([follower, following]) => {
        if (Array.isArray(following) && following.includes(currentUser.username)) {
          dispatch(addNotification({
            type: 'new_video',
            uploaderUsername: currentUser.username,
            videoId: uploadedVideo.id,
            videoTitle: title,
            timestamp: Date.now(),
          }));
        }
      });

      // Reset form
      setTitle('');
      setDescription('');
      setVideoFile(null);
      setThumbnailFile(null);

      // Immediate redirect to homepage
      onUploadComplete();

    } catch (err: any) {
      // Dismiss loading toast
      toast.dismiss(toastId);

      // Show error toast
      const errorMessage = err.message || 'Đã xảy ra lỗi khi upload';
      toast.error('Upload thất bại', {
        description: errorMessage,
        duration: 5000,
      });

      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8">
          {/* Back Button */}
          <div className="max-w-2xl mx-auto mb-6">
            <Button
              onClick={onUploadComplete}
              variant="ghost"
              className="text-white hover:bg-zinc-800 gap-2"
              disabled={uploading}
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại
            </Button>
          </div>

          <div className="max-w-2xl mx-auto">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Upload className="w-6 h-6" style={{ color: '#ff3b5c' }} />
                  Tải lên video
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-red-900/20 border border-red-800 rounded text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {/* Video File Input */}
                <div>
                  <Label className="text-zinc-300 mb-2 block">Video File *</Label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleVideoChange}
                      className="hidden"
                      id="video-input"
                      disabled={uploading}
                    />
                    <label
                      htmlFor="video-input"
                      className="flex items-center gap-3 p-4 bg-zinc-800 rounded border-2 border-dashed border-zinc-700 hover:border-zinc-600 cursor-pointer transition-colors"
                    >
                      <FileVideo className="w-8 h-8 text-zinc-500" />
                      <div className="flex-1">
                        {videoFile ? (
                          <div>
                            <p className="text-white font-medium">{videoFile.name}</p>
                            <p className="text-zinc-500 text-sm">
                              {(videoFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        ) : (
                          <p className="text-zinc-400">
                            Click để chọn video
                          </p>
                        )}
                      </div>
                      {videoFile && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setVideoFile(null);
                          }}
                          className="text-zinc-500 hover:text-white"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </label>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <Label className="text-zinc-300 mb-2 block">Tiêu đề *</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white"
                    placeholder="Nhập tiêu đề video"
                    disabled={uploading}
                  />
                </div>

                {/* Description */}
                <div>
                  <Label className="text-zinc-300 mb-2 block">Mô tả</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white"
                    placeholder="Nhập mô tả video"
                    rows={4}
                    disabled={uploading}
                  />
                </div>

                {/* Thumbnail File Input */}
                <div>
                  <Label className="text-zinc-300 mb-2 block">
                    Thumbnail (không bắt buộc)
                  </Label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailChange}
                      className="hidden"
                      id="thumbnail-input"
                      disabled={uploading}
                    />
                    <label
                      htmlFor="thumbnail-input"
                      className="flex items-center gap-3 p-4 bg-zinc-800 rounded border border-zinc-700 hover:border-zinc-600 cursor-pointer transition-colors"
                    >
                      <ImageIcon className="w-6 h-6 text-zinc-500" />
                      <div className="flex-1">
                        {thumbnailFile ? (
                          <p className="text-white text-sm">{thumbnailFile.name}</p>
                        ) : (
                          <p className="text-zinc-400 text-sm">
                            Click để chọn ảnh (tự động tạo nếu không chọn)
                          </p>
                        )}
                      </div>
                      {thumbnailFile && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setThumbnailFile(null);
                          }}
                          className="text-zinc-500 hover:text-white"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </label>
                  </div>
                </div>

                {/* Upload Button */}
                <Button
                  onClick={handleUpload}
                  className="w-full text-white"
                  style={{ backgroundColor: '#ff3b5c' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e6315a'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ff3b5c'}
                  disabled={!title.trim() || !videoFile || uploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? 'Đang tải lên...' : 'Tải lên video'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}