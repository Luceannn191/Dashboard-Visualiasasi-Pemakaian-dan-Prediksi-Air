import { useState, useEffect } from 'react';
import { Lock, ShieldAlert } from 'lucide-react';

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD as string;
const SESSION_KEY = 'tirta_musi_admin_auth';

export default function AdminGate({ children }: { children: React.ReactNode }) {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [inputPass, setInputPass] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Cek apakah sudah pernah login di tab/session ini
  useEffect(() => {
    const sudahLogin = sessionStorage.getItem(SESSION_KEY);
    if (sudahLogin === 'true') {
      setIsUnlocked(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!ADMIN_PASSWORD) {
      setError('VITE_ADMIN_PASSWORD belum diset di .env — hubungi developer.');
      return;
    }

    if (inputPass === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      setIsUnlocked(true);
      setError('');
    } else {
      setError('Password salah. Coba lagi.');
      setInputPass('');
    }
  };

  if (isUnlocked) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 w-full max-w-sm">
        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-bold text-slate-800 text-center mb-1">Area Terbatas</h1>
        <p className="text-xs text-slate-500 text-center mb-6">
          Masukkan password admin untuk mengakses dashboard input data.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={inputPass}
            onChange={(e) => setInputPass(e.target.value)}
            placeholder="Password admin..."
            autoFocus
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />

          {error && (
            <p className="text-xs text-red-600 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" /> {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all"
          >
            Masuk
          </button>
        </form>
      </div>
    </div>
  );
}