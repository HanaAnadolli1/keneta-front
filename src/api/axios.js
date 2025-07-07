// src/api/axios.js
import axios from "axios";
import { API_V1 } from "./config";

// Create an axios instance preconfigured for your API
const instance = axios.create({
  baseURL: API_V1,
  headers: { Accept: "application/json" },
});

if (typeof window !== "undefined") {
  const token = localStorage.getItem("token");
  if (token) {
    instance.defaults.headers.common.Authorization = `Bearer ${token}`;
  }
}

export default instance;
