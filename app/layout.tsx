
import type { Metadata } from "next";
import GoogleAnalytics from "./components/google-analytics";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.tccleaningaz.com"),
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
  verification: {
    google: "KJQAzJdb7ESgWFwBsZq5uXAs-_9wWgyDxeCFPt4nA0E",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "TC Cleaning Services AZ LLC",
    description:
      "Dependable residential and commercial cleaning in Mesa and Arizona's East Valley.",
    type: "website",
    url: "/",
    siteName: "TC Cleaning Services AZ LLC",
    images: [
      {
        url: "/images/branded-truck.jpg",
        width: 1536,
        height: 1152,
        alt: "TC Cleaning Services AZ LLC service truck in Arizona",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TC Cleaning Services AZ LLC | Mesa & East Valley",
    description:
      "Dependable residential and commercial cleaning in Mesa and Arizona's East Valley.",
    images: ["/images/branded-truck.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <GoogleAnalytics />
      </body>
    </html>
  );
}
