"use client";

import { useEffect, useRef } from "react";
import { FIELD } from "@/lib/motion";
import { liveManager, type Signal } from "@/lib/data/live-manager";
import { DATA_MODE } from "@/lib/data/config";
import { prng } from "@/lib/prng";
import { useReducedMotion } from "@/hooks/use-motion";

/**
 * COLLATERAL INTELLIGENCE FIELD — a sparse network of nodes and hairline links behind the hero.
 *
 *  • Ambient packets drift left → right along the network (asset → state → checks → policy → decision).
 *  • The cursor bends nearby nodes toward it (spring-smoothed), brightens them and their links, and casts a very
 *    faint radial light. No cursor follower is drawn.
 *  • When the LiveDataManager makes a real request, a bright packet enters from the left; a successful response
 *    sends a "decision" packet through. Motion here is driven by real system events, not a timer.
 *
 * Performance: one canvas, precomputed neighbour links, ≤ ~300 line draws/frame, capped DPR, paused when off-screen
 * or the tab is hidden. Touch devices get fewer nodes and no cursor. prefers-reduced-motion renders one static frame.
 */

interface Node {
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
  len: number;
}
interface Packet {
  link: number;
  t: number;
  /** +1: a → b, -1: b → a (chosen so packets always travel rightwards) */
  dir: 1 | -1;
  speed: number;
  kind: "data" | "request" | "decision";
  hops: number;
}

const CYAN = "84,214,255";
const AZURE = "59,130,246";

