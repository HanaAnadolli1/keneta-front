import React from "react";
import { useQuery } from "@tanstack/react-query";

import Carousel from "../components/Home/Carousel";
import Offers from "../components/Home/Offers";
import Categories from "../components/Home/Categories";
import DealsCarousel from "../components/Home/DealsCarousel";

function useHeroSlides() {
  return useQuery({
    queryKey: ["home", "heroSlides"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch(
        "https://keneta.laratest-app.com/api/v1/theme/customizations"
      );
      if (!res.ok) throw new Error("network");
      const json = await res.json();

      const block = json.data.find((item) => item.type === "image_carousel");
      const images = block?.options?.images ?? [];

      return images.map((img) => ({
        ...img,
        subtitle: "Smart tools for a thriving green space", 
      }));
    },
  });
}

export default function Home() {
  const { data: slides = [], isLoading, error } = useHeroSlides();

  return (
    <div>
      {error ? (
        <div className="p-8 text-red-600">Failed to load hero images.</div>
      ) : (
        <Carousel slides={isLoading ? [] : slides} />
      )}

      <Offers />
      <Categories />
      <DealsCarousel />
    </div>
  );
}
