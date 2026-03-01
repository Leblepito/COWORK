/**
 * API Proxy Route Handler — runtime backup for next.config.ts rewrites.
 * Proxies /cowork-api/* to backend using COWORK_API_URL env var.
 */
import { type NextRequest, NextResponse } from "next/server";

const backendUrl = () => process.env.COWORK_API_URL || "http://localhost:8888";

async function handler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const target = `${backendUrl()}/api/${path.join("/")}${req.nextUrl.search}`;

  const headers: HeadersInit = {};
  req.headers.forEach((v, k) => {
    if (!["host", "connection", "transfer-encoding"].includes(k)) headers[k] = v;
  });

  try {
    const resp = await fetch(target, {
      method: req.method,
      headers,
      body: req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
      // @ts-expect-error -- Node fetch supports duplex for streaming
      duplex: "half",
    });
    const data = await resp.arrayBuffer();
    return new NextResponse(data, {
      status: resp.status,
      headers: { "content-type": resp.headers.get("content-type") || "application/json" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Backend unreachable", detail: String(err), target },
      { status: 502 },
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
