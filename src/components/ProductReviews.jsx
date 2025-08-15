import React, { useEffect, useMemo, useState } from "react";
import { useToast } from "../context/ToastContext";
import { API_V1 } from "../api/config";

/* ---------- helpers ---------- */

const clamp = (n, min = 0, max = 100) =>
  Math.max(min, Math.min(max, Number.isFinite(n) ? n : 0));

/** Fallback: convert API summary (which may be counts OR percentages) to 0..100% */
const computeRatingDistribution = (summary, totalReviews) => {
  const raw = summary?.percentage ?? {};
  const vals = [5, 4, 3, 2, 1].map((s) => {
    const v = Number(raw?.[s]);
    return Number.isFinite(v) ? v : 0;
  });
  const sum = vals.reduce((a, b) => a + b, 0);
  if (sum >= 99 && sum <= 101) return vals.map((v) => clamp(Math.round(v)));
  if (Number(totalReviews) > 0) {
    return vals.map((v) => clamp(Math.round((v / totalReviews) * 100)));
  }
  return [0, 0, 0, 0, 0];
};

const Star = ({ filled = false, className = "", title }) => (
  <svg
    aria-hidden={title ? undefined : true}
    role={title ? "img" : "presentation"}
    viewBox="0 0 20 20"
    width="20"
    height="20"
    className={className}
  >
    <path
      d="M10 15.27l-5.18 3.04 1.37-5.9L1 7.97l6.02-.52L10 2l2.98 5.45 6.02.52-5.19 4.44 1.37 5.9z"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.2"
    />
  </svg>
);

const StarDisplay = ({ value = 0 }) => {
  const full = Math.round(Number(value) || 0);
  return (
    <div className="inline-flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} filled={i < full} />
      ))}
    </div>
  );
};

const StarInput = ({ value, onChange }) => {
  const [hover, setHover] = useState(0);
  const current = hover || value || 0;
  return (
    <div className="inline-flex items-center gap-1 text-amber-500">
      {Array.from({ length: 5 }).map((_, i) => {
        const n = i + 1;
        const isFilled = n <= current;
        return (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange?.(n)}
            className="p-0.5"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            title={`${n} star${n > 1 ? "s" : ""}`}
          >
            <Star filled={isFilled} />
          </button>
        );
      })}
    </div>
  );
};

/* ---------- main component ---------- */

/**
 * Props:
 * - productId: number (required)
 * - summary: product.reviews object (optional; used as fallback if list empty)
 * - accessToken: string | null (Bearer). For cookie sessions, pass null and add credentials in fetch.
 */
