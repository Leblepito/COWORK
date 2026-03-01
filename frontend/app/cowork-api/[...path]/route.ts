/**
 * Server-side API proxy for COWORK.ARMY backend.
 * Browser calls /cowork-api/... → Next.js proxies to backend.
 * Uses COWORK_API_URL env var (runtime), supports Railway private networking.
 */
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.COWORK_API_URL
  || process.env.NEXT_PUBLIC_COWORK_API_URL?.replace(/\/api$/, "")
  || "http://localhost:8888";

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const target = `${BACKEND_URL}/api/${path.join("/")}${req.nextUrl.search}`;

  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    if (!["host", "connection", "transfer-encoding"].includes(k.toLowerCase())) {
      headers[k] = v;
    }
  });

  try {
    const resp = await fetch(target, {
      method: req.method,
      headers,
      body: req.method !== "GET" && req.method !== "HEAD" ? await req.blob() : undefined,
    });

    const respHeaders = new Headers();
    resp.headers.forEach((v, k) => {
      if (!["transfer-encoding", "content-encoding"].includes(k.toLowerCase())) {
        respHeaders.set(k, v);
      }
    });

    return new NextResponse(resp.body, {
      status: resp.status,
      headers: respHeaders,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Backend unreachable", detail: String(err), target },
      { status: 502 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const PATCH = proxy;
