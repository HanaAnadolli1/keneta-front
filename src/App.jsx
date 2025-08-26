import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Header from "./components/Header";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetails from "./pages/ProductDetails";
import Brands from "./pages/Brands";
import Checkout from "./pages/Checkout";
import Wishlist from "./components/Wishlist";
import ComparePage from "./pages/ComparePage";
import Login from "./pages/Login";
import Register from "./pages/Register";

import useLoadColors from "./hooks/useLoadColors";

// Account (protected) routes + layout
import ProtectedRoute from "./routes/ProtectedRoute";
import AccountShell from "./components/account/AccountShell";
import Profile from "./pages/account/Profile";
import Orders from "./pages/account/Orders";
import OrderDetail from "./pages/account/OrderDetail";

import "./index.css";

function NotFound() {
  return (
    <div className="container mx-auto px-4 py-10 text-center">
      <h2 className="text-2xl font-semibold">404 - Page Not Found</h2>
      <p className="mt-4 text-gray-600">
        Sorry, we couldn’t find the page you’re looking for.
      </p>
    </div>
  );
}

export default function App() {
  // Load & apply CSS vars from API
  useLoadColors();

  return (
    <Router>
      <Header />

      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:url_key" element={<ProductDetails />} />
        <Route path="/brands" element={<Brands />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Account area */}
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <AccountShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Profile />} />
          <Route path="profile" element={<Profile />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderDetail />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      <Footer />
    </Router>
  );
}
