import React, { createContext, useState, useEffect } from "react";
import { login as fetchCurrentUser } from "../api/auth"; // you could add a dedicated fetchCurrentUser
import axios from "../api/axios";

export const AuthContext = createContext({
  currentUser: null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }) {
  // 1️⃣ Load initial user from localStorage
  const [currentUser, setCurrentUser] = useState(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });

  // 2️⃣ login() sets state + storage
  const login = (user) => {
    setCurrentUser(user);
    localStorage.setItem("user", JSON.stringify(user));
  };

  // 3️⃣ logout() clears everything
  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    delete axios.defaults.headers.common.Authorization;
  };

  // 4️⃣ On mount: if token exists but no user, fetch /me
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
