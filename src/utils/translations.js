// src/utils/translations.js

/**
 * Get the translated content for a category based on current language
 * @param {Object} category - The category object with translations array
 * @param {string} currentLocale - Current language code (e.g., 'sq', 'en')
 * @param {string} field - Field to get translation for (e.g., 'name', 'description')
 * @returns {string} - Translated content or fallback to default
 */
export function getTranslatedContent(category, currentLocale, field = "name") {
  if (
    !category ||
    !category.translations ||
    !Array.isArray(category.translations)
  ) {
    // No translations available, return the default field value
    return category?.[field] || "";
  }

  // Find translation for current locale
  const translation = category.translations.find(
    (t) => t.locale === currentLocale
  );

  if (translation && translation[field]) {
    return translation[field];
  }

  // Fallback to default locale (usually the main category field)
  return category?.[field] || "";
}

/**
 * Get translated category name
 * @param {Object} category - The category object
 * @param {string} currentLocale - Current language code
 * @returns {string} - Translated category name
 */
export function getCategoryName(category, currentLocale) {
  return getTranslatedContent(category, currentLocale, "name");
}

/**
 * Get translated category description
 * @param {Object} category - The category object
 * @param {string} currentLocale - Current language code
 * @returns {string} - Translated category description
 */
export function getCategoryDescription(category, currentLocale) {
  return getTranslatedContent(category, currentLocale, "description");
}

/**
 * Get translated category slug
 * @param {Object} category - The category object
 * @param {string} currentLocale - Current language code
 * @returns {string} - Translated category slug
 */
export function getCategorySlug(category, currentLocale) {
  return getTranslatedContent(category, currentLocale, "slug");
}

/**
 * Process categories array to get translated names
 * @param {Array} categories - Array of category objects
 * @param {string} currentLocale - Current language code
 * @returns {Array} - Categories with translated names
 */
export function processCategoriesWithTranslations(categories, currentLocale) {
  if (!Array.isArray(categories)) return [];

  return categories.map((category) => ({
    ...category,
    translatedName: getCategoryName(category, currentLocale),
    translatedDescription: getCategoryDescription(category, currentLocale),
    translatedSlug: getCategorySlug(category, currentLocale),
  }));
}

// --- Theme Translations ---

/**
 * Get the translated options for a theme based on current language
 * @param {Object} theme - The theme object with translations array
 * @param {string} currentLocale - Current language code (e.g., 'sq', 'en')
 * @returns {Object} - Translated options or fallback to default options
 */
export function getThemeOptions(theme, currentLocale) {
  if (!theme || !theme.translations || !Array.isArray(theme.translations)) {
    // No translations available, return the default options
    return theme?.options || {};
  }

  // Find translation for current locale
  const translation = theme.translations.find(
    (t) => t.locale === currentLocale
  );

  if (translation && translation.options) {
    return translation.options;
  }

  // Fallback to default options
  return theme?.options || {};
}

/**
 * Get translated title from theme options
 * @param {Object} theme - The theme object
 * @param {string} currentLocale - Current language code
 * @returns {string} - Translated title
 */
export function getThemeTitle(theme, currentLocale) {
  const options = getThemeOptions(theme, currentLocale);
  return options.title || theme?.name || "";
}

/**
 * Get translated HTML content from theme options
 * @param {Object} theme - The theme object
 * @param {string} currentLocale - Current language code
 * @returns {string} - Translated HTML content
 */
export function getThemeHtml(theme, currentLocale) {
  const options = getThemeOptions(theme, currentLocale);
  return options.html || "";
}

/**
 * Get translated CSS content from theme options
 * @param {Object} theme - The theme object
 * @param {string} currentLocale - Current language code
 * @returns {string} - Translated CSS content
 */
export function getThemeCss(theme, currentLocale) {
  const options = getThemeOptions(theme, currentLocale);
  return options.css || "";
}

/**
 * Get translated images array from theme options
 * @param {Object} theme - The theme object
 * @param {string} currentLocale - Current language code
 * @returns {Array} - Translated images array
 */
export function getThemeImages(theme, currentLocale) {
  const options = getThemeOptions(theme, currentLocale);
  return options.images || [];
}

/**
 * Get translated filters from theme options
 * @param {Object} theme - The theme object
 * @param {string} currentLocale - Current language code
 * @returns {Object} - Translated filters object
 */
export function getThemeFilters(theme, currentLocale) {
  const options = getThemeOptions(theme, currentLocale);
  return options.filters || {};
}

/**
 * Get translated footer links from theme options
 * @param {Object} theme - The theme object
 * @param {string} currentLocale - Current language code
 * @returns {Object} - Translated footer links object with column_1 and column_2
 */
export function getThemeFooterLinks(theme, currentLocale) {
  const options = getThemeOptions(theme, currentLocale);
  return {
    column_1: options.column_1 || [],
    column_2: options.column_2 || [],
  };
}

/**
 * Process themes array to get translated options
 * @param {Array} themes - Array of theme objects
 * @param {string} currentLocale - Current language code
 * @returns {Array} - Themes with translated options
 */
export function processThemesWithTranslations(themes, currentLocale) {
  if (!Array.isArray(themes)) return [];

  return themes.map((theme) => ({
    ...theme,
    translatedOptions: getThemeOptions(theme, currentLocale),
    translatedTitle: getThemeTitle(theme, currentLocale),
    translatedHtml: getThemeHtml(theme, currentLocale),
    translatedCss: getThemeCss(theme, currentLocale),
    translatedImages: getThemeImages(theme, currentLocale),
    translatedFilters: getThemeFilters(theme, currentLocale),
    translatedFooterLinks: getThemeFooterLinks(theme, currentLocale),
  }));
}
