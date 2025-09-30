// src/components/Search.jsx
import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { FiSearch } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useProductSearch } from "../hooks/useProductSearch";

const MIN_QUERY_LEN = 2;
const LIMIT = 8;

function getThumb(p) {
  const cands = [
    p?.base_image?.small_image_url,
    p?.base_image?.medium_image_url,
    p?.base_image?.original_image_url,
    p?.thumbnail_url,
    p?.image_url,
    p?.images?.[0]?.small_image_url,
    p?.images?.[0]?.medium_image_url,
    p?.images?.[0]?.original_image_url,
  ].filter(Boolean);
  return cands[0] || `data:image/svg+xml;base64,${btoa(`
      <svg width='40' height='40' xmlns='http://www.w3.org/2000/svg'>
        <rect width='40' height='40' fill='#f3f4f6'/>
        <text x='20' y='25' text-anchor='middle' font-family='Arial' 
              font-size='10' fill='#9ca3af'>no image</text>
      </svg>`)}`;
}

function priceLabel(p) {
  return (
    p?.formatted_final_price ||
    p?.formatted_price ||
    (Number.isFinite(p?.final_price) ? `${p.final_price}` : "") ||
    (Number.isFinite(p?.price) ? `${p.price}` : "")
  );
}

export default function Search({ className = "" }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [show, setShow] = useState(false);
  const [active, setActive] = useState(-1);

  const navigate = useNavigate();
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  const trimmed = useMemo(() => query.trim(), [query]);
  const { searchProducts, loading } = useProductSearch();

  // Close suggestions on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShow(false);
        setActive(-1);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (trimmed.length < MIN_QUERY_LEN) {
      setSuggestions([]);
      setActive(-1);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchProducts(trimmed, {
          limit: LIMIT
        });

        setSuggestions(results);
        setActive(-1);
      } catch (error) {
        setSuggestions([]);
        setActive(-1);
      }
    }, 150);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [trimmed, searchProducts]);

  // Navigate to product or search results
  const submitSearch = useCallback(() => {
    if (!trimmed) return;

    if (active >= 0 && suggestions[active]) {
      const product = suggestions[active];
      const slug = product.slug || `${product.name?.toLowerCase().replace(/\s+/g, '-')}-${product.id}`;
      navigate(`/products/${slug}`);
    } else {
      navigate(`/products?query=${encodeURIComponent(trimmed)}`);
    }
    
    setShow(false);
    setActive(-1);
  }, [trimmed, active, suggestions, navigate]);

  // Keyboard navigation
  const onKeyDown = (e) => {
    if (!show || suggestions.length === 0) {
      if (e.key === "Enter") submitSearch();
      return;
    }

    switch (e.key) {
      case "ArrowDown":
      e.preventDefault();
        setActive((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
      e.preventDefault();
        setActive((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
      e.preventDefault();
        submitSearch();
        break;
      case "Escape":
      setShow(false);
      setActive(-1);
      inputRef.current?.blur();
        break;
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    submitSearch();
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-1 w-full md:max-w-3xl mx-auto md:mx-10 ${className}`}
    >
      <form onSubmit={handleSubmit} className="flex w-full">
        <input
          ref={inputRef}
          type="text"
          placeholder="Kërko..."
          className="flex-1 px-4 py-2 rounded-l-2xl bg-white outline-none
             border border-[var(--primary)] border-opacity-30
             focus:border-opacity-100
             text-[var(--primary)] caret-[var(--third)] text-sm md:text-base
             transition-colors"
          value={query}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            setShow(v.trim().length >= MIN_QUERY_LEN);
          }}
          onFocus={() => {
            if (trimmed.length >= MIN_QUERY_LEN) setShow(true);
          }}
          onKeyDown={onKeyDown}
          aria-autocomplete="list"
          aria-expanded={show}
          aria-controls="search-suggestions"
          aria-activedescendant={
            active >= 0 && suggestions[active]
              ? `sugg-${suggestions[active].id}`
              : undefined
          }
        />

        <button
          type="submit"
          className="px-4 py-2 rounded-r-2xl bg-[var(--primary)] text-white
             hover:bg-[var(--primary)]/90 transition-colors
             flex items-center justify-center"
          aria-label="Search"
        >
          <FiSearch size={18} />
        </button>
      </form>

      {show && (
        <div
          id="search-suggestions"
          className="absolute top-full left-0 right-0 z-50 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto"
        >
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--primary)] mx-auto"></div>
              <p className="mt-2 text-sm">Searching...</p>
            </div>
          ) : suggestions.length > 0 ? (
            <>
              {suggestions.map((product, index) => (
                <div
                  key={product.id}
                  id={`sugg-${product.id}`}
                  className={`flex items-center p-3 cursor-pointer border-b border-gray-100 last:border-b-0
                    ${active === index ? 'bg-[var(--primary)]/10' : 'hover:bg-gray-50'}`}
                  onClick={() => {
                    const slug = product.slug || `${product.name?.toLowerCase().replace(/\s+/g, '-')}-${product.id}`;
                    navigate(`/products/${slug}`);
                    setShow(false);
                    setActive(-1);
                  }}
                  >
                    <img
                    src={getThumb(product)}
                    alt={product.name}
                    className="w-12 h-12 object-cover rounded mr-3 flex-shrink-0"
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {product.name}
                    </p>
                    {product.sku && (
                      <p className="text-xs text-gray-500 truncate">
                        SKU: {product.sku}
                      </p>
                    )}
                  </div>
                  <div className="ml-2 text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-[var(--primary)]">
                      {priceLabel(product)}
                    </p>
                  </div>
                </div>
              ))}
              
              <div className="p-3 border-t border-gray-100">
                <button
                  onClick={() => {
                    navigate(`/products?query=${encodeURIComponent(trimmed)}`);
                    setShow(false);
                    setActive(-1);
                  }}
                  className="w-full text-center text-sm text-[var(--primary)] hover:text-[var(--primary)]/80 font-medium"
                >
                  See all results for "{trimmed}"
                </button>
              </div>
            </>
          ) : trimmed.length >= MIN_QUERY_LEN ? (
            <div className="p-4 text-center text-gray-500">
              <p className="text-sm">No products found for "{trimmed}"</p>
              <button
                onClick={() => {
                  navigate(`/products?query=${encodeURIComponent(trimmed)}`);
                  setShow(false);
                }}
                className="mt-2 text-sm text-[var(--primary)] hover:text-[var(--primary)]/80"
              >
                Search anyway
              </button>
                      </div>
                      ) : null}
                    </div>
      )}
    </div>
  );
}
