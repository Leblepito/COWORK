import type { NextConfig } from "next";

// COWORK_API_URL: backend URL for server-side rewrites
// Railway: set to internal backend service URL (e.g. http://backend.railway.internal:8888)
// Fallback: derive from NEXT_PUBLIC_COWORK_API_URL by stripping /api suffix
const coworkUrl = process.env.COWORK_API_URL
    || process.env.NEXT_PUBLIC_COWORK_API_URL?.replace(/\/api$/, "")
    || "http://localhost:8888";

const nextConfig: NextConfig = {
    output: "standalone",
    async rewrites() {
        return [
            {
                source: "/cowork-api/:path*",
                destination: `${coworkUrl}/api/:path*`,
            },
        ];
    },
    transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],
};

export default nextConfig;
