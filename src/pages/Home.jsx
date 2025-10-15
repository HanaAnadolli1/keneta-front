import React from "react";
import { useQuery } from "@tanstack/react-query";

import Carousel from "../components/Home/Carousel";
import Offers from "../components/Home/Offers";
import Categories from "../components/Home/Categories";
import DealsCarousel from "../components/Home/DealsCarousel";
import ThemeRenderer from "../components/Home/ThemeRenderer";

function useThemeCustomizations() {
  return useQuery({
    queryKey: ["home", "themeCustomizations"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch(
        "https://admin.keneta-ks.com/api/v2/theme/customizations"
      );
      if (!res.ok) throw new Error("network");
      const json = await res.json();

      const items = Array.isArray(json?.data) ? json.data : [];

      // Filter active customizations and sort by sort_order
      const activeCustomizations = items
        .filter((x) => Number(x?.status) === 1)
        .sort(
          (a, b) => Number(a?.sort_order ?? 0) - Number(b?.sort_order ?? 0)
        );

      // Extract image carousels and group them intelligently
      const imageCarousels = activeCustomizations
        .filter((x) => x?.type === "image_carousel")
        .map((x) => {
          const translated =
            x?.translations?.[0]?.options?.images ?? x?.options?.images ?? [];
          return {
            id: x.id,
            name: x.name,
            sort_order: Number(x?.sort_order ?? 0),
            images: translated.map((img) => ({
              image: img?.image ?? "",
              title: img?.title ?? "",
              subtitle: img?.subtitle ?? "",
              link: img?.link ?? "",
            })),
          };
        })
        .sort((a, b) => a.sort_order - b.sort_order);

      // Group consecutive image carousels
      const groupedCarousels = [];
      let currentGroup = [];

      imageCarousels.forEach((carousel, index) => {
        const nextCarousel = imageCarousels[index + 1];

        currentGroup.push(carousel);

        // If this is the last carousel or the next one is not consecutive
        if (
          !nextCarousel ||
          nextCarousel.sort_order !== carousel.sort_order + 1
        ) {
          groupedCarousels.push([...currentGroup]);
          currentGroup = [];
        }
      });

      return {
        customizations: activeCustomizations,
        groupedCarousels: groupedCarousels,
        imageCarousels: imageCarousels,
      };
    },
  });
}

export default function Home() {
  const { data, isLoading, error } = useThemeCustomizations();
  const groupedCarousels = data?.groupedCarousels ?? [];
  const customizations = data?.customizations ?? [];
  const imageCarousels = data?.imageCarousels ?? [];

  return (
    <div>
      {error ? (
        <div className="p-8 text-red-600">
          Failed to load theme customizations.
        </div>
      ) : (
        <>
          {/* Render all customizations in sort_order sequence */}
          {customizations
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
            .map((customization) => {
              // Handle image carousels with smart grouping
              if (customization.type === "image_carousel") {
                // Find if this carousel is part of a group
                const carouselIndex = imageCarousels.findIndex(
                  (c) => c.id === customization.id
                );
                if (carouselIndex === -1) return null;

                const carousel = imageCarousels[carouselIndex];
                const nextCarousel = imageCarousels[carouselIndex + 1];
                const prevCarousel = imageCarousels[carouselIndex - 1];

                // Check if this is the first carousel in a group
                const isFirstInGroup =
                  !prevCarousel ||
                  prevCarousel.sort_order !== carousel.sort_order - 1;

                // Only render if this is the first carousel in a group
                if (!isFirstInGroup) return null;

                // Determine if this is a single carousel or part of a pair
                const isGrouped =
                  nextCarousel &&
                  nextCarousel.sort_order === carousel.sort_order + 1;

                return (
                  <section
                    key={customization.id}
                    className="w-full px-4 md:px-6 lg:px-8 py-4"
                  >
                    <div className="max-w-7xl mx-auto">
                      {isGrouped ? (
                        // Two carousels side by side (2x1 layout)
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-2">
                            <Carousel
                              slides={carousel.images || []}
                              className="h-[420px] md:h-[560px]"
                              buttonAlign="left"
                            />
                          </div>
                          <div className="hidden md:block md:col-span-1">
                            <Carousel
                              slides={nextCarousel.images || []}
                              className="h-[420px] md:h-[560px]"
                              buttonAlign="center"
                            />
                          </div>
                        </div>
                      ) : (
                        // Single carousel full width
                        <div className="w-full">
                          <Carousel
                            slides={carousel.images || []}
                            className="h-[420px] md:h-[560px]"
                            buttonAlign="center"
                          />
                        </div>
                      )}
                    </div>
                  </section>
                );
              }

              // Handle all other customization types
              return (
                <ThemeRenderer
                  key={customization.id}
                  customization={customization}
                />
              );
            })}
        </>
      )}
    </div>
  );
}
