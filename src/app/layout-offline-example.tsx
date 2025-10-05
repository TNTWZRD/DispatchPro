// src/app/layout-offline.tsx
// Example of how to update your existing layout.tsx for offline support

import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { OfflineProvider, OfflineAuthProvider, useOffline } from '@/lib/offline-integration';
import { FloatingOfflineIndicator } from '@/components/offline-indicator';
import { ConflictResolutionDialog } from '@/components/conflict-resolution-dialog';
import { useEffect } from 'react';
import { initializeOfflineSupport } from '@/lib/offline-integration';

const geistSans = localFont({
  src: "./fonts/GeistVF.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "DispatchPro",
  description: "Professional dispatch management system",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
  },
  // Add PWA-specific metadata
  themeColor: "#000000",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
};

// Client component for offline initialization
function OfflineInitializer() {
  useEffect(() => {
    initializeOfflineSupport().catch(error => {
      console.error('Failed to initialize offline support:', error);
    });
  }, []);

  return null;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Wrap everything in offline-aware providers */}
        <OfflineAuthProvider>
          <OfflineProvider>
            {/* Initialize offline support */}
            <OfflineInitializer />
            
            {/* Your existing app content */}
            {children}
            
            {/* Offline UI components */}
            <FloatingOfflineIndicator />
            <ConflictResolutionDialog open={false} onOpenChange={() => {}} />
            
            {/* Your existing components */}
            <Toaster />
          </OfflineProvider>
        </OfflineAuthProvider>
      </body>
    </html>
  );
}

// Optional: Add a custom hook for layout-specific offline features
export function useLayoutOffline() {
  const { isOnline, syncStatus, conflicts } = useOffline();
  
  // You can add layout-specific logic here
  useEffect(() => {
    if (conflicts.length > 0) {
      // Auto-open conflict resolution dialog
      // or show notification
    }
  }, [conflicts]);
  
  return {
    isOnline,
    syncStatus,
    hasConflicts: conflicts.length > 0
  };
}