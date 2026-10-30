import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
