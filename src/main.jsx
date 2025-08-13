import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import axios from "./api/axios";
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
