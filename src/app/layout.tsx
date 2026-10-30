
import type { Metadata } from "next";
import localFont from "next/font/local";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SiteChrome from "@/components/SiteChrome";
import { BUSINESS } from "@/lib/site-config";
import "./globals.css";

const inter = localFont({
  src: "./fonts/Inter-Variable.ttf",
  variable: "--font-inter",
  weight: "100 900",
  style: "normal",
  display: "swap",
});

const playfair = localFont({
  src: "./fonts/PlayfairDisplay-Variable.ttf",
  variable: "--font-playfair",
  weight: "400 900",
  style: "normal",
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Popsy Bar | Luxury Mobile Bar & Event Experiences",
  description:
    "Luxury mobile coffee, beverage, dessert and interactive event experiences brought directly to your event.",
};

// Public pages are re-generated at most every 5 minutes, and immediately after an admin saves.
export const revalidate = 300;

const structuredData = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: BUSINESS.name,
  telephone: BUSINESS.phoneDisplay,
  email: BUSINESS.publicEmail,
  address: {
    "@type": "PostalAddress",
    streetAddress: BUSINESS.streetAddress,
    addressLocality: BUSINESS.locality,
    addressRegion: BUSINESS.region,
    postalCode: BUSINESS.postalCode,
    addressCountry: "US",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
      <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${inter.variable} ${playfair.variable}`}
      >
      <body>
        {/* Hides the preloader before paint for visitors who have already seen it this session. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{if(sessionStorage.getItem("popsy-preloader-seen")==="1")document.documentElement.classList.add("preloader-seen")}catch(e){}',
          }}
        />
        <noscript>
          <style>{".preloader{display:none!important}"}</style>
        </noscript>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        />
        <SiteChrome header={<Header />} footer={<Footer />}>
          {children}
        </SiteChrome>
      </body>
    </html>
  );
}
