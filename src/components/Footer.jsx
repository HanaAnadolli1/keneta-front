// src/components/Footer.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.png";

export default function Footer() {
  const year = new Date().getFullYear();

  // Newsletter state
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const validateEmail = (v) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).toLowerCase());

  async function handleSubscribe(e) {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    if (!validateEmail(email)) {
      setErrorMsg("Ju lutem shkruani një email të vlefshëm.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(
        "https://keneta.laratest-app.com/api/v2/customer/subscription",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ email }),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSuccessMsg(
          data?.message || "You have successfully subscribed to our newsletter."
        );
        setEmail("");
      } else {
        setErrorMsg(
          data?.message ||
            "Nuk u arrit të kryhet abonimi. Ju lutem provoni sërish."
        );
      }
    } catch {
      setErrorMsg("Gabim rrjeti. Ju lutem provoni sërish.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <footer className="bg-white border-t border-[var(--primary)]/20 mt-16">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        {/* Top: Brand + Columns */}
        {/* Make 6 columns on md+, so Newsletter can span 2 */}
        <section className="py-8 grid gap-y-10 gap-x-6 md:gap-x-8 md:grid-cols-6 items-start">
          {/* Brand (2 cols) */}
          <div className="md:col-span-2">
            <Link to="/" className="inline-flex items-center">
              <img src={logo} alt="Keneta Logo" className="w-40 md:w-48" />
            </Link>
            <p className="mt-4 text-sm leading-6 text-[var(--third)]">
              Mjetet dhe pajisjet më të mira për hapësirën tuaj të gjelbër.
            </p>
          </div>

          {/* Nav 1 (1 col) */}
          <nav className="md:col-span-1">
            <h4 className="text-sm font-semibold tracking-wide text-[var(--primary)] mb-3">
              Navigimi
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  to="/products"
                  className="text-[var(--third)] hover:text-[var(--primary)] transition-colors"
                >
                  Produktet
                </Link>
              </li>
              <li>
                <Link
                  to="/brands"
                  className="text-[var(--third)] hover:text-[var(--primary)] transition-colors"
                >
                  Brendet
                </Link>
              </li>
              <li>
                <Link
                  to="/deals"
                  className="text-[var(--third)] hover:text-[var(--primary)] transition-colors"
                >
                  Deals
                </Link>
              </li>
              <li>
                <Link
                  to="/outlet"
                  className="text-[var(--third)] hover:text-[var(--primary)] transition-colors"
                >
                  Outlet
                </Link>
              </li>
            </ul>
          </nav>

          {/* Nav 2 (1 col) */}
          <nav className="md:col-span-1">
            <h4 className="text-sm font-semibold tracking-wide text-[var(--primary)] mb-3">
              Ndihmë
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  to="/shipping"
                  className="text-[var(--third)] hover:text-[var(--primary)] transition-colors"
                >
                  Dërgesat
                </Link>
              </li>
              <li>
                <Link
                  to="/returns"
                  className="text-[var(--third)] hover:text-[var(--primary)] transition-colors"
                >
                  Kthimet & Garancia
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-[var(--third)] hover:text-[var(--primary)] transition-colors"
                >
                  Kontakt
                </Link>
              </li>
              <li>
                <Link
                  to="/faq"
                  className="text-[var(--third)] hover:text-[var(--primary)] transition-colors"
                >
                  Pyetjet e shpeshta
                </Link>
              </li>
            </ul>
          </nav>

          {/* Newsletter (2 cols on md+) */}
          <div className="md:col-span-2 w-full">
            <h4 className="text-sm font-semibold tracking-wide text-[var(--primary)] mb-3">
              Newsletter
            </h4>
            <p className="text-[var(--third)] text-sm mb-3">
              Merrni ofertat dhe të rejat e fundit.
            </p>

            {/* Keep on one line, don't let input shrink, give it a reasonable min width */}
            <form
              onSubmit={handleSubscribe}
              className="flex flex-nowrap items-stretch w-full"
            >
              <label htmlFor="newsletter" className="sr-only">
                Email juaj
              </label>

              <input
                id="newsletter"
                type="email"
                placeholder="Email juaj"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 px-3 rounded-l-xl bg-white outline-none
                           border border-[var(--primary)]/30 focus:border-[var(--primary)]
                           placeholder:text-[var(--third)]/70 text-[var(--primary)] caret-[var(--third)]
                           transition-colors
                           shrink-0 min-w-[260px] md:min-w-[300px] lg:min-w-[310px] flex-1"
              />

              <button
                type="submit"
                disabled={submitting}
                className="shrink-0 h-10 px-4 -ml-px rounded-r-xl text-white text-sm font-medium
                           bg-[var(--secondary)] hover:bg-[var(--third)] transition-colors
                           disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? "Duke u dërguar…" : "Abonohu"}
              </button>
            </form>

            {/* Messages */}
            {successMsg && (
              <p className="mt-2 text-sm text-[var(--primary)]">{successMsg}</p>
            )}
            {errorMsg && (
              <p className="mt-2 text-sm text-red-600">{errorMsg}</p>
            )}
          </div>
        </section>

        {/* Divider */}
        <div className="h-px w-full bg-[var(--primary)]/10" />

        {/* Bottom */}
        <section className="py-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <ul className="flex items-center gap-3">
            <li>
              <a
                href="#"
                aria-label="Facebook"
                className="w-9 h-9 inline-flex items-center justify-center rounded-full
                           border border-[var(--primary)]/20 text-[var(--third)]
                           hover:text-[var(--primary)] hover:border-[var(--primary)]/40
                           hover:bg-[var(--primary)]/5 transition-colors"
              >
                {/* facebook icon */}
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
                className="w-9 h-9 inline-flex items-center justify-center rounded-full
                           border border-[var(--primary)]/20 text-[var(--third)]
                           hover:text-[var(--primary)] hover:border-[var(--primary)]/40
                           hover:bg-[var(--primary)]/5 transition-colors"
              >
                {/* instagram icon */}
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

          <p className="text-xs text-[var(--third)] text-center md:text-left">
            &copy; {year} Keneta. Të gjitha të drejtat e rezervuara.
          </p>
        </section>
      </div>
    </footer>
  );
}
