// app/api/runs/[id]/stream/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Next.js 15: params is a Promise
  const { id } = await params;
  const controller = new AbortController();
  const upstream = await fetch(`${BACKEND}/api/runs/${id}/stream`, {
    method: "GET",
    signal: controller.signal,
  });

  if (!upstream.ok || !upstream.body) {
    return new Response("Upstream error", { status: upstream.status });
    }
  // Wrap the upstream SSE stream
  const stream = new ReadableStream({
    start(controller2) {
      const reader = upstream.body!.getReader();
      let closed = false;
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
          if (!closed) {
            try { controller2.close(); } catch {}
          }
        }
      })();
      // Attach a cancel handler that prevents double close
      (controller as any)._closeGuard = () => { closed = true; };
    },
    cancel() {
      const anyCtrl = controller as any;
      if (typeof anyCtrl._closeGuard === 'function') anyCtrl._closeGuard();
      controller.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
