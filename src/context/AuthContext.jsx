import React, { createContext, useState, useEffect } from "react";
import axios from "../api/axios";
import { fetchCurrentUser } from "../api/auth";

export const AuthContext = createContext({
  currentUser: null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }) {
  // Initialize from localStorage
  const [currentUser, setCurrentUser] = useState(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });

  // Log in: save user + persist
  const login = (user) => {
    setCurrentUser(user);
    localStorage.setItem("user", JSON.stringify(user));
  };

  // Log out: clear storage + header
  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    delete axios.defaults.headers.common.Authorization;
  };

  // On mount: if token but no user, fetch /me
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token && !currentUser) {
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
      fetchCurrentUser()
        .then((user) => {
          setCurrentUser(user);
          localStorage.setItem("user", JSON.stringify(user));
        })
        .catch(logout);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
