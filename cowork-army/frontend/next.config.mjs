const coworkUrl = process.env.COWORK_API_URL || "http://localhost:8888";

/** @type {import('next').NextConfig} */
const nextConfig = {
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
