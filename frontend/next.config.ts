import type { NextConfig } from "next";

// Backend URL for server-side rewrites (baked at build time in standalone mode)
// Railway: set COWORK_API_URL=http://backend.railway.internal:8888
const backendUrl = process.env.COWORK_API_URL || "http://localhost:8888";

const nextConfig: NextConfig = {
    output: "standalone",
    async rewrites() {
        return [
            {
                source: "/cowork-api/:path*",
                destination: `${backendUrl}/api/:path*`,
            },
        ];
    },
    transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],
};

export default nextConfig;
