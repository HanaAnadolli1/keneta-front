// src/components/Search.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import { FiSearch } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { API_V1 } from "../api/config";

const MIN_QUERY_LEN = 3;
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
  if (cands[0]) return cands[0];

  // inline “no image” SVG fallback
  return (
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60'>
        <rect width='100%' height='100%' fill='#f3f4f6'/>
        <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
              font-size='10' fill='#9ca3af'>no image</text>
      </svg>`
    )
  );
}

function priceLabel(p) {
  // prefer formatted labels when present
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
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1); // index of highlighted suggestion

  const navigate = useNavigate();
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  const trimmed = useMemo(() => query.trim(), [query]);

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

  // Debounced suggestions fetch (only when query ≥ MIN_QUERY_LEN)
  useEffect(() => {
    if (trimmed.length < MIN_QUERY_LEN) {
      setSuggestions([]);
      setActive(-1);
      if (abortRef.current) abortRef.current.abort();
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();

        const url = `${API_V1}/products?query=${encodeURIComponent(
          trimmed
        )}&limit=${LIMIT}`;
        
        // Debug logging for search suggestions
        console.log("🔍 Search Suggestions Debug:", {
          query: trimmed,
          url,
          encodedQuery: encodeURIComponent(trimmed)
        });
        
        const res = await fetch(url, {
          credentials: "include",
          headers: { Accept: "application/json" },
          signal: abortRef.current.signal,
        });

        const json = await res.json();
        const arr = Array.isArray(json?.data)
          ? json.data
          : json?.data?.items || [];
          
        // Debug logging for search suggestions results
        console.log("🔍 Search Suggestions Results:", {
          query: trimmed,
          suggestionsCount: arr.length,
          suggestions: arr.map(item => ({ id: item.id, name: item.name }))
        });
        
        // Client-side filtering to ensure results contain the search term
        const filteredArr = arr.filter(item => {
          const name = (item.name || '').toLowerCase();
          const sku = (item.sku || '').toLowerCase();
          const searchTerm = trimmed.toLowerCase();
          
          // Check if search term appears in name or SKU
          const nameMatches = name.includes(searchTerm);
          const skuMatches = sku.includes(searchTerm);
          
          // Also check for word boundary matches (more precise)
          const nameWordMatch = name.split(/\s+/).some(word => 
            word.startsWith(searchTerm) || word.includes(searchTerm)
          );
          
          const matches = nameMatches || skuMatches || nameWordMatch;
          
          if (!matches) {
            console.log("🔍 Filtered out irrelevant result:", {
              name: item.name,
              sku: item.sku,
              searchTerm: trimmed,
              nameMatches,
              skuMatches,
              nameWordMatch
            });
          }
          
          return matches;
        });
        
        console.log("🔍 After client-side filtering:", {
          originalCount: arr.length,
          filteredCount: filteredArr.length,
          filteredResults: filteredArr.map(item => ({ id: item.id, name: item.name }))
        });
        
        setSuggestions(filteredArr);
        setActive(arr.length ? 0 : -1);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Suggestion fetch failed", err);
        }
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(debounceRef.current);
  }, [trimmed]);

  // shared submit action (used by button + “See all results” row)
  const submitSearch = () => {
    if (trimmed.length < MIN_QUERY_LEN) return;
    navigate(`/products?query=${encodeURIComponent(trimmed)}&page=1`);
    setShow(false);
    setActive(-1);
  };

  // Select a suggestion
  const handleSelect = (item) => {
    if (!item) return;
    if (item.url_key) navigate(`/products/${item.url_key}`);
    else navigate(`/products?query=${encodeURIComponent(item.name)}&page=1`);
    setShow(false);
    setActive(-1);
  };

  // Keyboard nav on input
  const onKeyDown = (e) => {
    if (!show) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % Math.max(1, suggestions.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) =>
        i <= 0 ? Math.max(0, suggestions.length - 1) : i - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && suggestions[active]) handleSelect(suggestions[active]);
      else submitSearch();
    } else if (e.key === "Escape") {
      setShow(false);
      setActive(-1);
      inputRef.current?.blur();
    }
  };

  // Form submit (mouse click on button)
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
          className="bg-[var(--primary)] hover:bg-[var(--secondary)] text-white
                     flex items-center justify-center px-4 md:px-6 rounded-r-2xl
                     text-sm md:text-base transition-colors"
          aria-label="Search"
          title="Search"
        >
          <FiSearch />
        </button>
      </form>

      {show && (
        <ul
          id="search-suggestions"
          role="listbox"
          className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-b-2xl shadow-lg z-50 max-h-80 overflow-auto"
        >
          {loading ? (
            <li className="px-4 py-3 text-[var(--primary)]">Loading…</li>
          ) : suggestions.length > 0 ? (
            <>
              {suggestions.map((item, idx) => {
                const img = getThumb(item);
                const isActive = idx === active;
                const price = priceLabel(item);
                return (
                  <li
                    id={`sugg-${item.id}`}
                    role="option"
                    aria-selected={isActive}
                    key={item.id}
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => handleSelect(item)}
                    className={`px-3 py-2 cursor-pointer text-sm md:text-base text-[var(--primary)]
                                flex items-center gap-3
                                ${isActive ? "bg-gray-100" : "hover:bg-gray-50"}`}
                  >
                    <img
                      src={img}
                      alt={item.name || item.sku || "product"}
                      className="w-10 h-10 object-contain rounded bg-gray-50 flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.src = getThumb({});
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate">
                        {item.name} {item.sku ? <span className="text-gray-500">({item.sku})</span> : null}
                      </div>
                      {price ? (
                        <div className="text-xs text-gray-600 truncate">{price}</div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
              <li
                onClick={submitSearch}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm md:text-base font-medium border-t text-[var(--primary)]"
              >
                See all results for “{trimmed}”
              </li>
            </>
          ) : (
            <li className="px-4 py-2 text-[var(--third)]">
              {trimmed.length >= MIN_QUERY_LEN
                ? "No suggestions found"
                : `Type at least ${MIN_QUERY_LEN} characters`}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
