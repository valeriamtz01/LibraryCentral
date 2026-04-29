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

export function resolveBackendOrigin(): string {
  const baseURL = resolveBaseURL();
  try {
    const url = new URL(baseURL);
    const pathname = url.pathname.replace(/\/+$/, "");
    if (pathname.endsWith("/api")) {
      url.pathname = pathname.slice(0, -"/api".length) || "/";
    }
    url.pathname = url.pathname.replace(/\/+$/, "");
    return url.origin + url.pathname;
  } catch {
    return String(baseURL).replace(/\/+$/, "").replace(/\/api$/, "");
  }
}

export const api = axios.create({
  baseURL: resolveBaseURL(),
  timeout: 10000, // IMPORTANT: prevents infinite "Signing in..." hang
});

// Attach token automatically for every request (if present)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const url = String(config.url || "");
    const isPublicAuthRoute =
      url.includes("/auth/login/") ||
      url.includes("/auth/register/") ||
      url.includes("/health/");

    if (token && !isPublicAuthRoute) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (resp) => resp,
  (error) => {
    const status = error?.response?.status;
    const data = error?.response?.data;
    const code = data?.code;
    const detail = data?.detail;

    if (status === 401 && (code === "token_not_valid" || detail === "Given token not valid for any token type")) {
      try {
        localStorage.removeItem("token");
      } catch {
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);
