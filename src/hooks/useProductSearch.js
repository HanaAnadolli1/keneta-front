// src/hooks/useProductSearch.js
import { useState, useCallback } from 'react';
import { API_V1 } from '../api/config';

export function useProductSearch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Search function that uses the API directly
  const searchProducts = useCallback(async (query, options = {}) => {
    if (!query || query.trim().length < 2) return [];

    const {
      limit = 10
    } = options;

    const searchTerm = query.trim();
    
    console.log(`🔍 Searching API for: "${searchTerm}"`);

    setLoading(true);
    setError(null);

    try {
      // Try different search parameter names to see which one works
      const searchParams = [
        `query=${encodeURIComponent(searchTerm)}`,
        `search=${encodeURIComponent(searchTerm)}`,
        `q=${encodeURIComponent(searchTerm)}`,
        `name=${encodeURIComponent(searchTerm)}`
      ];
      
      let response = null;
      let data = null;
      
      // Try each parameter until we get results
      for (const param of searchParams) {
        const url = `${API_V1}/products?${param}&per_page=${limit}&page=1`;
        console.log(`🔍 Trying API Search URL: ${url}`);
        
        response = await fetch(url);
        console.log(`🔍 API Response status: ${response.status}`);
        
        if (!response.ok) {
          console.log(`🔍 Parameter ${param} failed with status ${response.status}`);
          continue;
        }
        
        data = await response.json();
        const items = data?.data?.items || data?.items || (Array.isArray(data?.data) ? data.data : []) || data?.products || [];
        
        // Check if results are relevant
        const relevantResults = items.filter(item => {
          const name = (item.name || '').toLowerCase();
          const sku = (item.sku || '').toLowerCase();
          const searchLower = searchTerm.toLowerCase();
          return name.includes(searchLower) || sku.includes(searchLower);
        });
        
        console.log(`🔍 Parameter ${param} returned ${items.length} total, ${relevantResults.length} relevant`);
        
        if (relevantResults.length > 0) {
          console.log(`🔍 Found working parameter: ${param}`);
          break;
        }
      }
      
      if (!response || !response.ok) {
        throw new Error(`All search parameters failed`);
      }
      
      console.log(`🔍 Final API Response:`, data);
      
      // Extract products from response (same logic as Products.jsx)
      const items = data?.data?.items || data?.items || (Array.isArray(data?.data) ? data.data : []) || data?.products || [];
      
      console.log(`🔍 Found ${items.length} products for "${searchTerm}"`);
      console.log(`🔍 Sample results:`, items.slice(0, 3).map(item => ({ id: item.id, name: item.name, sku: item.sku })));
      
      // Debug: Check if any results actually contain the search term
      const relevantResults = items.filter(item => {
        const name = (item.name || '').toLowerCase();
        const sku = (item.sku || '').toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        return name.includes(searchLower) || sku.includes(searchLower);
      });
      
      console.log(`🔍 Relevant results (containing "${searchTerm}"):`, relevantResults.length);
      if (relevantResults.length === 0 && items.length > 0) {
        console.log(`🔍 WARNING: No results contain "${searchTerm}" but API returned ${items.length} products`);
        console.log(`🔍 First few product names:`, items.slice(0, 5).map(item => item.name));
      }
      
      return items;
    } catch (err) {
      console.error(`❌ Search failed for "${searchTerm}":`, err);
      setError(err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    searchProducts
  };
}