export function CollateralField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const coarse = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;
    const count = coarse ? FIELD.mobile : FIELD.desktop;
    const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1 : 1.5);

    // deterministic layout: the same field every load
    const rnd = prng(4663);
    const nodes: Node[] = Array.from({ length: count }, () => ({ bx: rnd(), by: rnd(), ph: rnd() * Math.PI * 2, ox: 0, oy: 0, glow: 0 }));
    let links: Link[] = [];
    let neighbours: number[][] = [];
    let W = 0;
    let H = 0;
    const packets: Packet[] = [];

    const pos = (n: Node, t: number) => ({
      x: n.bx * W + Math.sin(t * 0.00011 + n.ph) * 9 + n.ox,
      y: n.by * H + Math.cos(t * 0.00009 + n.ph * 1.3) * 9 + n.oy,
    });

    function layout() {
      const r = parent!.getBoundingClientRect();
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      canvas!.width = Math.round(W * dpr);
      canvas!.height = Math.round(H * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      // links: each node connects to its nearest few neighbours inside the link distance (base positions)
      const maxD = coarse ? FIELD.linkDistance * 0.9 : FIELD.linkDistance;
      links = [];
      neighbours = nodes.map(() => []);
      const seen = new Set<string>();
      nodes.forEach((n, i) => {
        const cand = nodes
          .map((m, j) => ({ j, d: Math.hypot((n.bx - m.bx) * W, (n.by - m.by) * H) }))
          .filter((c) => c.j !== i && c.d < maxD)
          .sort((p, q) => p.d - q.d)
          .slice(0, 3);
        cand.forEach(({ j, d }) => {
          const key = i < j ? `${i}-${j}` : `${j}-${i}`;
          if (seen.has(key)) return;
          seen.add(key);
          links.push({ a: i, b: j, len: d });
          neighbours[i].push(links.length - 1);
          neighbours[j].push(links.length - 1);
        });
      });
    }

    const dirOf = (li: number): 1 | -1 => (nodes[links[li].a].bx <= nodes[links[li].b].bx ? 1 : -1);

    function spawn(kind: Packet["kind"], startLeft = false) {
      if (links.length === 0 || packets.length > 26) return;
      let li = Math.floor(rnd() * links.length);
      if (startLeft) {
        // enter from the left edge: the link whose left node is furthest left
        let best = 1;
        links.forEach((l, i) => {
          const x = Math.min(nodes[l.a].bx, nodes[l.b].bx);
          if (x < best) {
            best = x;
            li = i;
          }
        });
      }
      packets.push({ link: li, t: 0, dir: dirOf(li), speed: kind === "data" ? 0.00016 : kind === "request" ? 0.0009 : 0.0011, kind, hops: 0 });
    }

    // cursor spring
    const cur = { x: -9999, y: -9999, vx: 0, vy: 0, tx: -9999, ty: -9999, active: false };
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

    function frame(t: number, dt: number) {
      ctx!.clearRect(0, 0, W, H);

      // spring the light toward the pointer (critically damped-ish): expensive-feeling, no overshoot jitter
      if (cur.active && !coarse) {
        const k = 90;
        const c = 18;
        const s = dt / 1000;
        cur.vx += ((cur.tx - cur.x) * k - cur.vx * c) * s;
        cur.vy += ((cur.ty - cur.y) * k - cur.vy * c) * s;
        cur.x += cur.vx * s;
        cur.y += cur.vy * s;
      }

      const P = nodes.map((n) => pos(n, t));
      const R = FIELD.cursorRadius;

      // node displacement + glow toward / from the cursor
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
            tox = (dx / (d || 1)) * s * 16;
            toy = (dy / (d || 1)) * s * 16;
          }
        }
        n.glow += (tg - n.glow) * 0.1;
        n.ox += (tox - n.ox) * 0.08;
        n.oy += (toy - n.oy) * 0.08;
        P[i] = pos(n, t);
      });

      // very faint radial light under the cursor
      if (cur.active && !coarse) {
        const g = ctx!.createRadialGradient(cur.x, cur.y, 0, cur.x, cur.y, 240);
        g.addColorStop(0, `rgba(${CYAN},0.075)`);
        g.addColorStop(1, `rgba(${CYAN},0)`);
        ctx!.fillStyle = g;
        ctx!.fillRect(cur.x - 240, cur.y - 240, 480, 480);
      }

      // links
      ctx!.lineWidth = 1;
      for (const l of links) {
        const a = P[l.a];
        const b = P[l.b];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const maxD = (coarse ? FIELD.linkDistance * 0.9 : FIELD.linkDistance) * 1.25;
        if (d > maxD) continue;
        const base = 0.075 * (1 - d / maxD);
        const boost = Math.max(nodes[l.a].glow, nodes[l.b].glow) * 0.3;
        ctx!.strokeStyle = `rgba(${CYAN},${(base + boost).toFixed(3)})`;
        ctx!.beginPath();
        ctx!.moveTo(a.x, a.y);
        ctx!.lineTo(b.x, b.y);
        ctx!.stroke();
      }

      // packets travel along links; on arrival they hop to a neighbouring link heading further right
      for (let i = packets.length - 1; i >= 0; i--) {
        const p = packets[i];
        const l = links[p.link];
        p.t += p.speed * dt * (1 / Math.max(0.35, l.len / 120));
        if (p.t >= 1) {
          const endNode = p.dir === 1 ? l.b : l.a;
          const next = neighbours[endNode].filter((li) => li !== p.link && nodes[links[li].a].bx !== nodes[links[li].b].bx).filter((li) => {
            const nl = links[li];
            const other = nl.a === endNode ? nl.b : nl.a;
            return nodes[other].bx > nodes[endNode].bx;
          });
          p.hops++;
          if (next.length === 0 || p.hops > 14) {
            packets.splice(i, 1);
            if (p.kind === "data") spawn("data");
            continue;
          }
          const li = next[Math.floor(rnd() * next.length)];
          p.link = li;
          p.dir = links[li].a === endNode ? 1 : -1;
          p.t = 0;
          continue;
        }
        const from = P[p.dir === 1 ? links[p.link].a : links[p.link].b];
        const to = P[p.dir === 1 ? links[p.link].b : links[p.link].a];
        const x = from.x + (to.x - from.x) * p.t;
        const y = from.y + (to.y - from.y) * p.t;
        const strong = p.kind !== "data";
        const r = strong ? 2.2 : 1.5;
        const a = strong ? 0.9 : 0.5;
        const col = p.kind === "decision" ? "57,229,140" : CYAN;
        // halo as a flat translucent disc: far cheaper than a per-packet radial gradient on software rasterizers
        ctx!.fillStyle = `rgba(${col},${strong ? 0.16 : 0.07})`;
        ctx!.beginPath();
        ctx!.arc(x, y, r * 3.6, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.fillStyle = `rgba(${col},${a})`;
        ctx!.beginPath();
        ctx!.arc(x, y, r, 0, Math.PI * 2);
        ctx!.fill();
      }

      // nodes
      nodes.forEach((n, i) => {
        const p = P[i];
        const g = n.glow;
        if (g > 0.05) {
          ctx!.fillStyle = `rgba(${CYAN},${(g * 0.14).toFixed(3)})`;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, 3 + g * 9, 0, Math.PI * 2);
          ctx!.fill();
        }
        ctx!.fillStyle = `rgba(${g > 0.05 ? CYAN : AZURE},${(0.28 + g * 0.6).toFixed(3)})`;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, 1.1 + g * 1.4, 0, Math.PI * 2);
        ctx!.fill();
      });
    }

    layout();
    for (let i = 0; i < (coarse ? 4 : 8); i++) spawn("data");

    if (reduce) {
      frame(0, 16);
      const onResize = () => {
        layout();
        frame(0, 16);
      };
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }

    let raf = 0;
    let last = 0;
    let visible = true;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(50, last ? t - last : 16);
      last = t;
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
      visible ? start() : stop();
    });
    io.observe(parent);
    const ro = new ResizeObserver(() => layout());
    ro.observe(parent);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    // real system events drive the brightest packets
    const offSignals =
      DATA_MODE === "demo"
        ? () => {}
        : liveManager().on((s: Signal) => {
            if (s.type === "request") spawn("request", true);
            else if (s.type === "response" && s.ok) spawn("decision", true);
            else if (s.type === "eligibility" || s.type === "price" || s.type === "state") spawn("decision", true);
          });

    start();
    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      offSignals();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [reduce]);

  return <canvas ref={ref} aria-hidden className={className} />;
}
