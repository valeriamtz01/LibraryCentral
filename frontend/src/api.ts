import axios from "axios";

/**
 * Decide the correct API base URL in a way that works for:
 * 1) Codespaces (frontend on https://...-5173.app.github.dev, backend on ...-8000...)
 * 2) Local dev (http://127.0.0.1:8000)
 */
function resolveBaseURL(): string {
  const env = import.meta.env.VITE_API_BASE_URL;
  if (env) return env;

  // Codespaces: auto-map the FE port host (...-5173.app.github.dev) to backend port host (...-8000.app.github.dev)
  if (typeof window !== "undefined") {
    const host = window.location.host; // e.g. psychic-goldfish-...-5173.app.github.dev
    const codespacesMatch = host.match(/^(.*)-\d+\.app\.github\.dev$/);

    if (codespacesMatch) {
      const prefix = codespacesMatch[1]; // everything before -5173
      return `https://${prefix}-8000.app.github.dev/api`;
    }
  }

  // Local fallback
  return "http://127.0.0.1:8000/api";
}

export const api = axios.create({
  baseURL: resolveBaseURL(),
  timeout: 10000, // IMPORTANT: prevents infinite "Signing in..." hang
});

// Attach token automatically for every request (if present)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);