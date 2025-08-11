// src/pages/Login.jsx
import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login as apiLogin } from "../api/auth";
import { AuthContext } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";

export default function Login() {
  const navigate = useNavigate();
  const { login: setUser } = useContext(AuthContext);
  const { refreshWishlist } = useWishlist(); // refresh badge instantly after login

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // apiLogin persists token to localStorage and sets axios Authorization header
      const result = await apiLogin({ email, password });
      const user = result?.data ?? result?.user ?? result;

      // Update AuthContext (leave AuthContext code as-is)
      setUser(user);

      // Trigger immediate wishlist refresh (Provider will have auto-merged guest list)
      await refreshWishlist().catch(() => {});

      navigate("/");
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
        <Link to="/register" className="text-blue-600">
          Register
        </Link>
      </p>
    </div>
  );
}
