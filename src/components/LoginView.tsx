import React, { useState } from 'react';
import { loginUser } from '../api.ts';
import type { User } from '../types.ts';
import { KeyRound, AlertCircle, ShieldCheck, Lock, Building2 } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await loginUser(username.trim(), password);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F2] flex flex-col justify-between selection:bg-[#E4F2E9] selection:text-[#087A50]">
      {/* Institutional Top Header */}
      <header className="bg-gradient-to-r from-[#075B40] via-[#087A50] to-[#075B40] py-3 px-6 text-center shadow-md border-b border-[#075B40]">
        <p className="text-emerald-100 text-xs font-serif tracking-widest uppercase">
          جامعة دار الهدى الإسلامية • DARUL HUDA ISLAMIC UNIVERSITY
        </p>
        <h1 className="text-white text-xl md:text-2xl font-black tracking-tight mt-0.5">
          UPDHITE
        </h1>
        <p className="text-emerald-200 text-xs md:text-sm font-medium">
          Campus Work Management Portal • Central Operations & Maintenance
        </p>
      </header>

      {/* Main Login Box */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white border border-[#DCE8E0] rounded-3xl p-7 sm:p-9 shadow-[0_16px_36px_rgba(29,67,48,0.08),0_4px_12px_rgba(29,67,48,0.03)] relative">
          
          <div className="flex flex-col items-center text-center mb-7">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#098859] via-[#087A50] to-[#075B40] flex items-center justify-center text-white font-black text-2xl shadow-[0_8px_20px_rgba(8,122,80,0.3),inset_0_1px_2px_rgba(255,255,255,0.4)] border border-[#0a9e69]/40 mb-3.5">
              U
            </div>
            <h2 className="text-2xl font-extrabold text-[#172A24] tracking-tight">UPDHITE Portal</h2>
            <p className="text-xs text-[#697B72] mt-1 font-medium">
              Authorized Campus Administration, Section Offices & Workers Sign-in
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5 shadow-sm">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#172A24] uppercase tracking-wider mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                placeholder="Enter assigned username"
                className="w-full px-4 py-2.5 bg-[#F8FAF9] border border-[#DCE8E0] rounded-xl text-[#172A24] text-sm focus:outline-none focus:ring-2 focus:ring-[#087A50]/20 focus:border-[#087A50] shadow-[inset_0_2px_4px_rgba(23,42,36,0.04)] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#172A24] uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter assigned password"
                className="w-full px-4 py-2.5 bg-[#F8FAF9] border border-[#DCE8E0] rounded-xl text-[#172A24] text-sm focus:outline-none focus:ring-2 focus:ring-[#087A50]/20 focus:border-[#087A50] shadow-[inset_0_2px_4px_rgba(23,42,36,0.04)] transition"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-b from-[#098859] via-[#087A50] to-[#075B40] hover:from-[#0a9663] hover:to-[#064f37] text-white rounded-xl font-bold text-sm shadow-[0_6px_16px_rgba(8,122,80,0.3),inset_0_1px_1px_rgba(255,255,255,0.3)] hover:shadow-[0_8px_20px_rgba(8,122,80,0.35)] active:translate-y-0.5 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Sign In to UPDHITE</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-7 pt-5 border-t border-[#DCE8E0] text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-xs text-[#087A50] font-semibold">
              <Lock className="w-3.5 h-3.5" />
              <span>Full User Authority Controlled by Main Admin</span>
            </div>
            <p className="text-[11px] text-[#697B72] leading-relaxed">
              Section offices and field staff accounts are generated by the Main Administrator. Contact university administration for account setup.
            </p>
          </div>

        </div>
      </div>

      {/* Institutional Footer */}
      <footer className="bg-white py-3.5 text-center text-xs text-[#697B72] border-t border-[#DCE8E0] shadow-sm">
        UPDHITE • Darul Huda Islamic University, Chemmad, Tirurangadi, Malappuram
      </footer>
    </div>
  );
};
