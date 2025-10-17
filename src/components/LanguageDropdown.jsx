import React, { useState, useRef, useEffect } from "react";
import { FiChevronDown, FiGlobe } from "react-icons/fi";
import { useLanguage } from "../context/LanguageContext";
import { useLocales } from "../api/hooks";

const LanguageDropdown = () => {
  const { language, changeLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { data: locales, isLoading, error } = useLocales();

  // Fallback languages if API fails
  const fallbackLanguages = [
    { code: "sq", name: "Shqip" },
    { code: "en", name: "English" },
  ];

  const languages = locales || fallbackLanguages;
  const currentLanguage = languages.find((lang) => lang.code === language);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLanguageChange = (langCode) => {
    changeLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3  text-sm font-medium text-white focus:outline-none rounded-md transition-colors duration-200"
        aria-label="Select language"
      >
        <FiGlobe className="w-4 h-4" />
        <span className="hidden md:inline">{currentLanguage?.name}</span>
        <FiChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              Loading languages...
            </div>
          ) : error ? (
            <div className="px-4 py-3 text-sm text-red-500 text-center">
              Failed to load languages
            </div>
          ) : (
            languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-gray-50 transition-colors duration-200 ${
                  language === lang.code
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700"
                }`}
              >
                <span className="font-medium">{lang.name}</span>
                {language === lang.code && (
                  <span className="ml-auto text-blue-600">✓</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default LanguageDropdown;
