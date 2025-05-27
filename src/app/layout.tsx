
import type { Metadata } from 'next';
// Removed: import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import AppLayout from '@/components/app-layout';
import QueryProvider from '@/components/query-provider';
import { AuthProvider } from '@/contexts/auth-context'; // Import AuthProvider

// Removed:
// const inter = Inter({
//   subsets: ['latin'],
//   variable: '--font-inter',
// });

export const metadata: Metadata = {
  title: 'Squadron Manager',
  description: 'Manage Australian Air Force Cadet Squadrons efficiently.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Removed inter.variable from className */}
      <body className="font-sans antialiased">
        <QueryProvider>
          <AuthProvider> {/* Wrap with AuthProvider */}
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <AppLayout>{children}</AppLayout>
              <Toaster />
            </ThemeProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
