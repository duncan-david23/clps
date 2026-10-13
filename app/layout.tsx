import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import Script from 'next/script';


const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "ClaukkPOS",
  description: "ClaukkPOS — ClaukkSuite",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} h-full antialiased`}
    >
      <body>
        <Script src="https://js.paystack.co/v1/inline.js" strategy="beforeInteractive" />
        <main className="flex h-full">
          
          {children}
        </main>
       
      </body>
    </html>
  );
}
