import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import noImage from "../assets/no_image.jpg";
import { API_V1 } from "../api/config";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";

const MIN_FOR_CAROUSEL = 7;

function normSlug(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function CategoryCard({ cat }) {
  const imgSrc =
    cat.logo_url || cat.image_url || cat.image?.url || cat.thumbnail || cat.icon || noImage;

  return (
    <Link
      to={`/products?category=${encodeURIComponent(cat.slug)}`}
      className="group px-2 py-2 flex flex-col items-center justify-center text-center"
      title={cat.name}
    >
      {/* taller circle & icon, but compact text */}
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-2 overflow-hidden">
        <img src={imgSrc} alt={cat.name} className="w-8 h-8 object-contain" loading="lazy" />
      </div>
      <span className="text-xs md:text-sm font-medium text-gray-800 leading-tight text-center whitespace-normal break-words">
        {cat.name}
      </span>
    </Link>
  );
}

export default function CategoryNavigator() {
  const [params] = useSearchParams();
  const categorySlugParam = params.get("category") || params.get("category_slug") || "";
  const categoryIdParam = params.get("category_id") || "";

  const [categoryOptions, setCategoryOptions] = useState([]);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);

  // small in-bounds nav buttons
  const prevRef = useRef(null);
  const nextRef = useRef(null);

  useEffect(() => {
    const cached = sessionStorage.getItem("categoryOptions");
    if (cached) {
      setCategoryOptions(JSON.parse(cached));
      return;
    }
    (async () => {
      try {
        const r = await fetch(`${API_V1}/categories?sort=id`);
        const j = await r.json();
        const all = j?.data || [];
        setCategoryOptions(all);
        sessionStorage.setItem("categoryOptions", JSON.stringify(all));
      } catch {
        setCategoryOptions([]);
      }
    })();
  }, []);

  const resolvedCategory = useMemo(() => {
    if (!categoryOptions.length) return null;
    if (categoryIdParam) {
      const id = String(categoryIdParam);
      return categoryOptions.find((c) => String(c.id) === id) || null;
    }
    if (categorySlugParam) {
      const decoded = decodeURIComponent(categorySlugParam);
      const candidates = new Map();
      for (const c of categoryOptions) {
        if (!c?.slug) continue;
        candidates.set(c.slug, c);
        candidates.set(encodeURIComponent(c.slug), c);
        candidates.set(normSlug(c.slug), c);
      }
      return (
        candidates.get(decoded) ||
        candidates.get(categorySlugParam) ||
        candidates.get(normSlug(decoded)) ||
        null
      );
    }
    return null;
  }, [categoryOptions, categorySlugParam, categoryIdParam]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const parentId = resolvedCategory?.id || categoryIdParam || null;
        if (!parentId) {
          setChildren([]);
          return;
        }
        const url = `${API_V1}/descendant-categories?parent_id=${parentId}`;
        const r = await fetch(url);
        const j = await r.json();
        const rows = (j?.data || []).filter((c) => String(c.status) === "1");
        if (!cancelled) setChildren(rows);
      } catch {
        if (!cancelled) setChildren([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolvedCategory, categoryIdParam]);

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

  // Grid (≤6 children) — max 5 per row
  if (!isCarousel) {
    return (
      <div className="mb-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {children.map((c) => (
            <CategoryCard key={c.id} cat={c} />
          ))}
        </div>
      </div>
    );
  }

  // Carousel (≥7 children) — cap at 5 visible on desktop
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
        // More room between items so it breathes
        spaceBetween={16}
        // Cap visible slides at 5 on md+; fewer on small screens to avoid crowding
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
