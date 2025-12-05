import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, MapPin, Clock, ArrowLeft, CalendarDays, IndianRupee } from 'lucide-react';
import { SportsGround } from '../types';

interface Props {
  grounds: SportsGround[];
}

const fallbackImage = 'https://images.pexels.com/photos/274506/pexels-photo-274506.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2';

const SportsGroundDetails: React.FC<Props> = ({ grounds }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const ground = grounds.find(g => g.id === id);

  if (!ground) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-12 text-center">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-8">
            <AlertCircle className="w-14 h-14 text-red-600" />
          </div>
          <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Venue Not Found</h2>
          <p className="text-xl text-gray-600 mb-10">
            The sports ground you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-4 px-10 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-xl hover:shadow-2xl text-xl"
          >
            <ArrowLeft className="w-7 h-7" />
            Back to All Venues
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-6 py-12 max-w-7xl">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-8 inline-flex items-center gap-3 text-blue-600 hover:text-blue-800 font-semibold text-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
          Back to Venues
        </button>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Hero Image */}
          <div className="relative h-96 md:h-[500px] lg:h-[600px]">
            <img
              src={ground.image || fallbackImage}
              alt={ground.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = fallbackImage;
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            
            {/* Title Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-10 text-white">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-4 drop-shadow-2xl">
                {ground.name}
              </h1>
              <div className="flex items-center gap-6 text-2xl">
                <div className="flex items-center gap-3">
                  <MapPin className="w-8 h-8" />
                  <span className="font-medium">{ground.location}, {ground.area}</span>
                </div>
                <div className="flex items-center gap-2 bg-green-600/90 px-6 py-3 rounded-full backdrop-blur-sm">
                  <Star className="w-7 h-7 fill-white" />
                  <span className="font-bold text-xl">{ground.rating}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-10 lg:p-16">
            <div className="grid lg:grid-cols-3 gap-12">
              {/* Left Column - Details */}
              <div className="lg:col-span-2 space-y-12">
                {/* Sports Available */}
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-4">
                    <CalendarDays className="w-10 h-10 text-blue-600" />
                    Available Sports
                  </h2>
                  <div className="flex flex-wrap gap-4">
                    {ground.sports.map((sport) => (
                      <span
                        key={sport}
                        className="inline-flex items-center gap-3 px-8 py-5 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 rounded-2xl font-bold text-xl shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        {sport}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Opening Hours */}
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-4">
                    <Clock className="w-10 h-10 text-purple-600" />
                    Operating Hours
                  </h2>
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-3xl p-10 border-2 border-purple-200">
                    <p className="text-3xl font-extrabold text-purple-800">
                      {ground.openingTime}
                    </p>
                    <p className="text-xl text-purple-700 mt-3">Open daily</p>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-4">
                    <MapPin className="w-10 h-10 text-red-600" />
                    Location
                  </h2>
                  <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-3xl p-10 border-2 border-red-200">
                    <p className="text-2xl font-bold text-red-800">
                      {ground.location}, {ground.area}
                    </p>
                    <p className="text-xl text-red-700 mt-3">
                      {ground.distance} from your location
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column - Pricing & Booking */}
              <div className="space-y-10">
                {/* Pricing Card */}
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl p-10 text-white shadow-2xl">
                  <h3 className="text-2xl font-bold mb-6">Pricing</h3>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <IndianRupee className="w-12 h-12" />
                      <span className="text-7xl font-extrabold">{ground.pricePerHour}</span>
                    </div>
                    <p className="text-2xl opacity-90">per hour</p>
                  </div>
                </div>

                {/* Book Now Button */}
                <button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold py-8 rounded-3xl text-3xl transition-all duration-300 shadow-2xl hover:shadow-3xl transform hover:scale-105">
                  <CalendarDays className="w-12 h-12 inline mr-4" />
                  Book This Venue
                </button>

                {/* Quick Info */}
                <div className="bg-gray-50 rounded-3xl p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-lg text-gray-600">Rating</span>
                    <div className="flex items-center gap-2">
                      <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
                      <span className="text-2xl font-bold text-gray-900">{ground.rating}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg text-gray-600">Distance</span>
                    <span className="text-2xl font-bold text-gray-900">{ground.distance}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SportsGroundDetails;