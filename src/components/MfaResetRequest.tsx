import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Info,
  Lock,
} from 'lucide-react';

interface MfaResetRequestProps {
  onSuccess?: () => void;
}

const MfaResetRequest: React.FC<MfaResetRequestProps> = ({ onSuccess }) => {
  const { user, userProfile } = useAuth();

  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user) {
      setError('You must be logged in to submit a request');
      return;
    }

    if (!reason.trim()) {
      setError('Please explain why you need your MFA reset');
      return;
    }

    if (reason.trim().length < 20) {
      setError('Please provide a detailed reason (at least 20 characters)');
      return;
    }

    setIsLoading(true);

    try {
      await addDoc(collection(db, 'Requests'), {
        userId: user.uid,
        userEmail: user.email || '',
        userDisplayName: userProfile?.displayName || '',
        userPhoneNumber: userProfile?.phoneNumber || '',
        message: reason.trim(),
        status: 'pending',
        requestType: 'mfa-reset',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setReason('');
      setSuccess(true);
      onSuccess?.();

      setTimeout(() => setSuccess(false), 10000);
    } catch (err) {
      console.error('Error submitting MFA reset request:', err);
      setError('Failed to submit your request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // If MFA is not enabled
  if (!userProfile?.mfaEnabled) {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-3xl p-10 text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-12 h-12 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">MFA Not Enabled</h2>
          <p className="text-xl text-gray-700 mb-6">
            Multi-Factor Authentication is currently not active on your account.
          </p>
          <p className="text-gray-600 text-lg">
            You can enable MFA from your <strong>Profile Settings</strong> to add an extra layer of security.
          </p>
        </div>
      </div>
    );
  }

  // Success State
  if (success) {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <div className="bg-white rounded-3xl shadow-2xl p-12 text-center animate-in fade-in zoom-in duration-500">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle className="w-16 h-16 text-green-600" />
          </div>
          <h2 className="text-4xl font-extrabold text-gray-900 mb-6">
            Request Submitted Successfully!
          </h2>
          <div className="text-left bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-8 mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-3">
              <Info className="w-6 h-6 text-blue-600" />
              What Happens Next?
            </h3>
            <ul className="space-y-3 text-gray-700 text-lg">
              <li className="flex items-start gap-3">
                <span className="text-2xl text-blue-600">•</span>
                <span>Your request has been sent to our admin team</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl text-blue-600">•</span>
                <span>You'll receive a notification once it's reviewed</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl text-blue-600">•</span>
                <span>If approved, your MFA will be reset immediately</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl text-blue-600">•</span>
                <span>You can then set up MFA again from your profile</span>
              </li>
            </ul>
          </div>
          <button
            onClick={() => setSuccess(false)}
            className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-xl hover:shadow-2xl text-xl"
          >
            <Lock className="w-7 h-7" />
            Submit Another Request
          </button>
        </div>
      </div>
    );
  }

  // Main Form
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="text-center mb-12">
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Shield className="w-14 h-14 text-red-600" />
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
          Request MFA Reset
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          If you've lost access to your authenticator app or device, submit a request below.
        </p>
      </div>

      {/* Critical Warning */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-3xl p-10 mb-10">
        <div className="flex items-start gap-6">
          <AlertTriangle className="w-12 h-12 text-red-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-2xl font-bold text-red-900 mb-4">Security Warning</h3>
            <p className="text-lg text-red-800 leading-relaxed mb-4">
              Resetting MFA temporarily reduces your account security. Only request this if you have <strong>permanently lost access</strong> to your authenticator.
            </p>
            <div className="bg-white/80 rounded-2xl p-6">
              <p className="text-red-700 font-semibold text-lg">
                This action requires manual approval by an administrator.
              </p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-8 p-6 bg-red-50 border-2 border-red-200 rounded-2xl flex items-start gap-4">
          <AlertTriangle className="w-7 h-7 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 font-medium text-lg">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xl p-10 space-y-10">
        <div>
          <label className="block text-xl font-bold text-gray-900 mb-6">
            Explain Your Situation *
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Please provide detailed information:
• Why do you need MFA reset? (lost phone, deleted app, etc.)
• When did this happen?
• Have you tried recovery codes?
• Any other relevant details..."
            rows={8}
            required
            className="w-full px-6 py-5 border-2 border-gray-300 rounded-2xl focus:border-red-500 focus:outline-none resize-none transition-colors text-lg leading-relaxed"
          />
          <p className="text-sm text-gray-500 mt-3">
            The more detail you provide, the faster your request can be processed.
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-3xl p-8">
          <h3 className="text-xl font-bold text-blue-900 mb-6 flex items-center gap-3">
            <Info className="w-7 h-7" />
            After Approval
          </h3>
          <div className="grid md:grid-cols-2 gap-6 text-blue-800">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Lock className="w-7 h-7 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-lg">MFA Will Be Disabled</p>
                <p className="text-blue-700">Your current authenticator will be removed</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Shield className="w-7 h-7 text-indigo-600" />
              </div>
              <div>
                <p className="font-semibold text-lg">Re-Enable Anytime</p>
                <p className="text-indigo-700">Set up a new authenticator from your profile</p>
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-extrabold py-6 rounded-2xl text-2xl transition-all duration-300 shadow-2xl hover:shadow-3xl disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-4"
        >
          <Shield className="w-9 h-9" />
          {isLoading ? 'Submitting Request...' : 'Submit MFA Reset Request'}
        </button>
      </form>
    </div>
  );
};

export default MfaResetRequest;