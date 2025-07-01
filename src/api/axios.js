// src/api/axios.js
import axios from "axios";
import { API_V1 } from "./config";

// baseURL points to your Laravel API
const instance = axios.create({
  baseURL: API_V1,
  headers: { Accept: "application/json" },
});

// if there’s already a stored token, send it on every request
const token = localStorage.getItem("token");
if (token) {
  instance.defaults.headers.common.Authorization = `Bearer ${token}`;
}

export default instance;
