// src/components/FilterSidebar.jsx
import React from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { API_V1 } from "../api/config";

/* ------------------------------
   Fetch all filterable attributes
------------------------------- */
async function fetchAllAttributes() {
  let page = 1;
  let all = [];
  let lastPage = 1;

  do {
    const res = await fetch(`${API_V1}/attributes?sort=id&page=${page}`);
    if (!res.ok) throw new Error("network");
    const json = await res.json();
    all.push(...(json.data || []));
    lastPage = json.meta?.last_page || 1;
    page += 1;
  } while (page <= lastPage);

  return all;
}

/* ------------------------------
   Custom hook for filter data
------------------------------- */
function useFilterAttributes() {
  return useQuery({
    queryKey: ["filterAttributes"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const allAttrs = await fetchAllAttributes();
      return allAttrs.filter(
        (a) =>
          a.is_filterable &&
          Array.isArray(a.options) &&
          a.options.length > 0
      );
    },
  });
}

/* ------------------------------
   Component: FilterSidebar
------------------------------- */
export default function FilterSidebar() {
  const { data: attributes = [], isLoading, error } = useFilterAttributes();
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = React.useState({});
  const [mobileVisible, setMobileVisible] = React.useState(false);

  // open all filters initially
  React.useEffect(() => {
    if (attributes.length && !Object.keys(open).length) {
      const init = {};
      attributes.forEach((a) => (init[a.code] = true));
      setOpen(init);
    }
  }, [attributes, open]);

  const toggleSection = (code) =>
    setOpen((prev) => ({ ...prev, [code]: !prev[code] }));

  const isChecked = (code, id) =>
    (searchParams.get(code)?.split(",") || []).includes(String(id));

  const updateFilter = (code, id) => {
    const set = new Set(searchParams.get(code)?.split(",").filter(Boolean));
    set.has(String(id)) ? set.delete(String(id)) : set.add(String(id));

    const qs = new URLSearchParams(searchParams);
    set.size ? qs.set(code, [...set].join(",")) : qs.delete(code);
    setSearchParams(qs);
  };

  const clearAll = () => {
    const qs = new URLSearchParams(searchParams);
    attributes.forEach((a) => qs.delete(a.code));
    setSearchParams(qs);
  };

  const renderFilters = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center font-bold text-lg border-b border-[#1a3c5c] pb-2">
        <span className="text-[#132232]">Filters:</span>
        <button
          onClick={clearAll}
          className="text-sm text-[#1e456c] hover:underline"
        >
          Clear All
        </button>
      </div>

      {attributes.map((attr) => (
        <div key={attr.id} className="border-b border-[#1a3c5c] pb-3">
          <div
            onClick={() => toggleSection(attr.code)}
            className="flex justify-between items-center cursor-pointer font-semibold mb-1"
          >
            <span className="text-[#193653]">{attr.name}</span>
            {open[attr.code] ? (
              <ChevronUp className="text-[#1e456c]" size={18} />
            ) : (
              <ChevronDown className="text-[#1e456c]" size={18} />
            )}
          </div>

          {open[attr.code] && (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {attr.options.map((opt) => (
                <label
                  key={opt.id}
                  className="flex items-center space-x-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={isChecked(attr.code, opt.id)}
                    onChange={() => updateFilter(attr.code, opt.id)}
                    className="rounded border-[#1d3d62] text-[#1d3d62] focus:ring-[#1d3d62]"
                  />
                  <span className="text-[#152a41]">{opt.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  // Loading/error states (shown only on desktop)
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
