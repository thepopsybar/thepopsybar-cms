import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // web-push uses Node's crypto/https; keep it as a normal Node module instead of bundling it.
  serverExternalPackages: ["web-push"],
  async headers() {
    return [
      {
        // The admin push service worker must always be re-checked so updates reach devices.
        source: "/popsy-push-sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
  // The standalone Plan Your Event page was removed; old links go to the homepage form.
  async redirects() {
    return [{ source: "/plan-your-event", destination: "/#plan", permanent: true }];
  },
  images: {
    // Photos uploaded through /admin are stored on Cloudinary.
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
