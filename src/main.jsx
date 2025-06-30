// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import App from "./App";

// ─── MirageJS mock server (only in dev) ────────────────────────────────────────
if (process.env.NODE_ENV === "development") {
  const { makeServer } = require("./mirage/server");
  makeServer({ environment: "development" });
}

// ─── React-Query client setup ───────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5-minute fresh window
      cacheTime: 30 * 60 * 1000, // 30-minute cache
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// ─── Persist Query Cache ────────────────────────────────────────────────────────
persistQueryClient({
  queryClient,
  persister: createSyncStoragePersister({ storage: window.localStorage }),
  maxAge: 30 * 60 * 1000, // purge after 30 min
});

// ─── Render ────────────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById("root")).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
