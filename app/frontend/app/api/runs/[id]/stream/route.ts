// app/api/runs/[id]/stream/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const controller = new AbortController();
  const upstream = await fetch(`${BACKEND}/api/runs/${params.id}/stream`, {
    method: "GET",
    signal: controller.signal,
    // IMPORTANT: no headers – EventSource can't send custom headers anyway
  });

  if (!upstream.ok || !upstream.body) {
    return new Response("Upstream error", { status: upstream.status });
    }
  // Rewrap the upstream SSE stream
  const stream = new ReadableStream({
    start(controller2) {
      const reader = upstream.body!.getReader();
      (async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller2.enqueue(value);
          }
        } catch (e) {
          // swallow
        } finally {
          controller2.close();
        }
      })();
    },
    cancel() { controller.abort(); },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
