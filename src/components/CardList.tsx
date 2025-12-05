import { useEffect, useState, useMemo, useCallback } from 'react';
import { db } from '../lib/firebase';
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
  Unsubscribe,
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  Edit,
  Save,
  X,
  Trash2,
  MapPin,
  ImageIcon,
  FileText,
  Calendar,
} from 'lucide-react';

interface CardData {
  id: string;
  title: string;
  imageUrl?: string;
  type: string;
  openingTime?: string;
  closingTime?: string;
  pricePerHour: number;
  location?: string;
  description?: string;
  userId: string;
  assignedHost?: string | null;
  createdAt?: any;
  updatedAt?: any;
}

export default function CardList() {
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CardData>>({});
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();

  // Memoized time options
  const timeOptions = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
  }, []);

  // Capitalize on blur
  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  const handleBlurCapitalize = (field: keyof CardData) => () => {
    setEditForm((prev) => ({
      ...prev,
      [field]: prev[field] ? capitalize(prev[field] as string) : '',
    }));
  };

  // Fetch cards based on role
  useEffect(() => {
    if (!user) {
      setCards([]);
      setLoading(false);
      return;
    }

    let q;
    if (hasRole('admin')) {
      q = query(collection(db, 'cards'));
    } else if (hasRole('host')) {
      q = query(collection(db, 'cards'), where('assignedHost', '==', user.uid));
    } else {
      q = query(collection(db, 'cards'), where('userId', '==', user.uid));
    }

    const unsubscribe: Unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as CardData[];

        // Sort by updatedAt or createdAt
        items.sort((a, b) => {
          const dateA = (a.updatedAt || a.createdAt)?.toDate?.() || new Date(0);
          const dateB = (b.updatedAt || b.createdAt)?.toDate?.() || new Date(0);
          return dateB.getTime() - dateA.getTime();
        });

        setCards(items);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching cards:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, hasRole]);

  const canEdit = useCallback(
    (card: CardData) => {
      return hasRole('admin') || (hasRole('host') && card.assignedHost === user?.uid) || card.userId === user?.uid;
    },
    [hasRole, user]
  );

  const canDelete = useCallback(() => hasRole('admin'), [hasRole]);

  const startEdit = (card: CardData) => {
    setEditingId(card.id);
    setEditForm({
      title: card.title,
      type: card.type,
      location: card.location || '',
      description: card.description || '',
      pricePerHour: card.pricePerHour,
      imageUrl: card.imageUrl || '',
      openingTime: card.openingTime || '09:00',
      closingTime: card.closingTime || '22:00',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (cardId: string) => {
    if (!editForm.title?.trim() || !editForm.type?.trim() || editForm.pricePerHour <= 0) {
      alert('Please fill in title, type, and a valid price.');
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, 'cards', cardId), {
        ...editForm,
        title: editForm.title.trim(),
        type: editForm.type.trim(),
        location: editForm.location?.trim() || '',
        description: editForm.description?.trim() || '',
        updatedAt: new Date(),
      });
      setEditingId(null);
    } catch (err) {
      console.error('Update failed:', err);
      alert('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const deleteCard = async (cardId: string, title: string) => {
    if (!confirm(`Permanently delete "${title}"? This cannot be undone.`)) return;

    setDeletingId(cardId);
    try {
      await deleteDoc(doc(db, 'cards', cardId));
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete venue.');
    } finally {
      setDeletingId(null);
    }
  };

  const fallbackImage = 'https://images.pexels.com/photos/274506/pexels-photo-274506.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2';

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-16">
        <p className="text-xl text-gray-600">Please log in to manage your venues.</p>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-2xl">
        <div className="max-w-md mx-auto">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-xl text-gray-600">
            {hasRole('admin')
              ? 'No venues in the system yet.'
              : hasRole('host')
              ? 'No venues assigned to you.'
              : 'You haven’t added any venues yet.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {cards.map((card) => {
        const isEditing = editingId === card.id;

        return (
          <div
            key={card.id}
            className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col"
          >
            {/* Image */}
            <div className="relative h-56 bg-gray-100">
              {isEditing ? (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
                  <div className="w-full">
                    <label className="flex items-center text-white text-sm mb-2">
                      <ImageIcon className="w-4 h-4 mr-2" /> Image URL
                    </label>
                    <input
                      type="url"
                      value={editForm.imageUrl || ''}
                      onChange={(e) => setEditForm((p) => ({ ...p, imageUrl: e.target.value }))}
                      placeholder="https://example.com/image.jpg"
                      className="w-full px-4 py-2 rounded-lg text-sm"
                    />
                  </div>
                </div>
              ) : (
                <img
                  src={card.imageUrl || fallbackImage}
                  alt={card.title}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => navigate(`/card/${card.id}`)}
                  onError={(e) => ((e.target as HTMLImageElement).src = fallbackImage)}
                />
              )}

              {/* Role Badge */}
              <div className="absolute top-3 left-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium text-white ${
                    hasRole('admin')
                      ? 'bg-red-600'
                      : hasRole('host') && card.assignedHost === user?.uid
                      ? 'bg-purple-600'
                      : 'bg-blue-600'
                  }`}
                >
                  {hasRole('admin') ? 'Admin' : hasRole('host') ? 'Assigned' : 'Yours'}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="absolute top-3 right-3 flex gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => saveEdit(card.id)}
                      disabled={saving}
                      className="p-2.5 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="p-2.5 bg-gray-600 text-white rounded-full hover:bg-gray-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    {canEdit(card) && (
                      <button
                        onClick={() => startEdit(card)}
                        className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete() && (
                      <button
                        onClick={() => deleteCard(card.id, card.title)}
                        disabled={deletingId === card.id}
                        className="p-2.5 bg-red-600 text-white rounded-full hover:bg-red-700 disabled:opacity-50"
                      >
                        {deletingId === card.id ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-5 flex-1 flex flex-col">
              {isEditing ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={editForm.title || ''}
                    onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                    onBlur={handleBlurCapitalize('title')}
                    placeholder="Venue Title *"
                    className="w-full text-lg font-bold border-b-2 border-gray-300 focus:border-blue-500 outline-none"
                  />
                  <input
                    type="text"
                    value={editForm.type || ''}
                    onChange={(e) => setEditForm((p) => ({ ...p, type: e.target.value }))}
                    onBlur={handleBlurCapitalize('type')}
                    placeholder="Sport Type *"
                    className="w-full text-sm border-b border-gray-300 focus:border-blue-500 outline-none"
                  />
                  <input
                    type="text"
                    value={editForm.location || ''}
                    onChange={(e) => setEditForm((p) => ({ ...p, location: e.target.value }))}
                    onBlur={handleBlurCapitalize('location')}
                    placeholder="Location"
                    className="w-full text-sm border-b border-gray-300 focus:border-blue-500 outline-none"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-600">Open</label>
                      <select
                        value={editForm.openingTime}
                        onChange={(e) => setEditForm((p) => ({ ...p, openingTime: e.target.value }))}
                        className="w-full mt-1 px-2 py-1 text-sm border rounded"
                      >
                        {timeOptions.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Close</label>
                      <select
                        value={editForm.closingTime}
                        onChange={(e) => setEditForm((p) => ({ ...p, closingTime: e.target.value }))}
                        className="w-full mt-1 px-2 py-1 text-sm border rounded"
                      >
                        {timeOptions.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <input
                    type="number"
                    value={editForm.pricePerHour || ''}
                    onChange={(e) => setEditForm((p) => ({ ...p, pricePerHour: Number(e.target.value) || 0 }))}
                    placeholder="Price/hour *"
                    min="1"
                    className="w-full text-sm border-b border-gray-300 focus:border-green-500 outline-none"
                  />
                  <textarea
                    value={editForm.description || ''}
                    onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                    onBlur={handleBlurCapitalize('description')}
                    placeholder="Description"
                    rows={2}
                    className="w-full text-sm border rounded resize-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ) : (
                <>
                  <h3
                    onClick={() => navigate(`/card/${card.id}`)}
                    className="text-xl font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                  >
                    {card.title}
                  </h3>
                  <p className="text-sm text-blue-600 font-medium mt-1">{card.type}</p>

                  <div className="mt-3 space-y-2 text-sm text-gray-600">
                    {card.location && (
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2" />
                        <span>{card.location}</span>
                      </div>
                    )}
                    {card.pricePerHour > 0 && (
                      <div className="flex items-center text-green-600 font-semibold">
                        ₹{card.pricePerHour}/hour
                      </div>
                    )}
                    {(card.openingTime || card.closingTime) && (
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        <span>
                          {card.openingTime} – {card.closingTime || '23:00'}
                        </span>
                      </div>
                    )}
                    {card.description && (
                      <p className="text-gray-600 line-clamp-2 mt-2">{card.description}</p>
                    )}
                  </div>

                  <div className="mt-4 text-xs text-gray-500">
                    Added: {card.createdAt?.toDate?.().toLocaleDateString() || 'Recently'}
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}