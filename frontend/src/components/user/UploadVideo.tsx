import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addVideo } from '../../store/videosSlice';
import { RootState } from '../../store/store';
import { Upload, Video } from 'lucide-react';
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

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');

  const handleUpload = () => {
    if (!title.trim() || !currentUser) return;

    dispatch(addVideo({
      id: Date.now().toString(),
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

    setTitle('');
    setDescription('');
    setThumbnailUrl('');
    onUploadComplete();
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Upload className="w-6 h-6 text-red-600" />
                Upload Video
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-zinc-300">Video Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  placeholder="Enter video title"
                />
              </div>

              <div>
                <Label className="text-zinc-300">Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  placeholder="Enter video description"
                  rows={4}
                />
              </div>

              <div>
                <Label className="text-zinc-300">Thumbnail URL (optional)</Label>
                <Input
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  placeholder="Enter thumbnail URL or leave empty for default"
                />
              </div>

              <div className="p-4 bg-zinc-800 rounded border-2 border-dashed border-zinc-700 text-center">
                <Video className="w-12 h-12 text-zinc-600 mx-auto mb-2" />
                <p className="text-zinc-500 text-sm">
                  Video upload functionality (demo mode)
                </p>
              </div>

              <Button
                onClick={handleUpload}
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={!title.trim()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Video
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
