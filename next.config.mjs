// Security headers for every page. Published user sites (/s/…) set their own stricter sandbox.
const security = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), payment=(), usb=(), microphone=(self)" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'; upgrade-insecure-requests" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // A new id on every deploy: open apps notice it and tell the user to refresh.
  env: { NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || String(Date.now()) },
  async headers() {
    return [
      { source: "/((?!s/).*)", headers: security },
      { source: "/s/:path*", headers: security.filter((h) => !["X-Frame-Options", "Content-Security-Policy", "Cross-Origin-Opener-Policy"].includes(h.key)) },
    ];
  },
};

export default nextConfig;
