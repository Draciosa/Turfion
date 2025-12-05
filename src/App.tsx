import React, { useState, useRef, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Login from './components/Login';
import SignUp from './components/SignUp';
import CardDetails from './components/CardDetails';
import BookingCalendar from './components/BookingCalendar';
import Receipt from './components/Receipt';
import Profile from './components/Profile';
import MfaSettings from './components/MfaSettings';
import Dashboard from './components/Dashboard';
import Checkout from './components/Checkout';
import PaymentFailed from './components/PaymentFailed';
import HeroSection from './components/HeroSection';
import CommunityCards from './components/CommunityCards';
import Footer from './components/Footer';
import { useAuth } from './contexts/AuthContext';
import {
  LogOut,
  User,
  ChevronDown,
  Menu,
  X,
  Shield,
  Home,
  LogIn,
  AlertTriangle,
} from 'lucide-react';
import { isFirebaseInitialized } from './lib/firebase';

const PROTECTED_PATHS = [
  '/profile',
  '/dashboard',
  '/mfa-settings',
  '/checkout',
  '/payment-failed',
];

const isProtectedPath = (path: string): boolean => {
  if (PROTECTED_PATHS.includes(path)) return true;
  if (path.startsWith('/book/')) return true;
  if (path.startsWith('/receipt/')) return true;
  return false;
};

function App() {
  const { user, logout, userProfile, firebaseError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showLogin, setShowLogin] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const userDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setShowMobileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentPath = location.pathname;
  const needsAuth = isProtectedPath(currentPath);
  const shouldShowLoginPrompt = needsAuth && !user && !showLogin && !showSignUp;

  if (firebaseError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl p-16 text-center">
          <div className="w-28 h-28 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-10">
            <AlertTriangle className="w-16 h-16 text-blue-600" />
          </div>
          <h1 className="text-5xl font-extrabold text-gray-900 mb-6">
            App Not Ready Yet
          </h1>
          <p className="text-2xl text-gray-700 mb-10 leading-relaxed">
            We're having trouble connecting to our services.<br />
            This usually means the app is still being set up.
          </p>
          <div className="bg-blue-50 rounded-2xl p-8">
            <p className="text-lg text-blue-800 font-medium">
              If you're the developer: Check Firebase environment variables.
            </p>
          </div>
          <div className="mt-10">
            <button
              onClick={() => window.location.reload()}
              className="px-12 py-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-xl hover:shadow-2xl text-xl"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isFirebaseInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-20 w-20 border-b-8 border-blue-600 mb-8" />
          <p className="text-3xl font-bold text-gray-800">Loading TURFION...</p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    setShowMobileMenu(false);
    setShowUserDropdown(false);
    navigate('/');
  };

  const handleLoginSuccess = () => {
    setShowLogin(false);
    setShowSignUp(false);
  };

  const UserDropdown = () => (
    <div
      ref={userDropdownRef}
      className="absolute right-0 top-full mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50"
    >
      <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-white shadow-lg">
              {userProfile?.photoURL ? (
                <img
                  src={userProfile.photoURL}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : null}
              <div className={`absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center ${userProfile?.photoURL ? 'hidden' : ''}`}>
                <User className="w-10 h-10 text-white" />
              </div>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900">
              {userProfile?.displayName || 'Welcome'}
            </h3>
            <p className="text-sm text-gray-600 truncate">{user?.email}</p>
            <div className="flex items-center gap-2 mt-3">
              {userProfile?.role && (
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  userProfile.role === 'admin' ? 'bg-red-100 text-red-700' :
                  userProfile.role === 'host' ? 'bg-purple-100 text-purple-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1)}
                </span>
              )}
              {userProfile?.mfaEnabled && (
                <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                  <Shield className="w-4 h-4" />
                  MFA
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-2">
        <button
          onClick={() => {
            setShowUserDropdown(false);
            navigate('/profile');
          }}
          className="w-full text-left px-5 py-4 rounded-xl hover:bg-gray-100 transition-colors font-medium flex items-center gap-3"
        >
          <User className="w-5 h-5" />
          View Profile
        </button>
        <button
          onClick={() => {
            setShowUserDropdown(false);
            navigate('/dashboard');
          }}
          className="w-full text-left px-5 py-4 rounded-xl hover:bg-gray-100 transition-colors font-medium flex items-center gap-3"
        >
          <Home className="w-5 h-5" />
          Dashboard
        </button>
        <button
          onClick={handleLogout}
          className="w-full text-left px-5 py-4 rounded-xl hover:bg-red-50 transition-colors font-medium text-red-600 flex items-center gap-3"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </div>
  );

  const MobileMenu = () => (
    <div className="fixed inset-0 bg-black/50 z-50 lg:hidden" onClick={() => setShowMobileMenu(false)}>
      <div
        ref={mobileMenuRef}
        className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Menu</h2>
            <button
              onClick={() => setShowMobileMenu(false)}
              className="p-3 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          {user ? (
            <div className="space-y-6 mt-8">
              <div className="flex items-center gap-4 pb-6 border-b border-gray-200">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                  {userProfile?.displayName?.[0] || user.email?.[0] || 'U'}
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">{userProfile?.displayName || 'User'}</p>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  navigate('/profile');
                }}
                className="w-full text-left py-4 px-6 hover:bg-gray-50 rounded-xl transition-colors flex items-center gap-4 text-lg"
              >
                <User className="w-6 h-6" />
                Profile
              </button>
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  navigate('/dashboard');
                }}
                className="w-full text-left py-4 px-6 hover:bg-gray-50 rounded-xl transition-colors flex items-center gap-4 text-lg"
              >
                <Home className="w-6 h-6" />
                Dashboard
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left py-4 px-6 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-4 text-red-600 text-lg"
              >
                <LogOut className="w-6 h-6" />
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setShowMobileMenu(false);
                setShowLogin(true);
              }}
              className="w-full mt-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-5 rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg text-xl"
            >
              <LogIn className="w-7 h-7 inline mr-3" />
              Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const LoginPrompt = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-12 text-center">
        <LogIn className="w-24 h-24 text-blue-600 mx-auto mb-8" />
        <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Sign In Required</h2>
        <p className="text-lg text-gray-600 mb-10">Please sign in to continue to your booking</p>
        <div className="space-y-4">
          <button
            onClick={() => setShowLogin(true)}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-5 rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg text-xl"
          >
            Sign In Now
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full border-2 border-gray-300 text-gray-700 font-semibold py-5 rounded-2xl hover:bg-gray-50 transition-all text-xl"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <nav className="sticky top-4 z-40 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/90 backdrop-blur-lg rounded-full shadow-xl border border-white/30 px-6 py-4">
            <div className="flex justify-between items-center">
              <button
                onClick={() => navigate('/')}
                className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
              >
                TURFION
              </button>

              <div className="hidden lg:flex items-center">
                {user ? (
                  <div className="relative">
                    <button
                      onClick={() => setShowUserDropdown(!showUserDropdown)}
                      className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full hover:from-blue-200 hover:to-purple-200 transition-all font-medium shadow-md"
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden ring-4 ring-white">
                        {userProfile?.photoURL ? (
                          <img
                            src={userProfile.photoURL}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : null}
                        <div className={`w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center ${userProfile?.photoURL ? 'hidden' : ''}`}>
                          <User className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      <ChevronDown className={`w-5 h-5 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showUserDropdown && <UserDropdown />}
                  </div>
                ) : (
                  <button
                    onClick={() => setShowLogin(true)}
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-full hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg text-lg"
                  >
                    Sign In
                  </button>
                )}
              </div>

              <button
                onClick={() => setShowMobileMenu(true)}
                className="lg:hidden p-3 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Menu className="w-7 h-7 text-gray-700" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {showMobileMenu && <MobileMenu />}

      <main className="pt-8">
        {showLogin && !user ? (
          <Login
            onSignUpClick={() => {
              setShowLogin(false);
              setShowSignUp(true);
            }}
            onSuccess={handleLoginSuccess}
          />
        ) : showSignUp && !user ? (
          <SignUp
            onLoginClick={() => {
              setShowSignUp(false);
              setShowLogin(true);
            }}
            onSuccess={handleLoginSuccess}
          />
        ) : shouldShowLoginPrompt ? (
          <LoginPrompt />
        ) : (
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <HeroSection />
                  <div id="cards" className="container mx-auto px-6 relative z-10">
                    <CommunityCards />
                  </div>
                </>
              }
            />
            <Route path="/card/:id" element={<CardDetails />} />
            <Route path="/book/:id" element={<BookingCalendar />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/payment-failed" element={<PaymentFailed />} />
            <Route path="/receipt/:id" element={<Receipt />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/mfa-settings" element={<MfaSettings />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default App;