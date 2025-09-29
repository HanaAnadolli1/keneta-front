import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Tag, ArrowRight } from "lucide-react";
import noImage from "../assets/no_image.jpg";

const API_BASE = "https://admin.keneta-ks.com/api";

const Deals = () => {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/custom-promotions`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        setPromotions(data.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPromotions();
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isActive = (from, to) => {
    const now = new Date();
    const startDate = new Date(from);
    const endDate = new Date(to);
    return now >= startDate && now <= endDate;
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-48 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="h-6 bg-gray-300 rounded mb-4"></div>
                  <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-[var(--primary)] mb-2">Failed to load deals</h2>
          <p className="text-[var(--third)] mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[var(--secondary)] text-white rounded-lg hover:bg-[var(--primary)] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--primary)] mb-2">Deals & Promotions</h1>
          <p className="text-[var(--third)]">Discover amazing offers and special promotions</p>
        </div>

        {/* Promotions Grid */}
        {promotions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-[var(--third)] text-6xl mb-4">🏷️</div>
            <h3 className="text-xl font-semibold text-[var(--primary)] mb-2">No active promotions</h3>
            <p className="text-[var(--third)]">Check back later for new deals and offers!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {promotions.map((promotion) => (
              <Link
                key={promotion.id}
                to={`/deals/${promotion.id}`}
                className="group bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col h-full"
              >
                {/* Banner Image */}
                <div className="aspect-video bg-gray-100 overflow-hidden">
                  {promotion.banner_url ? (
                    <img
                      src={promotion.banner_url}
                      alt={promotion.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <img
                      src={noImage}
                      alt="No image"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                <div className="p-6 flex flex-col flex-grow">
                  {/* Status Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isActive(promotion.from, promotion.to)
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <Tag className="w-3 h-3 mr-1" />
                      {isActive(promotion.from, promotion.to) ? 'Active' : 'Inactive'}
                    </span>
                    
                    <span className="text-sm text-gray-500">
                      {promotion.product_count} products
                    </span>
                  </div>

                  {/* Promotion Name */}
                  <h3 className="text-lg font-semibold text-[var(--primary)] mb-3 group-hover:text-[var(--secondary)] transition-colors">
                    {promotion.name}
                  </h3>

                  {/* Date Range */}
                  <div className="flex items-center text-sm text-[var(--third)] mb-4">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>
                      {formatDate(promotion.from)} - {formatDate(promotion.to)}
                    </span>
                  </div>

                  {/* View Details Button */}
                  <div className="flex items-center text-[var(--secondary)] font-medium group-hover:text-[var(--primary)] transition-colors mt-auto">
                    <span>View Details</span>
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Deals;
