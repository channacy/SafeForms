import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://127.0.0.1:8000';

async function handler(req: NextRequest) {
  try {
    // Extract the path from the request URL, removing the '/api/proxy' prefix.
    const path = req.nextUrl.pathname.replace('/api/proxy', '');
    const url = new URL(path, BACKEND_URL);

    // Forward query parameters.
    req.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.append(key, value);
    });

    // Make the request to the backend.
    const response = await fetch(url.toString(), {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...req.headers, // Forward other headers if necessary
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
      // IMPORTANT: Do not re-use the signal from the original request
      // as it may be aborted prematurely in some Next.js versions.
      signal: AbortSignal.timeout(30000), // 30-second timeout
    });

    // Create a new response to send back to the client.
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });

  } catch (error) {
    console.error('API Proxy Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred in the API proxy.' },
      { status: 500 }
    );
  }
}

// Export the handler for all supported HTTP methods.
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
