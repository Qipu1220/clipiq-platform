import { AlertTriangle } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { logoutThunk } from '../store/authSlice';
import { AppDispatch } from '../store/store';

export function MaintenanceScreen() {
  const dispatch = useDispatch<AppDispatch>();

  const handleLogout = () => {
    dispatch(logoutThunk());
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <AlertTriangle className="w-20 h-20 text-red-600 mx-auto mb-4" />
        <h1 className="text-white text-4xl mb-4">Đang bảo trì</h1>
        <p className="text-zinc-400 text-lg mb-6">
          Trang web hiện đang được bảo trì. Vui lòng quay lại sau.
        </p>
        <button
          onClick={handleLogout}
          className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
        >
          Đăng xuất
        </button>
      </div>
    </div>
  );
}