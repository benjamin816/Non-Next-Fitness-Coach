
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { StorageProvider } from "@/components/StorageProvider";
import LayoutWrapper from "@/components/LayoutWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Fitness Coach MVP",
  description: "Advanced adaptive fitness coaching and lifting log.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        <StorageProvider>
          <LayoutWrapper>{children}</LayoutWrapper>
        </StorageProvider>
      </body>
    </html>
  );
}
