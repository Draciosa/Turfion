import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../lib/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Users, UserCheck, AlertTriangle, Search } from 'lucide-react';

interface HostUser {
  id: string;
  email: string;
  role: string;
  displayName?: string;
}

interface Card {
  id: string; // Firestore document ID
  title: string;
  type: string;
  location: string;
  assignedHost?: string | null;
  userId: string;
  // Removed Card_ID if no longer needed (as per AddCard improvement)
}

const AssignCards: React.FC = () => {
  const { hasRole } = useAuth();
  const [hosts, setHosts] = useState<HostUser[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Debounced search term
  const debouncedSearchTerm = useMemo(
    () =>
      searchTerm.trim().toLowerCase(),
    [searchTerm]
  );

  // Filtered cards with memoization
  const filteredCards = useMemo(() => {
    if (!debouncedSearchTerm) return cards;

    return cards.filter(
      (card) =>
        card.title.toLowerCase().includes(debouncedSearchTerm) ||
        card.type.toLowerCase().includes(debouncedSearchTerm) ||
        (card.location && card.location.toLowerCase().includes(debouncedSearchTerm))
    );
  }, [cards, debouncedSearchTerm]);

  // Get host display name
  const getHostName = useCallback(
    (hostId?: string | null) => {
      if (!hostId) return 'Unassigned';
      const host = hosts.find((h) => h.id === hostId);
      return host?.displayName || host?.email || 'Unknown Host';
    },
    [hosts]
  );

  // Assign host
  const handleAssign = async (cardId: string, hostId: string) => {
    setAssigningId(cardId);
    setError('');
    setSuccess('');

    try {
      const cardRef = doc(db, 'cards', cardId);
      await updateDoc(cardRef, {
        assignedHost: hostId,
        updatedAt: serverTimestamp(),
      });

      const host = hosts.find((h) => h.id === hostId);
      const card = cards.find((c) => c.id === cardId);
      setSuccess(`"${card?.title}" assigned to ${host?.displayName || host?.email}`);
    } catch (err: any) {
      console.error('Assignment failed:', err);
      setError('Failed to assign card. Please try again.');
    } finally {
      setAssigningId(null);
    }
  };

  // Unassign host
  const handleUnassign = async (cardId: string) => {
    setAssigningId(cardId);
    setError('');
    setSuccess('');

    try {
      const cardRef = doc(db, 'cards', cardId);
      await updateDoc(cardRef, {
        assignedHost: null,
        updatedAt: serverTimestamp(),
      });

      const card = cards.find((c) => c.id === cardId);
      setSuccess(`"${card?.title}" is now unassigned`);
    } catch (err: any) {
      console.error('Unassignment failed:', err);
      setError('Failed to unassign card. Please try again.');
    } finally {
      setAssigningId(null);
    }
  };

  useEffect(() => {
    if (!hasRole('admin')) {
      setLoading(false);
      return;
    }

    let unsubHosts: Unsubscribe | null = null;
    let unsubCards: Unsubscribe | null = null;

    // Fetch hosts
    const hostsQuery = query(collection(db, 'users'), where('role', '==', 'host'));

    unsubHosts = onSnapshot(
      hostsQuery,
      (snapshot) => {
        const hostsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as HostUser[];
        setHosts(hostsData);
      },
      (err) => {
        console.error('Error fetching hosts:', err);
        setError('Failed to load hosts.');
      }
    );

    // Fetch cards
    const cardsQuery = query(collection(db, 'cards'));

    unsubCards = onSnapshot(
      cardsQuery,
      (snapshot) => {
        const cardsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Card[];
        setCards(cardsData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching cards:', err);
        setError('Failed to load cards.');
        setLoading(false);
      }
    );

    return () => {
      unsubHosts?.();
      unsubCards?.();
    };
  }, [hasRole]);

  // Auto-clear messages
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess('');
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  // Non-admin view
  if (!hasRole('admin')) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg">
        Only administrators can assign cards to hosts.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <h3 className="text-2xl font-bold flex items-center text-gray-900">
            <UserCheck className="w-7 h-7 mr-3 text-blue-600" />
            Assign Venues to Hosts
          </h3>
          <div className="text-sm text-gray-600">
            {cards.length} venues • {hosts.length} host{hosts.length !== 1 ? 's' : ''} available
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, type, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        {/* No hosts warning */}
        {hosts.length === 0 && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 text-sm">
              No hosts found. Create users with role "host" to assign venues.
            </p>
          </div>
        )}

        {/* Cards List */}
        {filteredCards.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-lg">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {searchTerm ? 'No venues match your search' : 'No venues available'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCards.map((card) => (
              <div
                key={card.id}
                className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow duration-200 bg-white"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap  gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                        {card.type.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900">{card.title}</h4>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 mt-1">
                          <span className="font-medium">{card.type}</span>
                          {card.location && (
                            <>
                              <span className="text-gray-400">•</span>
                              <span>{card.location}</span>
                            </>
                          )}
                        </div>

                        {card.assignedHost ? (
                          <div className="mt-3">
                            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <Users className="w-3.5 h-3.5 mr-1.5" />
                              Assigned to: {getHostName(card.assignedHost)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500 italic">Not assigned</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {card.assignedHost ? (
                      <button
                        onClick={() => handleUnassign(card.id)}
                        disabled={assigningId === card.id}
                        className="px-4 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                      >
                        {assigningId === card.id ? 'Unassigning...' : 'Unassign'}
                      </button>
                    ) : (
                      <select
                        disabled={hosts.length === 0 || assigningId === card.id}
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAssign(card.id, e.target.value);
                            e.target.value = ''; // Reset select
                          }
                        }}
                        className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-sm min-w-[180px]"
                      >
                        <option value="">{hosts.length === 0 ? 'No hosts' : 'Select Host'}</option>
                        {hosts.map((host) => (
                          <option key={host.id} value={host.id}>
                            {host.displayName || host.email}
                          </option>
                        ))}
                      </select>
                    )}
                    {assigningId === card.id && (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Guidelines */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-blue-700 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900">Assignment Rules</h4>
              <ul className="mt-2 space-y-1.5 text-sm text-blue-800">
                <li>• Hosts can edit and manage only their assigned venues</li>
                <li>• Hosts cannot book their own assigned venues</li>
                <li>• Only one host per venue</li>
                <li>• Unassigned venues are managed by admins only</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignCards;