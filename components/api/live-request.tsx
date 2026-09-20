"use client";

import { AnimatePresence, motion } from "motion/react";
import { Play } from "lucide-react";
import { useEffect, useState } from "react";
import { CodeBlock } from "@/components/ui/code-block";
import { cn } from "@/lib/utils";

export interface RequestSpec {
  method: "GET" | "POST";
  path: string;
  body?: unknown;
}

interface Outcome {
  http: number;
  ms: number;
  text: string;
  at: string;
}

export function curlOf(r: RequestSpec, origin = "https://your-comms-host") {
  const url = `${origin}${r.path}`;
  return r.method === "GET" ? `curl ${url}` : `curl -X POST ${url} \\\n  -H "content-type: application/json" \\\n  -d '${JSON.stringify(r.body)}'`;
}

/**
 * A real request to the COMMS API. Nothing is simulated: the status, latency and body shown are what the server returned.
 * Left: the request. Right: the response. RUN REQUEST sends it.
 */
export function LiveRequest({ request, className, autoLabel }: { request: RequestSpec; className?: string; autoLabel?: string }) {
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<Outcome | null>(null);
  const [err, setErr] = useState<string | null>(null);
  // the host is only known in the browser; render a placeholder first so server and client markup match
  const [host, setHost] = useState<string | undefined>(undefined);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHost(window.location.origin);
  }, []);

  async function run() {
    setBusy(true);
    setErr(null);
    const t0 = performance.now();
    try {
      const res = await fetch(request.path, {
        method: request.method,
        headers: request.body === undefined ? undefined : { "content-type": "application/json" },
        body: request.body === undefined ? undefined : JSON.stringify(request.body),
      });
      const raw = await res.text();
      let text = raw;
      try {
        text = JSON.stringify(JSON.parse(raw), null, 2);
      } catch {
        /* not JSON: show as received */
      }
      const lines = text.split("\n");
      setOut({ http: res.status, ms: Math.round(performance.now() - t0), text: lines.length > 70 ? `${lines.slice(0, 70).join("\n")}\n… (${lines.length - 70} more lines)` : text, at: new Date().toISOString() });
    } catch (e) {
      setOut(null);
      setErr(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2", className)}>
      <div className="flex min-w-0 flex-col">
        <CodeBlock code={curlOf(request, host)} lang="curl" title={`${request.method} ${request.path}`} className="flex-1" />
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="mt-3 inline-flex h-11 items-center justify-center gap-2 self-start rounded-md bg-ink px-5 font-mono text-[12px] tracking-[0.08em] text-on-ink uppercase transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          <Play size={13} aria-hidden /> {busy ? "Requesting…" : (autoLabel ?? "Run request")}
        </button>
      </div>
      <div className="min-w-0">
        <div className="overflow-hidden rounded-lg border border-line bg-base-1">
          <div className="flex items-center justify-between border-b border-line px-3 py-2 font-mono text-[11px] text-ink-3">
            <span>Response</span>
            {out ? (
              <span className={cn("tabular", out.http < 300 ? "text-eligible" : "text-ineligible")}>
                HTTP {out.http} · {out.ms} ms
              </span>
            ) : (
              <span>not sent</span>
            )}
          </div>
          <div className="max-h-[440px] min-h-[220px] overflow-auto p-4">
            <AnimatePresence mode="wait">
              {err ? (
                <motion.p key="e" initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="alert" className="font-mono text-[12.5px] text-ineligible">
                  {err}
                </motion.p>
              ) : out ? (
                <motion.pre key={out.at} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="font-mono text-[12px] leading-[1.7] whitespace-pre text-ink-2">
                  {out.text}
                </motion.pre>
              ) : (
                <motion.p key="i" className="font-mono text-[12.5px] text-ink-3">
                  No response yet. Press RUN REQUEST — this sends a real request to this deployment.
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
