/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow development server to be accessed from chat.ashanhimantha.com
  allowedDevOrigins: [
    'chat.ashanhimantha.com',
    // Add any other domains you use for development
  ],
  
  // Other Next.js config options as needed
  reactStrictMode: true,
}

module.exports = nextConfig