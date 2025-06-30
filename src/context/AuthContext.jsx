import React, { createContext, useState, useEffect } from "react";

// 1) Create the Context
export const AuthContext = createContext({
  currentUser: null,
  login: () => {},
  logout: () => {},
});

// 2) Provide it
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);

  // (optional) On mount, you could check localStorage / cookie
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("user"));
    if (stored) setCurrentUser(stored);
  }, []);

  const login = (userData) => {
    setCurrentUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