export default function ProductReviews({ productId, summary, accessToken }) {
  const toast = useToast();
  const baseApi = (API_V1 || "").replace(/\/+$/, "");

  // list state
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  // form state
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);
  const [files, setFiles] = useState([]);

  // auth (adapt to your app if you use cookies or context)
  const isLoggedIn = !!accessToken;

  const headers = {
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
  // For cookie sessions (Sanctum), remove Authorization and add `credentials: "include"` in both fetch calls.

  const fetchReviews = async (pid, { page: p = page, limit: l = limit } = {}) => {
    if (!pid) return;
    setLoading(true);
    setErr(null);
    try {
      const qs = new URLSearchParams({ page: String(p), limit: String(l) }).toString();
      const res = await fetch(`${baseApi}/products/${pid}/reviews?${qs}`, {
        headers,
        // credentials: "include",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || `Failed (${res.status})`);

      const data = body?.data;
      const items = Array.isArray(data) ? data : data ? [data] : [];
      setReviews(items);
      const t = body?.meta?.total ?? body?.pagination?.total ?? items.length;
      setTotal(Number(t));
    } catch (e) {
      setErr(e.message || "Could not load reviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productId) {
      setPage(1);
      fetchReviews(productId, { page: 1, limit });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, limit]);

  const submitReview = async (e) => {
    e.preventDefault();
    if (!isLoggedIn) {
      toast.warn("Please log in to write a review.");
      return;
    }

    const tid = toast.info("Submitting your review…", { duration: 0 });
    try {
      const form = new FormData();
      form.append("title", title);
      form.append("comment", comment);
      form.append("rating", String(rating));
      for (const f of files) form.append("attachments[]", f);

      const res = await fetch(`${baseApi}/products/${productId}/reviews`, {
        method: "POST",
        headers,
        // credentials: "include",
        body: form,
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.message || `Failed (${res.status})`);

      const serverReview = payload?.data;
      const newReview =
        serverReview ?? {
          id: `temp-${Date.now()}`,
          title,
          comment,
          rating,
          name: "You",
          status: "pending",
          created_at: new Date().toISOString(),
          attachments: [],
        };

      // reset + optimistic insert
      setTitle("");
      setComment("");
      setRating(5);
      setFiles([]);
      setShowForm(false);
      toast.remove(tid);
      toast.success("Your review was submitted and is pending approval.");
      setReviews((prev) => [newReview, ...prev]);

      // optional refresh (backend may not include pending)
      setPage(1);
      fetchReviews(productId, { page: 1, limit });
    } catch (err) {
      toast.remove(tid);
      toast.error(err.message || "Could not submit review.");
    }
  };

  /* ---------- derive metrics from the fetched LIST (authoritative) ---------- */

  const listStats = useMemo(() => {
    const total = reviews.length;
    if (!total) return null;

    // counts [5,4,3,2,1]
    const counts = [5, 4, 3, 2, 1].map((s) =>
      reviews.reduce((acc, r) => acc + (Number(r.rating) === s ? 1 : 0), 0)
    );
    const percents = counts.map((c) => Math.round((c / total) * 100));

    const avg =
      Math.round(
        (reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / total) * 10
      ) / 10;

    return { total, counts, percents, avg };
  }, [reviews]);

  // Prefer list-derived; fallback to API summary only if list empty
  const totalReviews = listStats?.total ?? Number(summary?.total ?? 0);
  const avgRating = listStats?.avg ?? Number(summary?.average_rating ?? 0);
  const starPercents =
    listStats?.percents ?? computeRatingDistribution(summary, totalReviews);

  /* ---------- render ---------- */

  const distributionUI = totalReviews ? (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <StarDisplay value={avgRating} />
        <span className="text-sm text-gray-700">
          {Number.isFinite(avgRating) ? avgRating.toFixed(1) : "0.0"} / 5 · {totalReviews} review
          {totalReviews > 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-1">
        {[5, 4, 3, 2, 1].map((star, idx) => {
          const pct = clamp(starPercents[idx]);
          return (
            <div key={star} className="flex items-center gap-3">
              <span className="w-10 text-sm">{star}★</span>
              <div className="h-2 flex-1 bg-gray-100 rounded">
                <div
                  className="h-2 bg-indigo-600 rounded"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-12 text-right text-sm text-gray-600">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-8">
      {/* Summary */}
      {distributionUI}

      {/* List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Customer Reviews</h3>
          <div className="text-sm text-gray-600">
            Page {page}
            {total ? <span className="ml-2">· Total {total}</span> : null}
          </div>
        </div>

        {loading && <p className="text-gray-500">Loading reviews…</p>}
        {err && <p className="text-red-600">{err}</p>}
        {!loading && !err && reviews.length === 0 && (
          <p className="text-gray-500">No reviews yet.</p>
        )}

        <ul className="space-y-4">
          {reviews.map((r) => (
            <li
              key={r.id}
              className={`p-4 rounded-xl ring-1 ring-black/5 bg-white ${
                String(r.status).toLowerCase() === "pending" ? "opacity-95" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-gray-900">{r.title || "Untitled"}</div>
                <div className="text-sm text-gray-500">
                  {r.created_at ? new Date(r.created_at).toLocaleDateString() : null}
                </div>
              </div>
              <div className="mt-1">
                <StarDisplay value={Number(r.rating ?? 0)} />
              </div>
              <p className="mt-2 text-gray-700">{r.comment}</p>

              <div className="mt-2 text-sm text-gray-500 flex items-center gap-2">
                <span>
                  by {r.name || r.customer?.first_name || "Anonymous"}
                  {r.status ? ` · ${r.status}` : ""}
                </span>
                {String(r.status).toLowerCase() === "pending" && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    Pending approval
                  </span>
                )}
              </div>

              {Array.isArray(r.attachments) && r.attachments.length > 0 && (
                <div className="mt-3 flex gap-3 flex-wrap">
                  {r.attachments.slice(0, 3).map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt="Review attachment"
                      className="w-40 h-40 object-cover rounded-lg ring-1 ring-black/10"
                    />
                  ))}
                </div>
              )}
              {r.attachments && typeof r.attachments === "string" && (
                <div className="mt-3">
                  <img
                    src={r.attachments}
                    alt="Review attachment"
                    className="w-40 h-40 object-cover rounded-lg ring-1 ring-black/10"
                  />
                </div>
              )}
            </li>
          ))}
        </ul>

        {/* Pagination */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 rounded-lg ring-1 ring-black/10 disabled:opacity-50"
              disabled={page <= 1 || loading}
              onClick={() => {
                const p = Math.max(1, page - 1);
                setPage(p);
                fetchReviews(productId, { page: p, limit });
              }}
            >
              Previous
            </button>
            <button
              className="px-3 py-1 rounded-lg ring-1 ring-black/10 disabled:opacity-50"
              disabled={reviews.length < limit || loading}
              onClick={() => {
                const p = page + 1;
                setPage(p);
                fetchReviews(productId, { page: p, limit });
              }}
            >
              Next
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Per page</label>
            <select
              className="px-2 py-1 rounded-lg ring-1 ring-black/10"
              value={limit}
              onChange={(e) => {
                const l = Number(e.target.value);
                setLimit(l);
                setPage(1);
                fetchReviews(productId, { page: 1, limit: l });
              }}
            >
              {[5, 10, 20].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Add review: button + form */}
      <div className="pt-6 border-t">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Write a review</h3>
        {!isLoggedIn ? (
            <a
              href="/login"
              className="px-4 py-2 rounded-lg text-sm font-semibold ring-1 ring-black/10 hover:bg-gray-50"
            >
              Log in to review
            </a>
          ) : (
            <button
              type="button"
              onClick={() => setShowForm((s) => !s)}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
            >
              {showForm ? "Close" : "Add review"}
            </button>
          )}
        </div>

        {isLoggedIn && showForm && (
          <form onSubmit={submitReview} className="mt-4 space-y-4 p-4 rounded-xl bg-white ring-1 ring-black/5">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Your rating</label>
              <StarInput value={rating} onChange={setRating} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-lg ring-1 ring-black/10 px-3 py-2"
                placeholder="Summarize your experience"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Comment</label>
              <textarea
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="mt-1 w-full rounded-lg ring-1 ring-black/10 px-3 py-2"
                rows={4}
                placeholder="What did you like or dislike?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Attachments (images or videos)
              </label>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
                className="mt-1 block"
              />
              {files?.length > 0 && (
                <div className="mt-2 text-sm text-gray-600">
                  {files.length} file{files.length > 1 ? "s" : ""} selected
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="h-11 px-6 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Submit Review
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="h-11 px-4 rounded-xl text-sm font-semibold ring-1 ring-black/10 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
