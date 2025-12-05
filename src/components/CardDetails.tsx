// components/CardDetails.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Clock, MapPin } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

interface CardData {
  id: string;
  title: string;
  imageUrl?: string;
  type: string;
  openingTime?: string;
  closingTime?: string;
  pricePerHour: number;
  location: string;
  description?: string;
}

const CardDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [card, setCard] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const fallbackImage = 'https://images.pexels.com/photos/274506/pexels-photo-274506.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2';

  useEffect(() => {
    const fetchCard = async () => {
      if (!id) {
        setError('Invalid venue link');
        setLoading(false);
        return;
      }

      try {
        const docSnap = await getDoc(doc(db, 'cards', id));
        if (docSnap.exists()) {
          setCard({ id: docSnap.id, ...docSnap.data() } as CardData);
        } else {
          setError('Venue not found');
        }
      } catch (err) {
        setError('Failed to load venue details');
      } finally {
        setLoading(false);
      }
    };

    fetchCard();
  }, [id]);

  const handleBookNow = () => {
    if (!user) {
      setShowLoginPrompt(true);
    } else {
      navigate(`/book/${id}`);
    }
  };

  const formatTime = (time?: string) => {
    if (!time) return null;
    const [hour, minute] = time.split(':').map(Number);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  const opening = formatTime(card?.openingTime);
  const closing = formatTime(card?.closingTime);

  // Simple Google Maps URL — no API key needed!
  const googleMapsUrl = card?.location
    ? `https://maps.google.com/maps?q=${encodeURIComponent(card.location)}&output=embed`
    : '';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <button onClick={() => navigate('/')} className="mb-8 inline-flex items-center text-blue-600 hover:text-blue-800 font-medium">
          <ArrowLeft className="w-5 h-5 mr-2" /> Back to Home
        </button>
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Oops! Venue Not Found</h2>
          <p className="text-gray-600 mb-8">{error || "The venue you're looking for doesn't exist."}</p>
          <button onClick={() => navigate('/')} className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 font-medium">
            Browse All Venues
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 lg:py-10 max-w-7xl">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </button>

        {/* Hero Image */}
        <div className="relative rounded-3xl overflow-hidden shadow-2xl mb-8">
          <img
            src={card.imageUrl || fallbackImage}
            alt={card.title}
            className="w-full h-80 sm:h-96 lg:h-[560px] object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackImage;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-8 left-6 right-6 text-white">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 drop-shadow-2xl">{card.title}</h1>
            <div className="flex flex-wrap gap-4">
              <span className="bg-white/20 backdrop-blur px-5 py-3 rounded-full font-semibold">
                {card.type}
              </span>
              <span className="bg-green-600/90 backdrop-blur px-5 py-3 rounded-full font-bold text-lg">
                ₹{card.pricePerHour}/hour
              </span>
              {(opening || closing) && (
                <span className="bg-white/20 backdrop-blur px-5 py-3 rounded-full flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  {opening} – {closing}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            {card.description && (
              <section className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl font-bold mb-4">About This Venue</h2>
                <p className="text-gray-700 leading-relaxed text-lg whitespace-pre-wrap">
                  {card.description}
                </p>
              </section>
            )}

            {/* Location Map - No API Key Needed */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Location</h2>
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center gap-3">
                  <MapPin className="w-7 h-7 text-blue-600" />
                  <p className="text-lg font-semibold text-gray-800">{card.location}</p>
                </div>
                <div className="h-96 w-full">
                  <iframe
                    src={googleMapsUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Venue location on Google Maps"
                    className="w-full h-full"
                  ></iframe>
                </div>
                <div className="p-4 bg-gray-50 border-t">
                  <a
                    href={`https://maps.google.com/maps?q=${encodeURIComponent(card.location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-medium flex items-center gap-2"
                  >
                    Open in Google Maps
                  </a>
                </div>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sticky top-24">
              <h3 className="text-2xl font-bold mb-6">Book This Venue</h3>
              <div className="text-4xl font-bold text-green-600 mb-2">
                ₹{card.pricePerHour}
                <span className="text-lg font-normal text-gray-500"> / hour</span>
              </div>

              <button
                onClick={handleBookNow}
                className="w-full bg-gradient-to-r from-blue-600 to-green-600 text-white font-bold py-5 rounded-2xl hover:shadow-2xl transition-all duration-300 text-xl mt-6 flex items-center justify-center gap-3"
              >
                <CalendarDays className="w-7 h-7" />
                {user ? 'Book Now' : 'Login to Book'}
              </button>

              <button
                onClick={() => navigate('/')}
                className="w-full mt-4 py-4 border border-gray-300 rounded-xl hover:bg-gray-50 font-medium transition"
              >
                Browse More Venues
              </button>
            </div>

            {/* Info Cards */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-xl font-bold mb-5">Venue Details</h3>
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <CalendarDays className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Sport</p>
                    <p className="text-gray-600">{card.type}</p>
                  </div>
                </div>
                {(opening || closing) && (
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                      <Clock className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium">Hours</p>
                      <p className="text-gray-600">{opening} – {closing}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-gray-600 text-sm">{card.location}</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Login Prompt */}
      {showLoginPrompt && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowLoginPrompt(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarDays className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Sign In Required</h2>
              <p className="text-gray-600 mb-6">Please log in to book this venue</p>
              <button
                onClick={() => navigate('/login', { state: { from: location } })}
                className="w-full bg-blue-600 text-white py- py-4 rounded-xl hover:bg-blue-700 font-bold"
              >
                Sign In Now
              </button>
              <button
                onClick={() => setShowLoginPrompt(false)}
                className="w-full mt-3 py-4 border border-gray-300 rounded-xl hover:bg-gray-50"
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

export default CardDetails;