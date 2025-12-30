import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { reportUserApi } from '../../api/reports';
import { RootState } from '../../store/store';
import { Flag, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
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
import { toast } from 'sonner';

export function ReportUser() {
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);
  const allUsers = useSelector((state: RootState) => state.users.allUsers);

  const [reportedUser, setReportedUser] = useState('');
  const [reason, setReason] = useState('');
  const [success, setSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const otherUsers = allUsers.filter(u => u.username !== currentUser?.username && u.role === 'user');

  const handleSubmit = () => {
    if (!reportedUser || !reason.trim() || !currentUser) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }
    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    try {
      // Map reason to a valid backend reason type
      await reportUserApi(reportedUser, 'other', reason);
      toast.success('Báo cáo người dùng đã được gửi! Staff sẽ xem xét trong 24-48 giờ.');
      setReportedUser('');
      setReason('');
      setSuccess(true);
      setShowConfirm(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Không thể gửi báo cáo. Vui lòng thử lại.';
      toast.error(errorMessage);
      setShowConfirm(false);
    }
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

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <Flag className="w-5 h-5 text-red-500" />
              Xác nhận báo cáo người dùng
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Bạn có chắc chắn muốn báo cáo người dùng <strong className="text-white">{reportedUser}</strong> không? Hành động này không thể hoàn tác.
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
              onClick={confirmSubmit}
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
