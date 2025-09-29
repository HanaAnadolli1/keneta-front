import React from "react";

const ServicesContent = ({ customization }) => {
  if (!customization || customization.type !== "services_content") {
    return null;
  }

  const { services } = customization.options || {};

  if (!services || services.length === 0) {
    return null;
  }

  const getServiceIcon = (iconName) => {
    const iconMap = {
      "icon-truck": "🚚",
      "icon-product": "🔄",
      "icon-dollar-sign": "💳",
      "icon-support": "🛠️",
    };
    return iconMap[iconName] || "⭐";
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {services.map((service, index) => (
          <div key={index} className="text-center p-6 bg-white rounded-lg shadow-sm">
            <div className="text-4xl mb-4">{getServiceIcon(service.service_icon)}</div>
            <h3 className="text-lg font-semibold text-[var(--primary)] mb-2">
              {service.title}
            </h3>
            <p className="text-[var(--third)] text-sm">
              {service.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServicesContent;
