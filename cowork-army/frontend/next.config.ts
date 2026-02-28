import type { NextConfig } from "next";

const backendUrl = process.env.COWORK_API_URL || "http://localhost:8888";

const nextConfig: NextConfig = {
    // output: "standalone", // disabled for Railway compatibility
    transpilePackages: ["three"],
    async rewrites() {
        return [
            {
                source: "/api/:path*",
                destination: `${backendUrl}/api/:path*`,
            },
        ];
    },
};

export default nextConfig;
