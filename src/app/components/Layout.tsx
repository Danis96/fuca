import { ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Home, Users, Calendar, Trophy, LogOut, Menu, X, Sun, Moon } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { signOut, userProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', icon: Home, page: 'dashboard' },
    { name: 'Players', icon: Users, page: 'players' },
    { name: 'Matches', icon: Calendar, page: 'matches' },
    { name: 'Leaderboard', icon: Trophy, page: 'leaderboard' },
  ];

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-40 glass border-b border-white/5 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <motion.div
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
              >
                <motion.div
                  className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-black/40 ring-1 ring-white/10"
                  whileHover={{ rotate: [0, -10, 10, 0], scale: 1.08 }}
                  transition={{ duration: 0.5 }}
                >
                  <img src="/fuca_logo.png" alt="Fuca" className="w-full h-full object-cover" />
                </motion.div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight">Fuca <span className="text-emerald-400">·</span> Sunday League</h1>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wider">Football Dashboard</p>
                </div>
              </motion.div>

              <div className="hidden md:flex ml-10 space-x-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const active = currentPage === item.page;
                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        onNavigate(item.page);
                        setMobileMenuOpen(false);
                      }}
                      className={`relative nav-link ${active ? 'active' : ''}`}
                    >
                      {active && (
                        <motion.span
                          layoutId="nav-active-indicator"
                          className="absolute inset-0 rounded-lg bg-emerald-500/15 border border-emerald-500/30 -z-0"
                          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {item.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <motion.button
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className="theme-toggle"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92, rotate: 180 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              >
                <Sun className={`w-4 h-4 absolute transition-all duration-500 ${theme === 'light' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}`} />
                <Moon className={`w-4 h-4 absolute transition-all duration-500 ${theme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-50'}`} />
              </motion.button>

              <div className="hidden md:flex user-chip">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-violet-950 font-bold text-sm">
                  {userProfile?.email?.charAt(0).toUpperCase() ?? '?'}
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium leading-tight">{userProfile?.email}</p>
                  <p className="text-[10px] text-gray-500 capitalize">{userProfile?.role}</p>
                </div>
              </div>

              <motion.button
                onClick={handleSignOut}
                title="Sign out"
                className="hidden md:flex icon-action"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
              >
                <LogOut className="w-4 h-4" />
              </motion.button>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-gray-600 hover:text-gray-900 relative"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={mobileMenuOpen ? 'x' : 'menu'}
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="inline-flex"
                  >
                    {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                  </motion.span>
                </AnimatePresence>
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {mobileMenuOpen && (
            <motion.div
              key="mobile-menu"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="md:hidden border-t border-gray-200 overflow-hidden"
            >
              <div className="px-4 py-3 space-y-1">
                {navigation.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <motion.button
                      key={item.name}
                      onClick={() => {
                        onNavigate(item.page);
                        setMobileMenuOpen(false);
                      }}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.04 * idx }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition ${
                        currentPage === item.page
                          ? 'bg-green-100 text-green-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {item.name}
                    </motion.button>
                  );
                })}
                <div className="pt-3 mt-3 border-t border-gray-200">
                  <div className="px-4 py-2 mb-2">
                    <p className="text-sm font-medium text-gray-900">{userProfile?.email}</p>
                    <p className="text-xs text-gray-500 capitalize">{userProfile?.role}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main>{children}</main>
    </div>
  );
}
