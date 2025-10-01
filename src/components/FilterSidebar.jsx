// src/components/FilterSidebar.jsx
import React from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { API_V1 } from "../api/config";

/* ---------------------------------------------
   Fetch all filterable attributes (across pages)
---------------------------------------------- */
async function fetchAllAttributes() {
  let page = 1;
  let all = [];
  let lastPage = 1;

  do {
    const res = await fetch(`${API_V1}/attributes?sort=id&page=${page}`);
    if (!res.ok) throw new Error("Failed to load attributes");
    const json = await res.json();

    all.push(...(json?.data || []));
    lastPage = json?.meta?.last_page || 1;
    page += 1;
  } while (page <= lastPage);

  return all;
}

/* ---------------------------------------------
   Fetch category-specific filter options
---------------------------------------------- */
async function fetchCategoryFilterOptions(categorySlug) {
  if (!categorySlug) {
    throw new Error("Category slug is required");
  }

  try {
    const res = await fetch(`${API_V1}/filters?category=${encodeURIComponent(categorySlug)}`);
    if (!res.ok) throw new Error(`Failed to load category filters: ${res.status} ${res.statusText}`);
    const json = await res.json();

    // The category filters API should return available filter options for this category
    const responseData = json?.data;
    if (!responseData) {
      return null;
    }

    // Check if it's an array of filter options
    if (Array.isArray(responseData)) {
      return responseData;
    }

    // Check if it has filter options in a nested structure
    if (responseData.filters || responseData.attributes) {
      const filters = responseData.filters || responseData.attributes;
      return filters;
    }

    return null;
  } catch (error) {
    return null;
  }
}


/* ---------------------------------------------
   De-duplicate options by label
   (case/diacritics/spacing-insensitive)
---------------------------------------------- */
const normLabel = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/\s+/g, " ")
    .trim();

function dedupeOptionsByLabel(options = []) {
  const seen = new Set();
  const out = [];
  for (const o of options) {
    const key = normLabel(o.label || o.admin_name || o.id);
    if (seen.has(key)) continue; // skip duplicates
    seen.add(key);
    out.push(o);
  }
  return out;
}

/* ---------------------------------------------
   Query hook: only filterable attributes w/ options
   and de-duplicated options
---------------------------------------------- */
function useFilterAttributes(categorySlug = null) {
  return useQuery({
    queryKey: ["filterAttributes", categorySlug],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // First, get all available attributes to know the structure
      const all = await fetchAllAttributes();
      
      const filterable = all.filter(
        (a) =>
          a?.is_filterable &&
          Array.isArray(a?.options) &&
          a.options.length > 0
      );
      
      let processed = filterable.map((a) => ({
        ...a,
        options: dedupeOptionsByLabel(a.options),
      }));
      
      // If we have a category, try to get category-specific filter options
      if (categorySlug) {
        const categoryOptions = await fetchCategoryFilterOptions(categorySlug);
        
        if (categoryOptions && Array.isArray(categoryOptions)) {
          // Filter the processed attributes to only include options that exist in the category
          processed = processed.map(attr => {
            const categoryAttrOptions = categoryOptions.find(catOpt => 
              catOpt.code === attr.code || catOpt.attribute_code === attr.code
            );
            
            if (categoryAttrOptions && categoryAttrOptions.options) {
              // Filter the attribute options to only include those available in this category
              const availableOptionIds = new Set(categoryAttrOptions.options.map(opt => String(opt.id || opt.value)));
              const filteredOptions = attr.options.filter(opt => 
                availableOptionIds.has(String(opt.id)) || 
                availableOptionIds.has(String(opt.value)) ||
                availableOptionIds.has(String(opt.label))
              );
              
              return {
                ...attr,
                options: filteredOptions
              };
            }
            
            return attr;
          });
        }
      }
      
      return processed;
    },
  });
}

/* ---------------------------------------------
   URL utils
---------------------------------------------- */
function parseSelected(searchParams, code, categorySlug = null) {
  const selectedValues = new Set();
  
  // Check both formats - category-specific and general
  if (categorySlug) {
    // Category-specific format: attributes[code][]
    const attributeParam = `attributes[${code}][]`;
    const categoryValues = searchParams.getAll(attributeParam);
    categoryValues.filter(Boolean).forEach(value => selectedValues.add(value));
  }
  
  // General format: code=value1,value2
  const raw = searchParams.get(code);
  if (raw) {
    raw
      .split(",")
      .map((v) => {
        const trimmed = v.trim();
        // For brand filtering, decode the URL-encoded names
        return code === "brand" ? decodeURIComponent(trimmed) : trimmed;
      })
      .filter(Boolean)
      .forEach(value => selectedValues.add(value));
  }
  
  return selectedValues;
}

