import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Image, Type, Link2, Save, CheckCircle, AlertCircle, Settings, Eye } from 'lucide-react';

interface HeroData {
  title: string;
  subtitle: string;
  backgroundImage: string;
  buttonText: string;
  buttonLink: string;
}

const fallbackImage = 'https://images.pexels.com/photos/274506/pexels-photo-274506.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2';

const ManageHomepage: React.FC = () => {
  const { hasRole } = useAuth();

  const [heroData, setHeroData] = useState<HeroData>({
    title: 'Welcome to TURFION',
    subtitle: 'Book premium sports venues and connect with players in your city',
    backgroundImage: fallbackImage,
    buttonText: 'Explore Venues',
    buttonLink: '#cards',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false); // Fixed: was "= = useState"

  useEffect(() => {
    const fetchHeroData = async () => {
      try {
        const heroDoc = await getDoc(doc(db, 'settings', 'hero'));
        if (heroDoc.exists()) {
          const data = heroDoc.data() as HeroData;
          setHeroData({
            ...data,
            backgroundImage: data.backgroundImage || fallbackImage,
          });
        }
      } catch (err) {
        console.error('Error fetching hero data:', err);
        setError('Failed to load current settings');
      } finally {
        setLoading(false);
      }
    };

    fetchHeroData();
  }, []);

  // Auto-clear messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
    if (error) {
      const timer = setTimeout(() => setError(''), 8000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const handleChange = (field: keyof HeroData, value: string) => {
    setHeroData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSave = async () => {
    if (!heroData.title.trim() || !heroData.subtitle.trim()) {
      setError('Title and subtitle are required');
      return;
    }

    if (!heroData.backgroundImage.trim()) {
      setError('Please provide a background image URL');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      await setDoc(doc(db, 'settings', 'hero'), {
        ...heroData,
        title: heroData.title.trim(),
        subtitle: heroData.subtitle.trim(),
        backgroundImage: heroData.backgroundImage.trim(),
        buttonText: heroData.buttonText.trim() || 'Explore Venues',
        buttonLink: heroData.buttonLink.trim() || '#cards',
        updatedAt: serverTimestamp(),
      });

      setSuccess(true);
    } catch (err) {
      console.error('Error saving hero section:', err);
      setError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!hasRole('admin')) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-xl text-red-700 font-semibold">Access Restricted</p>
          <p className="text-red-600 mt-2">Only administrators can manage the homepage.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-200 border-2 border-dashed rounded-xl h-32 animate-pulse" />
            ))}
          </div>
          <div className="bg-gray-200 border-2 border-dashed rounded-3xl h-96 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-3">Manage Homepage Hero</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Customize the main hero section that greets visitors on the homepage
        </p>
      </div>

      {error && (
        <div className="mb-8 p-5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-8 p-5 bg-green-50 border border-green-200 rounded-2xl flex items-start gap-4 animate-in fade-in slide-in-from-top-4">
          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-green-800 font-semibold">Homepage Updated Successfully!</p>
            <p className="text-green-700 text-sm mt-1">Changes are now live on the homepage.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Form */}
        <div className="bg-white rounded-3xl shadow-xl p-8 space-y-8">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Settings className="w-7 h-7 text-blue-600" />
            Hero Content Editor
          </h2>

          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="flex items-center gap-3 text-lg font-semibold text-gray-800 mb-3">
                <Type className="w-6 h-6 text-blue-600" />
                Main Title
              </label>
              <input
                type="text"
                value={heroData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g., Play Like a Pro"
                className="w-full px-6 py-4 border-2 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none transition-colors text-lg"
              />
            </div>

            {/* Subtitle */}
            <div>
              <label className="flex items-center gap-3 text-lg font-semibold text-gray-800 mb-3">
                <Type className="w-6 h-6 text-indigo-600" />
                Subtitle
              </label>
              <textarea
                value={heroData.subtitle}
                onChange={(e) => handleChange('subtitle', e.target.value)}
                rows={3}
                placeholder="e.g., Book premium turf and courts instantly"
                className="w-full px-6 py-4 border-2 border-gray-300 rounded-2xl focus:border-indigo-500 focus:outline-none transition-colors resize-none"
              />
            </div>

            {/* Background Image */}
            <div>
              <label className="flex items-center gap-3 text-lg font-semibold text-gray-800 mb-3">
                <Image className="w-6 h-6 text-green-600" />
                Background Image URL
              </label>
              <input
                type="url"
                value={heroData.backgroundImage}
                onChange={(e) => handleChange('backgroundImage', e.target.value)}
                placeholder="https://example.com/hero-image.jpg"
                className="w-full px-6 py-4 border-2 border-gray-300 rounded-2xl focus:border-green-500 focus:outline-none transition-colors"
              />
              <p className="text-sm text-gray-500 mt-2">Use a high-quality landscape image (1920x1080 recommended)</p>
            </div>

            {/* Button */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center gap-3 text-lg font-semibold text-gray-800 mb-3">
                  Button Text
                </label>
                <input
                  type="text"
                  value={heroData.buttonText}
                  onChange={(e) => handleChange('buttonText', e.target.value)}
                  placeholder="e.g., Get Started"
                  className="w-full px-6 py-4 border-2 border-gray-300 rounded-2xl focus:border-purple-500 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="flex items-center gap-3 text-lg font-semibold text-gray-800 mb-3">
                  <Link2 className="w-6 h-6 text-purple-600" />
                  Button Link
                </label>
                <input
                  type="text"
                  value={heroData.buttonLink}
                  onChange={(e) => handleChange('buttonLink', e.target.value)}
                  placeholder="#cards or https://..."
                  className="w-full px-6 py-4 border-2 border-gray-300 rounded-2xl focus:border-purple-500 focus:outline-none transition-colors"
                />
                <p className="text-sm text-gray-500 mt-2">#cards = scroll to venues • Full URL = external link</p>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-5 rounded-2xl text-xl transition-all duration-300 shadow-xl hover:shadow-2xl disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              <Save className="w-7 h-7" />
              {saving ? 'Saving Changes...' : 'Save Homepage'}
            </button>
          </div>
        </div>

        {/* Live Preview */}
        <div className="relative">
          <div className="sticky top-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <Eye className="w-7 h-7 text-indigo-600" />
              Live Preview
            </h2>

            <div className="rounded-3xl overflow-hidden shadow-2xl border-8 border-gray-900">
              <div
                className="relative h-96 bg-cover bg-center bg-no-repeat transition-all duration-1000"
                style={{
                  backgroundImage: `url(${heroData.backgroundImage || fallbackImage})`,
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

                <div className="relative h-full flex items-center justify-center text-center px-8">
                  <div className="max-w-4xl">
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white leading-tight drop-shadow-2xl">
                      {heroData.title || 'Your Title Here'}
                    </h1>
                    <p className="mt-6 text-lg md:text-2xl text-gray-100 font-light max-w-2xl mx-auto drop-shadow-lg">
                      {heroData.subtitle || 'Your subtitle will appear here'}
                    </p>
                    <button className="mt-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 px-10 rounded-full text-xl transition-all duration-300 transform hover:scale-105 shadow-2xl">
                      {heroData.buttonText || 'Call to Action'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-500 text-center mt-4">
              This is exactly how it will appear on the homepage
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageHomepage;