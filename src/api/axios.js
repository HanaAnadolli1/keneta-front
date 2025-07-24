// src/api/axios.js
import axios from "axios";
import { API_V1 } from "./config";

const instance = axios.create({
  baseURL: API_V1,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  withCredentials: true, // for cookie-based auth if needed
});

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

export default instance;
