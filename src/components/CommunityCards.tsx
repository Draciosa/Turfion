import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, limit, startAfter, orderBy, DocumentSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';

const fallbackImage = 'https://images.pexels.com/photos/274506/pexels-photo-274506.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&dpr=2';

const CARDS_PER_PAGE = 9;

const CommunityCards: React.FC = () => {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [lastDocs, setLastDocs] = useState<Map<number, DocumentSnapshot | null>>(new Map());
  const navigate = useNavigate();

  const fetchPage = async (page: number) => {
    setLoading(true);
    try {
      let q = query(
        collection(db, 'cards'),
        orderBy('createdAt', 'desc'),
        limit(CARDS_PER_PAGE)
      );

      if (page > 1 && lastDocs.has(page - 1)) {
        const lastDoc = lastDocs.get(page - 1);
        if (lastDoc) {
          q = query(
            collection(db, 'cards'),
            orderBy('createdAt', 'desc'),
            startAfter(lastDoc),
            limit(CARDS_PER_PAGE)
          );
        }
      }

      const querySnapshot = await getDocs(q);
      const loadedCards = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setCards(loadedCards);

      const newLastDocs = new Map(lastDocs);
      newLastDocs.set(page, querySnapshot.docs[querySnapshot.docs.length - 1] || null);
      setLastDocs(newLastDocs);

      const totalCardsEstimate = page * CARDS_PER_PAGE + (querySnapshot.size === CARDS_PER_PAGE ? 1 : 0);
      setTotalPages(Math.max(page, Math.ceil(totalCardsEstimate / CARDS_PER_PAGE)));
    } catch (err) {
      console.error('Error fetching cards:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage(1);
  }, []);

  const handlePageClick = (page: number) => {
    if (page === currentPage || page < 1 || page > totalPages) return;
    setCurrentPage(page);
    fetchPage(page);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl overflow-hidden animate-pulse border border-white/30">
            <div className="h-64 bg-gray-200" />
            <div className="p-8">
              <div className="h-8 bg-gray-200 rounded-xl mb-4" />
              <div className="h-6 bg-gray-200 rounded-lg w-3/4 mb-6" />
              <div className="h-10 bg-gray-200 rounded-full w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="text-center py-24">
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-16 max-w-3xl mx-auto shadow-2xl">
          <div className="w-32 h-32 bg-gray-200 rounded-full mx-auto mb-8 flex items-center justify-center">
            <span className="text-6xl">🏟️</span>
          </div>
          <h2 className="text-5xl font-extrabold text-gray-800 mb-6">
            No Venues Available Yet
          </h2>
          <p className="text-2xl text-gray-600 mb-12 leading-relaxed">
            We're working hard to bring premium sports venues to TURFION.
            <br />
            Check back soon or help us grow by suggesting a venue!
          </p>
          <button
            onClick={() => navigate('/request-card')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-extrabold py-6 px-16 rounded-full text-2xl transition-all duration-300 shadow-2xl hover:shadow-3xl transform hover:scale-105"
          >
            Suggest a Venue
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
  {cards.map((card) => (
    <div
      key={card.id}
      onClick={() => navigate(`/card/${card.id}`)}
      className="relative rounded-3xl overflow-hidden shadow-2xl cursor-pointer group border-4 border-transparent hover:border-white/40 transition-all duration-700"
    >
      <img
        src={card.imageUrl || card.imageURL || fallbackImage}
        alt={card.title}
        className="w-full h-96 object-cover group-hover:scale-110 transition-transform duration-800"
        onError={(e) => (e.target as HTMLImageElement).src = fallbackImage}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent" />
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-t from-blue-600/60 via-transparent to-transparent" />

      <div className="absolute bottom-0 left-0 right-0 p-10 text-white">
        <h3 className="text-4xl font-extrabold mb-3 tracking-tight drop-shadow-2xl">
          {card.title || 'Unnamed Venue'}
        </h3>
        <p className="text-xl opacity-90 mb-6 flex items-center gap-3 drop-shadow-lg">
          <span className="text-2xl">📍</span> {card.location}
        </p>
        <div className="flex justify-between items-center">
          <span className="text-3xl font-extrabold text-green-400 drop-shadow-2xl">
            ₹{card.pricePerHour || '???'}
            <span className="text-3xl ml-2 opacity-80">/hr</span>
          </span>
          <span className="bg-white/30 backdrop-blur-lg px-3 py-4 rounded-full font-bold text-base border border-white/40 shadow-xl">
            {card.type || 'Sports'}
          </span>
        </div>
      </div>
    </div>
  ))}
</div>
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-16">
          <button
            onClick={() => handlePageClick(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-3 rounded-full bg-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            ←
          </button>

          <div className="flex gap-3">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageClick(page)}
                className={`w-12 h-12 rounded-full font-bold text-lg transition-all ${
                  currentPage === page
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-xl'
                    : 'bg-white text-gray-700 hover:bg-gray-100 shadow-md'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => handlePageClick(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-3 rounded-full bg-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            →
          </button>
        </div>
      )}
    </>
  );
};

export default CommunityCards;