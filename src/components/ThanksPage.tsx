import { CheckCircle, Home, Key } from 'lucide-react';

interface ThanksPageProps {
  onGoHome: () => void;
  onGoToKeys: () => void;
}

export function ThanksPage({ onGoHome, onGoToKeys }: ThanksPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <CheckCircle className="w-20 h-20 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Terima kasih!</h1>
        <p className="text-gray-400 mb-6">
          Pembayaran Anda telah diterima. Key akan muncul di My Keys setelah merchant memverifikasi. Jika sudah verify, refresh halaman My Keys.
        </p>
        <div className="space-y-3">
          <button
            onClick={onGoToKeys}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Key className="w-5 h-5" />
            Lihat My Keys
          </button>
          <button
            onClick={onGoHome}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            Kembali ke Beranda
          </button>
        </div>
      </div>
    </div>
  );
}
