// src/components/CategoryNavigator.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import noImage from "../assets/no_image.jpg";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";

const MIN_FOR_CAROUSEL = 7;
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
      if (logoUrl.startsWith('http')) {
        return logoUrl;
      } else if (logoUrl.startsWith('storage/')) {
        return `https://admin.keneta-ks.com/${logoUrl}`;
      }
    }
    
    // Check image_url
    if (imageUrl) {
      if (imageUrl.startsWith('http')) {
        return imageUrl;
      } else if (imageUrl.startsWith('storage/')) {
        return `https://admin.keneta-ks.com/${imageUrl}`;
      }
    }
    
    return noImage;
  };
  
  const imgSrc = getImageSrc();
  
  return (
    <Link
      to={`/products?category=${encodeURIComponent(cat.slug)}`}
      className="group px-2 py-2 flex flex-col items-center justify-center text-center"
      title={cat.name}
    >
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-2 overflow-hidden">
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
      <span className="text-xs md:text-sm font-medium text-gray-800 leading-tight text-center whitespace-normal break-words">
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
        console.warn(`Failed to fetch children for parent ${parentId}:`, error);
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
    let category = categories.find(cat => {
      const catSlugNorm = normSlug(cat.slug);
      const catNameNorm = normSlug(cat.name);
      const searchSlugNorm = normSlug(slug);
      
      return catSlugNorm === searchSlugNorm || catNameNorm === searchSlugNorm;
    });
    
    if (!category) {
      // Look for partial match
      category = categories.find(cat => {
        const catSlugNorm = normSlug(cat.slug);
        const catNameNorm = normSlug(cat.name);
        const searchSlugNorm = normSlug(slug);
        
        return catSlugNorm.includes(searchSlugNorm) || catNameNorm.includes(searchSlugNorm);
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
  

  const prevRef = useRef(null);
  const nextRef = useRef(null);

  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvedParentId, setResolvedParentId] = useState(null);

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
            `https://admin.keneta-ks.com/api/v2/breadcrumbs/category/${encodeURIComponent(decoded)}`
          );
          if (breadcrumbResponse.ok) {
            const breadcrumbData = await breadcrumbResponse.json();
            
            // Look for the category in the breadcrumb data
            if (breadcrumbData?.data && Array.isArray(breadcrumbData.data)) {
              const categoryFromBreadcrumb = breadcrumbData.data.find(cat => 
                normSlug(cat.slug) === normSlug(decoded) || normSlug(cat.name) === normSlug(decoded)
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
            ? rows.filter(cat => cat.name !== activeCategoryName)
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

  const isCarousel = children.length >= MIN_FOR_CAROUSEL;

  if (loading) {
    return (
      <div className="mb-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-2 py-2 text-center">
              <div className="w-16 h-16 mx-auto bg-gray-200 animate-pulse rounded-full" />
              <div className="h-3 w-24 mx-auto mt-2 bg-gray-200 animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!children.length) return null;

  if (!isCarousel) {
    return (
      <div className="mb-3">
        {/* Mobile */}
        <div className="md:hidden">
          {children.length > 4 ? (
            <Swiper
              className="!w-full !max-w-full"
              modules={[Navigation]}
              navigation={false}
              spaceBetween={12}
              slidesPerView={4}
            >
              {children.map((c) => (
                <SwiperSlide key={c.id}>
                  <CategoryCard cat={c} />
                </SwiperSlide>
              ))}
            </Swiper>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {children.map((c) => (
                <CategoryCard key={c.id} cat={c} />
              ))}
            </div>
          )}
        </div>

        {/* Desktop */}
        <div className="hidden md:grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {children.map((c) => (
            <CategoryCard key={c.id} cat={c} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-3 relative w-full max-w-full overflow-hidden">
      <button
        ref={prevRef}
        className="hidden md:flex absolute left-[-11px] top-1/2 -translate-y-1/2 z-10 h-7 w-7 items-center justify-center text-[var(--secondary)]"
        aria-label="Prev"
        type="button"
      >
        <IoIosArrowBack />
      </button>
      <button
        ref={nextRef}
        className="hidden md:flex absolute right-[-11px] top-1/2 -translate-y-1/2 z-10 h-7 w-7 items-center justify-center text-[var(--secondary)]"
        aria-label="Next"
        type="button"
      >
        <IoIosArrowForward />
      </button>

      <Swiper
        className="!w-full !max-w-full"
        modules={[Navigation]}
        navigation={{ prevEl: prevRef.current, nextEl: nextRef.current }}
        onInit={(swiper) => {
          swiper.params.navigation.prevEl = prevRef.current;
          swiper.params.navigation.nextEl = nextRef.current;
          swiper.navigation.init();
          swiper.navigation.update();
        }}
        spaceBetween={16}
        slidesPerView={4}
        breakpoints={{
          480: { slidesPerView: 4 },
          640: { slidesPerView: 4 },
          768: { slidesPerView: 6 },
          1024: { slidesPerView: 7 },
          1280: { slidesPerView: 7 },
        }}
      >
        {children.map((cat) => (
          <SwiperSlide key={cat.id}>
            <CategoryCard cat={cat} />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
