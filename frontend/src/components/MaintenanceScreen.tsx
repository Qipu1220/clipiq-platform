import { AlertTriangle } from 'lucide-react';

export function MaintenanceScreen() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <AlertTriangle className="w-20 h-20 text-red-600 mx-auto mb-4" />
        <h1 className="text-white text-4xl mb-4">Đang bảo trì</h1>
        <p className="text-zinc-400 text-lg">
          Trang web hiện đang được bảo trì. Vui lòng quay lại sau.
        </p>
      </div>
    </div>
  );
}