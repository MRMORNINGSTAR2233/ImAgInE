/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Allow cross-origin requests during development
    allowedDevOrigins: ['phoenix-promoted-piranha.ngrok-free.app']
  }
};

module.exports = nextConfig;