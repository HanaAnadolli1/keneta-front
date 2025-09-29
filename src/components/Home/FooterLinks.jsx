import React from "react";

const FooterLinks = ({ customization }) => {
  if (!customization || customization.type !== "footer_links") {
    return null;
  }

  const { column_1, column_2 } = customization.options || {};

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Column 1 */}
        {column_1 && column_1.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-[var(--primary)] mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {column_1.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.url}
                    className="text-[var(--third)] hover:text-[var(--secondary)] transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {link.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Column 2 */}
        {column_2 && column_2.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-[var(--primary)] mb-4">Policies</h3>
            <ul className="space-y-2">
              {column_2.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.url}
                    className="text-[var(--third)] hover:text-[var(--secondary)] transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {link.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default FooterLinks;
