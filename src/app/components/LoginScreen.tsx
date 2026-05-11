import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, LogIn, User as UserIcon } from 'lucide-react';
import { isAdminEmail } from '../../lib/admins';

type Mode = 'player' | 'admin';

export function LoginScreen() {
  const [mode, setMode] = useState<Mode>('player');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle, signInWithEmail } = useAuth();

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error(err);
      setError('Failed to sign in with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isAdminEmail(email)) {
      setError('This email is not registered as an admin.');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmail(email, password);
    } catch (err: any) {
      console.error(err);
      setError(err?.code === 'auth/invalid-credential'
        ? 'Wrong email or password.'
        : 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Fuca</h1>
            <p className="text-gray-600">Sunday League Football</p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => { setMode('player'); setError(''); }}
              className={`flex items-center justify-center gap-2 py-2 rounded-md font-medium transition text-sm ${
                mode === 'player'
                  ? 'bg-white text-green-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <UserIcon className="w-4 h-4" />
              Player
            </button>
            <button
              onClick={() => { setMode('admin'); setError(''); }}
              className={`flex items-center justify-center gap-2 py-2 rounded-md font-medium transition text-sm ${
                mode === 'admin'
                  ? 'bg-white text-green-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Shield className="w-4 h-4" />
              Admin
            </button>
          </div>

          {mode === 'player' ? (
            <div className="space-y-4">
              <button
                onClick={handleGoogle}
                disabled={loading}
                className="w-full bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 py-3 rounded-lg font-medium transition flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {loading ? 'Signing in...' : 'Continue with Google'}
              </button>

              <p className="text-xs text-gray-500 text-center pt-2">
                New users will be registered as players automatically.
              </p>
            </div>
          ) : (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                  placeholder="admin@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                  placeholder="Enter your password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogIn className="w-5 h-5" />
                {loading ? 'Signing in...' : 'Admin Sign In'}
              </button>

              <p className="text-xs text-gray-500 text-center pt-2">
                Only authorised admin emails can sign in here.
              </p>
            </form>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
