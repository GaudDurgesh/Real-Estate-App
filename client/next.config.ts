import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "example.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "real-estate-16.s3.eu-north-1.amazonaws.com",
        port: "",
        pathname: "/properties/**",
      },
    ],
  },
};

export default nextConfig;