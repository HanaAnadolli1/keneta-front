import React from "react";

/**
 * Basic site footer with white background and your custom palette.
 */
export default function Footer() {
  return (
    <footer className="bg-white border-t border-[#1a3c5c] mt-16">
      <div className="max-w-7xl mx-auto px-4 py-10 grid gap-8 md:grid-cols-3">
        {/* Company description */}
        <div>
          <h3 className="text-lg font-semibold text-[#132232] mb-4">Keneta</h3>
          <p className="text-sm text-[#152a41]">
            Mjetet dhe pajisjet më të mira për hapësirën tuaj të gjelbër.
          </p>
        </div>

        {/* Navigation */}
        <div>
          <h4 className="text-sm font-semibold text-[#132232] mb-2">
            Navigimi
          </h4>
          <ul className="space-y-2 text-sm text-[#152a41]">
            <li>
              <a
                href="/products"
                className="hover:underline hover:text-[#1d446b]"
              >
                Produktet
              </a>
            </li>
            <li>
              <a
                href="/brands"
                className="hover:underline hover:text-[#1d446b]"
              >
                Brendet
              </a>
            </li>
            <li>
              <a href="#" className="hover:underline hover:text-[#1d446b]">
                Kontakt
              </a>
            </li>
          </ul>
        </div>

        {/* Social links */}
        <div>
          <h4 className="text-sm font-semibold text-[#132232] mb-2">
            Na ndiqni
          </h4>
          <ul className="flex space-x-4">
            <li>
              <a
                href="#"
                aria-label="Facebook"
                className="text-[#152a41] hover:text-[#1a3c5c]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54v-2.89h2.54V9.845c0-2.507 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.772-1.63 1.562v1.875h2.773l-.443 2.89h-2.33v6.987C18.343 21.128 22 16.991 22 12" />
                </svg>
              </a>
            </li>
            <li>
              <a
                href="#"
                aria-label="Instagram"
                className="text-[#152a41] hover:text-[#1a3c5c]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path d="M7 2C4.243 2 2 4.243 2 7v10c0 2.757 2.243 5 5 5h10c2.757 0 5-2.243 5-5V7c0-2.757-2.243-5-5-5H7zm10 2c1.654 0 3 1.346 3 3v10c0 1.654-1.346 3-3 3H7c-1.654 0-3-1.346-3-3V7c0-1.654 1.346-3 3-3h10zm-5 3a5 5 0 100 10 5 5 0 000-10zm0 2a3 3 0 110 6 3 3 0 010-6zm4.5-.5a1 1 0 100 2 1 1 0 000-2z" />
                </svg>
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[#1a3c5c] py-4 text-center text-xs text-[#152a41]">
        &copy; {new Date().getFullYear()} Keneta. Të gjitha të drejtat e
        rezervuara.
      </div>
    </footer>
  );
}
