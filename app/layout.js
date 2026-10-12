import "./globals.css";
import SWRegister from "./sw-register";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://ahm-ai.vercel.app").replace(/\/$/, "");
const DESC = "AHM AI — زیرەکی دەستکرد بە کوردی، عەرەبی و ئینگلیزی: پرسیار و وەڵام، دروستکردنی ماڵپەڕ و ئەپ، لۆگۆ و وێنە، خوێندنەوەی PDF، گفتوگۆی دەنگی و فێربوونی زمان. Kurdish AI assistant.";

export const metadata = {
  metadataBase: new URL(SITE),
  title: { default: "AHM AI — زیرەکی دەستکرد بە کوردی", template: "%s · AHM AI" },
  description: DESC,
  applicationName: "AHM AI",
  keywords: ["AHM AI", "زیرەکی دەستکرد", "زیرەکی دەستکرد بە کوردی", "AI کوردی", "Kurdish AI", "Kurdish chatbot", "ذكاء اصطناعي كردي", "ذكاء اصطناعي", "دروستکردنی ماڵپەڕ", "فێربوونی ئینگلیزی", "Sorani"],
  manifest: "/manifest.json",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website", url: SITE, siteName: "AHM AI", locale: "ckb_IQ",
    title: "AHM AI — زیرەکی دەستکرد بە زمانی خۆت", description: DESC,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "AHM AI" }],
  },
  twitter: { card: "summary_large_image", title: "AHM AI — زیرەکی دەستکرد بە زمانی خۆت", description: DESC, images: ["/og.png"] },
  robots: { index: true, follow: true },
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "AHM AI" },
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "AHM AI",
  url: SITE,
  applicationCategory: "ProductivityApplication",
  operatingSystem: "iOS, Android, Windows, macOS, Web",
  inLanguage: ["ckb", "ar", "en"],
  description: DESC,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  image: SITE + "/og.png",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#101114",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ckb" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;500;600;700&family=Michroma&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
        {children}
        <SWRegister />
      </body>
    </html>
  );
}
