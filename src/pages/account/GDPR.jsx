import React, { useEffect, useMemo, useState } from "react";
import {
  getGdprRequests,
  createGdprRequest,
  revokeGdprRequest,
} from "../../api/customer";
import { X, Filter, ChevronDown, Search } from "lucide-react";
import Breadcrumbs from "../../components/Breadcrumbs";

const navyBtn =
  "rounded-xl bg-[#0b1446] text-white px-5 py-3 text-[15px] hover:opacity-95";
const iconBtn =
  "inline-flex items-center gap-2 rounded-xl ring-1 ring-slate-300 px-4 py-2 text-[15px] hover:bg-slate-50";
const menuItem =
  "block w-full text-left px-4 py-2 text-[15px] hover:bg-slate-50";

export default function GDPR() {
  // data
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");

  // create modal
  const [openModal, setOpenModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState("delete");
  const [message, setMessage] = useState("");

  // toolbar state
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [openSize, setOpenSize] = useState(false);

  // filters
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fltStatus, setFltStatus] = useState("");
  const [fltType, setFltType] = useState("");

  const breadcrumbs = [
    { label: "Home", path: "/" },
    { label: "Account", path: "/account" },
    { label: "GDPR" },
  ];

  const load = async () => {
    try {
      setError("");
      const res = await getGdprRequests();
      setRows(Array.isArray(res) ? res : res?.data || []);
    } catch (e) {
      setError(e?.message || "Failed to load GDPR requests");
    }
  };
  useEffect(() => {
    load();
  }, []);

  // Options for filters (derived from rows)
  const statusOptions = useMemo(() => {
    if (!rows) return [];
    const s = Array.from(
      new Set(
        rows
          .map((r) => (r.status ? String(r.status) : ""))
          .filter(Boolean)
          .map((x) => x.trim())
      )
    );
    return s.sort((a, b) => a.localeCompare(b));
  }, [rows]);
  const typeOptions = useMemo(() => {
    if (!rows) return [];
    const s = Array.from(
      new Set(
        rows
          .map((r) => (r.type ? String(r.type) : ""))
          .filter(Boolean)
          .map((x) => x.trim().toLowerCase())
      )
    );
    return s.sort((a, b) => a.localeCompare(b));
  }, [rows]);

  // Filtering + searching
  const filteredAll = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const matchQ =
        !q ||
        String(r.id).includes(q) ||
        String(r.status || "")
          .toLowerCase()
          .includes(q) ||
        String(r.type || "")
          .toLowerCase()
          .includes(q) ||
        String(r.message || "")
          .toLowerCase()
          .includes(q);
      const matchStatus = !fltStatus || String(r.status) === fltStatus;
      const matchType = !fltType || String(r.type).toLowerCase() === fltType;
      return matchQ && matchStatus && matchType;
    });
  }, [rows, query, fltStatus, fltType]);

  const visibleRows = useMemo(
    () => filteredAll.slice(0, pageSize),
    [filteredAll, pageSize]
  );

  const [revoking, setRevoking] = useState(false);
  const onRevoke = async (id) => {
    if (!window.confirm("Revoke this GDPR request?")) return;
    try {
      setRevoking(true);
      await revokeGdprRequest(id);
      await load();
    } catch (e) {
      alert(e?.message || "Failed to revoke request");
    } finally {
      setRevoking(false);
    }
  };

  const onSave = async (e) => {
    e.preventDefault();
    if (!type) return;
    try {
      setSaving(true);
      await createGdprRequest({ type, message });
      setOpenModal(false);
      setType("delete");
      setMessage("");
      await load();
    } catch (e) {
      alert(e?.message || "Failed to create request");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Breadcrumbs items={breadcrumbs} />
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">GDPR Data Requests</h2>
        <div className="flex items-center gap-3">
          <button className={navyBtn} onClick={() => setOpenModal(true)}>
            Create Request
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="w-[340px] rounded-xl ring-1 ring-slate-300 px-4 py-2.5 pr-10 text-[15px] focus:outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
        </div>
        <span className="text-sm text-slate-500">
          {filteredAll.length} Results
        </span>

        <div className="ml-auto flex items-center gap-3">
          {/* Page size dropdown */}
          <div
            className="relative"
            onBlur={() => setOpenSize(false)}
            tabIndex={0}
          >
            <button className={iconBtn} onClick={() => setOpenSize((o) => !o)}>
              {pageSize} <ChevronDown className="w-4 h-4" />
            </button>
            {openSize && (
              <div className="absolute right-0 mt-2 w-36 rounded-xl bg-white shadow-lg ring-1 ring-slate-200 py-1 z-10">
                {[10, 25, 50].map((n) => (
                  <button
                    key={n}
                    className={menuItem}
                    onClick={() => {
                      setPageSize(n);
                      setOpenSize(false);
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filters popover */}
          <div
            className="relative"
            onBlur={() => setFiltersOpen(false)}
            tabIndex={0}
          >
            <button
              className={iconBtn}
              onClick={() => setFiltersOpen((o) => !o)}
            >
              <Filter className="w-4 h-4" /> Filter
            </button>

            {filtersOpen && (
              <div className="absolute right-0 mt-2 w-[320px] rounded-2xl bg-white shadow-lg ring-1 ring-slate-200 p-4 z-10">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm mb-1">Status</label>
                    <select
                      value={fltStatus}
                      onChange={(e) => setFltStatus(e.target.value)}
                      className="w-full rounded-xl ring-1 ring-slate-300 px-3 py-2"
                    >
                      <option value="">Any</option>
                      {statusOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm mb-1">Type</label>
                    <select
                      value={fltType}
                      onChange={(e) => setFltType(e.target.value)}
                      className="w-full rounded-xl ring-1 ring-slate-300 px-3 py-2"
                    >
                      <option value="">Any</option>
                      {typeOptions.map((t) => (
                        <option key={t} value={t}>
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      className="text-sm text-slate-600 hover:underline"
                      onClick={() => {
                        setFltStatus("");
                        setFltType("");
                      }}
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      className="rounded-xl bg-slate-900 text-white px-3 py-2 text-sm"
                      onClick={() => setFiltersOpen(false)}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm rounded-2xl overflow-hidden">
          <thead className="bg-slate-50">
            <tr className="text-left">
              <th className="py-3 px-4">ID</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Message</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Revoke</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {error && (
              <tr>
                <td colSpan={6} className="py-8 px-4 text-center text-red-600">
                  {error}
                </td>
              </tr>
            )}

            {rows && visibleRows.length > 0
              ? visibleRows.map((r) => {
                  const isRevokable =
                    typeof r.status === "string" &&
                    /pending|new|open/i.test(r.status);
                  return (
                    <tr key={r.id}>
                      <td className="py-3 px-4 font-medium">{r.id}</td>
                      <td className="py-3 px-4">{r.status || "—"}</td>
                      <td className="py-3 px-4 capitalize">{r.type || "—"}</td>
                      <td
                        className="py-3 px-4 max-w-[420px] truncate"
                        title={r.message}
                      >
                        {r.message || "—"}
                      </td>
                      <td className="py-3 px-4">
                        {r.created_at ? r.created_at.slice(0, 10) : "—"}
                      </td>
                      <td className="py-3 px-4">
                        {isRevokable ? (
                          <button
                            className="rounded-xl ring-1 ring-slate-300 px-3 py-1.5 hover:bg-slate-50"
                            onClick={() => onRevoke(r.id)}
                            disabled={revoking}
                          >
                            Revoke
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              : !error && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-10 px-4 text-center text-slate-500"
                    >
                      No Records Available.
                    </td>
                  </tr>
                )}
          </tbody>
        </table>
      </div>

      {/* Create Request Modal */}
      {openModal && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/60"
            onClick={() => setOpenModal(false)}
          />
          {/* Sheet */}
          <div className="relative mx-auto mt-16 w-[680px] max-w-[92vw] rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-xl font-semibold">Create New Request</h3>
              <button
                onClick={() => setOpenModal(false)}
                className="rounded-full p-2 hover:bg-slate-50"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form className="px-6 py-6" onSubmit={onSave}>
              <div className="mb-5">
                <label className="block text-sm mb-1">
                  Type <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    className="w-full rounded-xl ring-1 ring-slate-300 px-4 py-2.5 appearance-none bg-white"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    required
                  >
                    <option value="update">Update</option>
                    <option value="delete">Delete</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm mb-1">
                  Message <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  className="w-full rounded-xl ring-1 ring-slate-300 px-4 py-2.5"
                  placeholder=""
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>

              <div className="border-t px-0 -mx-6 mb-6" />
              <div className="px-0">
                <button className={navyBtn} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
