import React, { useState } from 'react';
import { Search, Filter, X, Calendar, Clock, DollarSign } from 'lucide-react';

interface SearchAndFiltersProps {
  onSearch: (searchTerm: string) => void;
  onFilterChange: (filters: FilterOptions) => void;
  availableTypes: string[];
}

export interface FilterOptions {
  type: string;
  minPrice: number;
  maxPrice: number;
  date: string;
  time: string;
}

const SearchAndFilters: React.FC<SearchAndFiltersProps> = ({
  onSearch,
  onFilterChange,
  availableTypes,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    type: '',
    minPrice: 0,
    maxPrice: 0,
    date: '',
    time: '',
  });

  // Generate time options from 6:00 AM to 10:00 PM
  const timeOptions = Array.from({ length: 17 }, (_, i) => {
    const hour24 = i + 6;
    const hour12 = hour24 > 12 ? hour24 - 12 : hour24 === 12 ? 12 : hour24;
    const period = hour24 >= 12 ? 'PM' : 'AM';
    return `${hour12}:00 ${period}`;
  });

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    onSearch(value);
  };

  const updateFilter = (key: keyof FilterOptions, value: string | number) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilter = (key: keyof FilterOptions) => {
    updateFilter(key, key === 'minPrice' || key === 'maxPrice' ? 0 : '');
  };

  const clearAllFilters = () => {
    const cleared = { type: '', minPrice: 0, maxPrice: 0, date: '', time: '' };
    setFilters(cleared);
    onFilterChange(cleared);
  };

  const activeFilterCount = Object.values(filters).filter(
    (v) => (typeof v === 'string' ? v !== '' : v > 0)
  ).length;

  return (
    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden mb-12">
      {/* Search Bar + Filter Toggle */}
      <div className="p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Search Input */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
              <Search className="w-7 h-7 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by venue name, sport, or location..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-16 pr-6 py-5 text-lg border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:outline-none transition-all duration-300 placeholder-gray-400"
            />
          </div>

          {/* Filter Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-4 px-10 py-5 rounded-2xl font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-xl ${
              showFilters || activeFilterCount > 0
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter className="w-7 h-7" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-white text-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="border-t-2 border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100 px-6 lg:px-8 py-8 animate-in slide-in-from-top-4 duration-500">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-2xl font-extrabold text-gray-900">Refine Your Search</h3>
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold transition-colors"
              >
                <X className="w-6 h-6" />
                Clear All Filters
              </button>
            )}
          </div>

          {/* Active Filter Chips */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-4 mb-8">
              {filters.type && (
                <span className="inline-flex items-center gap-2 px-5 py-3 bg-blue-100 text-blue-800 rounded-full font-semibold">
                  Sport: {filters.type}
                  <button onClick={() => clearFilter('type')} className="hover:text-blue-900">
                    <X className="w-5 h-5" />
                  </button>
                </span>
              )}
              {filters.date && (
                <span className="inline-flex items-center gap-2 px-5 py-3 bg-purple-100 text-purple-800 rounded-full font-semibold">
                  <Calendar className="w-5 h-5" />
                  {new Date(filters.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  <button onClick={() => clearFilter('date')} className="hover:text-purple-900">
                    <X className="w-5 h-5" />
                  </button>
                </span>
              )}
              {filters.time && (
                <span className="inline-flex items-center gap-2 px-5 py-3 bg-orange-100 text-orange-800 rounded-full font-semibold">
                  <Clock className="w-5 h-5" />
                  {filters.time}
                  <button onClick={() => clearFilter('time')} className="hover:text-orange-900">
                    <X className="w-5 h-5" />
                  </button>
                </span>
              )}
              {filters.minPrice > 0 && (
                <span className="inline-flex items-center gap-2 px-5 py-3 bg-green-100 text-green-800 rounded-full font-semibold">
                  <DollarSign className="w-5 h-5" />
                  Min: ₹{filters.minPrice}
                  <button onClick={() => clearFilter('minPrice')} className="hover:text-green-900">
                    <X className="w-5 h-5" />
                  </button>
                </span>
              )}
              {filters.maxPrice > 0 && (
                <span className="inline-flex items-center gap-2 px-5 py-3 bg-green-100 text-green-800 rounded-full font-semibold">
                  <DollarSign className="w-5 h-5" />
                  Max: ₹{filters.maxPrice}
                  <button onClick={() => clearFilter('maxPrice')} className="hover:text-green-900">
                    <X className="w-5 h-5" />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {/* Sport Type */}
            <div>
              <label className="block text-lg font-bold text-gray-800 mb-3">Sport Type</label>
              <select
                value={filters.type}
                onChange={(e) => updateFilter('type', e.target.value)}
                className="w-full px-6 py-4 border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:outline-none transition-colors text-lg"
              >
                <option value="">All Sports</option>
                {availableTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-lg font-bold text-gray-800 mb-3 flex items-center gap-3">
                <Calendar className="w-6 h-6 text-purple-600" />
                Preferred Date
              </label>
              <input
                type="date"
                value={filters.date}
                onChange={(e) => updateFilter('date', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-6 py-4 border-2 border-gray-200 rounded-2xl focus:border-purple-500 focus:outline-none transition-colors text-lg"
              />
            </div>

            {/* Time */}
            <div>
              <label className="block text-lg font-bold text-gray-800 mb-3 flex items-center gap-3">
                <Clock className="w-6 h-6 text-orange-600" />
                Preferred Time
              </label>
              <select
                value={filters.time}
                onChange={(e) => updateFilter('time', e.target.value)}
                className="w-full px-6 py-4 border-2 border-gray-200 rounded-2xl focus:border-orange-500 focus:outline-none transition-colors text-lg"
              >
                <option value="">Any Time</option>
                {timeOptions.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>

            {/* Min Price */}
            <div>
              <label className="block text-lg font-bold text-gray-800 mb-3 flex items-center gap-3">
                <DollarSign className="w-6 h-6 text-green-600" />
                Min Price (₹/hr)
              </label>
              <input
                type="number"
                value={filters.minPrice || ''}
                onChange={(e) => updateFilter('minPrice', parseInt(e.target.value) || 0)}
                placeholder="0"
                min="0"
                className="w-full px-6 py-4 border-2 border-gray-200 rounded-2xl focus:border-green-500 focus:outline-none transition-colors text-lg placeholder-gray-400"
              />
            </div>

            {/* Max Price */}
            <div>
              <label className="block text-lg font-bold text-gray-800 mb-3 flex items-center gap-3">
                <DollarSign className="w-6 h-6 text-green-600" />
                Max Price (₹/hr)
              </label>
              <input
                type="number"
                value={filters.maxPrice || ''}
                onChange={(e) => updateFilter('maxPrice', parseInt(e.target.value) || 0)}
                placeholder="No limit"
                min="0"
                className="w-full px-6 py-4 border-2 border-gray-200 rounded-2xl focus:border-green-500 focus:outline-none transition-colors text-lg placeholder-gray-400"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchAndFilters;