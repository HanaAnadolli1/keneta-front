import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Products from "./pages/Products";
import Home from "./pages/Home";
import Brands from "./pages/Brands";
import ProductDetails from "./pages/ProductDetails";
import Login from "./pages/Login";
import Register from "./pages/Register";
import "./index.css";
import Checkout from "./pages/Checkout";
import Wishlist from "./components/Wishlist";
import ComparePage from "./pages/ComparePage";

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
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:url_key" element={<ProductDetails />} />
        <Route path="/brands" element={<Brands />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
    </Router>
  );
}
