// src/components/WishlistPDFButton.jsx
import React, { useState } from "react";
import { downloadWishlistPDF } from "../utils/downloadWishlistPDF";

// Lightweight JWT decoder (no verification), for name/email display
function decodeJWT(token) {
  try {
    const [, payload] = token.split(".");
    // base64url -> base64
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(b64);
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

export default function WishlistPDFButton({ targetRef }) {
  const [busy, setBusy] = useState(false);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const claims = token ? decodeJWT(token) : null;

  const customer = {
    name:
      claims?.name ||
      [claims?.first_name, claims?.last_name].filter(Boolean).join(" ") ||
      "Guest",
    email: claims?.email || "-",
  };

  const handleDownload = async () => {
    if (!targetRef?.current) return;
    setBusy(true);

    // Put a tiny footer with filename/date as a data attribute if you want to show it
    const filenameSafe =
      `Wishlist_${customer.name.replace(/\s+/g, "_")}_${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;

    try {
      await downloadWishlistPDF(targetRef.current, filenameSafe);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={busy}
      className="px-4 py-2 rounded-lg bg-black text-white hover:opacity-90 disabled:opacity-50"
      // Don’t include this button in the screenshot
      data-html2canvas-ignore="true"
      title="Download wishlist as PDF"
    >
      {busy ? "Preparing…" : "Download PDF"}
    </button>
  );
}
