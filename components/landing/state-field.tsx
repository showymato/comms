"use client";

import { useEffect, useRef } from "react";
import { liveManager, type Signal } from "@/lib/data/live-manager";
import { DATA_MODE } from "@/lib/data/config";
import { useReducedMotion } from "@/hooks/use-motion";
import type { EligibilityStatus } from "@/types";

/**
 * COLLATERAL STATE FIELD — the live system drawn as a graph.
 *
 *   assets → checks → policy rules → decisions
 *
 *  • Asset nodes are real registry tokens. Each ambient packet starts at one of them and finishes at the decision node
 *    matching that asset's actual current result — the field's traffic is the real distribution of outcomes.
 *  • Bright packets are real events: a completed COMMS request, a price change, a state or eligibility change.
 *  • The cursor bends nearby nodes, lights their links, and hovering a node reports what it is (see `onHover`).
 *
 * One canvas, precomputed links, DPR capped at 1.5, paused off-screen / when the tab is hidden.
 * Reduced motion draws a single still frame.
 */

export type FieldKind = "asset" | "check" | "policy" | "decision";
export interface FieldHover {
  kind: FieldKind;
  index: number;
}

interface Props {
  assetStatus: EligibilityStatus[];
  checkCount: number;
  policyCount: number;
  /** highlight a whole column (touch / keyboard alternative to hover) */
  focusKind?: FieldKind | null;
  onHover?: (h: FieldHover | null) => void;
  className?: string;
}

const DECISIONS: EligibilityStatus[] = ["ELIGIBLE", "CONDITIONAL", "INELIGIBLE", "UNKNOWN"];
const RGB: Record<EligibilityStatus, string> = {
  ELIGIBLE: "10,138,82",
  CONDITIONAL: "168,100,0",
  INELIGIBLE: "209,45,45",
  UNKNOWN: "93,107,128",
};
const INK = "10,10,10";
const SIGNAL = "0,150,196";

interface Node {
  kind: FieldKind;
  index: number;
  /** normalised layout position */
  bx: number;
  by: number;
  ph: number;
  ox: number;
  oy: number;
  glow: number;
}
interface Link {
  a: number;
  b: number;
}
interface Packet {
  link: number;
  t: number;
  speed: number;
  strong: boolean;
  target: number;
  hops: number;
}

const COL_X: Record<FieldKind, number> = { asset: 0, check: 0.34, policy: 0.66, decision: 1 };

