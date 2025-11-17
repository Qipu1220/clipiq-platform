import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addUserReport } from '../../store/reportsSlice';
import { RootState } from '../../store/store';
import { Flag, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export function ReportUser() {
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);
  const allUsers = useSelector((state: RootState) => state.users.allUsers);

  const [reportedUser, setReportedUser] = useState('');
  const [reason, setReason] = useState('');
  const [success, setSuccess] = useState(false);

  const otherUsers = allUsers.filter(u => u.username !== currentUser?.username && u.role === 'user');

  const handleSubmit = () => {
    if (!reportedUser || !reason.trim() || !currentUser) return;

    dispatch(addUserReport({
      id: Date.now().toString(),
      reportedUser,
      reportedBy: currentUser.username,
      reason,
      timestamp: Date.now(),
      status: 'pending',
    }));

    setReportedUser('');
    setReason('');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Flag className="w-6 h-6 text-red-600" />
                Report User
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {success && (
                <div className="p-4 bg-green-900/50 border border-green-700 rounded text-green-300">
                  Report submitted successfully. Our staff will review it.
                </div>
              )}

              <div>
                <Label className="text-zinc-300">Select User to Report</Label>
                <Select value={reportedUser} onValueChange={setReportedUser}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue placeholder="Choose a user..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {otherUsers.map(user => (
                      <SelectItem key={user.username} value={user.username}>
                        {user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-zinc-300">Reason for Report</Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  placeholder="Describe the violation (e.g., spam, harassment, inappropriate behavior)..."
                  rows={6}
                />
              </div>

              <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded">
                <div className="flex gap-2 text-yellow-500 mb-2">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm">
                    Please only report users who have violated our community guidelines.
                    False reports may result in action against your account.
                  </p>
                </div>
              </div>

              <Button
                onClick={handleSubmit}
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={!reportedUser || !reason.trim()}
              >
                <Flag className="w-4 h-4 mr-2" />
                Submit Report
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
