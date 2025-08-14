// src/components/Search.jsx
import React, { useEffect, useRef, useState } from "react";
import { FiSearch } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { API_V1 } from "../api/config";

const MIN_QUERY_LEN = 3;

export default function Search({ className = "" }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const containerRef = useRef(null);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  // Close suggestions on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShow(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Debounced suggestions fetch (only when query ≥ 3 chars)
  useEffect(() => {
    const term = query.trim();

    if (term.length < MIN_QUERY_LEN) {
      setSuggestions([]);
      if (abortRef.current) abortRef.current.abort();
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();

        const res = await fetch(
          `${API_V1}/products?query=${encodeURIComponent(term)}&limit=5`,
          {
            credentials: "include",
            headers: { Accept: "application/json" },
            signal: abortRef.current.signal,
          }
        );

        const json = await res.json();
        const arr = Array.isArray(json?.data)
          ? json.data
          : json?.data?.items || [];
        setSuggestions(arr);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Suggestion fetch failed", err);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // 🔧 shared submit action (used by button + "See all results" row)
  const submitSearch = () => {
    const term = query.trim();
    if (term.length < MIN_QUERY_LEN) return;
    navigate(`/products?query=${encodeURIComponent(term)}&page=1`);
    setShow(false);
  };

  // Form submit (Enter key or search icon)
  const handleSubmit = (e) => {
    e?.preventDefault(); // make event optional so callers without an event don't crash
    submitSearch();
  };

  const handleSelect = (item) => {
    if (item.url_key) navigate(`/products/${item.url_key}`);
    else navigate(`/products?query=${encodeURIComponent(item.name)}&page=1`);
    setShow(false);
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-1 w-full md:max-w-3xl mx-auto md:mx-10 ${className}`}
    >
      <form onSubmit={handleSubmit} className="flex w-full">
        <input
          type="text"
          placeholder="Kërko..."
          className="flex-1 px-4 py-2 border-2 border-transparent rounded-l-2xl bg-white outline-none text-[#152a41] text-sm md:text-base focus:border-[#1d446b]"
          value={query}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            setShow(v.trim().length >= MIN_QUERY_LEN);
          }}
          onFocus={() => {
            if (query.trim().length >= MIN_QUERY_LEN) setShow(true);
          }}
        />
        <button
          type="submit"
          className="bg-[#1d446b] text-white flex items-center justify-center px-4 md:px-6 rounded-r-2xl text-sm md:text-base"
          aria-label="Search"
          title="Search"
        >
          <FiSearch />
        </button>
      </form>

      {show && (
        <ul className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-b-2xl shadow-lg z-50 max-h-60 overflow-auto">
          {loading ? (
            <li className="px-4 py-2 text-gray-500">Loading...</li>
          ) : suggestions.length > 0 ? (
            <>
              {suggestions.map((item) => (
                <li
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm md:text-base"
                >
                  {item.name} {item.sku ? `(${item.sku})` : ""}
                </li>
              ))}
              {/* This row now calls submitSearch() directly (no event) */}
              <li
                onClick={submitSearch}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm md:text-base font-medium border-t"
              >
                See all results for “{query.trim()}”
              </li>
            </>
          ) : (
            <li className="px-4 py-2 text-gray-500">
              {query.trim().length >= MIN_QUERY_LEN
                ? "No suggestions found"
                : `Type at least ${MIN_QUERY_LEN} characters`}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
