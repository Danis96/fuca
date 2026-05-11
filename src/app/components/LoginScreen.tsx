import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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

  const direction = mode === 'player' ? -1 : 1;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <motion.div
          className="absolute top-1/4 -left-20 w-96 h-96 rounded-full bg-emerald-500/20 blur-[120px]"
          animate={{ x: [0, 40, 0], y: [0, 30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-violet-500/20 blur-[120px]"
          animate={{ x: [0, -40, 0], y: [0, -30, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <motion.div
        className="w-full max-w-[460px]"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="panel p-8 glow-ring">
          <div className="text-center mb-6">
            <motion.div
              className="inline-flex items-center justify-center w-24 h-24 rounded-2xl mb-4 overflow-hidden shadow-lg shadow-black/40 ring-1 ring-white/10"
              initial={{ rotate: -180, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 180, damping: 14 }}
              whileHover={{ rotate: [0, -8, 8, 0], transition: { duration: 0.5 } }}
            >
              <img src="/fuca_logo.png" alt="Fuca" className="w-full h-full object-cover" />
            </motion.div>
            <motion.h1
              className="text-4xl font-bold mb-2 tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              Fuca
            </motion.h1>
            <motion.p
              className="text-gray-500 text-sm uppercase tracking-widest"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
            >
              Sunday League Football
            </motion.p>
          </div>

          <div className="relative grid grid-cols-2 gap-1 mb-6 bg-white/[0.04] p-1 rounded-xl border border-white/5">
            {(['player', 'admin'] as Mode[]).map((m) => {
              const active = mode === m;
              const Icon = m === 'player' ? UserIcon : Shield;
              return (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(''); }}
                  className={`relative flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                    active ? 'text-emerald-300' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="login-mode-indicator"
                      className="absolute inset-0 rounded-lg bg-emerald-500/15 border border-emerald-500/30"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {m === 'player' ? 'Player' : 'Admin'}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative overflow-hidden px-1.5 -mx-1.5 py-1 -my-1">
            <AnimatePresence mode="wait" initial={false}>
              {mode === 'player' ? (
                <motion.div
                  key="player"
                  initial={{ opacity: 0, x: 30 * direction }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 * direction }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-4"
                >
                  <motion.button
                    onClick={handleGoogle}
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-white hover:bg-gray-100 text-gray-900 py-3 rounded-xl font-medium transition flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_1px_0_rgba(255,255,255,0.4)_inset,0_2px_8px_rgba(0,0,0,0.25)]"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    {loading ? 'Signing in...' : 'Continue with Google'}
                  </motion.button>

                  <p className="text-xs text-gray-500 text-center pt-2">
                    New users will be registered as players automatically.
                  </p>
                </motion.div>
              ) : (
                <motion.form
                  key="admin"
                  onSubmit={handleAdminLogin}
                  initial={{ opacity: 0, x: 30 * direction }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 * direction }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-gray-400 mb-2">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="field-input"
                      placeholder="admin@example.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-gray-400 mb-2">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="field-input"
                      placeholder="Enter your password"
                      required
                    />
                  </div>

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <LogIn className="w-5 h-5" />
                    {loading ? 'Signing in...' : 'Admin Sign In'}
                  </motion.button>

                  <p className="text-xs text-gray-500 text-center pt-2">
                    Only authorised admin emails can sign in here.
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -6, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <motion.div
                  animate={{ x: [0, -6, 6, -4, 4, 0] }}
                  transition={{ duration: 0.4 }}
                  className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
                >
                  {error}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
