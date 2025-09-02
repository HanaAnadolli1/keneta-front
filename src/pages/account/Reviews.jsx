import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import { getOrders, getProductReviews } from "../../api/customer";
import Breadcrumbs from "../../components/Breadcrumbs";

// Try to extract product metadata from an order item
function productMetaFromItem(it = {}) {
  const p = it.product || {};
  const id = it.product_id ?? p.id ?? it.productId ?? it.product_id ?? null;

  const name = it.name ?? p.name ?? "Product";

  const url_key = p.url_key ?? it.url_key ?? p.slug ?? null;

  const thumb =
    p.base_image?.url ??
    p.thumbnail_url ??
    it.base_image?.url ??
    it.image ??
    (Array.isArray(p.images) && p.images[0]?.url) ??
    (Array.isArray(it.images) && it.images[0]?.url) ??
    null;

  return { id, name, url_key, thumb };
}

export default function Reviews() {
  const { currentUser } = useContext(AuthContext) || {};
  const userId = currentUser?.id;
  const userEmail = (currentUser?.email || "").toLowerCase();

  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState([]); // normalized reviews with product info
  const [error, setError] = useState("");

  const breadcrumbs = [
    { label: "Home", path: "/" },
    { label: "Account", path: "/account" },
    { label: "Reviews" },
  ];

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        // 1) Load orders to know which products the customer bought (and to grab product metadata)
        const ordersRes = await getOrders();
        const orders = Array.isArray(ordersRes)
          ? ordersRes
          : ordersRes?.data || [];

        // Build product map: id -> { name, url_key, thumb }
        const productMap = new Map();
        for (const o of orders) {
          const items = Array.isArray(o?.items) ? o.items : [];
          for (const it of items) {
            const meta = productMetaFromItem(it);
            if (meta.id && !productMap.has(meta.id))
              productMap.set(meta.id, meta);
          }
        }

        const productIds = Array.from(productMap.keys());
        if (productIds.length === 0) {
          setCards([]);
          setLoading(false);
          return;
        }

        // 2) Fetch reviews for each product and flatten
        const all = await Promise.all(
          productIds.map(async (pid) => {
            try {
              const r = await getProductReviews(pid);
              const list = Array.isArray(r) ? r : r?.data || [];
              return list.map((rv) => ({ ...rv, __productId: pid }));
            } catch {
              return [];
            }
          })
        );
        const reviews = all.flat();

        // 3) Keep only the reviews written by this customer
        const mine = reviews.filter((rv) => {
          const rid =
            rv.customer_id ?? rv.user_id ?? rv.customer?.id ?? rv.customerId;
          const remail = (
            rv.customer_email ??
            rv.email ??
            rv.customer?.email ??
            ""
          ).toLowerCase();
          return (
            (userId && String(rid) === String(userId)) ||
            (userEmail && remail === userEmail)
          );
        });

        // 4) Normalize for UI and join in product info
        const norm = mine.map((rv) => {
          const pid = rv.product_id ?? rv.__productId ?? rv.product?.id ?? null;
          const pm = (pid && productMap.get(pid)) || {};
          const rating =
            Number(rv.rating ?? rv.rating_value ?? rv.stars ?? 0) || 0;
          return {
            id: rv.id ?? `${pid}-${rv.created_at ?? ""}`,
            productId: pid,
            productName: pm.name || rv.product?.name || "Product",
            productUrlKey: pm.url_key || rv.product?.url_key || null,
            productThumb: pm.thumb || null,
            title: rv.title ?? rv.review_title ?? rv.headline ?? "Review",
            body: rv.comment ?? rv.review ?? rv.description ?? rv.message ?? "",
            rating,
            date:
              rv.created_at ?? rv.createdAt ?? rv.updated_at ?? rv.date ?? "",
          };
        });

        // Sort newest first (optional)
        norm.sort((a, b) => (a.date < b.date ? 1 : -1));

        setCards(norm);
      } catch (e) {
        setError(e?.message || "Failed to load reviews");
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, userEmail]);

  if (loading)
    return (
      <div>
        <Breadcrumbs items={breadcrumbs} />
        <p>Loading…</p>
      </div>
    );
  if (error)
    return (
      <div>
        <Breadcrumbs items={breadcrumbs} />
        <p className="text-red-600">{error}</p>
      </div>
    );

  return (
    <div>
      <Breadcrumbs items={breadcrumbs} />
      <h2 className="text-2xl font-semibold mb-6">Reviews</h2>

      {cards.length === 0 ? (
        <p className="text-slate-500">No reviews found.</p>
      ) : (
        <ul className="space-y-4">
          {cards.map((c) => (
            <li
              key={c.id}
              className="rounded-2xl ring-1 ring-slate-200 bg-white p-5"
            >
              <div className="flex gap-5">
                {/* product thumb */}
                <div className="w-[120px] h-[120px] rounded-2xl bg-slate-50 ring-1 ring-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                  {c.productThumb ? (
                    <img
                      src={c.productThumb}
                      alt={c.productName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg
                      width="44"
                      height="44"
                      viewBox="0 0 24 24"
                      className="text-slate-300"
                    >
                      <path
                        fill="currentColor"
                        d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14l2-2h14l2 2ZM8 9a2 2 0 1 1 0-4a2 2 0 0 1 0 4Zm-3 6l3.5-4.5l2.5 3l3.5-4.5L19 15H5Z"
                      />
                    </svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {/* product name + stars */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {c.productUrlKey ? (
                        <a
                          className="text-lg font-semibold hover:underline truncate block"
                          href={`/products/${c.productUrlKey}`}
                          title={c.productName}
                        >
                          {c.productName}
                        </a>
                      ) : (
                        <h3
                          className="text-lg font-semibold truncate"
                          title={c.productName}
                        >
                          {c.productName}
                        </h3>
                      )}
                      {c.date && (
                        <p className="text-xs text-slate-500 mt-1">
                          {formatDateTime(c.date)}
                        </p>
                      )}
                    </div>
                    <Stars value={c.rating} />
                  </div>

                  {/* review title */}
                  {c.title && <p className="mt-3 font-medium">{c.title}</p>}
                  {/* review body */}
                  {c.body && (
                    <p className="mt-2 text-slate-600 leading-6">{c.body}</p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* helpers */
function formatDateTime(d) {
  try {
    const dt = new Date(d);
    if (!isNaN(dt.getTime())) return dt.toLocaleString();
  } catch {
    /* ignore */
  }
  return String(d).slice(0, 19);
}

function Stars({ value = 0 }) {
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <div className="flex gap-1 text-amber-400">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} filled={i <= v} />
      ))}
    </div>
  );
}
function Star({ filled }) {
  return filled ? (
    <svg viewBox="0 0 20 20" className="w-5 h-5 fill-current">
      <path d="M10 15.27 16.18 19l-1.64-7.03L20 7.24l-7.19-.61L10 0 7.19 6.63 0 7.24l5.46 4.73L3.82 19z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="w-5 h-5">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        d="m12 17.27 6.18 3.73-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73-1.64 7.03z"
      />
    </svg>
  );
}
