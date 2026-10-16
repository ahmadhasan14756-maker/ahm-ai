import "./globals.css";
import SWRegister from "./sw-register";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://ahm-ai.vercel.app").replace(/\/$/, "");
const DESC = "AHM AI — زیرەکی دەستکرد بە کوردی، عەرەبی و ئینگلیزی: پرسیار و وەڵام، دروستکردنی ماڵپەڕ و ئەپ، گفتوگۆی دەنگی و فێربوونی زمان. Kurdish AI assistant.";

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
  themeColor: "#07080b",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ckb" dir="rtl" data-theme="d" suppressHydrationWarning>
      <head>
        {/* pick the saved design before the page paints (no flash) */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem("ahm-theme");if(t!=="a"&&t!=="b"&&t!=="c")t="d";document.documentElement.setAttribute("data-theme",t);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",{a:"#08080a",b:"#f7f9f6",c:"#070d1f",d:"#07080b"}[t])}catch(e){}` }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;500;600;700;800;900&family=Vazirmatn:wght@400;500;600;700;800;900&family=Rubik:wght@400;500;600;700;800;900&family=Montserrat:wght@600;700;800;900&family=Michroma&family=IBM+Plex+Mono:wght@400;500&display=swap"
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