export function StateField({ assetStatus, checkCount, policyCount, focusKind = null, onHover, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  const statusKey = assetStatus.join(",");
  const focusRef = useRef<FieldKind | null>(focusKind);
  const hoverCb = useRef(onHover);
  useEffect(() => {
    focusRef.current = focusKind;
    hoverCb.current = onHover;
  });

  useEffect(() => {
    const canvas = ref.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1 : 1.5);
    const statuses = statusKey ? (statusKey.split(",") as EligibilityStatus[]) : [];

    // ── graph ──
    const nodes: Node[] = [];
    const add = (kind: FieldKind, n: number) => {
      for (let i = 0; i < n; i++) {
        const y = n === 1 ? 0.5 : 0.06 + (0.88 * i) / (n - 1);
        nodes.push({ kind, index: i, bx: COL_X[kind], by: y, ph: (i * 2.399 + COL_X[kind] * 7) % (Math.PI * 2), ox: 0, oy: 0, glow: 0 });
      }
    };
    add("asset", statuses.length);
    add("check", checkCount);
    add("policy", policyCount);
    add("decision", DECISIONS.length);
    const idx = (kind: FieldKind, i: number) => nodes.findIndex((n) => n.kind === kind && n.index === i);

    const links: Link[] = [];
    const out: number[][] = nodes.map(() => []);
    const link = (a: number, b: number) => {
      links.push({ a, b });
      out[a].push(links.length - 1);
    };
    statuses.forEach((_, i) => {
      for (let k = 0; k < 3; k++) link(idx("asset", i), idx("check", (i * 3 + k * 2 + 1) % checkCount));
    });
    for (let c = 0; c < checkCount; c++) {
      link(idx("check", c), idx("policy", c % policyCount));
      link(idx("check", c), idx("policy", (c + 1) % policyCount));
    }
    for (let p = 0; p < policyCount; p++) DECISIONS.forEach((_, d) => link(idx("policy", p), idx("decision", d)));

    let W = 0;
    let H = 0;
    let x0 = 0;
    let span = 0;
    const packets: Packet[] = [];
    const pulses: Array<{ node: number; t: number; rgb: string }> = [];
    let rot = 0;

    const pos = (n: Node, t: number) => ({
      x: x0 + n.bx * span + Math.sin(t * 0.00011 + n.ph) * 5 + n.ox,
      y: 28 + n.by * (H - 56) + Math.cos(t * 0.00009 + n.ph * 1.3) * 5 + n.oy,
    });

    function layout() {
      const r = parent!.getBoundingClientRect();
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      canvas!.width = Math.round(W * dpr);
      canvas!.height = Math.round(H * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      x0 = 24;
      span = Math.max(1, W - 48);
    }

    function spawn(strong: boolean, targetStatus?: EligibilityStatus, fromAsset?: number) {
      if (packets.length > 30 || statuses.length === 0) return;
      const a = fromAsset ?? Math.floor((rot++ * 7 + 3) % statuses.length);
      const first = out[idx("asset", a)];
      if (!first?.length) return;
      const st = targetStatus ?? statuses[a] ?? "UNKNOWN";
      packets.push({ link: first[rot % first.length], t: 0, speed: strong ? 0.0011 : 0.00042 + (rot % 5) * 0.00003, strong, target: DECISIONS.indexOf(st), hops: 0 });
    }

    // ── pointer ──
    const cur = { x: -9999, y: -9999, tx: -9999, ty: -9999, active: false };
    let hovered = -1;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = canvas.getBoundingClientRect();
      cur.tx = e.clientX - r.left;
      cur.ty = e.clientY - r.top;
      if (!cur.active) {
        cur.x = cur.tx;
        cur.y = cur.ty;
        cur.active = true;
      }
    };
    const onLeave = () => {
      cur.active = false;
    };
    const onClick = (e: PointerEvent) => {
      // touch / click: pick the nearest node in reach
      const r = canvas.getBoundingClientRect();
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;
      let best = -1;
      let bd = 26;
      nodes.forEach((n, i) => {
        const p = pos(n, performance.now());
        const d = Math.hypot(p.x - px, p.y - py);
        if (d < bd) {
          bd = d;
          best = i;
        }
      });
      if (best >= 0) {
        setHover(best);
        pulses.push({ node: best, t: 0, rgb: SIGNAL });
      }
    };
    const setHover = (i: number) => {
      if (i === hovered) return;
      hovered = i;
      hoverCb.current?.(i < 0 ? null : { kind: nodes[i].kind, index: nodes[i].index });
    };

    const rgbOf = (n: Node): string => {
      if (n.kind === "decision") return RGB[DECISIONS[n.index]];
      if (n.kind === "asset") return RGB[statuses[n.index] ?? "UNKNOWN"];
      return INK;
    };

    function frame(t: number, dt: number) {
      ctx!.clearRect(0, 0, W, H);
      const P = nodes.map((n) => pos(n, t));
      const R = 150;

      // cursor spring + hover pick
      if (cur.active && !coarse) {
        const k = 1 - Math.exp(-dt / 70);
        cur.x += (cur.tx - cur.x) * k;
        cur.y += (cur.ty - cur.y) * k;
      }
      let near = -1;
      let nd = 22;
      nodes.forEach((n, i) => {
        let tg = 0;
        let tox = 0;
        let toy = 0;
        if (cur.active && !coarse) {
          const dx = cur.x - P[i].x;
          const dy = cur.y - P[i].y;
          const d = Math.hypot(dx, dy);
          if (d < R) {
            const f = 1 - d / R;
            const s = f * f * (3 - 2 * f);
            tg = s;
            tox = (dx / (d || 1)) * s * 12;
            toy = (dy / (d || 1)) * s * 12;
          }
          if (d < nd) {
            nd = d;
            near = i;
          }
        }
        const fk = focusRef.current;
        if (fk && n.kind === fk) tg = Math.max(tg, 0.85);
        n.glow += (tg - n.glow) * 0.12;
        n.ox += (tox - n.ox) * 0.08;
        n.oy += (toy - n.oy) * 0.08;
        P[i] = pos(n, t);
      });
      if (cur.active && !coarse) setHover(near);
      else if (!cur.active && hovered >= 0 && !coarse) setHover(-1);

      // links — lit when either end is hovered/focused
      const lit = new Set<number>();
      if (hovered >= 0) {
        links.forEach((l, i) => {
          if (l.a === hovered || l.b === hovered) lit.add(i);
        });
      }
      ctx!.lineWidth = 1;
      links.forEach((l, i) => {
        const a = P[l.a];
        const b = P[l.b];
        const boost = Math.max(nodes[l.a].glow, nodes[l.b].glow) * 0.22;
        const on = lit.has(i);
        ctx!.strokeStyle = on ? `rgba(${SIGNAL},0.6)` : `rgba(${INK},${(0.055 + boost).toFixed(3)})`;
        ctx!.beginPath();
        ctx!.moveTo(a.x, a.y);
        ctx!.lineTo(b.x, b.y);
        ctx!.stroke();
      });

      // packets
      for (let i = packets.length - 1; i >= 0; i--) {
        const p = packets[i];
        const l = links[p.link];
        p.t += p.speed * dt;
        if (p.t >= 1) {
          const end = l.b;
          const nk = nodes[end].kind;
          if (nk === "decision") {
            nodes[end].glow = 1;
            pulses.push({ node: end, t: 0, rgb: RGB[DECISIONS[nodes[end].index]] });
            packets.splice(i, 1);
            continue;
          }
          const next = out[end];
          if (!next?.length || p.hops > 6) {
            packets.splice(i, 1);
            continue;
          }
          // on the last hop before a decision, take the edge to the packet's real target
          const want = nk === "policy" ? next.find((li) => nodes[links[li].b].kind === "decision" && nodes[links[li].b].index === p.target) : undefined;
          p.link = want ?? next[(p.hops + rot) % next.length];
          p.t = 0;
          p.hops++;
          continue;
        }
        const a = P[l.a];
        const b = P[l.b];
        const x = a.x + (b.x - a.x) * p.t;
        const y = a.y + (b.y - a.y) * p.t;
        const col = p.strong ? SIGNAL : INK;
        ctx!.fillStyle = `rgba(${col},${p.strong ? 0.16 : 0.06})`;
        ctx!.beginPath();
        ctx!.arc(x, y, p.strong ? 8 : 5, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.fillStyle = `rgba(${col},${p.strong ? 0.95 : 0.55})`;
        ctx!.beginPath();
        ctx!.arc(x, y, p.strong ? 2.3 : 1.5, 0, Math.PI * 2);
        ctx!.fill();
      }

      // pulses (real events arriving)
      for (let i = pulses.length - 1; i >= 0; i--) {
        const q = pulses[i];
        q.t += dt / 900;
        if (q.t >= 1) {
          pulses.splice(i, 1);
          continue;
        }
        const p = P[q.node];
        ctx!.strokeStyle = `rgba(${q.rgb},${(0.5 * (1 - q.t)).toFixed(3)})`;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, 6 + q.t * 22, 0, Math.PI * 2);
        ctx!.stroke();
      }

      // nodes
      nodes.forEach((n, i) => {
        const p = P[i];
        const g = n.glow + (i === hovered ? 0.6 : 0);
        const rgb = n.kind === "check" || n.kind === "policy" ? (g > 0.3 ? SIGNAL : INK) : rgbOf(n);
        if (g > 0.05) {
          ctx!.fillStyle = `rgba(${g > 0.3 && (n.kind === "check" || n.kind === "policy") ? SIGNAL : rgb},${(g * 0.13).toFixed(3)})`;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, 8 + g * 10, 0, Math.PI * 2);
          ctx!.fill();
        }
        ctx!.fillStyle = `rgba(${rgb},${(0.4 + g * 0.55).toFixed(3)})`;
        ctx!.strokeStyle = `rgba(${rgb},${(0.55 + g * 0.4).toFixed(3)})`;
        ctx!.lineWidth = 1.2;
        ctx!.beginPath();
        if (n.kind === "asset") {
          ctx!.arc(p.x, p.y, 2.4 + g * 1.8, 0, Math.PI * 2);
          ctx!.fill();
        } else if (n.kind === "check") {
          const s = 3.2 + g * 1.4;
          ctx!.rect(p.x - s, p.y - s, s * 2, s * 2);
          ctx!.stroke();
        } else if (n.kind === "policy") {
          const s = 5 + g * 2;
          ctx!.moveTo(p.x, p.y - s);
          ctx!.lineTo(p.x + s, p.y);
          ctx!.lineTo(p.x, p.y + s);
          ctx!.lineTo(p.x - s, p.y);
          ctx!.closePath();
          ctx!.stroke();
        } else {
          ctx!.arc(p.x, p.y, 8 + g * 2, 0, Math.PI * 2);
          ctx!.stroke();
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, 3.4, 0, Math.PI * 2);
          ctx!.fill();
        }
      });
    }

    layout();
    for (let i = 0; i < Math.min(statuses.length, coarse ? 5 : 10); i++) spawn(false, undefined, i);

    if (reduce) {
      frame(0, 16);
      const onResize = () => {
        layout();
        frame(0, 16);
      };
      window.addEventListener("resize", onResize);
      canvas.addEventListener("pointerdown", onClick);
      return () => {
        window.removeEventListener("resize", onResize);
        canvas.removeEventListener("pointerdown", onClick);
      };
    }

    let raf = 0;
    let last = 0;
    let visible = true;
    let ambient = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(50, last ? t - last : 16);
      last = t;
      ambient += dt;
      if (ambient > 900) {
        ambient = 0;
        spawn(false);
      }
      frame(t, dt);
    };
    const start = () => {
      if (!raf && visible && !document.hidden) {
        last = 0;
        raf = requestAnimationFrame(loop);
      }
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) start();
      else stop();
    });
    io.observe(parent);
    const ro = new ResizeObserver(() => layout());
    ro.observe(parent);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("pointerdown", onClick);

    // real system events drive the bright packets and pulses
    const off =
      DATA_MODE === "demo"
        ? () => {}
        : liveManager().on((s: Signal) => {
            if (s.type === "response" && s.ok) spawn(true);
            else if (s.type === "eligibility") spawn(true, s.to);
            else if (s.type === "price" || s.type === "state") spawn(true);
          });

    start();
    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      off();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerdown", onClick);
    };
  }, [reduce, statusKey, checkCount, policyCount]);

  return <canvas ref={ref} aria-hidden className={className} style={{ touchAction: "pan-y" }} />;
}
