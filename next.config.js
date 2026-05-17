/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || (isProd ? "/2K_BB_Demo" : "");

const nextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

module.exports = nextConfig;
