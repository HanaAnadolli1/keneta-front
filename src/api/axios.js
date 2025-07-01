import axios from "axios";
import { API_V1 } from "./config";

const instance = axios.create({
  baseURL: API_V1,
  headers: { Accept: "application/json" },
});

// Add existing token if available
const token = localStorage.getItem("token");
if (token) {
  instance.defaults.headers.common.Authorization = `Bearer ${token}`;
}

export default instance;
