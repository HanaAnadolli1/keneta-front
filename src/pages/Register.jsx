import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register as apiRegister } from "../api/auth";
import { AuthContext } from "../context/AuthContext";

export default function Register() {
  const navigate = useNavigate();
  const { login: setUser } = useContext(AuthContext);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    password_confirmation: "",
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // ← fixed spread operator here
  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await apiRegister(form);
      setUser(user);
      navigate("/");
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 text-center">Register</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* First Name */}
        <div>
          <label className="block mb-1 text-sm">First Name</label>
          <input
            name="first_name"
            className="w-full border rounded p-2"
            value={form.first_name}
            onChange={handleChange}
            required
          />
        </div>
        {/* Last Name */}
        <div>
          <label className="block mb-1 text-sm">Last Name</label>
          <input
            name="last_name"
            className="w-full border rounded p-2"
            value={form.last_name}
            onChange={handleChange}
            required
          />
        </div>
        {/* Email */}
        <div>
          <label className="block mb-1 text-sm">Email</label>
          <input
            type="email"
            name="email"
            className="w-full border rounded p-2"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>
        {/* Password */}
        <div>
          <label className="block mb-1 text-sm">Password</label>
          <input
            type="password"
            name="password"
            className="w-full border rounded p-2"
            value={form.password}
            onChange={handleChange}
            required
          />
        </div>
        {/* Confirm Password */}
        <div>
          <label className="block mb-1 text-sm">Confirm Password</label>
          <input
            type="password"
            name="password_confirmation"
            className="w-full border rounded p-2"
            value={form.password_confirmation}
            onChange={handleChange}
            required
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          className="w-full bg-[#0b2d39] text-white py-2 rounded"
          disabled={loading}
        >
          {loading ? "Loading…" : "Register"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm">
        Already have an account?{" "}
        <Link to="/login" className="text-blue-600">
          Login
        </Link>
      </p>
    </div>
  );
}
