// app/api/batch/run/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

export async function POST(req: Request) {
  const body = await req.text(); // pass-through JSON
  const resp = await fetch(`${BACKEND}/api/batch/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  // Pass through status + JSON
  const text = await resp.text();
  return new Response(text, {
    status: resp.status,
    headers: { "Content-Type": resp.headers.get("content-type") ?? "application/json" },
  });
}
