// src/components/CategoryNavigator.jsx
import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import noImage from "../assets/no_image.jpg";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";

const API_PUBLIC_V1 = "https://admin.keneta-ks.com/api/v2";
const SS_CHILDREN_CACHE = "cat.childrenCache.v1";
const SS_TRAIL_CACHE = "cat.trailCache.v2";
const SS_RECENT_TRAIL = "recent.trail.json";

const ssGet = (k, fb) => {
  try {
    const v = sessionStorage.getItem(k);
    return v ? JSON.parse(v) : fb;
  } catch {
    return fb;
  }
};
const ssSet = (k, v) => {
  try {
    sessionStorage.setItem(k, JSON.stringify(v));
  } catch {}
};

const normSlug = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function normCat(c) {
  if (!c) return null;
  return {
    id: Number(c.id ?? c.category_id ?? c.value ?? 0) || 0,
    parent_id:
      c.parent_id != null
        ? Number(c.parent_id)
        : c.parent?.id != null
        ? Number(c.parent.id)
        : null,
    slug: String(c.slug ?? c.code ?? c.value ?? c.name ?? "").toLowerCase(),
    name: String(c.name ?? c.label ?? c.title ?? c.slug ?? "Category"),
    status: String(c.status ?? "1"),
    image_url: c.image_url ?? c.image?.url ?? c.thumbnail ?? c.icon ?? null,
    logo_url: c.logo_url ?? null,
  };
}

function CategoryCard({ cat }) {
  // Fix image URLs - convert relative paths to full URLs
  const getImageSrc = () => {
    const logoUrl = cat.logo_url;
    const imageUrl = cat.image_url;

    // Check logo_url first
    if (logoUrl) {
      if (logoUrl.startsWith("http")) {
        return logoUrl;
      } else if (logoUrl.startsWith("storage/")) {
        return `https://admin.keneta-ks.com/${logoUrl}`;
      }
    }

    // Check image_url
    if (imageUrl) {
      if (imageUrl.startsWith("http")) {
        return imageUrl;
      } else if (imageUrl.startsWith("storage/")) {
        return `https://admin.keneta-ks.com/${imageUrl}`;
      }
    }

    return noImage;
  };

  const imgSrc = getImageSrc();

  return (
    <Link
      to={`/products?category=${encodeURIComponent(cat.slug)}`}
      className="group bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-2 hover:shadow-md transition-all duration-200 w-full"
      title={cat.name}
    >
      <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
        <img
          src={imgSrc}
          alt={cat.name}
          className="w-8 h-8 object-contain"
          loading="lazy"
          onError={(e) => {
            e.target.src = noImage;
          }}
        />
      </div>
      <span className="text-xs font-medium text-gray-700 group-hover:text-[#00A7E5] group-hover:underline transition-colors duration-200 flex-1 truncate">
        {cat.name}
      </span>
    </Link>
  );
}

function useChildrenFetcher() {
  const mem = useRef(new Map());
  const inflight = useRef(new Map());

  return useCallback(async (parentId) => {
    const key = String(parentId);

    if (mem.current.has(key)) return mem.current.get(key);

    const ss = ssGet(SS_CHILDREN_CACHE, {});
    if (ss[key]) {
      mem.current.set(key, ss[key]);
      return ss[key];
    }

    if (inflight.current.has(key)) return inflight.current.get(key);

    const p = (async () => {
      try {
        const r = await fetch(
          `${API_PUBLIC_V1}/descendant-categories?parent_id=${encodeURIComponent(
            parentId
          )}`
        );
        const j = await r.json();
        const rows = (j?.data || [])
          .map(normCat)
          .filter((c) => c && c.status === "1");
        mem.current.set(key, rows);
        ssSet(SS_CHILDREN_CACHE, {
          ...ssGet(SS_CHILDREN_CACHE, {}),
          [key]: rows,
        });
        inflight.current.delete(key);
        return rows;
      } catch (error) {
        inflight.current.delete(key);
        return [];
      }
    })();

    inflight.current.set(key, p);
    return p;
  }, []);
}

