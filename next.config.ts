import type { NextConfig } from "next";

// Giftomat is a 100% client-side app. Static export produces a self-contained
// `out/` directory that a minimal `node:http` server (server.js) serves directly.
// This avoids running a heavy `next build` on the deploy host at startup.
// The security headers that `headers()` used to set are enforced in server.js,
// because `headers()` is not supported together with `output: "export"`.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: false,
};

export default nextConfig;
