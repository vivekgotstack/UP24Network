import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };

async function proxy(request: NextRequest, context: Context) {
  const { path } = await context.params;
  if (!['auth', 'admin'].includes(path[0]) || path.some(segment => !/^[A-Za-z0-9-]+$/.test(segment)))
    return NextResponse.json({ detail: "Not found" }, { status: 404 });
  if (request.method !== "GET") {
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ detail: "Invalid request origin" }, { status: 403 });
  }
  const headers = new Headers();
  for (const name of ['cookie', 'content-type', 'x-csrf-token']) {
    const value = request.headers.get(name); if (value) headers.set(name, value);
  }
  try {
    const response = await fetch(`${process.env.NEWS_API_URL ?? 'http://127.0.0.1:8080'}/api/${path.join('/')}${request.nextUrl.search}`, {
      method: request.method, headers, cache: 'no-store', redirect: 'manual',
      body: request.method === 'GET' ? undefined : await request.arrayBuffer(), signal: AbortSignal.timeout(60000),
    });
    const result = new NextResponse(response.body, { status: response.status });
    result.headers.set('cache-control', 'no-store');
    const contentType = response.headers.get('content-type'); if (contentType) result.headers.set('content-type', contentType);
    for (const cookie of response.headers.getSetCookie()) result.headers.append('set-cookie', cookie);
    return result;
  } catch {
    return NextResponse.json({ detail: 'The newsroom service is unavailable. Please try again.' }, { status: 503 });
  }
}
export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
