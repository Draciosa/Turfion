import React, { useState, useMemo } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import {
  MapPin,
  Clock,
  DollarSign,
  FileText,
  Image,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface HostRequestFormProps {
  onSuccess?: () => void;
}

interface CardFormData {
  title: string;
  imageUrl: string;
  type: string;
  openingTime: string;
  closingTime: string;
  pricePerHour: number;
  description: string;
  location: string;
}

const HostRequestForm: React.FC<HostRequestFormProps> = ({ onSuccess }) => {
  const { user } = useAuth();

  const [requestMessage, setRequestMessage] = useState('');
  const [cardData, setCardData] = useState<CardFormData>({
    title: '',
    imageUrl: '',
    type: '',
    openingTime: '06:00',
    closingTime: '22:00',
    pricePerHour: 0,
    description: '',
    location: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Memoized time options
  const timeOptions = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
  }, []);

  // Capitalize on blur
  const capitalizeFirstLetter = (str: string): string => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const handleCapitalizeBlur = (field: keyof CardFormData) => () => {
    setCardData((prev) => ({
      ...prev,
      [field]: capitalizeFirstLetter(prev[field] as string),
    }));
  };

  const handleChange = (field: keyof CardFormData, value: string | number) => {
    setCardData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user) {
      setError('You must be logged in to submit a request');
      return;
    }

    if (!requestMessage.trim()) {
      setError('Please explain why you want to become a host');
      return;
    }

    if (!cardData.title.trim() || !cardData.type.trim() || cardData.pricePerHour <= 0) {
      setError('Please complete all required venue details (title, type, and valid price)');
      return;
    }

    setIsLoading(true);

    try {
      await addDoc(collection(db, 'Requests'), {
        userId: user.uid,
        userEmail: user.email || '',
        userDisplayName: user.displayName || '',
        message: requestMessage.trim(),
        status: 'pending',
        requestType: 'host-request',
        cardData: {
          ...cardData,
          title: cardData.title.trim(),
          type: cardData.type.trim(),
          location: cardData.location.trim(),
          description: cardData.description.trim(),
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Reset form
      setRequestMessage('');
      setCardData({
        title: '',
        imageUrl: '',
        type: '',
        openingTime: '06:00',
        closingTime: '22:00',
        pricePerHour: 0,
        description: '',
        location: '',
      });
      setSuccess(true);
      onSuccess?.();

      setTimeout(() => setSuccess(false), 8000);
    } catch (err) {
      console.error('Error submitting host request:', err);
      setError('Failed to submit request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-10 text-center max-w-2xl mx-auto">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-in fade-in zoom-in">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Request Submitted Successfully!</h3>
        <p className="text-gray-600 text-lg leading-relaxed mb-8">
          Thank you for your interest in becoming a host on TURFION.
          <br />
          Our team will review your request and get back to you soon.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg"
        >
          Submit Another Request
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 lg:p-10 max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Become a Host on TURFION</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          List your sports venue and reach thousands of players looking for great places to play.
        </p>
      </div>

      {error && (
        <div className="mb-8 p-5 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-10">
        {/* Personal Message */}
        <div>
          <label className="block text-lg font-semibold text-gray-800 mb-4">
            Why do you want to become a host? *
          </label>
          <textarea
            value={requestMessage}
            onChange={(e) => setRequestMessage(e.target.value)}
            placeholder="Tell us about your venue, your experience, and why you'd be a great host..."
            rows={5}
            required
            className="w-full px-5 py-4 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none resize-none transition-colors"
          />
        </div>

        {/* Venue Details */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-200">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <FileText className="w-6 h-6 mr-3 text-blue-600" />
            Your Venue Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Title */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Venue Name *</label>
              <input
                type="text"
                value={cardData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                onBlur={handleCapitalizeBlur('title')}
                placeholder="e.g., Green Valley Turf"
                required
                className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Type & Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sport Type *</label>
              <input
                type="text"
                value={cardData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                onBlur={handleCapitalizeBlur('type')}
                placeholder="e.g., Football, Cricket"
                required
                className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <DollarSign className="w-5 h-5 mr-1" />
                Price per Hour (₹) *
              </label>
              <input
                type="number"
                value={cardData.pricePerHour || ''}
                onChange={(e) => handleChange('pricePerHour', parseFloat(e.target.value) || 0)}
                min="1"
                placeholder="500"
                required
                className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Clock className="w-5 h-5 mr-1" />
                Opening Time
              </label>
              <select
                value={cardData.openingTime}
                onChange={(e) => handleChange('openingTime', e.target.value)}
                className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
              >
                {timeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Clock className="w-5 h-5 mr-1" />
                Closing Time
              </label>
              <select
                value={cardData.closingTime}
                onChange={(e) => handleChange('closingTime', e.target.value)}
                className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
              >
                {timeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <MapPin className="w-5 h-5 mr-1" />
                Location
              </label>
              <input
                type="text"
                value={cardData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                onBlur={handleCapitalizeBlur('location')}
                placeholder="e.g., Banjara Hills, Hyderabad"
                className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Image URL */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Image className="w-5 h-5 mr-1" />
                Venue Image URL
              </label>
              <input
                type="url"
                value={cardData.imageUrl}
                onChange={(e) => handleChange('imageUrl', e.target.value)}
                placeholder="https://example.com/venue-photo.jpg"
                className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
              />
              <p className="text-xs text-gray-500 mt-2">Upload a high-quality photo to attract more players</p>
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={cardData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                onBlur={handleCapitalizeBlur('description')}
                placeholder="Describe facilities, surface type, lighting, amenities, parking, etc."
                rows={4}
                className="w-full px-5 py-4 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none resize-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-5 rounded-xl text-lg transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Submitting Your Request...' : 'Submit Host Request'}
        </button>
      </form>
    </div>
  );
};

export default HostRequestForm;