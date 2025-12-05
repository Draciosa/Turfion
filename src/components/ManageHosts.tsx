import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import {
  Users,
  UserMinus,
  AlertTriangle,
  CheckCircle,
  Shield,
  Calendar,
  Mail,
} from 'lucide-react';

interface HostUser {
  id: string;
  email: string;
  role: string;
  displayName?: string;
  createdAt: any;
  updatedAt?: any;
}

const ManageHosts: React.FC = () => {
  const { hasRole } = useAuth();
  const [hosts, setHosts] = useState<HostUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<HostUser | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!hasRole('admin')) return;

    const q = query(collection(db, 'users'), where('role', '==', 'host'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const hostsData: HostUser[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as HostUser));

        // Sort by creation date (newest first)
        hostsData.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB.getTime() - dateA.getTime();
        });

        setHosts(hostsData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching hosts:', err);
        setError('Failed to load hosts');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [hasRole]);

  // Auto-clear messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 6000);
      return () => clearTimeout(timer);
    }
    if (error) {
      const timer = setTimeout(() => setError(''), 8000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const handleRevokeHost = async (host: HostUser) => {
    setConfirmModal(null);
    setRevokingId(host.id);
    setError('');
    setSuccess('');

    try {
      // Get all cards by this host
      const cardsQuery = query(collection(db, 'cards'), where('userId', '==', host.id));
      const cardsSnap = await getDocs(cardsQuery);
      const cardIds = cardsSnap.docs.map((d) => d.id);

      // Delete bookings with open slots for these cards
      const deleteOpenSlotBookings = async () => {
        for (const cardId of cardIds) {
          const openBookingsQuery = query(
            collection(db, 'bookings'),
            where('cardId', '==', cardId),
            where('openSlots', '>', 0)
          );
          const openBookingsSnap = await getDocs(openBookingsQuery);
          const deletes = openBookingsSnap.docs.map((d) => deleteDoc(doc(db, 'bookings', d.id)));
          await Promise.all(deletes);
        }
      };

      await deleteOpenSlotBookings();

      // Delete all cards
      const deleteCards = cardsSnap.docs.map((d) => deleteDoc(doc(db, 'cards', d.id)));
      await Promise.all(deleteCards);

      // Revoke host role
      await updateDoc(doc(db, 'users', host.id), {
        role: 'user',
        updatedAt: serverTimestamp(),
      });

      setSuccess(
        `Host privileges revoked for ${host.displayName || host.email}. Deleted ${cardsSnap.size} venue(s) and associated open slots.`
      );
    } catch (err) {
      console.error('Error revoking host:', err);
      setError('Failed to revoke host privileges. Please try again.');
    } finally {
      setRevokingId(null);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp?.toDate) return 'Unknown date';
    return timestamp.toDate().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!hasRole('admin')) {
    return (
      <div className="max-w-4xl mx-auto p-10 text-center">
        <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-10">
          <Shield className="w-20 h-20 text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-red-800 mb-3">Access Denied</h2>
          <p className="text-red-700 text-lg">Only administrators can manage hosts.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-10">
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-200 border-2 border-dashed rounded-2xl h-32 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Manage Hosts</h1>
        <p className="text-xl text-gray-600">View and revoke host privileges for users</p>
      </div>

      {error && (
        <div className="mb-8 p-6 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-4">
          <AlertCircle className="w-7 h-7 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 font-medium text-lg">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-2xl flex items-start gap-4 animate-in fade-in slide-in-from-top-4">
          <CheckCircle className="w-7 h-7 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-green-800 font-semibold text-lg">Success!</p>
            <p className="text-green-700">{success}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Users className="w-12 h-12" />
              <div>
                <h2 className="text-3xl font-bold">Active Hosts</h2>
                <p className="text-purple-100 text-lg">{hosts.length} host{hosts.length !== 1 ? 's' : ''} currently active</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8">
          {hosts.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-2xl">
              <Users className="w-20 h-20 text-gray-300 mx-auto mb-6" />
              <h3 className="text-2xl font-semibold text-gray-700 mb-3">No Hosts Found</h3>
              <p className="text-gray-500 text-lg">When users are granted host privileges, they will appear here.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {hosts.map((host) => (
                <div
                  key={host.id}
                  className="border border-gray-200 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-purple-50 to-indigo-50"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="flex items-start gap-5">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                        {host.displayName?.charAt(0).toUpperCase() || host.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">
                          {host.displayName || 'No Display Name'}
                        </h3>
                        <div className="flex items-center gap-3 text-gray-600 mt-2">
                          <Mail className="w-5 h-5" />
                          <span className="font-medium">{host.email}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500 mt-3">
                          <Calendar className="w-4 h-4" />
                          <span>Host since {formatDate(host.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="px-5 py-2 bg-purple-100 text-purple-800 rounded-full font-semibold text-lg">
                        Host
                      </span>
                      <button
                        onClick={() => setConfirmModal(host)}
                        disabled={revokingId === host.id}
                        className="flex items-center gap-3 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-60 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
                      >
                        <UserMinus className="w-5 h-5" />
                        {revokingId === host.id ? 'Revoking...' : 'Revoke Host'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Warning Banner */}
      <div className="mt-12 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-3xl p-8">
        <div className="flex items-start gap-5">
          <AlertTriangle className="w-10 h-10 text-yellow-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-2xl font-bold text-yellow-900 mb-3">Critical Action Warning</h3>
            <p className="text-yellow-800 leading-relaxed text-lg">
              Revoking host privileges is <strong>permanent and destructive</strong>. This action will:
            </p>
            <ul className="mt-4 space-y-2 text-yellow-800">
              <li className="flex items-start gap-3">
                <span className="text-2xl">•</span>
                <span>Demote the user from "host" to regular "user"</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">•</span>
                <span>Delete <strong>all venues</strong> created by this host</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">•</span>
                <span>Remove all open slots and associated bookings</span>
              </li>
            </ul>
            <p className="mt-6 text-yellow-900 font-semibold text-lg">
              This action <strong>cannot be undone</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 animate-in zoom-in">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <UserMinus className="w-12 h-12 text-red-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">Revoke Host Privileges?</h3>
              <p className="text-gray-600 text-lg">
                You are about to revoke host access for:
              </p>
              <div className="bg-gray-50 rounded-xl p-6 mt-6">
                <p className="font-bold text-xl text-gray-900">{confirmModal.displayName || confirmModal.email}</p>
                <p className="text-gray-600">{confirmModal.email}</p>
              </div>
              <p className="text-red-600 font-semibold mt-6 text-lg">
                This will permanently delete all their venues and open slots.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRevokeHost(confirmModal)}
                disabled={revokingId === confirmModal.id}
                className="flex-1 py-4 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-60 font-bold transition-all duration-300 shadow-lg"
              >
                {revokingId === confirmModal.id ? 'Revoking...' : 'Yes, Revoke Access'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageHosts;