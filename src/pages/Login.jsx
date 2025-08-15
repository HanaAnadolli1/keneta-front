// src/pages/Login.jsx
import React, { useState, useContext, useMemo } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { login as apiLogin } from "../api/auth";
import { AuthContext } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login: setUser } = useContext(AuthContext);
  const { refreshWishlist } = useWishlist(); // refresh badge instantly after login

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Read & sanitize ?redirect=...
  const redirectParam = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const raw = params.get("redirect") || "";
    try {
      // Only allow in‑app paths to prevent open redirects
      // Accept things like "/p/slug?tab=reviews#reviews"
      const decoded = decodeURIComponent(raw);
      if (decoded.startsWith("/")) return decoded;
      return ""; // fallback (home) if invalid or external
    } catch {
      return "";
    }
  }, [location.search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // apiLogin persists token to storage and configures axios headers
      const result = await apiLogin({ email, password });
      const user = result?.data ?? result?.user ?? result;

      // Update AuthContext
      setUser(user);

      // Immediate wishlist refresh (optional)
      await refreshWishlist().catch(() => {});

      // Go back to the product/reviews if provided, otherwise home
      if (redirectParam) {
        navigate(redirectParam, { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 text-center">Login</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 text-sm">Email</label>
          <input
            type="email"
            className="w-full border rounded p-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div>
          <label className="block mb-1 text-sm">Password</label>
          <input
            type="password"
            className="w-full border rounded p-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          className="w-full bg-[#0b2d39] text-white py-2 rounded"
          disabled={loading}
        >
          {loading ? "Loading…" : "Login"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm">
        Don’t have an account?{" "}
        <Link
          to={
            redirectParam
              ? `/register?redirect=${encodeURIComponent(redirectParam)}`
              : "/register"
          }
          className="text-blue-600"
        >
          Register
        </Link>
      </p>
    </div>
  );
}
