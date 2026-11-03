
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TC Cleaning Services AZ LLC | Mesa & East Valley",
  description:
    "Professional residential, recurring, deep cleaning, and move-in/move-out cleaning services in Mesa, Gilbert, Chandler, Tempe, Queen Creek, Phoenix, and Scottsdale, Arizona.",
  keywords: [
    "TC Cleaning",
    "Mesa AZ cleaning services",
    "East Valley house cleaning",
    "residential cleaning Arizona",
    "deep cleaning Mesa",
  ],
  openGraph: {
    title: "TC Cleaning Services AZ LLC",
    description: "A Cleaner Home. A Better Life.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
