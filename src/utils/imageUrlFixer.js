// Enhanced utility functions to fix theme image URLs and handle lazy loading
export const fixThemeImageUrls = (content) => {
  if (!content) return content;

  const baseUrl = "https://admin.keneta-ks.com/";

  // Fix src attributes
  content = content.replace(/src="([^"]*storage\/[^"]*)"/g, (match, path) => {
    if (path.startsWith("http")) return match; // Already a full URL
    return `src="${baseUrl}${path}"`;
  });

  // Fix data-src attributes (for lazy loading)
  content = content.replace(
    /data-src="([^"]*storage\/[^"]*)"/g,
    (match, path) => {
      if (path.startsWith("http")) return match; // Already a full URL
      return `data-src="${baseUrl}${path}"`;
    }
  );

  // Convert lazy loading images to regular images (move data-src to src)
  content = content.replace(
    /<img([^>]*?)src=""([^>]*?)data-src="([^"]*)"([^>]*?)>/g,
    '<img$1src="$3"$2$4>'
  );

  return content;
};

export const fixThemeCss = (css) => {
  if (!css) return css;

  // Remove problematic CSS rules that hide images
  css = css.replace(/text-indent:\s*-9999px;?/g, "");

  // Replace hardcoded max-width values with 100% to respect container max-width
  // This handles cases like "max-width: 1000px;" -> "max-width: 100%;"
  css = css.replace(/max-width:\s*\d+px;?/g, "max-width: 100%;");

  // Also handle max-width with spaces and different formats
  css = css.replace(/max-width:\s*\d+\s*px;?/g, "max-width: 100%;");

  // Fix flex-wrap issues for better responsiveness
  css = css.replace(/flex-wrap:\s*nowrap;?/g, "flex-wrap: wrap;");

  // Ensure proper responsive behavior for benefits container
  css = css.replace(
    /\.benefits\s*\{[^}]*max-width:\s*1000px;[^}]*\}/g,
    (match) => {
      return match.replace(/max-width:\s*1000px;?/g, "max-width: 100%;");
    }
  );

  // Add better mobile responsiveness
  css += `
    @media (max-width: 768px) {
      .benefits {
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 12px !important;
        padding: 12px !important;
      }
      .benefits .item {
        flex: none !important;
        width: 100% !important;
        border-bottom: 1px solid #e8e8ea;
        padding-bottom: 8px;
      }
      .benefits .item:last-child {
        border-bottom: none;
      }
      .benefits .divider {
        display: none !important;
      }
    }
  `;

  return css;
};

// Initialize lazy loading for images after HTML is rendered
export const initializeLazyLoading = () => {
  const lazyImages = document.querySelectorAll("img[data-src]");

  if (lazyImages.length === 0) return;

  const imageObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove("lazy");
          img.classList.add("loaded");
          observer.unobserve(img);
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: "50px",
    }
  );

  lazyImages.forEach((img) => imageObserver.observe(img));
};