// Helper function to find category ID by slug
async function findCategoryIdBySlug(slug) {
  try {
    // Try multiple API endpoints to get all categories
    const endpoints = [
      `${API_PUBLIC_V1}/categories?limit=1000`, // Get more categories
      `${API_PUBLIC_V1}/categories?sort=id&order=asc&limit=1000`, // Sorted
      `${API_PUBLIC_V1}/categories?include=parent,children&limit=1000`, // Include relationships
    ];

    let categories = [];
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint);
        const data = await response.json();
        const cats = data?.data || [];

        if (cats.length > categories.length) {
          categories = cats;
          break; // Use the first endpoint that returns more categories
        }
      } catch (err) {
        // Continue to next endpoint
      }
    }

    // Look for exact match first
    let category = categories.find((cat) => {
      const catSlugNorm = normSlug(cat.slug);
      const catNameNorm = normSlug(cat.name);
      const searchSlugNorm = normSlug(slug);

      return catSlugNorm === searchSlugNorm || catNameNorm === searchSlugNorm;
    });

    if (!category) {
      // Look for partial match
      category = categories.find((cat) => {
        const catSlugNorm = normSlug(cat.slug);
        const catNameNorm = normSlug(cat.name);
        const searchSlugNorm = normSlug(slug);

        return (
          catSlugNorm.includes(searchSlugNorm) ||
          catNameNorm.includes(searchSlugNorm)
        );
      });
    }

    return category ? Number(category.id) : null;
  } catch (error) {
    return null;
  }
}

