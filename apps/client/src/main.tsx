import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "./index.css";
import CandidateFormPage from "./pages/CandidateFormPage";
import { trpc, trpcClient } from "./lib/trpc";

/**
 * App entrypoint.
 *
 * The whole app is one form. There is no router because there are no other
 * pages — if you need more pages later, drop in `react-router-dom` and wrap
 * the form in a `<RouterProvider>`.
 */

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Forms-ui uses its own autosave/load lifecycle, so React Query's
      // staleness window doesn't really matter here. 5s keeps incidental
      // tRPC queries fresh-ish without re-running constantly.
      staleTime: 5_000,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <CandidateFormPage />
      </QueryClientProvider>
    </trpc.Provider>
  </StrictMode>,
);
