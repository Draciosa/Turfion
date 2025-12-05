import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Shield, AlertCircle } from 'lucide-react';
import { authenticator } from 'otplib';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

type LoginProps = {
  onSignUpClick: () => void;
  onSuccess?: () => void;
};

const Login: React.FC<LoginProps> = ({ onSignUpClick, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [showMfa, setShowMfa] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signInWithGoogle } = useAuth();

  // Secure device remembering (30 days)
  const rememberThisDevice = () => {
    const data = {
      email: email.toLowerCase(),
      expires: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    };
    localStorage.setItem('mfa_trusted_device', JSON.stringify(data));
  };

  const isDeviceTrusted = (): boolean => {
    try {
      const data = localStorage.getItem('mfa_trusted_device');
      if (!data) return false;
      const parsed = JSON.parse(data);
      if (parsed.email !== email.toLowerCase()) return false;
      return Date.now() < parsed.expires;
    } catch {
      return false;
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const user = credential.user;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        onSuccess?.();
        return;
      }

      const userData = userDoc.data();
      if (userData.mfaEnabled && userData.mfaSecret) {
        if (isDeviceTrusted()) {
          onSuccess?.();
          return;
        }

        await auth.signOut();
        setShowMfa(true);
      } else {
        onSuccess?.();
      }
    } catch (err: any) {
      setLoading(false);
      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError('Invalid email or password');
          break;
        case 'auth/too-many-requests':
          setError('Too many attempts. Try again later.');
          break;
        case 'auth/invalid-email':
          setError('Please enter a valid email');
          break;
        default:
          setError('Failed to sign in. Please try again.');
      }
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaCode.length !== 6) {
      setError('Enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', credential.user.uid));
      
      if (!userDoc.exists() || !userDoc.data()?.mfaSecret) {
        setError('MFA not configured');
        setLoading(false);
        return;
      }

      const isValid = authenticator.check(mfaCode, userDoc.data().mfaSecret);
      
      if (!isValid) {
        setError('Invalid MFA code');
        setLoading(false);
        return;
      }

      if (rememberDevice) {
        rememberThisDevice();
      }

      onSuccess?.();
    } catch (err) {
      setError('Verification failed. Try logging in again.');
      setShowMfa(false);
      setMfaCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      onSuccess?.();
    } catch (err: any) {
      setLoading(false);
      setError('Google sign-in failed. Try again.');
    }
  };

  if (showMfa) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-12 h-12 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Two-Factor Authentication</h2>
            <p className="mt-3 text-gray-600">Enter the 6-digit code from your authenticator app</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          <form onSubmit={handleMfaSubmit} className="space-y-6">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              autoFocus
              className="w-full text-center text-4xl font-mono tracking-widest px-6 py-5 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
            />

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-gray-700">Trust this device for 30 days</span>
            </label>

            <button
              type="submit"
              disabled={loading || mfaCode.length !== 6}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 transition-all duration-300 shadow-lg"
            >
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowMfa(false);
                setMfaCode('');
                setError('');
              }}
              className="w-full text-gray-600 hover:text-gray-800 font-medium"
            >
              ← Back to login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to manage your bookings and venues</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
  className="w-full flex items-center justify-center gap-4 px-8 py-5 border-2 border-gray-300 rounded-2xl hover:border-gray-400 hover:bg-gray-50 disabled:opacity-60 transition-all duration-300 font-bold text-lg shadow-lg"
>
  <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.501 12.453c0-.827-.075-1.653-.218-2.463h-10.283v4.653h5.902c-.255 1.378-1.029 2.544-2.183 3.327v2.718h3.527c2.064-1.907 3.255-4.709 3.255-7.735z" fill="#4285F4"/>
    <path d="M12 23c3.255 0 5.991-1.073 7.991-2.909l-3.527-2.718c-1.091.727-2.482 1.164-4.464 1.164-3.428 0-6.336-2.309-7.373-5.418h-3.636v2.745c1.991 3.964 6.082 6.136 10.009 6.136z" fill="#34A853"/>
    <path d="M4.627 14.236c-.255-.782-.4-1.618-.4-2.482 0-.864.145-1.7.4-2.482v-2.745h-3.636c-.873 1.709-1.364 3.609-1.364 5.591 0 1.982.491 3.882 1.364 5.591l3.636-2.745z" fill="#FBBC05"/>
    <path d="M12 4.727c1.773 0 3.364.618 4.618 1.818l3.455-3.455c-2.109-1.964-4.845-3.164-8.073-3.164-3.927 0-8.018 2.172-10.009 6.136l3.636 2.745c1.037-3.109 3.945-5.418 7.373-5.418z" fill="#EA4335"/>
  </svg>
  Continue with Google
        </button>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500 font-medium">or</span>
          </div>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-60"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-600">
            New here?{' '}
            <button onClick={onSignUpClick} className="font-bold text-blue-600 hover:text-blue-700">
              Create an account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;