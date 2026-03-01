/**
 * Health Check — diagnose backend connectivity from the browser.
 * GET /api/health → tests fetch to COWORK_API_URL and returns diagnostics.
 */
import { NextResponse } from "next/server";

export async function GET() {
  const backendUrl = process.env.COWORK_API_URL || "http://localhost:8888";
  const diagnostics: Record<string, unknown> = {
    frontend: "ok",
    timestamp: new Date().toISOString(),
    env: {
      COWORK_API_URL: backendUrl,
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
    },
  };

  try {
    const resp = await fetch(`${backendUrl}/api/info`, {
      signal: AbortSignal.timeout(5000),
    });
    const body = await resp.text();
    diagnostics.backend = {
      status: resp.status,
      ok: resp.ok,
      body: body.slice(0, 500),
    };
  } catch (err) {
    diagnostics.backend = {
      error: String(err),
      url_tested: `${backendUrl}/api/info`,
    };
  }

  return NextResponse.json(diagnostics);
}
