import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addVideo } from '../../store/videosSlice';
import { addNotification } from '../../store/notificationsSlice';
import { RootState } from '../../store/store';
import { Upload, Video, ArrowLeft } from 'lucide-react';
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
  const [thumbnailUrl, setThumbnailUrl] = useState('');

  const handleUpload = () => {
    if (!title.trim() || !currentUser) return;

    const videoId = Date.now().toString();

    dispatch(addVideo({
      id: videoId,
      title,
      description,
      uploader: currentUser.username,
      thumbnailUrl: thumbnailUrl || '',
      videoUrl: '',
      views: 0,
      likes: [],
      uploadDate: Date.now(),
      comments: [],
    }));

    // Send notifications to all followers
    Object.entries(subscriptions).forEach(([follower, following]) => {
      if (Array.isArray(following) && following.includes(currentUser.username)) {
        dispatch(addNotification({
          type: 'new_video',
          uploaderUsername: currentUser.username,
          videoId: videoId,
          videoTitle: title,
          timestamp: Date.now(),
        }));
      }
    });

    setTitle('');
    setDescription('');
    setThumbnailUrl('');
    onUploadComplete();
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
                <div>
                  <Label className="text-zinc-300 mb-2 block">Video Title</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white"
                    placeholder="Nhập tiêu đề video"
                  />
                </div>

                <div>
                  <Label className="text-zinc-300 mb-2 block">Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white"
                    placeholder="Nhập mô tả video"
                    rows={4}
                  />
                </div>

                <div>
                  <Label className="text-zinc-300 mb-2 block">Thumbnail URL (optional)</Label>
                  <Input
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white"
                    placeholder="Nhập URL thumbnail hoặc để trống"
                  />
                </div>

                <div className="p-4 bg-zinc-800 rounded border-2 border-dashed border-zinc-700 text-center">
                  <Video className="w-12 h-12 text-zinc-600 mx-auto mb-2" />
                  <p className="text-zinc-500 text-sm">
                    Chức năng tải lên video (chế độ demo)
                  </p>
                </div>

                <Button
                  onClick={handleUpload}
                  className="w-full text-white"
                  style={{ backgroundColor: '#ff3b5c' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e6315a'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ff3b5c'}
                  disabled={!title.trim()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Tải lên video
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}