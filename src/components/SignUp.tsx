import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, CheckCircle } from 'lucide-react';

type SignUpProps = {
  onLoginClick: () => void;
  onSuccess?: () => void;
};

const SignUp: React.FC<SignUpProps> = ({ onLoginClick, onSuccess }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp, signInWithGoogle } = useAuth();

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const validatePassword = (pwd: string) => {
    return pwd.length >= 8;
  };

  const passwordsMatch = formData.password && formData.password === formData.confirmPassword;
  const isPasswordValid = validatePassword(formData.password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.fullName.trim()) {
      setError('Please enter your full name');
      return;
    }

    if (!formData.email.trim()) {
      setError('Please enter your email');
      return;
    }

    if (!isPasswordValid) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await signUp(formData.email, formData.password, formData.fullName.trim());
      onSuccess?.();
    } catch (err: any) {
      switch (err.code) {
        case 'auth/email-already-in-use':
          setError('An account with this email already exists');
          break;
        case 'auth/invalid-email':
          setError('Please enter a valid email address');
          break;
        case 'auth/weak-password':
          setError('Password is too weak. Use at least 8 characters');
          break;
        default:
          setError('Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      onSuccess?.();
    } catch (err: any) {
      setLoading(false);
      setError('Google sign-up failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-3">Join TURFION</h1>
          <p className="text-xl text-gray-600">Create your account and start booking venues</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-6 bg-red-50 border-2 border-red-200 rounded-2xl flex items-start gap-4">
            <AlertCircle className="w-7 h-7 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 font-medium text-lg">{error}</p>
          </div>
        )}

        {/* Google Sign Up */}
        <button
  onClick={handleGoogleSignUp}
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

        {/* Divider */}
        <div className="relative my-10">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t-2 border-gray-300" />
          </div>
          <div className="relative flex justify-center text-lg">
            <span className="px-6 bg-white text-gray-500 font-semibold">or</span>
          </div>
        </div>

        {/* Email Sign Up Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Full Name */}
          <div>
            <label className="block text-lg font-semibold text-gray-800 mb-3">Full Name</label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              placeholder="John Doe"
              required
              className="w-full px-6 py-5 border-2 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none transition-colors text-lg"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-lg font-semibold text-gray-800 mb-3">Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-6 py-5 border-2 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none transition-colors text-lg"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-lg font-semibold text-gray-800 mb-3">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-6 py-5 border-2 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none transition-colors text-lg"
            />
            <div className="mt-3 flex items-center gap-3">
              {formData.password ? (
                isPasswordValid ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-6 h-6" />
                    <span className="font-medium">Strong password</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-orange-600">
                    <AlertCircle className="w-6 h-6" />
                    <span className="font-medium">Use at least 8 characters</span>
                  </div>
                )
              ) : (
                <span className="text-gray-500">Minimum 8 characters recommended</span>
              )}
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-lg font-semibold text-gray-800 mb-3">Confirm Password</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-6 py-5 border-2 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none transition-colors text-lg"
            />
            {formData.confirmPassword && (
              <div className="mt-3 flex items-center gap-3">
                {passwordsMatch ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-6 h-6" />
                    <span className="font-medium">Passwords match</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-6 h-6" />
                    <span className="font-medium">Passwords do not match</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !isPasswordValid || !passwordsMatch}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 text-white font-extrabold py-6 rounded-2xl text-2xl transition-all duration-300 shadow-2xl hover:shadow-3xl flex items-center justify-center gap-4"
          >
            Create Account
          </button>
        </form>

        {/* Login Link */}
        <div className="mt-10 text-center">
          <p className="text-lg text-gray-600">
            Already have an account?{' '}
            <button
              onClick={onLoginClick}
              className="font-bold text-blue-600 hover:text-blue-700 underline"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;