import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  QrCode,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Copy,
  Smartphone,
  Lock,
} from 'lucide-react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { authenticator } from 'otplib';
import { QRCodeSVG } from 'qrcode.react';

const MfaSettings: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaSecret, setMfaSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadMfaStatus = async () => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setMfaEnabled(!!data.mfaEnabled);
          if (data.mfaSecret) setMfaSecret(data.mfaSecret);
        }
      } catch (err) {
        console.error('Failed to load MFA status:', err);
        setError('Could not load security settings');
      } finally {
        setLoading(false);
      }
    };

    loadMfaStatus();
  }, [user]);

  // Auto-clear messages
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess('');
        setError('');
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const generateSecret = () => authenticator.generateSecret();

  const generateOtpAuthUrl = (secret: string) => {
    if (!user?.email) return '';
    return authenticator.keyuri(user.email, 'TURFION', secret);
  };

  const handleEnableMfa = () => {
    if (mfaEnabled) return;

    setError('');
    setVerificationCode('');
    const secret = generateSecret();
    setMfaSecret(secret);
    setShowSetup(true);
  };

  const handleConfirmEnable = async () => {
    if (verificationCode.length !== 6 || !/^\d+$/.test(verificationCode)) {
      setError('Enter a valid 6-digit code');
      return;
    }

    setSaving(true);
    try {
      const isValid = authenticator.check(verificationCode, mfaSecret);
      if (!isValid) {
        setError('Invalid code. Check your authenticator app and try again.');
        setSaving(false);
        return;
      }

      await updateDoc(doc(db, 'users', user!.uid), {
        mfaEnabled: true,
        mfaSecret,
        mfaUpdatedAt: new Date(),
      });

      setMfaEnabled(true);
      setShowSetup(false);
      setVerificationCode('');
      setSuccess('Two-Factor Authentication enabled successfully!');
    } catch (err) {
      console.error('MFA enable failed:', err);
      setError('Failed to enable MFA. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDisableMfa = async () => {
    if (disableCode.length !== 6 || !/^\d+$/.test(disableCode)) {
      setError('Enter a valid 6-digit code');
      return;
    }

    setSaving(true);
    try {
      const isValid = authenticator.check(disableCode, mfaSecret);
      if (!isValid) {
        setError('Invalid code. Please try again.');
        setSaving(false);
        return;
      }

      await updateDoc(doc(db, 'users', user!.uid), {
        mfaEnabled: false,
        mfaSecret: '',
        mfaUpdatedAt: new Date(),
      });

      setMfaEnabled(false);
      setMfaSecret('');
      setShowDisableConfirm(false);
      setDisableCode('');
      setSuccess('Two-Factor Authentication disabled');
    } catch (err) {
      console.error('MFA disable failed:', err);
      setError('Failed to disable MFA');
    } finally {
      setSaving(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(mfaSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-600">Please log in to manage security settings</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <button
            onClick={() => navigate('/profile')}
            className="mb-6 inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Profile
          </button>
          <h1 className="text-5xl font-extrabold text-gray-900 mb-4">Security Settings</h1>
          <p className="text-xl text-gray-600">Protect your account with Two-Factor Authentication</p>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-10 mb-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center ${mfaEnabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                <Shield className={`w-14 h-14 ${mfaEnabled ? 'text-green-600' : 'text-gray-500'}`} />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900">
                  Two-Factor Authentication (MFA)
                </h2>
                <p className={`text-2xl font-semibold mt-2 ${mfaEnabled ? 'text-green-600' : 'text-red-600'}`}>
                  {mfaEnabled ? 'Enabled' : 'Disabled'}
                </p>
                <p className="text-gray-600 mt-2 text-lg">
                  {mfaEnabled
                    ? 'Your account is protected with an extra layer of security'
                    : 'Enable MFA to significantly improve account security'}
                </p>
              </div>
            </div>

            <div>
              {!mfaEnabled ? (
                <button
                  onClick={handleEnableMfa}
                  className="px-10 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-xl hover:shadow-2xl text-xl"
                >
                  <Lock className="w-7 h-7 inline mr-3" />
                  Enable MFA
                </button>
              ) : (
                <button
                  onClick={() => setShowDisableConfirm(true)}
                  className="px-10 py-5 bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold rounded-2xl hover:from-red-700 hover:to-orange-700 transition-all duration-300 shadow-xl hover:shadow-2xl text-xl"
                >
                  Disable MFA
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Feedback */}
        {success && (
          <div className="mb-8 p-6 bg-green-50 border-2 border-green-200 rounded-3xl flex items-start gap-4 animate-in fade-in slide-in-from-top-4">
            <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <p className="text-green-800 font-bold text-xl">{success}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-8 p-6 bg-red-50 border-2 border-red-200 rounded-3xl flex items-start gap-4">
            <AlertTriangle className="w-8 h-8 text-red-600 flex-shrink-0 mt-1" />
            <p className="text-red-700 font-medium text-lg">{error}</p>
          </div>
        )}

        {/* Setup Modal */}
        {showSetup && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6 animate-in fade-in">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-10 animate-in zoom-in">
              <h2 className="text-3xl font-extrabold text-center mb-8">Set Up Two-Factor Authentication</h2>

              <div className="space-y-10">
                {/* Step 1: Install App */}
                <div className="text-center">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Smartphone className="w-12 h-12 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">1. Install an Authenticator App</h3>
                  <p className="text-gray-600 text-lg max-w-lg mx-auto">
                    Download one of these apps on your phone:
                  </p>
                  <div className="flex justify-center gap-8 mt-6">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mb-3">
                        <span className="text-white font-bold text-2xl">G</span>
                      </div>
                      <p className="font-semibold">Google Authenticator</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-3">
                        <span className="text-white font-bold text-2xl">A</span>
                      </div>
                      <p className="font-semibold">Microsoft Authenticator</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center mb-3">
                        <span className="text-white font-bold text-2xl">A</span>
                      </div>
                      <p className="font-semibold">Authy</p>
                    </div>
                  </div>
                </div>

                {/* Step 2: Scan QR */}
                <div className="text-center">
                  <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <QrCode className="w-12 h-12 text-indigo-600" />
                  </div>
                  <h3 className="text-2xl font-bold mb-6">2. Scan This QR Code</h3>
                  <div className="inline-block bg-white p-8 rounded-3xl shadow-xl">
                    <QRCodeSVG
                      value={generateOtpAuthUrl(mfaSecret)}
                      size={220}
                      level="H"
                      includeMargin
                    />
                  </div>
                </div>

                {/* Manual Entry */}
                <div className="bg-gray-50 rounded-2xl p-6">
                  <p className="text-center text-lg font-medium mb-4">Can't scan? Enter this code manually:</p>
                  <div className="flex items-center justify-center gap-4">
                    <code className="font-mono text-xl tracking-wider bg-white px-6 py-4 rounded-xl border">
                      {mfaSecret.match(/.{4}/g)?.join(' ') || mfaSecret}
                    </code>
                    <button
                      onClick={copySecret}
                      className="p-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                    >
                      {copied ? <CheckCircle className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
                    </button>
                  </div>
                  {copied && <p className="text-center text-green-600 mt-3 font-medium">Copied to clipboard!</p>}
                </div>

                {/* Verification */}
                <div>
                  <label className="block text-xl font-bold text-center mb-6">
                    3. Enter the 6-digit code from your app
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full text-center text-4xl font-mono tracking-widest px-8 py-6 border-2 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none transition-colors"
                    autoFocus
                  />
                </div>

                <div className="flex gap-6">
                  <button
                    onClick={handleConfirmEnable}
                    disabled={saving || verificationCode.length !== 6}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-6 rounded-2xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 transition-all duration-300 shadow-xl text-xl"
                  >
                    {saving ? 'Enabling MFA...' : 'Complete Setup'}
                  </button>
                  <button
                    onClick={() => {
                      setShowSetup(false);
                      setVerificationCode('');
                      setMfaSecret('');
                    }}
                    className="flex-1 py-6 border-2 border-gray-300 text-gray-700 rounded-2xl hover:bg-gray-50 font-bold text-xl transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Disable Confirmation */}
        {showDisableConfirm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-10">
              <div className="text-center mb-10">
                <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Shield className="w-14 h-14 text-red-600" />
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Disable MFA?</h2>
                <p className="text-xl text-gray-600">
                  This will reduce your account security. Enter your current code to confirm.
                </p>
              </div>

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full text-center text-4xl font-mono tracking-widest px-8 py-6 border-2 border-gray-300 rounded-2xl focus:border-red-500 focus:outline-none transition-colors mb-8"
                autoFocus
              />

              <div className="flex gap-6">
                <button
                  onClick={handleDisableMfa}
                  disabled={saving || disableCode.length !== 6}
                  className="flex-1 bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold py-6 rounded-2xl hover:from-red-700 hover:to-orange-700 disabled:opacity-60 transition-all duration-300 shadow-xl text-xl"
                >
                  {saving ? 'Disabling...' : 'Disable MFA'}
                </button>
                <button
                  onClick={() => {
                    setShowDisableConfirm(false);
                    setDisableCode('');
                  }}
                  className="flex-1 py-6 border-2 border-gray-300 text-gray-700 rounded-2xl hover:bg-gray-50 font-bold text-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MfaSettings;