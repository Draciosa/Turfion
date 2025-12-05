import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Shield, QrCode, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import QRCode from 'qrcode';

const MfaSettings: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaSecret, setMfaSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [disableVerificationCode, setDisableVerificationCode] = useState('');

  useEffect(() => {
    const fetchMfaStatus = async () => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setMfaEnabled(!!data.mfaEnabled);
          setMfaSecret(data.mfaSecret || '');
        }
      } catch (err) {
        console.error('Error fetching MFA status:', err);
        setError('Failed to load MFA settings');
      } finally {
        setLoading(false);
      }
    };

    fetchMfaStatus();
  }, [user]);

  // Generate a valid Base32 secret (32 characters)
  const generateMfaSecret = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  };

  // Generate QR code URL
  const generateQrCode = async (secret: string) => {
    if (!user?.email) return;

    const issuer = 'TURFION';
    const account = encodeURIComponent(user.email);
    const otpAuthUrl = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

    try {
      const dataUrl = await QRCode.toDataURL(otpAuthUrl, { width: 256, margin: 2 });
      setQrCodeUrl(dataUrl);
    } catch (err) {
      console.error('QR generation failed:', err);
      setError('Failed to generate QR code');
    }
  };

  // Base32 decoding with proper padding support
  const base32ToBytes = (base32: string): Uint8Array => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const cleaned = base32.replace(/=+$/, '').toUpperCase(); // Remove padding
    let bits = 0;
    let value = 0;
    const output: number[] = [];

    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i];
      const val = alphabet.indexOf(char);
      if (val === -1) throw new Error('Invalid base32 character');

      value = (value << 5) | val;
      bits += 5;

      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }

    return new Uint8Array(output);
  };

  // HMAC-SHA1
  const hmacSha1 = async (key: Uint8Array, data: Uint8Array): Promise<Uint8Array> => {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
    return new Uint8Array(signature);
  };

  // Correct TOTP generation (RFC 6238)
  const generateTOTP = async (secret: string, counter: number): Promise<string> => {
    const key = base32ToBytes(secret);

    // Counter must be 8-byte big-endian
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setBigUint64(0, BigInt(counter), false); // big-endian

    const hash = await hmacSha1(key, new Uint8Array(buffer));
    const offset = hash[hash.length - 1] & 0xf;

    const binary =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);

    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
  };

  // Verify TOTP code with ±2 window tolerance
  const verifyMfaCode = async (secret: string, token: string): Promise<boolean> => {
    if (!secret || !token || token.length !== 6 || !/^\d+$/.test(token)) return false;

    const timeWindow = Math.floor(Date.now() / 1000 / 30); // 30-second windows

    for (let i = -2; i <= 2; i++) {
      const expected = await generateTOTP(secret, timeWindow + i);
      if (expected === token) return true;
    }
    return false;
  };

  const handleEnableMfa = async () => {
    if (mfaEnabled) {
      setError('MFA is already enabled');
      return;
    }

    setError('');
    setSuccess('');
    setVerificationCode('');
    setQrCodeUrl('');

    const secret = generateMfaSecret();
    setMfaSecret(secret);
    await generateQrCode(secret);
    setShowSetup(true);
  };

  const handleConfirmEnable = async () => {
    if (verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setSaving(true);
    try {
      const isValid = await verifyMfaCode(mfaSecret, verificationCode);
      if (!isValid) {
        setError('Invalid code. Please try again.');
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
      setSuccess('MFA enabled successfully!');
    } catch (err) {
      console.error('Enable MFA failed:', err);
      setError('Failed to enable MFA. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDisableMfa = async () => {
    if (disableVerificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setSaving(true);
    try {
      const isValid = await verifyMfaCode(mfaSecret, disableVerificationCode);
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
      setDisableVerificationCode('');
      setSuccess('MFA disabled successfully');
    } catch (err) {
      console.error('Disable MFA failed:', err);
      setError('Failed to disable MFA. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Please log in to access MFA settings</h2>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate('/profile')}
            className="mb-4 inline-flex items-center text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Profile
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Multi-Factor Authentication</h1>
          <p className="text-gray-600">Add an extra layer of security to your account</p>
        </div>

        {success && (
          <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            {success}
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${mfaEnabled ? 'bg-green-100' : 'bg-gray-100'}`}>
              <Shield className={`w-8 h-8 ${mfaEnabled ? 'text-green-600' : 'text-gray-500'}`} />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">MFA is {mfaEnabled ? 'Enabled' : 'Disabled'}</h2>
              <p className="text-gray-600">
                {mfaEnabled
                  ? 'Your account is protected with two-factor authentication'
                  : 'Enable MFA for enhanced security'}
              </p>
            </div>
          </div>

          {!mfaEnabled ? (
            <button
              onClick={handleEnableMfa}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium"
            >
              Enable MFA
            </button>
          ) : (
            <button
              onClick={() => setShowDisableConfirm(true)}
              className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 font-medium"
            >
              Disable MFA
            </button>
          )}
        </div>

        {/* Setup Modal */}
        {showSetup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-center mb-4">Set Up Authenticator</h3>
              
              <div className="bg-gray-50 rounded-lg p-6 text-center mb-6">
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="MFA QR Code" className="mx-auto" />
                ) : (
                  <div className="w-48 h-48 bg-gray-200 border-2 border-dashed rounded-xl mx-auto" />
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm">
                <p className="font-medium mb-2">Can't scan? Enter manually:</p>
                <code className="block bg-white p-3 rounded border font-mono text-xs break-all">
                  {mfaSecret.match(/.{4}/g)?.join(' ') || mfaSecret}
                </code>
              </div>

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-3 text-center text-xl font-mono border rounded-lg mb-4"
                autoFocus
              />

              <div className="flex gap-3">
                <button
                  onClick={handleConfirmEnable}
                  disabled={saving || verificationCode.length !== 6}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Enabling...' : 'Enable MFA'}
                </button>
                <button
                  onClick={() => {
                    setShowSetup(false);
                    setVerificationCode('');
                    setQrCodeUrl('');
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Disable Confirmation */}
        {showDisableConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-center mb-4 text-red-600">Disable MFA?</h3>
              <p className="text-center text-gray-600 mb-6">
                This will reduce your account security. Enter your current code to confirm.
              </p>

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={disableVerificationCode}
                onChange={(e) => setDisableVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-3 text-center text-xl font-mono border rounded-lg mb-6"
                autoFocus
              />

              <div className="flex gap-3">
                <button
                  onClick={handleDisableMfa}
                  disabled={saving || disableVerificationCode.length !== 6}
                  className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {saving ? 'Disabling...' : 'Disable MFA'}
                </button>
                <button
                  onClick={() => {
                    setShowDisableConfirm(false);
                    setDisableVerificationCode('');
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300"
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