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

const RequestNewCard: React.FC = () => {
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
  const [imageError, setImageError] = useState(false);

  // Memoized time options
  const timeOptions = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
  }, []);

  // Capitalize on blur
  const capitalizeFirstLetter = (str: string): string => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const handleBlurCapitalize = (field: keyof CardFormData) => () => {
    setCardData((prev) => ({
      ...prev,
      [field]: capitalizeFirstLetter(prev[field] as string),
    }));
  };

  const handleChange = (field: keyof CardFormData, value: string | number) => {
    setCardData((prev) => ({ ...prev, [field]: value }));
    if (field === 'imageUrl') setImageError(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user) {
      setError('You must be logged in to submit a request');
      return;
    }

    if (!requestMessage.trim()) {
      setError('Please explain why you want to add this venue');
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
        message: requestMessage.trim(),
        status: 'pending',
        requestType: 'new-card',
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

      setTimeout(() => setSuccess(false), 10000);
    } catch (err) {
      console.error('Error submitting card request:', err);
      setError('Failed to submit request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <div className="bg-white rounded-3xl shadow-2xl p-12 text-center animate-in fade-in zoom-in duration-500">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle className="w-16 h-16 text-green-600" />
          </div>
          <h2 className="text-4xl font-extrabold text-gray-900 mb-6">
            Venue Request Submitted!
          </h2>
          <div className="text-left bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-8 mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Thank You!</h3>
            <p className="text-gray-700 text-lg leading-relaxed">
              Your request to add a new venue has been successfully submitted to our admin team.
              <br /><br />
              We review all requests carefully and will notify you via email once a decision is made.
              <br /><br />
              Typical review time: <strong>2-5 business days</strong>
            </p>
          </div>
          <button
            onClick={() => setSuccess(false)}
            className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-xl hover:shadow-2xl text-xl"
          >
            Submit Another Venue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
          Request to Add a New Venue
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Suggest a sports venue that should be listed on TURFION. Our team will review and add it if approved.
        </p>
      </div>

      {error && (
        <div className="mb-8 p-6 bg-red-50 border-2 border-red-200 rounded-2xl flex items-start gap-4">
          <AlertCircle className="w-7 h-7 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 font-medium text-lg">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xl p-10 space-y-10">
        {/* Request Message */}
        <div>
          <label className="block text-xl font-bold text-gray-900 mb-6">
            Why should we add this venue? *
          </label>
          <textarea
            value={requestMessage}
            onChange={(e) => setRequestMessage(e.target.value)}
            placeholder="Tell us about this venue:
• Why is it popular or unique?
• What facilities does it offer?
• Who is the target audience?
• Any special features?"
            rows={6}
            required
            className="w-full px-6 py-5 border-2 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none resize-none transition-colors text-lg leading-relaxed"
          />
        </div>

        {/* Venue Details */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl p-10 border-2 border-blue-200">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-4">
            <FileText className="w-8 h-8 text-blue-600" />
            Venue Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Title */}
            <div className="md:col-span-2">
              <label className="block text-lg font-semibold text-gray-800 mb-3">Venue Name *</label>
              <input
                type="text"
                value={cardData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                onBlur={handleBlurCapitalize('title')}
                placeholder="e.g., Elite Sports Complex"
                required
                className="w-full px-6 py-4 border-2 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none transition-colors text-lg"
              />
            </div>

            {/* Type & Price */}
            <div>
              <label className="block text-lg font-semibold text-gray-800 mb-3">Sport Type *</label>
              <input
                type="text"
                value={cardData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                onBlur={handleBlurCapitalize('type')}
                placeholder="e.g., Badminton, Basketball"
                required
                className="w-full px-6 py-4 border-2 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none transition-colors text-lg"
              />
            </div>

            <div>
              <label className="block text-lg font-semibold text-gray-800 mb-3 flex items-center gap-3">
                <DollarSign className="w-7 h-7 text-green-600" />
                Price per Hour (₹) *
              </label>
              <input
                type="number"
                value={cardData.pricePerHour || ''}
                onChange={(e) => handleChange('pricePerHour', parseFloat(e.target.value) || 0)}
                min="1"
                placeholder="450"
                required
                className="w-full px-6 py-4 border-2 border-gray-300 rounded-2xl focus:border-green-500 focus:outline-none transition-colors text-lg"
              />
            </div>

            {/* Time */}
            <div>
              <label className="block text-lg font-semibold text-gray-800 mb-3 flex items-center gap-3">
                <Clock className="w-7 h-7 text-purple-600" />
                Opening Time
              </label>
              <select
                value={cardData.openingTime}
                onChange={(e) => handleChange('openingTime', e.target.value)}
                className="w-full px-6 py-4 border-2 border-gray-300 rounded-2xl focus:border-purple-500 focus:outline-none transition-colors text-lg"
              >
                {timeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-lg font-semibold text-gray-800 mb-3 flex items-center gap-3">
                <Clock className="w-7 h-7 text-purple-600" />
                Closing Time
              </label>
              <select
                value={cardData.closingTime}
                onChange={(e) => handleChange('closingTime', e.target.value)}
                className="w-full px-6 py-4 border-2 border-gray-300 rounded-2xl focus:border-purple-500 focus:outline-none transition-colors text-lg"
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
              <label className="block text-lg font-semibold text-gray-800 mb-3 flex items-center gap-3">
                <MapPin className="w-7 h-7 text-red-600" />
                Location
              </label>
              <input
                type="text"
                value={cardData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                onBlur={handleBlurCapitalize('location')}
                placeholder="e.g., Jubilee Hills, Hyderabad"
                className="w-full px-6 py-4 border-2 border-gray-300 rounded-2xl focus:border-red-500 focus:outline-none transition-colors text-lg"
              />
            </div>

            {/* Image URL */}
            <div className="md:col-span-2">
              <label className="block text-lg font-semibold text-gray-800 mb-3 flex items-center gap-3">
                <Image className="w-7 h-7 text-orange-600" />
                Venue Image URL
              </label>
              <input
                type="url"
                value={cardData.imageUrl}
                onChange={(e) => handleChange('imageUrl', e.target.value)}
                placeholder="https://example.com/venue-photo.jpg"
                className="w-full px-6 py-4 border-2 border-gray-300 rounded-2xl focus:border-orange-500 focus:outline-none transition-colors text-lg"
              />
              {cardData.imageUrl && (
                <div className="mt-4 flex items-center gap-4">
                  <div className="w-32 h-32 rounded-2xl overflow-hidden border-4 border-white shadow-xl">
                    {!imageError ? (
                      <img
                        src={cardData.imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={() => setImageError(true)}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <AlertCircle className="w-12 h-12 text-red-500" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Preview</p>
                    {imageError && <p className="text-red-600 text-sm mt-1">Invalid image URL</p>}
                  </div>
                </div>
              )}
              <p className="text-sm text-gray-600 mt-3">
                High-quality photos increase approval chances
              </p>
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-lg font-semibold text-gray-800 mb-3">Description</label>
              <textarea
                value={cardData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                onBlur={handleBlurCapitalize('description')}
                placeholder="Facilities, surface type, lighting, parking, changing rooms, etc."
                rows={5}
                className="w-full px-6 py-5 border-2 border-gray-300 rounded-2xl focus:border-indigo-500 focus:outline-none resize-none transition-colors text-lg leading-relaxed"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-extrabold py-6 rounded-2xl text-2xl transition-all duration-300 shadow-2xl hover:shadow-3xl disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-4"
        >
          <FileText className="w-9 h-9" />
          {isLoading ? 'Submitting Request...' : 'Submit Venue Request'}
        </button>
      </form>
    </div>
  );
};

export default RequestNewCard;