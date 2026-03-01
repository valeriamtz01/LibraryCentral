import axios from "axios";

/**
 * Axios instance used by the entire frontend.
 * - baseURL comes from VITE_API_BASE_URL or defaults to local Django server
 * - request interceptor attaches JWT token automatically
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000",
});

// Attach token automatically for every request (if present)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    // If user is logged in, send: Authorization: Bearer <token>
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);