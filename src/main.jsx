import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { AuthProvider } from "./context/AuthContext";
import { WishlistProvider } from "./context/WishlistContext";
import { CompareProvider } from "./context/CompareContext";
import { ToastProvider } from "./context/ToastContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 300_000,
      cacheTime: 1_800_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

persistQueryClient({
  queryClient,
  persister: createSyncStoragePersister({ storage: window.localStorage }),
  maxAge: 1_800_000,
});

async function applyThemeColors() {
  try {
    const res = await fetch(
      "https://keneta.laratest-app.com/api/custom-settings/colors",
      { headers: { Accept: "application/json" }, cache: "no-store" }
    );
    const json = await res.json();

    if (json?.status && json?.data && typeof json.data === "object") {
      Object.entries(json.data).forEach(([name, value]) => {
        document.documentElement.style.setProperty(`--${name}`, String(value));
      });
      // console.log("Applied theme colors:", json.data);
    } else {
      console.warn("Color API returned unexpected payload:", json);
    }
  } catch (err) {
    console.error("Failed to load theme colors from API:", err);
  }
}

(async () => {
  // Ensure CSS variables are set BEFORE the UI mounts
  await applyThemeColors();

  ReactDOM.createRoot(document.getElementById("root")).render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <WishlistProvider>
          <CompareProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </CompareProvider>
        </WishlistProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
})();
