import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  addDoc,
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import {
  Users,
  Shield,
  ShieldOff,
  AlertTriangle,
  Search,
  UserCog,
  CheckCircle,
  X,
  Calendar, // ← Fixed: Was missing
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  role: string;
  displayName?: string;
  mfaEnabled?: boolean;
  mfaSecret?: string;
  createdAt: any;
  updatedAt?: any;
  phoneNumber?: string;
}

const UserSettings: React.FC = () => {
  const { hasRole } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleModal, setRoleModal] = useState<User | null>(null);
  const [mfaModal, setMfaModal] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState('');

  useEffect(() => {
    if (!hasRole('admin')) return;

    const q = query(collection(db, 'users'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const usersData: User[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as User));

        usersData.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB.getTime() - dateA.getTime();
        });

        setUsers(usersData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching users:', err);
        setError('Failed to load users');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [hasRole]);

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

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleChangeRole = async () => {
    if (!roleModal || !selectedRole) return;

    setProcessing(roleModal.id);
    setError('');
    setSuccess('');

    try {
      await updateDoc(doc(db, 'users', roleModal.id), {
        role: selectedRole,
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, 'notifications'), {
        userId: roleModal.id,
        type: 'role_changed',
        title: 'Account Role Updated',
        message: `Your account role has been changed to ${selectedRole} by an administrator.`,
        read: false,
        createdAt: serverTimestamp(),
      });

      setSuccess(`Role changed to ${selectedRole} for ${roleModal.email}`);
    } catch (err) {
      console.error('Error changing role:', err);
      setError('Failed to change role');
    } finally {
      setProcessing(null);
      setRoleModal(null);
      setSelectedRole('');
    }
  };

  const handleResetMfa = async () => {
    if (!mfaModal) return;

    setProcessing(mfaModal.id);
    setError('');
    setSuccess('');

    try {
      await updateDoc(doc(db, 'users', mfaModal.id), {
        mfaEnabled: false,
        mfaSecret: '',
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, 'notifications'), {
        userId: mfaModal.id,
        type: 'mfa_reset',
        title: 'MFA Reset by Administrator',
        message: 'Your Multi-Factor Authentication has been reset by an administrator.',
        read: false,
        createdAt: serverTimestamp(),
      });

      setSuccess(`MFA reset for ${mfaModal.email}`);
    } catch (err) {
      console.error('Error resetting MFA:', err);
      setError('Failed to reset MFA');
    } finally {
      setProcessing(null);
      setMfaModal(null);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp?.toDate) return 'Unknown';
    return timestamp.toDate().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      admin: 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg',
      host: 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg',
      user: 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg',
    };
    return (
      <span className={`px-6 py-3 rounded-full font-bold text-lg ${styles[role] || 'bg-gray-500 text-white'}`}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  if (!hasRole('admin')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-12 text-center">
          <Shield className="w-20 h-20 text-red-600 mx-auto mb-8" />
          <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-xl text-gray-600">Only administrators can manage user settings.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-extrabold text-gray-900 mb-4">User Management</h1>
          <p className="text-2xl text-gray-600">Admin control panel for user roles and security</p>
        </div>

        {/* Messages */}
        {success && (
          <div className="mb-10 p-8 bg-green-50 border-2 border-green-200 rounded-3xl flex items-start gap-6 animate-in fade-in slide-in-from-top-4">
            <CheckCircle className="w-10 h-10 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <p className="text-2xl font-bold text-green-800">{success}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-10 p-8 bg-red-50 border-2 border-red-200 rounded-3xl flex items-start gap-6">
            <AlertTriangle className="w-10 h-10 text-red-600 flex-shrink-0 mt-1" />
            <p className="text-2xl font-bold text-red-800">{error}</p>
          </div>
        )}

        {/* Search */}
        <div className="mb-12">
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-8 flex items-center pointer-events-none">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by email, name, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-20 pr-8 py-6 text-xl border-2 border-gray-200 rounded-3xl focus:border-blue-500 focus:outline-none transition-all duration-300 placeholder-gray-400"
            />
          </div>
        </div>

        {/* Users Grid */}
        <div className="grid gap-8">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-3xl shadow-2xl">
              <Users className="w-24 h-24 text-gray-300 mx-auto mb-8" />
              <h3 className="text-3xl font-bold text-gray-700 mb-4">
                {searchTerm ? 'No users match your search' : 'No users found'}
              </h3>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div
                key={user.id}
                className="bg-white rounded-3xl shadow-2xl p-10 hover:shadow-3xl transition-all duration-300"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                  {/* User Info */}
                  <div className="flex items-start gap-8">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-xl">
                      {user.displayName?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-3xl font-extrabold text-gray-900">
                        {user.displayName || 'No Name Set'}
                      </h3>
                      <p className="text-xl text-gray-600 mt-2">{user.email}</p>
                      {user.phoneNumber && (
                        <p className="text-lg text-gray-500 mt-3">📞 {user.phoneNumber}</p>
                      )}
                      <div className="flex items-center gap-6 mt-6 text-lg">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-6 h-6 text-gray-500" />
                          <span className="text-gray-600">Joined {formatDate(user.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status & Actions */}
                  <div className="flex flex-col gap-6">
                    {/* Role Badge */}
                    <div className="self-start">
                      {getRoleBadge(user.role)}
                    </div>

                    {/* MFA Status */}
                    <div className="self-start">
                      <span className={`inline-flex items-center gap-3 px-8 py-4 rounded-full text-xl font-bold ${user.mfaEnabled ? 'bg-green-100 text-green-800 shadow-lg' : 'bg-gray-100 text-gray-800'}`}>
                        {user.mfaEnabled ? (
                          <>
                            <Shield className="w-8 h-8" />
                            MFA Enabled
                          </>
                        ) : (
                          <>
                            <ShieldOff className="w-8 h-8" />
                            MFA Disabled
                          </>
                        )}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4">
                      <button
                        onClick={() => {
                          setRoleModal(user);
                          setSelectedRole(user.role);
                        }}
                        disabled={processing === user.id}
                        className="flex items-center gap-4 px-8 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 transition-all duration-300 shadow-xl hover:shadow-2xl text-xl"
                      >
                        <UserCog className="w-8 h-8" />
                        Change Role
                      </button>

                      {user.mfaEnabled && (
                        <button
                          onClick={() => setMfaModal(user)}
                          disabled={processing === user.id}
                          className="flex items-center gap-4 px-8 py-5 bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold rounded-2xl hover:from-red-700 hover:to-orange-700 disabled:opacity-60 transition-all duration-300 shadow-xl hover:shadow-2xl text-xl"
                        >
                          <ShieldOff className="w-8 h-8" />
                          Reset MFA
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Warning Banner */}
        <div className="mt-16 bg-gradient-to-r from-yellow-50 to-orange-50 border-4 border-yellow-300 rounded-3xl p-12">
          <div className="flex items-start gap-8">
            <AlertTriangle className="w-14 h-14 text-yellow-600 flex-shrink-0 mt-2" />
            <div>
              <h3 className="text-3xl font-extrabold text-yellow-900 mb-6">Admin Actions Are Permanent</h3>
              <ul className="space-y-6 text-xl text-yellow-800">
                <li className="flex items-start gap-4">
                  <span className="text-3xl">•</span>
                  <span>
                    <strong>Change Role:</strong> Modifies user permissions (user → host → admin)
                  </span>
                </li>
                <li className="flex items-start gap-4">
                  <span className="text-3xl">•</span>
                  <span>
                    <strong>Reset MFA:</strong> Completely disables two-factor authentication
                  </span>
                </li>
                <li className="flex items-start gap-4">
                  <span className="text-3xl">•</span>
                  <span>
                    <strong>Notifications:</strong> Users are automatically informed of changes
                  </span>
                </li>
              </ul>
              <p className="mt-8 text-2xl font-bold text-yellow-900">
                Use these powers responsibly.
              </p>
            </div>
          </div>
        </div>

        {/* Role Change Modal */}
        {roleModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-10 animate-in zoom-in">
              <div className="text-center mb-10">
                <UserCog className="w-20 h-20 text-blue-600 mx-auto mb-6" />
                <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Change User Role</h2>
                <div className="bg-gray-50 rounded-2xl p-8">
                  <p className="text-2xl font-bold text-gray-900">{roleModal.displayName || roleModal.email}</p>
                  <p className="text-xl text-gray-600">{roleModal.email}</p>
                  <p className="text-lg text-gray-500 mt-4">
                    Current role: <strong className="uppercase">{roleModal.role}</strong>
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <label className="block text-xl font-bold text-gray-800">Select New Role</label>
                <div className="grid grid-cols-3 gap-6">
                  {['user', 'host', 'admin'].map((role) => (
                    <button
                      key={role}
                      onClick={() => setSelectedRole(role)}
                      className={`py-8 rounded-2xl font-bold text-2xl transition-all duration-300 ${
                        selectedRole === role
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-2xl scale-110'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-6 mt-12">
                <button
                  onClick={handleChangeRole}
                  disabled={processing === roleModal.id || !selectedRole || selectedRole === roleModal.role}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-6 rounded-2xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 transition-all shadow-xl text-xl"
                >
                  {processing ? 'Updating...' : 'Change Role'}
                </button>
                <button
                  onClick={() => {
                    setRoleModal(null);
                    setSelectedRole('');
                  }}
                  className="flex-1 py-6 border-4 border-gray-300 text-gray-700 rounded-2xl hover:bg-gray-50 font-bold text-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MFA Reset Modal */}
        {mfaModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-10 animate-in zoom-in">
              <div className="text-center mb-10">
                <ShieldOff className="w-20 h-20 text-red-600 mx-auto mb-6" />
                <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Reset MFA?</h2>
                <div className="bg-gray-50 rounded-2xl p-8">
                  <p className="text-2xl font-bold text-gray-900">{mfaModal.displayName || mfaModal.email}</p>
                  <p className="text-xl text-gray-600">{mfaModal.email}</p>
                </div>
                <p className="text-xl text-red-600 font-semibold mt-8">
                  This will completely disable two-factor authentication
                </p>
              </div>

              <div className="flex gap-6">
                <button
                  onClick={handleResetMfa}
                  disabled={processing === mfaModal.id}
                  className="flex-1 bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold py-6 rounded-2xl hover:from-red-700 hover:to-orange-700 disabled:opacity-60 transition-all shadow-xl text-xl"
                >
                  {processing ? 'Resetting...' : 'Yes, Reset MFA'}
                </button>
                <button
                  onClick={() => setMfaModal(null)}
                  className="flex-1 py-6 border-4 border-gray-300 text-gray-700 rounded-2xl hover:bg-gray-50 font-bold text-xl transition-colors"
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

export default UserSettings;