
"use client";

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools'; // Optional: for dev tools

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default query options if needed
      staleTime: 1000 * 60, // 1 minute
    },
  },
});

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    // Provide the client to your App
    <QueryClientProvider client={queryClient}>
      {children}
      {/* <ReactQueryDevtools initialIsOpen={false} /> */} {/* Optional Devtools */}
    </QueryClientProvider>
  );
}
