import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "./index.css";
import CandidateFormPage from "./pages/CandidateFormPage";
import PosterPage from "./pages/PosterPage";
import { trpc, trpcClient } from "./lib/trpc";

/**
 * App entrypoint.
 */

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
    },
  },
});

const isPoster = window.location.pathname === "/poster";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {isPoster ? <PosterPage /> : <CandidateFormPage />}
      </QueryClientProvider>
    </trpc.Provider>
  </StrictMode>,
);
