/**
 * COWORK.ARMY — API Proxy Middleware
 * Rewrites /cowork-api/* requests to backend at runtime.
 * Works in standalone mode with runtime env vars.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const backendUrl = process.env.COWORK_API_URL || "http://localhost:8888";
  const apiPath = request.nextUrl.pathname.replace(/^\/cowork-api/, "/api");
  const target = `${backendUrl}${apiPath}${request.nextUrl.search}`;

  return NextResponse.rewrite(new URL(target));
}

export const config = {
  matcher: "/cowork-api/:path*",
};
