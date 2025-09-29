import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Tag, ShoppingCart } from "lucide-react";

const API_BASE = "https://admin.keneta-ks.com/api";

const DealDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [promotion, setPromotion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch promotion details
  useEffect(() => {
    const fetchPromotion = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/custom-promotions`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch promotions: HTTP ${response.status}`);
        }
        
        const data = await response.json();
        const currentPromotion = data.data?.find(p => p.id === parseInt(id));
        
        if (!currentPromotion) {
          throw new Error('Promotion not found');
        }
        
        setPromotion(currentPromotion);
        
        // Redirect to Products page with promotion filter
        navigate(`/products?promotion_id=${id}`, { replace: true });
        
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPromotion();
    }
  }, [id, navigate]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading promotion...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load deal details</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-x-4">
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <Link
              to="/deals"
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to Deals
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!promotion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Promotion not found</h2>
          <p className="text-gray-600 mb-4">The promotion you're looking for doesn't exist.</p>
          <Link
            to="/deals"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Deals
          </Link>
        </div>
      </div>
    );
  }

  // This should not render as we redirect, but just in case
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link
          to="/deals"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Deals
        </Link>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center mb-3">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    isActive(promotion.from, promotion.to)
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <Tag className="w-4 h-4 mr-2" />
                  {isActive(promotion.from, promotion.to) ? 'Active Promotion' : 'Inactive Promotion'}
                </span>
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-3">{promotion.name}</h1>

              <div className="flex items-center text-gray-600">
                <Calendar className="w-4 h-4 mr-2" />
                <span>
                  {formatDate(promotion.from)} - {formatDate(promotion.to)}
                </span>
              </div>
            </div>

            {promotion.logo_url && (
              <div className="mt-4 md:mt-0">
                <img
                  src={promotion.logo_url}
                  alt={`${promotion.name} logo`}
                  className="h-12 w-auto"
                />
              </div>
            )}
          </div>
        </div>

        <div className="text-center py-8">
          <p className="text-gray-600">Redirecting to products...</p>
        </div>
      </div>
    </div>
  );
};

export default DealDetails;