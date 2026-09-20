import type { NextConfig } from "next";
import path from "node:path";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: { root: path.resolve(__dirname) },
  experimental: { optimizePackageImports: ["lucide-react", "motion"] },
};

export default config;
