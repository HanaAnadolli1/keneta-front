import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import App from "./App";
import { AuthProvider } from "./context/AuthContext.jsx";

// ---------- React-Query client ----------
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5-minute fresh window
      cacheTime: 30 * 60 * 1000, // keep data in memory for 30 min
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// ---- (optional) persist queries across full reloads ----
persistQueryClient({
  queryClient,
  persister: createSyncStoragePersister({ storage: window.localStorage }),
  maxAge: 30 * 60 * 1000, // purge after 30 min
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <App />
    </AuthProvider>
  </QueryClientProvider>
);
