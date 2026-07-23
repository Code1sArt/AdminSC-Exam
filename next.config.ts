import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Plesk runs the application with its Node.js/Passenger integration.
  // Vinext's standalone output includes server.js and only the runtime
  // dependencies needed in production, so the server does not need npm install.
  output: "standalone",
};

export default nextConfig;
