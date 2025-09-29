import React, { useEffect, useState } from "react";
import TopCollections from "../components/Home/TopCollections";

const ExampleTopCollections = () => {
  const [customization, setCustomization] = useState(null);

  useEffect(() => {
    const fetchTopCollections = async () => {
      try {
        const res = await fetch(
          "https://admin.keneta-ks.com/api/v2/theme/customizations"
        );
        const json = await res.json();

        // Find the "Top Collections" customization (sort_order = 5)
        const topCollections = json.data.find(
          (item) => 
            item.type === "static_content" && 
            item.name === "Top Collections" &&
            item.sort_order === 5
        );

        if (topCollections) {
          setCustomization(topCollections);
        }
      } catch (error) {
        console.error("Error fetching top collections:", error);
      }
    };

    fetchTopCollections();
  }, []);

  return (
    <div>
      <h1>Top Collections Example</h1>
      <TopCollections customization={customization} />
    </div>
  );
};

export default ExampleTopCollections;
