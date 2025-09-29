// src/hooks/useProductSearch.js
import { useState, useCallback, useRef } from 'react';
import { API_V1 } from '../api/config';

// Cache for search results
const searchCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useProductSearch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  // Search function that uses the API directly
  const searchProducts = useCallback(async (query, options = {}) => {
    if (!query || query.trim().length < 2) return [];

    const {
      limit = 10
    } = options;

    const searchTerm = query.trim();
    const cacheKey = `${searchTerm}-${limit}`;
    
    // Check cache first
    const cached = searchCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return cached.results;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setLoading(true);
    setError(null);

    try {
      // Try different search parameters in order until we get results
      const searchParams = [
        `query=${encodeURIComponent(searchTerm)}`,
        `search=${encodeURIComponent(searchTerm)}`,
        `q=${encodeURIComponent(searchTerm)}`,
        `name=${encodeURIComponent(searchTerm)}`
      ];
      
      let response = null;
      let data = null;
      let relevantResults = [];
      
      // Try each parameter until we get relevant results
      for (const param of searchParams) {
        const url = `${API_V1}/products?${param}&per_page=${limit}&page=1`;
        
        response = await fetch(url, { signal });
        
        if (!response.ok) {
          console.log(`❌ Parameter ${param} failed with status ${response.status}`);
          continue;
        }
        
        data = await response.json();
        const items = data?.data?.items || data?.items || (Array.isArray(data?.data) ? data.data : []) || data?.products || [];
        
        console.log(`🔍 Parameter ${param} returned ${items.length} total products`);
        
        // Filter relevant results
        relevantResults = items.filter(item => {
          const name = (item.name || '').toLowerCase();
          const sku = (item.sku || '').toLowerCase();
          const searchLower = searchTerm.toLowerCase();
          return name.includes(searchLower) || sku.includes(searchLower);
        });
        
        console.log(`🔍 Parameter ${param} has ${relevantResults.length} relevant results`);
        
        // If we found relevant results, use this parameter
        if (relevantResults.length > 0) {
          console.log(`✅ Using parameter ${param} for "${searchTerm}"`);
          break;
        }
      }
      
      if (!response || !response.ok) {
        throw new Error(`All search parameters failed`);
      }
      
      // Return only relevant results, sorted by relevance
      if (relevantResults.length > 0) {
        // Sort by relevance: exact matches first, then name matches, then SKU matches
        const sortedResults = relevantResults.sort((a, b) => {
          const aName = (a.name || '').toLowerCase();
          const bName = (b.name || '').toLowerCase();
          const aSku = (a.sku || '').toLowerCase();
          const bSku = (b.sku || '').toLowerCase();
          const searchLower = searchTerm.toLowerCase();
          
          // Exact name match gets highest priority
          const aExactName = aName === searchLower;
          const bExactName = bName === searchLower;
          if (aExactName && !bExactName) return -1;
          if (!aExactName && bExactName) return 1;
          
          // Name starts with search term
          const aNameStarts = aName.startsWith(searchLower);
          const bNameStarts = bName.startsWith(searchLower);
          if (aNameStarts && !bNameStarts) return -1;
          if (!aNameStarts && bNameStarts) return 1;
          
          // SKU exact match
          const aExactSku = aSku === searchLower;
          const bExactSku = bSku === searchLower;
          if (aExactSku && !bExactSku) return -1;
          if (!aExactSku && bExactSku) return 1;
          
          // Name contains search term
          const aNameContains = aName.includes(searchLower);
          const bNameContains = bName.includes(searchLower);
          if (aNameContains && !bNameContains) return -1;
          if (!aNameContains && bNameContains) return 1;
          
          // SKU contains search term
          const aSkuContains = aSku.includes(searchLower);
          const bSkuContains = bSku.includes(searchLower);
          if (aSkuContains && !bSkuContains) return -1;
          if (!aSkuContains && bSkuContains) return 1;
          
          return 0;
        });
        
        // Cache the results
        searchCache.set(cacheKey, {
          results: sortedResults,
          timestamp: Date.now()
        });
        
        // Clean old cache entries (keep only last 100)
        if (searchCache.size > 100) {
          const oldestKey = searchCache.keys().next().value;
          searchCache.delete(oldestKey);
        }
        
        return sortedResults;
      } else {
        return [];
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err);
      }
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