export default function CategoryNavigator({ activeCategoryName }) {
  const [params] = useSearchParams();
  const categorySlugParam =
    params.get("category") || params.get("category_slug") || "";
  const categoryIdParam = params.get("category_id") || "";

  const getChildren = useChildrenFetcher();

  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvedParentId, setResolvedParentId] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);

  // Resolve parentId from URL parameters
  useEffect(() => {
    const resolveParentId = async () => {
      if (categoryIdParam) {
        setResolvedParentId(Number(categoryIdParam));
        return;
      }

      if (categorySlugParam) {
        const decoded = decodeURIComponent(categorySlugParam);

        // First try cache
        const key = normSlug(decoded);
        const tc = ssGet(SS_TRAIL_CACHE, {});
        const trail =
          tc[key] || tc[decoded.toLowerCase()] || tc[categorySlugParam] || null;
        if (Array.isArray(trail) && trail.length) {
          const last = trail[trail.length - 1];
          if (last?.id) {
            setResolvedParentId(Number(last.id));
            return;
          }
        }

        // If not in cache, try to find by slug
        const foundId = await findCategoryIdBySlug(decoded);
        if (foundId) {
          setResolvedParentId(foundId);
          return;
        }

        // Fallback: try to get category info from breadcrumb API
        try {
          const breadcrumbResponse = await fetch(
            `https://admin.keneta-ks.com/api/v2/breadcrumbs/category/${encodeURIComponent(
              decoded
            )}`
          );
          if (breadcrumbResponse.ok) {
            const breadcrumbData = await breadcrumbResponse.json();

            // Look for the category in the breadcrumb data
            if (breadcrumbData?.data && Array.isArray(breadcrumbData.data)) {
              const categoryFromBreadcrumb = breadcrumbData.data.find(
                (cat) =>
                  normSlug(cat.slug) === normSlug(decoded) ||
                  normSlug(cat.name) === normSlug(decoded)
              );
              if (categoryFromBreadcrumb?.id) {
                setResolvedParentId(Number(categoryFromBreadcrumb.id));
                return;
              }
            }
          }
        } catch (breadcrumbError) {
          // Silent fallback failure
        }
      }

      const recent = ssGet(SS_RECENT_TRAIL, []);
      if (Array.isArray(recent) && recent.length) {
        const last = recent[recent.length - 1];
        if (last?.id) {
          setResolvedParentId(Number(last.id));
          return;
        }
      }

      // Default to root categories only if no category slug was provided
      if (!categorySlugParam) {
        setResolvedParentId(1);
      } else {
        setResolvedParentId(null); // Don't show children if we can't find the category
      }
    };

    resolveParentId();
  }, [categoryIdParam, categorySlugParam]);

  useEffect(() => {
    if (resolvedParentId === null) return; // Wait for parent ID to be resolved

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const rows = await getChildren(resolvedParentId);
        if (!cancelled) {
          // Filter out children that have the same name as the active category
          const filteredRows = activeCategoryName
            ? rows.filter((cat) => cat.name !== activeCategoryName)
            : rows;
          setChildren(filteredRows);
        }
      } catch (error) {
        if (!cancelled) setChildren([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolvedParentId, getChildren, activeCategoryName]);

  // Responsive slides per view
  const [slidesPerView, setSlidesPerView] = useState(6);

  useEffect(() => {
    const calculateSlidesPerView = () => {
      const width = window.innerWidth;
      if (width < 640) setSlidesPerView(2); // Mobile: 2 slides
      else if (width < 768) setSlidesPerView(3); // Small tablet: 3 slides
      else if (width < 1024) setSlidesPerView(4); // Tablet: 4 slides
      else if (width < 1280) setSlidesPerView(5); // Desktop: 5 slides
      else setSlidesPerView(6); // Large desktop: 6 slides
    };

    calculateSlidesPerView();
    window.addEventListener("resize", calculateSlidesPerView);
    return () => window.removeEventListener("resize", calculateSlidesPerView);
  }, []);

  const totalSlides = Math.ceil(children.length / slidesPerView);

  const nextSlide = () => {
    setCurrentIndex((prev) => Math.min(prev + 1, totalSlides - 1));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  const canGoNext = currentIndex < totalSlides - 1;
  const canGoPrev = currentIndex > 0;

  if (loading) {
    return (
      <div className="mb-3">
        <div className="flex" style={{ gap: "12px" }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-shrink-0">
              <div className="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-2 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded" />
                <div className="h-3 w-20 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!children.length) return null;

  // Touch/swipe and mouse drag handling
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    e.preventDefault();
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    e.preventDefault();
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = (e) => {
    e.preventDefault();
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && canGoNext) {
      nextSlide();
    }
    if (isRightSwipe && canGoPrev) {
      prevSlide();
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  // Mouse drag handlers
  const onMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart(e.clientX);
    setDragEnd(null);
  };

  const onMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    setDragEnd(e.clientX);
  };

  const onMouseUp = (e) => {
    if (!isDragging) {
      setIsDragging(false);
      return;
    }

    if (dragStart && dragEnd) {
      const distance = dragStart - dragEnd;
      const isLeftDrag = distance > minSwipeDistance;
      const isRightDrag = distance < -minSwipeDistance;

      if (isLeftDrag && canGoNext) {
        nextSlide();
      }
      if (isRightDrag && canGoPrev) {
        prevSlide();
      }
    }

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  const onMouseLeave = () => {
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  // Always show slider implementation
  return (
    <div className="mb-3">
      {/* Slider Content */}
      <div
        className={`overflow-hidden select-none ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        style={{ userSelect: "none" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
      >
        <div
          className="flex transition-transform duration-300 ease-in-out"
          style={{
            transform: `translateX(-${currentIndex * (100 / totalSlides)}%)`,
            width: `${totalSlides * 100}%`,
            gap: "12px",
          }}
        >
          {children.map((cat) => (
            <div
              key={cat.id}
              className="flex-shrink-0"
              style={{
                width: "auto",
                minWidth: "120px",
                maxWidth: "200px",
              }}
            >
              <CategoryCard cat={cat} />
            </div>
          ))}
        </div>
      </div>

      {/* Dots Indicator */}
      <div className="flex justify-center mt-4 space-x-2">
        {Array.from({ length: totalSlides }).map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-all duration-200 ${
              index === currentIndex ? "bg-blue-500" : "bg-gray-300"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
