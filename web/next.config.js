/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@sam-pyeong-oh/shared"],
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["@sam-pyeong-oh/shared"],
    reactCompiler: true,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@shared": require("path").resolve(__dirname, "../shared/src"),
    };
    return config;
  },
};

module.exports = nextConfig;
