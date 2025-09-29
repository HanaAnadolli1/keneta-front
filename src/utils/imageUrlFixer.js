// Enhanced utility functions to fix theme image URLs and handle lazy loading
export const fixThemeImageUrls = (content) => {
  if (!content) return content;
  
  const baseUrl = "https://admin.keneta-ks.com/";
  
  // Fix src attributes
  content = content.replace(
    /src="([^"]*storage\/[^"]*)"/g,
    (match, path) => {
      if (path.startsWith('http')) return match; // Already a full URL
      return `src="${baseUrl}${path}"`;
    }
  );
  
  // Fix data-src attributes (for lazy loading)
  content = content.replace(
    /data-src="([^"]*storage\/[^"]*)"/g,
    (match, path) => {
      if (path.startsWith('http')) return match; // Already a full URL
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
  css = css.replace(/text-indent:\s*-9999px;?/g, '');
  
  return css;
};

// Initialize lazy loading for images after HTML is rendered
export const initializeLazyLoading = () => {
  const lazyImages = document.querySelectorAll('img[data-src]');
  
  if (lazyImages.length === 0) return;

  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.classList.remove('lazy');
        img.classList.add('loaded');
        observer.unobserve(img);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '50px'
  });

  lazyImages.forEach(img => imageObserver.observe(img));
};