import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  Edit,
  Save,
  X,
  Shield,
  Camera,
  AlertCircle,
  CheckCircle,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { authenticator } from 'otplib';

interface UserProfile {
  displayName?: string;
  phoneNumber?: string;
  photoURL?: string;
  mfaEnabled?: boolean;
  mfaSecret?: string;
}

const Profile: React.FC = () => {
  const { user, userProfile: initialProfile } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile>({
    displayName: '',
    phoneNumber: '',
    photoURL: '',
    mfaEnabled: false,
  });
  const [editForm, setEditForm] = useState<UserProfile>(profile);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [imageError, setImageError] = useState(false);
  const [showMfaVerify, setShowMfaVerify] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [pendingChanges, setPendingChanges] = useState<UserProfile | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user || !initialProfile) return;

      const fullProfile = {
        displayName: initialProfile.displayName || '',
        phoneNumber: initialProfile.phoneNumber || '',
        photoURL: initialProfile.photoURL || '',
        mfaEnabled: !!initialProfile.mfaEnabled,
        mfaSecret: initialProfile.mfaSecret || '',
      };

      setProfile(fullProfile);
      setEditForm(fullProfile);
      setLoading(false);
    };

    loadProfile();
  }, [user, initialProfile]);

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

  const handleEdit = () => {
    setIsEditing(true);
    setError('');
    setSuccess('');
    setImageError(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm(profile);
    setError('');
    setImageError(false);
  };

  const handleChange = (field: keyof UserProfile, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
    if (field === 'photoURL') setImageError(false);
  };

  const validateImageUrl = (url: string): boolean => {
    if (!url.trim()) return true;
    try {
      const parsed = new URL(url.trim());
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    setError('');

    if (editForm.photoURL && !validateImageUrl(editForm.photoURL)) {
      setError('Please enter a valid image URL (http:// or https://)');
      return;
    }

    if (profile.mfaEnabled && profile.mfaSecret) {
      setPendingChanges(editForm);
      setShowMfaVerify(true);
      return;
    }

    await saveProfile(editForm);
  };

  const saveProfile = async (changes: UserProfile) => {
    if (!user) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: changes.displayName?.trim() || '',
        phoneNumber: changes.phoneNumber?.trim() || '',
        photoURL: changes.photoURL?.trim() || '',
        updatedAt: new Date(),
      });

      setProfile(changes);
      setIsEditing(false);
      setSuccess('Profile updated successfully!');
    } catch (err) {
      console.error('Profile update failed:', err);
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleMfaVerify = async () => {
    if (mfaCode.length !== 6 || !/^\d+$/.test(mfaCode)) {
      setError('Enter a valid 6-digit code');
      return;
    }

    if (!profile.mfaSecret || !authenticator.check(mfaCode, profile.mfaSecret)) {
      setError('Invalid MFA code');
      return;
    }

    if (pendingChanges) {
      await saveProfile(pendingChanges);
      setPendingChanges(null);
      setShowMfaVerify(false);
      setMfaCode('');
    }
  };

  const handleMfaSettings = () => navigate('/mfa-settings');
  const handleMfaReset = () => navigate('/dashboard?mfa-reset');

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-xl text-gray-600">Please log in to view your profile</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Hero Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl shadow-2xl p-10 text-white mb-12">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden border-8 border-white/30 shadow-2xl">
                {profile.photoURL && !imageError ? (
                  <img
                    src={profile.photoURL}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="w-full h-full bg-white/30 flex items-center justify-center">
                    <User className="w-16 h-16 text-white" />
                  </div>
                )}
              </div>
              {isEditing && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <Camera className="w-12 h-12 text-white" />
                </div>
              )}
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-5xl font-extrabold mb-3">My Profile</h1>
              <p className="text-2xl text-blue-100">
                {profile.displayName || user.email}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        {success && (
          <div className="mb-8 p-6 bg-green-50 border-2 border-green-200 rounded-3xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <p className="text-green-800 font-semibold text-xl">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-8 p-6 bg-red-50 border-2 border-red-200 rounded-3xl flex items-center gap-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
            <p className="text-red-700 font-medium text-xl">{error}</p>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-10">
          {/* Main Profile */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow-2xl p-10">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-3xl font-bold text-gray-900">Personal Information</h2>
                {!isEditing ? (
                  <button
                    onClick={handleEdit}
                    className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
                  >
                    <Edit className="w-6 h-6" />
                    Edit Profile
                  </button>
                ) : (
                  <div className="flex gap-4">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-2xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-60 transition-all shadow-lg"
                    >
                      <Save className="w-6 h-6" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="px-8 py-4 border-2 border-gray-300 text-gray-700 font-bold rounded-2xl hover:bg-gray-50 transition-all"
                    >
                      <X className="w-6 h-6" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-8">
                {/* Email */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-8">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
                      <Mail className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Email Address</h3>
                      <p className="text-lg text-gray-600 mt-2">{user.email}</p>
                      <span className={`inline-block mt-3 px-4 py-2 rounded-full text-sm font-semibold ${user.emailVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {user.emailVerified ? 'Verified' : 'Unverified'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Display Name */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-8">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center">
                      <User className="w-8 h-8 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-3">Display Name</h3>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.displayName || ''}
                          onChange={(e) => handleChange('displayName', e.target.value)}
                          placeholder="Your preferred name"
                          className="w-full px-6 py-4 border-2 border-gray-300 rounded-2xl focus:border-purple-500 focus:outline-none transition-colors text-lg"
                        />
                      ) : (
                        <p className="text-lg text-gray-700">{profile.displayName || 'Not set'}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Phone */}
                <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-2xl p-8">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                      <Phone className="w-8 h-8 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-3">Phone Number</h3>
                      {isEditing ? (
                        <input
                          type="tel"
                          value={editForm.phoneNumber || ''}
                          onChange={(e) => handleChange('phoneNumber', e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full px-6 py-4 border-2 border-gray-300 rounded-2xl focus:border-green-500 focus:outline-none transition-colors text-lg"
                        />
                      ) : (
                        <p className="text-lg text-gray-700">{profile.phoneNumber || 'Not set'}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Photo URL */}
                <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl p-8">
                  <div className="flex items-start gap-5">
                    <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center">
                      <Camera className="w-8 h-8 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-3">Profile Picture</h3>
                      {isEditing ? (
                        <div className="space-y-4">
                          <input
                            type="url"
                            value={editForm.photoURL || ''}
                            onChange={(e) => handleChange('photoURL', e.target.value)}
                            placeholder="https://example.com/your-photo.jpg"
                            className="w-full px-6 py-4 border-2 border-gray-300 rounded-2xl focus:border-orange-500 focus:outline-none transition-colors text-lg"
                          />
                          {editForm.photoURL && (
                            <div className="flex items-center gap-4">
                              <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-white shadow-xl">
                                {!imageError ? (
                                  <img
                                    src={editForm.photoURL}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                    onError={() => setImageError(true)}
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                    <AlertCircle className="w-10 h-10 text-red-500" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-gray-700">Preview</p>
                                {imageError && <p className="text-red-600 text-sm mt-1">Invalid image URL</p>}
                              </div>
                            </div>
                          )}
                          <p className="text-sm text-gray-600">
                            Use a direct link to a publicly accessible image (JPG, PNG, WebP)
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          {profile.photoURL && !imageError ? (
                            <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-white shadow-xl">
                              <img
                                src={profile.photoURL}
                                alt="Profile"
                                className="w-full h-full object-cover"
                                onError={() => setImageError(true)}
                              />
                            </div>
                          ) : (
                            <div className="w-24 h-24 bg-gray-200 rounded-2xl flex items-center justify-center border-4 border-dashed border-gray-400">
                              <User className="w-12 h-12 text-gray-500" />
                            </div>
                          )}
                          <p className="text-lg text-gray-700">
                            {profile.photoURL ? 'Custom photo set' : 'No photo set'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* MFA Status */}
            <div className="bg-white rounded-3xl shadow-2xl p-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-4">
                <Lock className="w-9 h-9 text-indigo-600" />
                Security
              </h3>

              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-gray-800">Two-Factor Authentication</p>
                    <p className="text-gray-600">Extra protection for your account</p>
                  </div>
                  <span className={`px-6 py-3 rounded-full text-lg font-bold ${profile.mfaEnabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {profile.mfaEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                <div className="flex flex-col gap-4">
                  <button
                    onClick={handleMfaSettings}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-5 rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-xl hover:shadow-2xl text-xl flex items-center justify-center gap-3"
                  >
                    <Shield className="w-7 h-7" />
                    Manage MFA Settings
                  </button>

                  {profile.mfaEnabled && (
                    <button
                      onClick={handleMfaReset}
                      className="w-full bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold py-5 rounded-2xl hover:from-red-700 hover:to-orange-700 transition-all duration-300 shadow-xl hover:shadow-2xl text-xl flex items-center justify-center gap-3"
                    >
                      <AlertTriangle className="w-7 h-7" />
                      Request MFA Reset
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Help Card */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-3xl p-8">
              <h4 className="text-xl font-bold text-blue-900 mb-4">Need Help?</h4>
              <p className="text-blue-800 leading-relaxed">
                If you have any issues with your profile or security settings, contact support at{' '}
                <a href="mailto:support@turfion.com" className="font-bold underline hover:text-blue-600">
                  support@turfion.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MFA Verification Modal */}
      {showMfaVerify && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-10 animate-in zoom-in">
            <div className="text-center mb-10">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-14 h-14 text-blue-600" />
              </div>
              <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Verify Your Identity</h2>
              <p className="text-xl text-gray-600">
                Enter the 6-digit code from your authenticator app to save changes
              </p>
            </div>

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full text-center text-5xl font-mono tracking-widest px-8 py-8 border-2 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none transition-colors mb-8"
              autoFocus
            />

            <div className="flex gap-6">
              <button
                onClick={handleMfaVerify}
                disabled={saving || mfaCode.length !== 6}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-6 rounded-2xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 transition-all shadow-xl text-xl"
              >
                {saving ? 'Verifying...' : 'Verify & Save'}
              </button>
              <button
                onClick={() => {
                  setShowMfaVerify(false);
                  setMfaCode('');
                  setPendingChanges(null);
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
  );
};

export default Profile;