// src/api/axios.js
import axios from "axios";
import { API_V1 } from "./config";

// Create an axios instance preconfigured for your API
const instance = axios.create({
  baseURL: API_V1,
  headers: { Accept: "application/json" },
});

// If there's already a token in localStorage, send it on every request
const token = localStorage.getItem("token");
if (token) {
  instance.defaults.headers.common.Authorization = `Bearer ${token}`;
}

export default instance;
