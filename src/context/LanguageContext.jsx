import React, { createContext, useContext, useState, useEffect } from "react";

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState("sq"); // Default to Albanian
  const [translations, setTranslations] = useState({});

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem("keneta-language");
    if (savedLanguage && ["sq", "en"].includes(savedLanguage)) {
      setLanguage(savedLanguage);
    }
  }, []);

  // Load translations when language changes
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const translationModule = await import(`../locales/${language}.json`);
        setTranslations(translationModule.default);
      } catch (error) {
        console.error(`Failed to load translations for ${language}:`, error);
        // Fallback to Albanian if loading fails
        if (language !== "sq") {
          const fallbackModule = await import("../locales/sq.json");
          setTranslations(fallbackModule.default);
        }
      }
    };

    loadTranslations();
  }, [language]);

  const changeLanguage = (newLanguage) => {
    if (["sq", "en"].includes(newLanguage)) {
      setLanguage(newLanguage);
      localStorage.setItem("keneta-language", newLanguage);
    }
  };

  const t = (key, fallback = "") => {
    const keys = key.split(".");
    let value = translations;

    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k];
      } else {
        return fallback || key;
      }
    }

    return typeof value === "string" ? value : fallback || key;
  };

  const value = {
    language,
    changeLanguage,
    t,
    translations,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
