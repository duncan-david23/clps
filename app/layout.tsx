
import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import Script from "next/script";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pos.claukk.com"),

  title: {
    default: "ClaukkPOS | POS & Inventory Management Software",
    template: "%s | ClaukkPOS",
  },

  description:
    "ClaukkPOS is a modern point-of-sale and inventory management system that helps businesses manage sales, products, stock, employees, barcodes and daily operations from one platform.",

  applicationName: "ClaukkPOS",

  authors: [{ name: "Claukk" }],
  creator: "Claukk",
  publisher: "Claukk",

  keywords: [
    "ClaukkPOS",
    "POS software",
    "Point of sale system",
    "Inventory management software",
    "Retail management software",
    "Stock management system",
    "Sales management software",
    "Business management software",
    "POS software Ghana",
    "Inventory management Ghana",
    "ClaukkSuite",
  ],

  category: "technology",

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    url: "https://pos.claukk.com",
    siteName: "ClaukkPOS",
    title: "ClaukkPOS | POS & Inventory Management Software",
    description:
      "Manage sales, inventory, products, employees and business operations with ClaukkPOS — a modern POS and inventory management platform.",
  },

  twitter: {
    card: "summary",
    title: "ClaukkPOS | POS & Inventory Management Software",
    description:
      "A modern POS and inventory management platform for businesses worldwide.",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} h-full antialiased`}
    >
      <body>
        <Script
          src="https://js.paystack.co/v1/inline.js"
          strategy="beforeInteractive"
        />

        <main className="flex h-full">
          {children}
        </main>
      </body>
    </html>
  );
}
