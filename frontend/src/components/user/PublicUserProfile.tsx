import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { User, Video, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';

interface PublicUserProfileProps {
  username: string;
  onVideoClick: (videoId: string) => void;
  onBack: () => void;
}

export function PublicUserProfile({ username, onVideoClick, onBack }: PublicUserProfileProps) {
  const allUsers = useSelector((state: RootState) => state.users.allUsers);
  const videos = useSelector((state: RootState) => state.videos.videos);
  
  const user = allUsers.find(u => u.username === username);
  const userVideos = videos.filter(v => v.uploader === username);

  if (!user) {
    return (
      <div className="min-h-screen bg-black">
        <div className="container mx-auto px-4 py-8">
          <Button onClick={onBack} variant="outline" className="mb-4 bg-zinc-900">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <p className="text-white">User not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8">
        <Button onClick={onBack} variant="outline" className="mb-4 bg-zinc-900 text-white border-zinc-700 hover:bg-zinc-800">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="flex items-center gap-3 mb-8">
          {user.avatarUrl ? (
            <img 
              src={user.avatarUrl} 
              alt={user.username}
              className="w-16 h-16 rounded-full object-cover border-2 border-red-600"
            />
          ) : (
            <User className="w-8 h-8 text-red-600" />
          )}
          <div>
            <h1 className="text-white text-3xl">
              {user.displayName || user.username}
            </h1>
            <p className="text-zinc-400 text-sm">@{user.username}</p>
            <div className="flex gap-3 mt-2 text-sm">
              <span className="text-zinc-400">Role: {user.role}</span>
              {user.warnings > 0 && (
                <span className="text-yellow-500">{user.warnings} warnings</span>
              )}
              {user.banned && (
                <span className="text-red-500">BANNED</span>
              )}
              {!user.banned && user.warnings === 0 && (
                <span className="text-green-500">Good standing</span>
              )}
            </div>
          </div>
        </div>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Uploaded Videos ({userVideos.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {userVideos.length === 0 ? (
              <div className="text-center py-12">
                <Video className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-500">This user hasn't uploaded any videos yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userVideos.map(video => (
                  <div
                    key={video.id}
                    className="bg-zinc-800 rounded-lg overflow-hidden cursor-pointer hover:bg-zinc-750 transition-colors"
                    onClick={() => onVideoClick(video.id)}
                  >
                    <div className="aspect-video bg-zinc-900 flex items-center justify-center">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3">
                      <h3 className="text-white line-clamp-2 mb-1">{video.title}</h3>
                      <p className="text-sm text-zinc-400">{video.views.toLocaleString()} views</p>
                      <p className="text-sm text-zinc-400">{video.likes.length} likes</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        {new Date(video.uploadDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}