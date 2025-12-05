import { useState, FormEvent, ChangeEvent, useMemo } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

interface AddCardProps {
  onSuccess?: () => void;
}

interface FormData {
  title: string;
  imageUrl: string;
  type: string;
  openingTime: string;
  closingTime: string;
  pricePerHour: number;
  description: string;
  location: string;
}

export default function AddCard({ onSuccess }: AddCardProps) {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    imageUrl: '',
    type: '',
    openingTime: '00:00',
    closingTime: '23:00',
    pricePerHour: 0,
    description: '',
    location: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user, hasRole } = useAuth();

  // Memoize time options to avoid regenerating on every render
  const timeOptions = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) =>
      `${i.toString().padStart(2, '0')}:00`
    );
  }, []);

  // Capitalize only on blur (more natural typing experience)
  const capitalizeFirstLetter = (str: string): string => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'number'
          ? parseFloat(value) || 0
          : value,
    }));
  };

  // Capitalize on blur instead of on every change
  const handleCapitalizeBlur = (field: keyof FormData) => () => {
    setFormData((prev) => ({
      ...prev,
      [field]: capitalizeFirstLetter(prev[field]),
    }));
  };

  const buildSearchKeywords = (data: FormData): string => {
    return [data.title, data.type, data.location, data.description]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!user) {
      setError('You must be logged in to add a card');
      return;
    }

    if (!hasRole('admin')) {
      setError('Only admins can create cards');
      return;
    }

    if (!formData.title.trim() || !formData.type.trim() || !formData.location.trim()) {
      setError('Title, type, and location are required');
      return;
    }

    if (formData.pricePerHour <= 0) {
      setError('Price per hour must be greater than 0');
      return;
    }

    // Basic URL validation for image
    if (formData.imageUrl && !/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)/i.test(formData.imageUrl)) {
      setError('Please enter a valid image URL (jpg, jpeg, png, gif, webp)');
      return;
    }

    setIsLoading(true);

    try {
      const searchKeywords = buildSearchKeywords(formData);

      await addDoc(collection(db, 'cards'), {
        ...formData,
        userId: user.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
        titleLower: formData.title.toLowerCase(),
        typeLower: formData.type.toLowerCase(),
        locationLower: formData.location.toLowerCase(),
        descriptionLower: formData.description.toLowerCase(),
        searchKeywords,
        // Removed custom Card_ID — let Firestore generate secure auto-ID
      });

      // Reset form
      setFormData({
        title: '',
        imageUrl: '',
        type: '',
        openingTime: '00:00',
        closingTime: '23:00',
        pricePerHour: 0,
        description: '',
        location: '',
      });

      setSuccess('Card created successfully!');
      onSuccess?.();
    } catch (err: any) {
      console.error('Error adding card:', err);
      setError(err.message || 'Failed to add card. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Early return for non-admins (only once)
  if (!hasRole('admin')) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
        Only administrators can create cards.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-2xl mx-auto">
      <h3 className="text-2xl font-bold mb-6 text-gray-900">Add New Venue</h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            onBlur={handleCapitalizeBlur('title')}
            placeholder="Enter venue title"
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>

        <div>
          <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-2">
            Image URL
          </label>
          <input
            type="url"
            id="imageUrl"
            name="imageUrl"
            value={formData.imageUrl}
            onChange={handleChange}
            placeholder="https://example.com/venue.jpg"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
          <p className="text-xs text-gray-500 mt-1">Supported: jpg, jpeg, png, gif, webp</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
              Type <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              onBlur={handleCapitalizeBlur('type')}
              placeholder="e.g., Football"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
              Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              onBlur={handleCapitalizeBlur('location')}
              placeholder="e.g., Banjara Hills"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            onBlur={handleCapitalizeBlur('description')}
            rows={4}
            placeholder="Describe facilities, surface type, amenities..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
          />
        </div>

        <div>
          <label htmlFor="pricePerHour" className="block text-sm font-medium text-gray-700 mb-2">
            Price per Hour (₹) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="pricePerHour"
            name="pricePerHour"
            value={formData.pricePerHour || ''}
            onChange={handleChange}
            min="1"
            step="1"
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="openingTime" className="block text-sm font-medium text-gray-700 mb-2">
              Opening Time
            </label>
            <select
              id="openingTime"
              name="openingTime"
              value={formData.openingTime}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              {timeOptions.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="closingTime" className="block text-sm font-medium text-gray-700 mb-2">
              Closing Time
            </label>
            <select
              id="closingTime"
              name="closingTime"
              value={formData.closingTime}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              {timeOptions.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {isLoading ? 'Adding Venue...' : 'Add Venue'}
        </button>
      </form>
    </div>
  );
}