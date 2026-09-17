// Small fetch wrapper. Adds the JWT to every request and unwraps the JSON response.
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export function getToken() {
  return localStorage.getItem("token");
}

async function request(path, options = {}) {
  const token = getToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  let body = null;
  try {
    body = await res.json();
  } catch (e) {
    body = null;
  }

  if (!res.ok) {
    // Token expired or invalid -> force a fresh login
    if (res.status === 401 && token) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
    throw new Error((body && body.message) || `Request failed (${res.status})`);
  }

  return body;
}

export const api = {
  get: (path) => request(path),
  post: (path, data) => request(path, { method: "POST", body: JSON.stringify(data || {}) }),
  patch: (path, data) => request(path, { method: "PATCH", body: JSON.stringify(data || {}) }),
};
