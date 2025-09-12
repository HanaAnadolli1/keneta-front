import React from "react";
import { useQuery } from "@tanstack/react-query";

import Carousel from "../components/Home/Carousel";
import Offers from "../components/Home/Offers";
import Categories from "../components/Home/Categories";
import DealsCarousel from "../components/Home/DealsCarousel";

function useHeroCarousels() {
  return useQuery({
    queryKey: ["home", "heroCarousels"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch(
        "https://keneta.laratest-app.com/api/v2/theme/customizations"
      );
      if (!res.ok) throw new Error("network");
      const json = await res.json();

      const items = Array.isArray(json?.data) ? json.data : [];

      const imageCarousels = items
        .filter((x) => x?.type === "image_carousel" && Number(x?.status) === 1)
        .map((x) => {
          const translated =
            x?.translations?.[0]?.options?.images ?? x?.options?.images ?? [];
          return {
            sort_order: Number(x?.sort_order ?? 0),
            images: translated.map((img) => ({
              image: img?.image ?? "",
              title: img?.title ?? "",
              subtitle: img?.subtitle ?? "",
              link: img?.link ?? "",
            })),
          };
        });

      const byOrder = (n) =>
        imageCarousels.find((c) => c.sort_order === n)?.images ?? [];

      return {
        leftSlides: byOrder(1), // 2/3 width
        rightSlides: byOrder(2), // 1/3 width
      };
    },
  });
}

export default function Home() {
  const { data, isLoading, error } = useHeroCarousels();
  const leftSlides = data?.leftSlides ?? [];
  const rightSlides = data?.rightSlides ?? [];

  return (
    <div>
      {error ? (
        <div className="p-8 text-red-600">Failed to load hero images.</div>
      ) : (
        <section className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Left (2/3) */}
            {(leftSlides.length > 0 || isLoading) && (
              <div className="md:col-span-2">
                <Carousel
                  slides={isLoading ? [] : leftSlides}
                  className="h-[420px] md:h-[560px]"
                  buttonAlign="left"
                />
              </div>
            )}

            {/* Right (1/3) */}
            {(rightSlides.length > 0 || isLoading) && (
              <div className="md:col-span-1">
                <Carousel
                  slides={isLoading ? [] : rightSlides}
                  className="h-[420px] md:h-[560px]"
                  buttonAlign="center"
                />
              </div>
            )}
          </div>
        </section>
      )}

      <Offers />
      <Categories />
      <DealsCarousel />
    </div>
  );
}
