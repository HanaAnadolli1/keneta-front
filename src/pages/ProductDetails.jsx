// src/pages/ProductDetails.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { useCartMutations } from "../api/hooks";
import { useToggleWishlist } from "../api/wishlist"; // ✅ ADD
import { API_V1 } from "../api/config";
import ImageGallery from "react-image-gallery";
import "react-image-gallery/styles/css/image-gallery.css";
import "../custom.css";

export default function ProductDetails() {
  const { url_key } = useParams();
  const { addItem } = useCartMutations();
  const toggleWishlist = useToggleWishlist(); // ✅ ADD

  const galleryRef = useRef();
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch(`${API_V1}/products?url_key=${url_key}`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json = await res.json();
        if (!Array.isArray(json?.data) || json.data.length === 0) {
          throw new Error("Product not found");
        }
        if (!ignore) {
          setProduct(json.data[0]);
        }
      } catch (e) {
        if (!ignore) setError(e.message);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [url_key]);

  const handleAdd = async () => {
    if (!product || qty < 1) return;
    setBusy(true);
    try {
      await addItem.mutateAsync({ productId: product.id, quantity: qty });
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (e) {
      alert("Failed to add to cart: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const galleryImages =
    product?.images?.length > 0
      ? product.images.map((img) => ({
          original: img.original_image_url,
          thumbnail: img.small_image_url || img.medium_image_url,
        }))
      : product?.base_image?.original_image_url
      ? [
          {
            original: product.base_image.original_image_url,
            thumbnail:
              product.base_image.small_image_url ||
              product.base_image.medium_image_url,
          },
        ]
      : [];

  const onThumbnailClick = (index) => {
    setSelectedIndex(index);
    galleryRef.current?.slideToIndex(index);
  };

  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!product) return <div className="p-8">Loading…</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex flex-col lg:flex-row gap-10">
        <div className="w-full lg:w-1/2 flex gap-4">
          {!isMobile && galleryImages.length > 1 && (
            <div className="flex flex-col gap-4">
              {galleryImages.map((img, idx) => (
                <img
                  key={idx}
                  src={img.thumbnail}
                  alt={`Thumbnail ${idx + 1}`}
                  onClick={() => onThumbnailClick(idx)}
                  className={`w-20 h-20 object-contain border rounded-lg cursor-pointer ${
                    selectedIndex === idx ? "ring-2 ring-indigo-600" : ""
                  }`}
                />
              ))}
            </div>
          )}
          <div className="flex-1">
            <ImageGallery
              ref={galleryRef}
              items={galleryImages}
              startIndex={selectedIndex}
              showThumbnails={false}
              showPlayButton={false}
              showFullscreenButton={false}
              showNav={false}
              showBullets={isMobile}
              additionalClass="custom-gallery"
              onClick={() => setIsFullscreen(true)}
            />
          </div>
        </div>

        <div className="w-full lg:w-1/2 flex flex-col space-y-4">
          <h1 className="text-3xl font-semibold">{product.name}</h1>
          <div
            className="text-gray-500"
            dangerouslySetInnerHTML={{ __html: product.short_description }}
          />
          <div className="text-2xl font-bold text-black">
            {product.formatted_price}
          </div>

          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center border rounded-md">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="px-3 py-1 text-lg"
              >
                −
              </button>
              <div className="px-4 py-1 w-10 text-center">{qty}</div>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="px-3 py-1 text-lg"
              >
                +
              </button>
            </div>
            <button
              onClick={handleAdd}
              disabled={busy}
              className="border border-indigo-600 text-indigo-600 px-6 py-2 rounded hover:bg-indigo-50 disabled:opacity-50"
            >
              {busy ? "Adding…" : "Add To Cart"}
            </button>
            <button
              onClick={() => toggleWishlist.mutate(product.id)} // ✅ ADD
              className="border border-pink-500 text-pink-500 px-6 py-2 rounded hover:bg-pink-50"
            >
              ♥ Wishlist
            </button>
          </div>

          {added && (
            <div className="text-green-600 text-sm mt-2">
              Product added to cart!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
