import React, { createContext, useState, useEffect } from "react";
import axios from "../api/axios";
import { fetchCurrentUser } from "../api/auth";

export const AuthContext = createContext({
  currentUser: null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }) {
  // Initialize user from localStorage
  const [currentUser, setCurrentUser] = useState(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });

  // Log in: set user and persist token for axios
  const login = (user) => {
    setCurrentUser(user);
    localStorage.setItem("user", JSON.stringify(user));
    const token = localStorage.getItem("token");
    if (token) {
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
    }
  };

  // Log out: clear user and remove token/header
  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    delete axios.defaults.headers.common.Authorization;
  };

  // On mount: rehydrate axios header and fetch current user if missing
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token && !currentUser) {
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
      fetchCurrentUser()
        .then((user) => {
          setCurrentUser(user);
          localStorage.setItem("user", JSON.stringify(user));
        })
        .catch(() => logout());
    }
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
