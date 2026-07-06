import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      const token = localStorage.getItem("healthchain_token");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get("/me");
        setUser(data.user);
        localStorage.setItem("healthchain_user", JSON.stringify(data.user));
      } catch {
        localStorage.removeItem("healthchain_token");
        localStorage.removeItem("healthchain_user");
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []);

  async function login(credentials) {
    const { data } = await api.post("/login", credentials);
    localStorage.setItem("healthchain_token", data.token);
    localStorage.setItem("healthchain_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  async function register(payload) {
    const { data } = await api.post("/register", payload);
    localStorage.setItem("healthchain_token", data.token);
    localStorage.setItem("healthchain_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    // Log the logout event server-side before clearing the token
    try { await api.post("/logout"); } catch { /* ignore — token may already be invalid */ }
    localStorage.removeItem("healthchain_token");
    localStorage.removeItem("healthchain_user");
    setUser(null);
  }

  function updateUser(patch) {
    setUser((prev) => {
      const updated = { ...prev, ...patch };
      localStorage.setItem("healthchain_user", JSON.stringify(updated));
      return updated;
    });
  }

  const value = useMemo(
    () => ({ user, login, register, logout, updateUser, loading, isAuthenticated: Boolean(user) }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
