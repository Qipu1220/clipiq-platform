import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { logoutThunk } from '../store/authSlice';
import { AppDispatch } from '../store/store';

interface BannedModalProps {
  banReason?: string;
  banExpiry?: string;
  isPermanent: boolean;
}

export function BannedModal({ banReason, banExpiry, isPermanent }: BannedModalProps) {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    // Prevent user from closing modal with ESC or clicking outside
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleLogout = async () => {
    await dispatch(logoutThunk());
    window.location.reload();
  };

  const getTimeRemaining = (expiry?: string) => {
    if (!expiry) return null;
    const now = new Date().getTime();
    const expiryTime = new Date(expiry).getTime();
    const diff = expiryTime - now;

    if (diff <= 0) return 'Đã hết hạn';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days} ngày ${hours} giờ`;
    if (hours > 0) return `${hours} giờ ${minutes} phút`;
    return `${minutes} phút`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full p-8 border border-red-500/30">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-white mb-4">
          Tài khoản bị cấm
        </h2>

        {/* Message */}
        <div className="space-y-4 mb-6">
          <p className="text-zinc-300 text-center">
            Tài khoản của bạn đã bị cấm và không thể sử dụng nền tảng này.
          </p>

          {banReason && (
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
              <p className="text-sm text-zinc-300 mb-2 font-semibold">Lý do:</p>
              <p className="text-white">{banReason}</p>
            </div>
          )}

          <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
            <p className="text-sm text-zinc-400 mb-3">Thời hạn cấm</p>
            {isPermanent ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-400 font-bold text-xl text-center">
                  Vĩnh viễn
                </p>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-400/30 rounded-lg p-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-red-400 mb-1">
                    {getTimeRemaining(banExpiry)}
                  </p>
                  <p className="text-white">còn lại để được mở khóa</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
          <p className="text-sm text-zinc-300 mb-2 font-semibold">
            Nếu bạn cho rằng đây là một sai lầm, vui lòng liên hệ với bộ phận hỗ trợ của chúng tôi.
          </p>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
        >
          Đăng xuất
        </button>
      </div>
    </div>
  );
}
