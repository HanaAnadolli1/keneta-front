import React, { createContext, useState, useEffect } from "react";
import axios from "../api/axios";
import { fetchCurrentUser } from "../api/auth";

const AUTO_LOGOUT_MS = 30 * 60 * 1000;

export const AuthContext = createContext({
  currentUser: null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });

  const signalAuthChanged = () => {
    // let listeners (WishlistContext, etc.) know auth changed
    window.dispatchEvent(new Event("auth-changed"));
  };

  const login = (user) => {
    setCurrentUser(user);
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("lastActivity", Date.now().toString());
    const token = localStorage.getItem("token");
    if (token) {
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
    }
    signalAuthChanged();
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("lastActivity");
    delete axios.defaults.headers.common.Authorization;
    signalAuthChanged();
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token && !currentUser) {
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
      fetchCurrentUser()
        .then((user) => {
          setCurrentUser(user);
          localStorage.setItem("user", JSON.stringify(user));
          signalAuthChanged();
        })
        .catch(() => logout());
    }
  }, []);

  // Auto logout
  useEffect(() => {
    if (!currentUser) return;

    const updateActivity = () =>
      localStorage.setItem("lastActivity", Date.now().toString());

    const checkTimeout = () => {
      const last = parseInt(localStorage.getItem("lastActivity"), 10);
      if (last && Date.now() - last > AUTO_LOGOUT_MS) {
        logout();
      }
    };

    updateActivity();
    window.addEventListener("mousemove", updateActivity);
    window.addEventListener("keydown", updateActivity);
    window.addEventListener("click", updateActivity);
    const interval = setInterval(checkTimeout, 60000);

    return () => {
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keydown", updateActivity);
      window.removeEventListener("click", updateActivity);
      clearInterval(interval);
    };
  }, [currentUser]);

  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