function toggleValue(searchParams, setSearchParams, code, id, label, categorySlug = null) {
  const set = parseSelected(searchParams, code, categorySlug);
  // For brand filtering, use the label (name) instead of ID
  const key = code === "brand" ? String(label) : String(id);
  if (set.has(key)) set.delete(key);
  else set.add(key);

  const qs = new URLSearchParams(searchParams);
  
  // Always clean up both formats to avoid conflicts
  qs.delete(code); // Remove general format
  const attributeParam = `attributes[${code}][]`;
  qs.delete(attributeParam); // Remove category-specific format
  
  // If we're in a category context, use category-specific filter format
  if (categorySlug) {
    // Use attributes[code][] format for category filters
    [...set].forEach(value => {
      qs.append(attributeParam, value);
    });
  } else {
    // Use original format for general filters
    const csv = code === "brand" 
      ? [...set].map(name => encodeURIComponent(name)).join(",")
      : [...set].join(",");

    if (csv) qs.set(code, csv);

    // Avoid conflicts with slug-based deep links
    if (code === "brand") {
      qs.delete("brand_slug");
    }
  }

  // Reset pagination on any filter change
  qs.delete("page");
  setSearchParams(qs);
}

/* ---------------------------------------------
   Section (searchable multi-select like select2)
---------------------------------------------- */
function Section({ attr, searchParams, setSearchParams, open, onToggleOpen, categorySlug = null }) {
  const [q, setQ] = React.useState("");
  const [focused, setFocused] = React.useState(false);

  const selectedSet = React.useMemo(
    () => parseSelected(searchParams, attr.code, categorySlug),
    [searchParams, attr.code, categorySlug]
  );

  const filtered = React.useMemo(() => {
    if (!q.trim()) return attr.options;
    const needle = q.toLowerCase();
    return attr.options.filter((o) =>
      String(o?.label ?? "").toLowerCase().includes(needle)
    );
  }, [attr.options, q]);

  const selectedCount = selectedSet.size;

  const clearSection = () => {
    const qs = new URLSearchParams(searchParams);
    
    // Always clean up both formats to avoid conflicts
    qs.delete(attr.code); // Remove general format
    const attributeParam = `attributes[${attr.code}][]`;
    qs.delete(attributeParam); // Remove category-specific format
    
    if (attr.code === "brand") qs.delete("brand_slug");
    
    qs.delete("page");
    setSearchParams(qs);
  };

  const selectAllFiltered = () => {
    if (!filtered.length) return;
    
    const qs = new URLSearchParams(searchParams);
    
    // Always clean up both formats to avoid conflicts
    qs.delete(attr.code); // Remove general format
    const attributeParam = `attributes[${attr.code}][]`;
    qs.delete(attributeParam); // Remove category-specific format
    
    // If we're in a category context, use category-specific filter format
    if (categorySlug) {
      // Add each filtered value as a separate parameter
      filtered.forEach(opt => {
        const value = attr.code === "brand" ? String(opt.label) : String(opt.id);
        qs.append(attributeParam, value);
      });
    } else {
      // Use original format for general filters
      const values = filtered.map((o) => attr.code === "brand" ? String(o.label) : String(o.id));
      const csv = attr.code === "brand" 
        ? values.map(name => encodeURIComponent(name)).join(",")
        : values.join(",");
      qs.set(attr.code, csv);
      if (attr.code === "brand") qs.delete("brand_slug");
    }
    
    qs.delete("page");
    setSearchParams(qs);
  };

  return (
    <div className="border-b border-[#1a3c5c] pb-3">
      {/* Header */}
      <button
        type="button"
        onClick={() => onToggleOpen(attr.code)}
        className="w-full flex justify-between items-center cursor-pointer font-semibold mb-1"
        aria-expanded={open}
      >
        <span className="text-[#193653]">
          {attr.name}
          {selectedCount > 0 && (
            <span className="ml-2 text-xs font-medium text-indigo-600">
              ({selectedCount} selected)
            </span>
          )}
        </span>
        {open ? (
          <ChevronUp className="text-[#1e456c]" size={18} />
        ) : (
          <ChevronDown className="text-[#1e456c]" size={18} />
        )}
      </button>

      {/* Body */}
      {open && (
        <div className="space-y-2">
          {/* Search input */}
          <div className="relative">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={`Search ${attr.name.toLowerCase()}…`}
              className={`w-full rounded-md border px-3 py-2 text-sm outline-none ${
                focused ? "border-[#1d3d62] ring-1 ring-[#1d3d62]" : "border-gray-300"
              }`}
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="text-xs text-[#1e456c] hover:underline"
              onClick={selectAllFiltered}
              disabled={filtered.length === 0}
              title="Select all currently filtered options"
            >
              Select all
            </button>
            {selectedCount > 0 && (
              <button
                type="button"
                className="text-xs text-red-600 hover:underline"
                onClick={clearSection}
                title="Clear this filter"
              >
                Clear
              </button>
            )}
          </div>

          {/* Options (taller on bigger screens) */}
          <div
            className="
              space-y-2 overflow-y-auto pr-1
              max-h-64
              md:max-h-80
              lg:max-h-[28rem]
              xl:max-h-[34rem]
            "
          >
            {filtered.length === 0 ? (
              <p className="text-xs text-gray-500 px-1">No results</p>
            ) : (
              filtered.map((opt) => {
                // For brand filtering, check against label instead of ID
                const key = attr.code === "brand" ? String(opt.label) : String(opt.id);
                const checked = selectedSet.has(key);
                return (
                  <label
                    key={opt.id}
                    className="flex items-center space-x-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        toggleValue(
                          searchParams,
                          setSearchParams,
                          attr.code,
                          opt.id,
                          opt.label,
                          categorySlug
                        )
                      }
                      className="rounded border-[#1d3d62] text-[#1d3d62] focus:ring-[#1d3d62]"
                    />
                    <span className="text-[#152a41]">{opt.label}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------
   FilterSidebar (desktop + mobile)
---------------------------------------------- */
export default function FilterSidebar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = React.useState({});
  const [mobileVisible, setMobileVisible] = React.useState(false);
  
  // Get category slug from URL params
  const categorySlug = searchParams.get("category") || searchParams.get("category_slug") || null;
  
  const { data: attributes = [], isLoading, error } = useFilterAttributes(categorySlug);
  

  // Open all filters initially
  React.useEffect(() => {
    if (attributes.length && !Object.keys(open).length) {
      const init = {};
      attributes.forEach((a) => (init[a.code] = true));
      setOpen(init);
    }
  }, [attributes, open]);

  const toggleSectionOpen = (code) =>
    setOpen((prev) => ({ ...prev, [code]: !prev[code] }));

  const clearAll = () => {
    const qs = new URLSearchParams(searchParams);
    attributes.forEach((a) => qs.delete(a.code));
    qs.delete("brand_slug"); // drop slug-based deep links if present
    qs.delete("page");
    setSearchParams(qs);
  };

  const renderFilters = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center font-bold text-lg border-b border-[#1a3c5c] pb-2">
        <span className="text-[#132232]">Filters</span>
        <button
          onClick={clearAll}
          className="text-sm text-[#1e456c] hover:underline"
        >
          Clear all
        </button>
      </div>

      {attributes.map((attr) => (
        <Section
          key={attr.id}
          attr={attr}
          searchParams={searchParams}
          setSearchParams={setSearchParams}
          open={!!open[attr.code]}
          onToggleOpen={toggleSectionOpen}
          categorySlug={categorySlug}
        />
      ))}
    </div>
  );

  // Desktop-only loading/error
  if (isLoading) {
    return (
      <aside className="w-72 p-4 hidden md:block">
        <p className="text-[#152a41]">Loading filters…</p>
      </aside>
    );
  }

  if (error) {
    return (
      <aside className="w-72 p-4 hidden md:block">
        <p className="text-red-500 text-sm">Failed to load filters.</p>
      </aside>
    );
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="w-72 pr-4 hidden md:block">{renderFilters()}</aside>

      {/* Mobile collapsible panel */}
      <div className="md:hidden border border-[#1a3c5c] bg-[#193653] rounded">
        <button
          onClick={() => setMobileVisible((v) => !v)}
          className="w-full flex items-center justify-between py-3 px-4 text-white font-semibold"
        >
          <span>FILTRAT</span>
          {mobileVisible ? (
            <ChevronUp className="text-white" />
          ) : (
            <ChevronDown className="text-white" />
          )}
        </button>

        {mobileVisible && (
          <div className="p-4 bg-white border-t border-[#1a3c5c]">
            {renderFilters()}
          </div>
        )}
      </div>
    </>
  );
}
