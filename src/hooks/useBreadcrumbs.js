import { useState, useEffect } from 'react';

/**
 * Breadcrumb API Hooks
 * 
 * These hooks replace the complex React-based breadcrumb logic with simple API calls
 * to dedicated breadcrumb endpoints. This provides better performance and consistency.
 * 
 * API Endpoints:
 * - Product breadcrumbs: https://admin.keneta-ks.com/api/v2/breadcrumbs/product/{productSlug}
 * - Category breadcrumbs: https://admin.keneta-ks.com/api/v2/breadcrumbs/category/{categorySlug}
 * 
 * @param {string} productSlug - The product slug
 * @returns {Object} { breadcrumbs, loading, error }
 */
export const useProductBreadcrumbs = (productSlug) => {
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!productSlug) {
      setBreadcrumbs([]);
      return;
    }

    const fetchBreadcrumbs = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(
          `https://admin.keneta-ks.com/api/v2/breadcrumbs/product/${encodeURIComponent(productSlug)}`
        );
        
        if (!response.ok) {
          // For 500 errors or other server errors, use fallback silently
          if (response.status >= 500) {
            setBreadcrumbs([]); // Will trigger fallback in component
            return;
          }
          throw new Error(`Failed to fetch product breadcrumbs: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Handle different response formats - make it robust
        let breadcrumbData = [];
        if (Array.isArray(data)) {
          breadcrumbData = data;
        } else if (data?.data?.breadcrumbs) {
          // Handle nested structure: data.data.breadcrumbs (actual API response format)
          breadcrumbData = Array.isArray(data.data.breadcrumbs) ? data.data.breadcrumbs : [];
        } else if (data?.data?.product?.breadcrumbs) {
          // Handle nested structure: data.product.breadcrumbs
          breadcrumbData = Array.isArray(data.data.product.breadcrumbs) ? data.data.product.breadcrumbs : [];
        } else if (data?.data) {
          breadcrumbData = Array.isArray(data.data) ? data.data : [];
        } else if (data?.breadcrumbs) {
          breadcrumbData = Array.isArray(data.breadcrumbs) ? data.breadcrumbs : [];
        } else if (data?.product?.breadcrumbs) {
          // Handle direct product.breadcrumbs
          breadcrumbData = Array.isArray(data.product.breadcrumbs) ? data.product.breadcrumbs : [];
        } else if (typeof data === 'object' && data !== null) {
          // Single breadcrumb item
          breadcrumbData = [data];
        }
        
        // Normalize breadcrumb data to our format
        const normalizedBreadcrumbs = breadcrumbData.map(item => ({
          label: String(item.label || item.name || item.title || ''),
          path: item.path || item.url || (item.slug ? `/products?category=${encodeURIComponent(item.slug)}` : null)
        }));
        
        setBreadcrumbs(normalizedBreadcrumbs);
      } catch (err) {
        setError(err.message);
        setBreadcrumbs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBreadcrumbs();
  }, [productSlug]);

  return { breadcrumbs, loading, error };
};

/**
 * Hook for fetching category breadcrumbs
 * @param {string} categorySlug - The category slug
 * @returns {Object} { breadcrumbs, loading, error }
 */
export const useCategoryBreadcrumbs = (categorySlug) => {
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!categorySlug) {
      setBreadcrumbs([]);
      return;
    }

    const fetchBreadcrumbs = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(
          `https://admin.keneta-ks.com/api/v2/breadcrumbs/category/${encodeURIComponent(categorySlug)}`
        );
        
        if (!response.ok) {
          // For 500 errors or other server errors, use fallback silently
          if (response.status >= 500) {
            setBreadcrumbs([]); // Will trigger fallback in component
            return;
          }
          throw new Error(`Failed to fetch category breadcrumbs: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Handle different response formats - make it robust
        let breadcrumbData = [];
        if (Array.isArray(data)) {
          breadcrumbData = data;
        } else if (data?.data) {
          breadcrumbData = Array.isArray(data.data) ? data.data : [];
        } else if (data?.breadcrumbs) {
          breadcrumbData = Array.isArray(data.breadcrumbs) ? data.breadcrumbs : [];
        } else if (typeof data === 'object' && data !== null) {
          // Single breadcrumb item
          breadcrumbData = [data];
        }
        
        // Normalize breadcrumb data to our format
        const normalizedBreadcrumbs = breadcrumbData.map(item => ({
          label: String(item.label || item.name || item.title || ''),
          path: item.path || item.url || null
        }));
        
        setBreadcrumbs(normalizedBreadcrumbs);
      } catch (err) {
        console.error('Error fetching category breadcrumbs:', err);
        setError(err.message);
        setBreadcrumbs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBreadcrumbs();
  }, [categorySlug]);

  return { breadcrumbs, loading, error };
};
