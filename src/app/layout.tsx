import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppProvider } from "@/lib/store";
import { Shell } from "@/components/shell";

export const metadata: Metadata = {
  title: "ASG Leads — Amplify Solutions Group",
  description: "Internal lead intake, field survey, distribution, calling and sales operations platform for Amplify Solutions Group.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ASG Leads",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0B1426",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-asg-cream text-asg-text antialiased">
        <AppProvider>
          <Shell>{children}</Shell>
        </AppProvider>
      </body>
    </html>
  );
}
