
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, Settings as SettingsIcon, Dumbbell } from 'lucide-react';
import { StorageProvider, useStorage } from './components/StorageProvider';
import TodayPage from './pages/TodayPage';
import LiftingPage from './pages/LiftingPage';
import ProgressPage from './pages/ProgressPage';
import SettingsPage from './pages/SettingsPage';
import OnboardingPage from './pages/OnboardingPage';
import { UserProfile } from './types';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navItems = [
    { label: 'Today', path: '/today', icon: LayoutDashboard },
    { label: 'Progress', path: '/progress', icon: TrendingUp },
    { label: 'Lifting', path: '/lifting', icon: Dumbbell },
    { label: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-20 md:pb-0">
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-30 flex justify-between items-center md:hidden">
        <h1 className="text-xl font-bold text-blue-600">Fitness Coach</h1>
      </header>
      
      <nav className="hidden md:flex bg-white border-b sticky top-0 z-30 px-6 py-4 justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-600">Fitness Coach</h1>
        <div className="flex space-x-8">
          {navItems.map((item) => (
            <Link 
              key={item.path}
              to={item.path} 
              className={`flex items-center space-x-2 font-medium transition-colors ${
                location.pathname === item.path ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      <main className="flex-grow p-4 md:p-8 max-w-4xl mx-auto w-full">
        {children}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-3 px-2 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => (
          <Link 
            key={item.path}
            to={item.path} 
            className={`flex flex-col items-center space-y-1 transition-all ${
              location.pathname === item.path ? 'text-blue-600 scale-110' : 'text-gray-400'
            }`}
          >
            <item.icon size={24} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
};

const AppContent: React.FC = () => {
  const storage = useStorage();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkProfile = async () => {
      const p = await storage.getUserProfile();
      setProfile(p);
      setLoading(false);
    };
    checkProfile();
  }, [storage]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!profile) {
    return <OnboardingPage onComplete={(p) => setProfile(p)} />;
  }

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/today" replace />} />
          <Route path="/today" element={<TodayPage />} />
          <Route path="/lifting" element={<LiftingPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/settings" element={<SettingsPage onReset={() => window.location.reload()} />} />
          <Route path="*" element={<Navigate to="/today" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <StorageProvider>
      <AppContent />
    </StorageProvider>
  );
};

export default App;
