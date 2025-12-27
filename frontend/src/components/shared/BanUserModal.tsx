import { X, UserX } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';

interface BanUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  banDuration: string;
  setBanDuration: (value: string) => void;
  banReason: string;
  setBanReason: (value: string) => void;
  onConfirm: () => void;
}

export function BanUserModal({
  isOpen,
  onClose,
  username,
  banDuration,
  setBanDuration,
  banReason,
  setBanReason,
  onConfirm
}: BanUserModalProps) {
  if (!isOpen || !username) return null;

  return (
    <div data-modal-open="true" className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-[#ff3b5c]/30 rounded-xl w-full max-w-lg shadow-2xl">
        <div className="px-6 py-3 border-b border-zinc-900/50 bg-[#ff3b5c]/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#ff3b5c]/20 flex items-center justify-center">
                <UserX className="w-5 h-5 text-[#ff3b5c]" />
              </div>
              <div>
                <h3 className="text-white font-medium text-lg">Cấm người dùng</h3>
                <p className="text-zinc-500 text-xs">@{username}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <Label className="text-zinc-400 mb-2 block text-sm">Thời hạn (ngày)</Label>
            <Input
              type="number"
              value={banDuration}
              onChange={(e) => setBanDuration(e.target.value)}
              className="bg-zinc-900/50 border-zinc-800/50 text-white focus:border-[#ff3b5c] h-10"
              placeholder="Để trống = vĩnh viễn"
            />
            <p className="text-zinc-600 text-xs mt-1">Để trống để cấm vĩnh viễn</p>
          </div>

          <div>
            <Label className="text-zinc-400 mb-2 block text-sm">Lý do cấm</Label>
            <Input
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              className="bg-zinc-900/50 border-zinc-800/50 text-white focus:border-[#ff3b5c] h-10"
              placeholder="Vi phạm quy định cộng đồng..."
            />
          </div>
        </div>

        <div className="px-5 py-3 border-t border-zinc-900/50 flex gap-3 justify-end">
          <Button onClick={onClose} className="bg-zinc-900/50 hover:bg-zinc-800 text-white border-zinc-800/50 h-10 rounded-lg">
            Hủy
          </Button>
          <Button onClick={onConfirm} className="bg-[#ff3b5c] hover:bg-[#ff3b5c]/90 text-white h-10 rounded-lg">
            Xác nhận cấm
          </Button>
        </div>
      </div>
    </div>
  );
}
