import { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { updateDisplayName, updateAvatar } from '../../store/authSlice';
import { updateUserDisplayName, updateUserAvatar } from '../../store/usersSlice';
import { User, Video, Settings, Upload, Image } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';

interface UserProfileProps {
  onVideoClick: (videoId: string) => void;
}

export function UserProfile({ onVideoClick }: UserProfileProps) {
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);
  const videos = useSelector((state: RootState) => state.videos.videos);
  
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '');
  const [avatarPreview, setAvatarPreview] = useState(currentUser?.avatarUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const myVideos = videos.filter(v => v.uploader === currentUser?.username);

  const handleUpdateDisplayName = () => {
    if (!currentUser) return;
    if (displayName.trim()) {
      dispatch(updateDisplayName(displayName));
      dispatch(updateUserDisplayName({ username: currentUser.username, displayName }));
      alert('Display name updated successfully!');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setAvatarUrl(result);
        setAvatarPreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateAvatar = () => {
    if (!currentUser) return;
    if (avatarUrl.trim()) {
      dispatch(updateAvatar(avatarUrl));
      dispatch(updateUserAvatar({ username: currentUser.username, avatarUrl }));
      alert('Avatar updated successfully!');
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          {currentUser?.avatarUrl ? (
            <img 
              src={currentUser.avatarUrl} 
              alt={currentUser.username}
              className="w-16 h-16 rounded-full object-cover border-2 border-red-600"
            />
          ) : (
            <User className="w-8 h-8 text-red-600" />
          )}
          <div>
            <h1 className="text-white text-3xl">
              {currentUser?.displayName || currentUser?.username}
            </h1>
            <p className="text-zinc-400 text-sm">@{currentUser?.username}</p>
          </div>
        </div>

        <Tabs defaultValue="videos" className="space-y-6">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger 
              value="videos" 
              className="data-[state=active]:bg-red-600 data-[state=active]:text-white text-zinc-400"
            >
              <Video className="w-4 h-4 mr-2" />
              My Videos ({myVideos.length})
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="data-[state=active]:bg-red-600 data-[state=active]:text-white text-zinc-400"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="videos">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Uploaded Videos</CardTitle>
              </CardHeader>
              <CardContent>
                {myVideos.length === 0 ? (
                  <div className="text-center py-12">
                    <Video className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                    <p className="text-zinc-500">You haven't uploaded any videos yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myVideos.map(video => (
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
          </TabsContent>

          <TabsContent value="settings">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Account Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-zinc-300">Username (cannot be changed)</Label>
                    <Input
                      value={currentUser?.username}
                      disabled
                      className="bg-zinc-800 border-zinc-700 text-zinc-500"
                    />
                  </div>

                  <div>
                    <Label className="text-zinc-300">Display Name</Label>
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white"
                      placeholder="Enter your display name"
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                      This is the name that will be shown on your profile and videos
                    </p>
                    <Button
                      onClick={handleUpdateDisplayName}
                      className="bg-red-600 hover:bg-red-700 text-white mt-2 w-full"
                    >
                      Save Display Name
                    </Button>
                  </div>

                  <div className="pt-4 border-t border-zinc-800">
                    <Label className="text-zinc-300 mb-3 block">Avatar Image</Label>
                    
                    {avatarPreview && (
                      <div className="mb-3 flex justify-center">
                        <img 
                          src={avatarPreview} 
                          alt="Avatar preview"
                          className="w-24 h-24 rounded-full object-cover border-2 border-red-600"
                        />
                      </div>
                    )
                    }
                    
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                        className="bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700 w-full"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Choose Image File
                      </Button>
                      
                      <p className="text-xs text-zinc-500 text-center">Or paste image URL below:</p>
                      
                      <Input
                        value={avatarUrl}
                        onChange={(e) => {
                          setAvatarUrl(e.target.value);
                          setAvatarPreview(e.target.value);
                        }}
                        className="bg-zinc-800 border-zinc-700 text-white"
                        placeholder="https://example.com/avatar.jpg"
                      />
                      
                      <Button
                        onClick={handleUpdateAvatar}
                        className="bg-red-600 hover:bg-red-700 text-white w-full"
                        disabled={!avatarUrl.trim()}
                      >
                        <Image className="w-4 h-4 mr-2" />
                        Update Avatar
                      </Button>
                    </div>
                    
                    <p className="text-xs text-zinc-500 mt-2">
                      Maximum file size: 5MB. Supported formats: JPG, PNG, GIF
                    </p>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*"
                  />
                </div>

                <div className="pt-6 border-t border-zinc-800">
                  <h3 className="text-white mb-2">Account Information</h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-zinc-400">
                      <span className="text-zinc-300">Role:</span> {currentUser?.role}
                    </p>
                    <p className="text-zinc-400">
                      <span className="text-zinc-300">Warnings:</span> {currentUser?.warnings || 0}
                    </p>
                    <p className="text-zinc-400">
                      <span className="text-zinc-300">Status:</span>{' '}
                      {currentUser?.banned ? (
                        <span className="text-red-500">Banned</span>
                      ) : (
                        <span className="text-green-500">Active</span>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}