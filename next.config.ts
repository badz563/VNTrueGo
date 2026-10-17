import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/VNtrueGO",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;