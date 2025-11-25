import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['pdf-to-png-converter', 'canvas', 'pdfjs-dist'],
  turbopack: {}, // Empty config to acknowledge Turbopack usage
};

export default nextConfig;
