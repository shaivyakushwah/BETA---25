import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000, // Keep data fresh for 60 seconds
        gcTime: 10 * 60_000, // Cache in memory for 10 minutes
        refetchOnWindowFocus: false, // Prevent lag when switching tabs or focusing window
        refetchOnMount: false, // Instant navigation using cached snapshot
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent", // Preload route data on mouse hover for instant clicking
    defaultPreloadStaleTime: 60_000,
  });

  return router;
};
