import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface HeroData {
  title: string;
  subtitle: string;
  backgroundImage: string;
  buttonText: string;
  buttonLink: string;
}

const fallbackImage = 'https://images.pexels.com/photos/274506/pexels-photo-274506.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&dpr=2';

const HeroSection: React.FC = () => {
  const [heroData, setHeroData] = useState<HeroData>({
    title: 'Welcome to TURFION',
    subtitle: 'Book premium sports venues and connect with players in your city',
    backgroundImage: fallbackImage,
    buttonText: 'Explore Venues',
    buttonLink: '#cards',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHeroData = async () => {
      try {
        const heroDoc = await getDoc(doc(db, 'settings', 'hero'));
        if (heroDoc.exists()) {
          const data = heroDoc.data();
          setHeroData({
            title: data.title || 'Welcome to TURFION',
            subtitle: data.subtitle || 'Book premium sports venues and connect with players',
            backgroundImage: data.backgroundImage || fallbackImage,
            buttonText: data.buttonText || 'Explore Venues',
            buttonLink: data.buttonLink || '#cards',
          });
        }
        // If document doesn't exist, silently use defaults
      } catch (error) {
        console.warn('Hero data not available (using defaults):', error);
        // Graceful fallback — no crash
      } finally {
        setLoading(false);
      }
    };

    fetchHeroData();
  }, []);

  const handleButtonClick = () => {
    if (heroData.buttonLink.startsWith('#')) {
      const target = document.querySelector(heroData.buttonLink);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      window.open(heroData.buttonLink, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) {
    return (
      <section className="relative h-96 md:h-screen max-h-[800px] rounded-3xl overflow-hidden mb-20 shadow-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent animate-pulse" />
        <div className="relative h-full flex items-center justify-center text-center px-8">
          <div className="max-w-6xl mx-auto">
            <div className="h-20 bg-white/20 rounded-3xl w-11/12 mx-auto mb-8" />
            <div className="h-12 bg-white/10 rounded-2xl w-10/12 mx-auto mb-16" />
            <div className="h-16 bg-white/30 rounded-full w-80 mx-auto" />
          </div>
        </div>
      </section>
    );
  }

  return (
   <section className="relative h-96 rounded-3xl overflow-hidden mb-16 shadow-2xl">
  <div
    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
    style={{ backgroundImage: `url(${heroData.backgroundImage})` }}
  >
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
  </div>

  <div className="relative h-full flex items-center justify-center text-center px-8">
    <div className="max-w-4xl mx-auto">
      <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-tight drop-shadow-2xl">
        {heroData.title}
      </h1>
      <p className="mt-6 text-xl md:text-2xl text-gray-100 font-light max-w-2xl mx-auto drop-shadow-lg">
        {heroData.subtitle}
      </p>
      <button
        onClick={handleButtonClick}
        className="mt-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 px-10 rounded-full text-xl transition-all duration-300 transform hover:scale-105 shadow-2xl"
      >
        {heroData.buttonText} →
      </button>
    </div>
  </div>
</section>
  );
};

export default HeroSection;