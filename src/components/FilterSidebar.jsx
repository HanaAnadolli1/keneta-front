import React from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { API_V1 } from "../api/config";

/* ------------------------------------------------
   Hook: load & cache filterable attributes
------------------------------------------------- */
function useFilterAttributes() {
  return useQuery({
    queryKey: ["filterAttributes"],
    staleTime: 5 * 60 * 1000, // fresh for 5 min
    queryFn: async () => {
      const res = await fetch(`${API_V1}/attributes?sort=id`);
      if (!res.ok) throw new Error("network");
      const json = await res.json();

      /** keep only attributes that can actually be filtered */
      return (json.data || []).filter(
        (a) => a.is_filterable && Array.isArray(a.options) && a.options.length
      );
    },
  });
}

/* ------------------------------------------------
   Component
------------------------------------------------- */
export default function FilterSidebar() {
  const { data: attributes = [], isLoading, error } = useFilterAttributes();
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = React.useState({});
  const [mobileVisible, setMobileVisible] = React.useState(false); // whole accordion on mobile

  /* open every section once we know the attributes */
  React.useEffect(() => {
    const obj = {};
    attributes.forEach((a) => (obj[a.code] = true));
    setOpen(obj);
  }, [attributes]);

  /* ------------- helpers ------------- */
  const toggleSection = (code) => setOpen((p) => ({ ...p, [code]: !p[code] }));

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

  /* ------------- Markup builders ------------- */
  const renderFilters = () => (
    <>
      <div className="flex justify-between items-center font-bold text-lg border-b pb-2">
        <span>Filters:</span>
        <button
          onClick={clearAll}
          className="text-sm text-indigo-600 hover:underline"
        >
          Clear All
        </button>
      </div>

      {attributes.map((attr) => (
        <div key={attr.id} className="border-b pb-3">
          {/* header */}
          <div
            onClick={() => toggleSection(attr.code)}
            className="flex justify-between items-center cursor-pointer font-semibold text-gray-800 mb-1"
          >
            <span>{attr.name}</span>
            {open[attr.code] ? (
              <ChevronUp size={18} />
            ) : (
              <ChevronDown size={18} />
            )}
          </div>

          {/* options */}
          {open[attr.code] && (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {attr.options.map((opt) => (
                <label
                  key={opt.id}
                  className="flex items-center space-x-2 text-sm text-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={isChecked(attr.code, opt.id)}
                    onChange={() => updateFilter(attr.code, opt.id)}
                    className="rounded border-gray-300"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      ))}
    </>
  );

  /* ------------- UI ------------- */
  if (isLoading) {
    return (
      <aside className="w-72 p-4 md:block hidden">
        <p className="text-gray-500">Loading filters…</p>
      </aside>
    );
  }
  if (error) {
    return (
      <aside className="w-72 p-4 md:block hidden">
        <p className="text-red-600 text-sm">Failed to load filters.</p>
      </aside>
    );
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="w-72 space-y-4 pr-4 md:block hidden">
        {renderFilters()}
      </aside>

      {/* Mobile collapsible header */}
      <div className="md:hidden border bg-sky-50">
        <button
          onClick={() => setMobileVisible((v) => !v)}
          className="w-full flex items-center justify-between py-3 px-4 text-indigo-900 font-semibold"
        >
          <span>FILTRAT</span>
          {mobileVisible ? <ChevronUp /> : <ChevronDown />}
        </button>
        {mobileVisible && (
          <div className="p-4 space-y-4 border-t bg-white shadow-inner">
            {renderFilters()}
          </div>
        )}
      </div>
    </>
  );
}
