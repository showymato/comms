import type { EligibilityStatus } from "@/types";

/**
 * COMMS SPHERE ENGINE — the live system drawn as a slowly turning network.
 *
 * Framework-free canvas renderer with its own 3D projection (no WebGL / Three.js: ~25 nodes and ~30 curves do not need
 * a GPU pipeline, and it keeps the bundle and the cold-start cost near zero).
 *
 *   core (COMMS)  ·  orbit 1 + 2: Stock Tokens (real registry assets)  ·  orbit 3: pipeline + data-source nodes
 *
 * The engine draws only what it is given (`setData`). It never invents a token, a status or a health value.
 * Motion: critically damped springs for tilt / focus / zoom, orbital drift at "barely noticeable" speed, packets only
 * on selected routes plus a sparse ambient trickle. Off-screen / hidden tab / reduced motion → no continuous loop.
 */

export type Health = "ok" | "warn" | "down" | "unknown";
export type SystemId = "registry" | "prices" | "chain" | "state" | "checks" | "policy" | "decision";
export type Intent = "idle" | "explore" | "evaluate";

export interface SphereToken {
  id: string;
  symbol: string;
  status: EligibilityStatus;
  /** true = ACTIVE, false = INACTIVE, null = not reported */
  active: boolean | null;
}
export interface SphereSystem {
  id: SystemId;
  label: string;
  health: Health;
}
export interface CardPos {
  x: number;
  y: number;
  r: number;
  /** node is on the near hemisphere */
  front: boolean;
}
export interface EngineStats {
  fps: number;
  nodes: number;
  links: number;
  packets: number;
  running: boolean;
}
export interface EngineCallbacks {
  onHover?: (id: string | null) => void;
  onSelect?: (id: string) => void;
  /** a click / tap on empty space while a token is selected */
  onDeselect?: () => void;
  onCard?: (p: CardPos | null) => void;
  onStats?: (s: EngineStats) => void;
  /** the first time the visitor touches the sphere: the network wakes up for ~1.2 s, then settles back to idle */
  onWake?: () => void;
}

/* ───────────── math ───────────── */

const TAU = Math.PI * 2;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const angDiff = (a: number, b: number) => {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
};
function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Spring {
  x: number;
  v: number;
}
function stepSpring(s: Spring, target: number, dt: number, snap: boolean, omega = 6.5, zeta = 0.95) {
  if (snap) {
    s.x = target;
    s.v = 0;
    return;
  }
  const a = omega * omega * (target - s.x) - 2 * zeta * omega * s.v;
  s.v += a * dt;
  s.x += s.v * dt;
}

/* ───────────── palette (drawn on the dark sphere) ───────────── */

type RGB = [number, number, number];
const STATUS_RGB: Record<EligibilityStatus, RGB> = {
  ELIGIBLE: [57, 229, 140],
  CONDITIONAL: [255, 184, 77],
  INELIGIBLE: [255, 107, 107],
  UNKNOWN: [143, 163, 191],
};
const SIGNAL: RGB = [0, 200, 255];
const PAPER: RGB = [245, 245, 242];
/** granules that drift outside the dark disc sit on the light page */
const INK: RGB = [22, 32, 42];
const HEALTH_RGB: Record<Health, RGB> = { ok: SIGNAL, warn: STATUS_RGB.CONDITIONAL, down: STATUS_RGB.INELIGIBLE, unknown: STATUS_RGB.UNKNOWN };
const rgba = (c: RGB, a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${clamp(a).toFixed(3)})`;
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/* ───────────── structures ───────────── */

interface Orbit {
  r: number;
  e: number;
  rx: number;
  rz: number;
  ph: number;
  speed: number;
  dir: number;
}
const ORBITS: Orbit[] = [
  { r: 0.46, e: 0.88, rx: 0.55, rz: 0.25, ph: 0.4, speed: 0.07, dir: 1 },
  { r: 0.72, e: 0.83, rx: -0.42, rz: -0.32, ph: 2.1, speed: 0.046, dir: -1 },
  { r: 0.93, e: 0.92, rx: 0.2, rz: 0.5, ph: 4.0, speed: 0.03, dir: 1 },
];
const RING_SEGS = 72;

interface Node {
  id: string;
  kind: "core" | "token" | "system";
  label: string;
  orbit: number;
  theta: number;
  status: EligibilityStatus;
  active: boolean | null;
  health: Health;
  hover: number;
  sel: number;
  glow: number;
  bornAt: number;
  /** local (pre-view) position */
  lx: number;
  ly: number;
  lz: number;
  /** projected */
  sx: number;
  sy: number;
  sc: number;
  depth: number;
  vz: number;
  /** cursor gravity: smoothed screen-space offset (px) toward the pointer, and how strongly the node is being pulled (0–1) */
  gx: number;
  gy: number;
  pull: number;
}
interface Link {
  a: number;
  b: number;
  strength: number;
  kind: "core" | "ring" | "pipe";
  bend: number;
  energy: number;
  /** last projected geometry */
  ax: number;
  ay: number;
  cx: number;
  cy: number;
  bx: number;
  by: number;
  az: number;
  bz: number;
}
interface Leg {
  li: number;
  fwd: boolean;
}
interface Packet {
  legs: Leg[];
  leg: number;
  t: number;
  speed: number;
  strong: boolean;
  rgb: RGB;
  done?: () => void;
}
interface Pulse {
  node: number;
  t: number;
  rgb: RGB;
  big: boolean;
}

/**
 * The granule field: fine dust that lives on and inside the sphere (plus a thin haze just outside it).
 * Each granule has a home on the sphere (spherical coords, slowly drifting at its own rate → differential rotation) and a
 * screen-space displacement that springs back home. The cursor parts the dust, a touched node gathers it into an orbiting
 * cloud tinted with that node's status, and clicks send a ripple through it. Purely visual: it carries no data.
 */
interface Granules {
  n: number;
  /** [0, nIn) sit inside the sphere disc (clipped to it); the rest float just outside */
  nIn: number;
  lon: Float32Array;
  cl: Float32Array;
  sl: Float32Array;
  rad: Float32Array;
  w: Float32Array;
  size: Float32Array;
  ph: Float32Array;
  /** preferred orbit radius (px) when gathered around a node */
  ring: Float32Array;
  px: Float32Array;
  py: Float32Array;
  pz: Float32Array;
  dx: Float32Array;
  dy: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  heat: Float32Array;
  tint: Float32Array;
}
interface Ripple {
  x: number;
  y: number;
  t: number;
}
interface Focus {
  x: number;
  y: number;
  k: number;
  rs: number;
  tang: number;
}

function makeGranules(rnd: () => number, total: number): Granules {
  const n = total;
  const nIn = Math.round(total * 0.84);
  const f = () => new Float32Array(n);
  const G: Granules = { n, nIn, lon: f(), cl: f(), sl: f(), rad: f(), w: f(), size: f(), ph: f(), ring: f(), px: f(), py: f(), pz: f(), dx: f(), dy: f(), vx: f(), vy: f(), heat: f(), tint: f() };
  for (let i = 0; i < n; i++) {
    const z = rnd() * 2 - 1;
    G.sl[i] = z;
    G.cl[i] = Math.sqrt(1 - z * z);
    G.lon[i] = rnd() * TAU;
    // a granular skin on the surface, a looser volume inside, a faint haze outside
    G.rad[i] = i >= nIn ? 1.04 + 0.2 * rnd() : rnd() < 0.6 ? 0.95 + 0.045 * rnd() : 0.22 + 0.72 * Math.cbrt(rnd());
    // equator turns faster than the poles
    G.w[i] = (0.025 + 0.075 * rnd()) * (rnd() < 0.5 ? -1 : 1) * (1 - 0.55 * Math.abs(z));
    G.size[i] = 0.9 + rnd() * rnd() * 2.1;
    G.ph[i] = rnd() * TAU;
    G.ring[i] = 14 + rnd() * 40;
  }
  return G;
}

const STAGE_ORDER: SystemId[] = ["state", "checks", "policy", "decision"];
const WAKE_MS = 1200;
/** cursor gravity: reach and maximum pull, in px */
const GRAVITY_REACH = 130;
const GRAVITY_MAX = 4.5;
/** brightness steps: granules are batched into (colour × level) paths so a frame costs a handful of fills */
const GRAIN_LEVELS = 6;

/* ───────────── engine ───────────── */

export class SphereEngine {
  private ctx: CanvasRenderingContext2D;
  private cb: EngineCallbacks;
  private compact: boolean;
  private reduced: boolean;
  private dprCap: number;

  private W = 0;
  private H = 0;
  private dpr = 1;
  private cx = 0;
  private cy = 0;
  private R = 100;
  private body: HTMLCanvasElement | null = null;
  private sprites = new Map<string, HTMLCanvasElement>();
  private fontFamily = "ui-monospace, monospace";

  private nodes: Node[] = [];
  private byId = new Map<string, number>();
  private links: Link[] = [];
  private packets: Packet[] = [];
  private pulses: Pulse[] = [];
  private thetaMemory = new Map<string, number>();
  private gr: Granules;
  private ripples: Ripple[] = [];
  private foci: Focus[] = [
    { x: 0, y: 0, k: 0, rs: 100, tang: 1 },
    { x: 0, y: 0, k: 0, rs: 70, tang: 0.6 },
  ];
  private cloud: RGB = SIGNAL;
  /** current on-screen radius of the sphere disc */
  private limbR = 100;
  private grid: Float32Array[] = [];

  private T = 0;
  private last = 0;
  private raf = 0;
  private visible = true;
  private mounted = false;
  private pending = false;
  private frameNo = 0;
  private acc = 0;
  private fpsEma = 60;
  private statsAt = 0;

  private yaw: Spring = { x: 0.5, v: 0 };
  private pitch: Spring = { x: 0.12, v: 0 };
  private zoom: Spring = { x: 1, v: 0 };
  private yawBase = 0.5;
  private mouse = { x: 0, y: 0, tx: 0, ty: 0, inside: false, over: false, px: 0, py: 0 };
  private drag: { id: number; x: number; y: number; t: number; moved: number } | null = null;
  /** drag-to-rotate: release velocity (rad/s) carries on and decays; vertical drag tilts and eases back */
  private yawVel = 0;
  private pitchOff = 0;

  private ptrHover: string | null = null;
  private extHover: string | null = null;
  private selectedId: string | null = null;
  private cardId: string | null = null;
  private focusAmt = 0;
  private intent: Intent = "idle";
  private intentAmt = 0;
  private exploreAmt = 0;
  private evalAmt = 0;
  private evalHold = 0;
  private scroll = 0;
  private wallet: "none" | "ok" | "wrong" = "none";

  private ring = { prog: 0, rgb: SIGNAL as RGB, target: SIGNAL as RGB, settled: false };
  private ambientAt = 0;
  private ambientN = 0;

  /** the entrance clock is frozen (nothing drawn) until begin() — the page loader decides when the network starts forming */
  private held = false;
  /** the first-touch "wake": envelope 0 → 1 → 0 over WAKE_MS */
  private woken = false;
  private wakeAt = -1;
  private wakeAmt = 0;
  /** strongest hovered token (0–1): the rest of the network dims a little */
  private hoverAmt = 0;
  private dtMs = 16;
  private wakeTok: Node | undefined;

  private cleanup: Array<() => void> = [];

  constructor(private canvas: HTMLCanvasElement, opts: { compact: boolean; reduced: boolean; dprCap?: number; hold?: boolean }, cb: EngineCallbacks) {
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("2D canvas unavailable");
    this.ctx = ctx;
    this.cb = cb;
    this.compact = opts.compact;
    this.reduced = opts.reduced;
    this.dprCap = opts.dprCap ?? 1.75;
    this.held = !!opts.hold && !opts.reduced;
    if (this.reduced) this.T = 5000;
    const rnd = mulberry(4663);
    this.gr = makeGranules(rnd, this.compact ? 320 : 900);
    // sparse lat / long grid — the "system coordinates" texture
    const merid = this.compact ? 3 : 6;
    for (let k = 0; k < merid; k++) {
      const a = (k * Math.PI) / merid;
      const pts = new Float32Array(3 * 49);
      for (let i = 0; i <= 48; i++) {
        const t = (i / 48) * TAU;
        pts[i * 3] = Math.cos(t) * Math.cos(a) * 0.985;
        pts[i * 3 + 1] = Math.sin(t) * 0.985;
        pts[i * 3 + 2] = Math.cos(t) * Math.sin(a) * 0.985;
      }
      this.grid.push(pts);
    }
    for (const y of this.compact ? [0] : [-0.52, 0, 0.52]) {
      const rr = Math.sqrt(1 - y * y) * 0.985;
      const pts = new Float32Array(3 * 49);
      for (let i = 0; i <= 48; i++) {
        const t = (i / 48) * TAU;
        pts[i * 3] = Math.cos(t) * rr;
        pts[i * 3 + 1] = y * 0.985;
        pts[i * 3 + 2] = Math.sin(t) * rr;
      }
      this.grid.push(pts);
    }
    this.addCore();
  }

  /* ───────────── lifecycle ───────────── */

  mount() {
    if (this.mounted) return;
    this.mounted = true;
    const parent = this.canvas.parentElement!;
    const fam = getComputedStyle(document.body).getPropertyValue("--font-geist-mono").trim();
    if (fam) this.fontFamily = `${fam}, ui-monospace, monospace`;
    this.resize();

    const ro = new ResizeObserver(() => {
      this.resize();
      this.invalidate();
    });
    ro.observe(parent);
    const io = new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      this.visible ? this.start() : this.stop();
    });
    io.observe(parent);
    const onVis = () => (document.hidden ? this.stop() : this.start());
    document.addEventListener("visibilitychange", onVis);

    const c = this.canvas;
    c.style.cursor = "grab";
    const onWinMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = c.getBoundingClientRect();
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;
      this.mouse.px = px;
      this.mouse.py = py;
      // tilt follows the cursor across the whole viewport, weighted by distance, so the sphere leans before the cursor arrives
      const nx = (e.clientX - (r.left + r.width / 2)) / Math.max(320, window.innerWidth * 0.5);
      const ny = (e.clientY - (r.top + r.height / 2)) / Math.max(320, window.innerHeight * 0.5);
      this.mouse.tx = clamp(nx, -1, 1);
      this.mouse.ty = clamp(ny, -1, 1);
      // the floating card (and other sphere UI) sits above the canvas: never pick nodes through it
      const overUi = e.target instanceof Element && e.target.closest("[data-sphere-ui]") !== null;
      this.mouse.inside = !overUi && px >= 0 && py >= 0 && px <= this.W && py <= this.H;
      this.mouse.over = true;
      this.setPointerHover(this.mouse.inside ? this.pick(px, py) : null);
      this.invalidate();
    };
    const onDocLeave = () => {
      this.mouse.tx = 0;
      this.mouse.ty = 0;
      this.mouse.inside = false;
      this.mouse.over = false;
      this.setPointerHover(null);
      this.invalidate();
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, moved: 0 };
      this.yawVel = 0;
      // touch has no hover: the first tap on the sphere wakes it
      if (e.pointerType !== "mouse") this.triggerWake();
      // a grab while a node is focused hands the camera to the hand: continue from where the view is now
      if (this.selectedId) this.yawBase = this.yaw.x - (this.mouse.x * 0.34 + this.scroll * 0.9);
      try {
        c.setPointerCapture(e.pointerId);
      } catch {
        /* capture is best-effort */
      }
    };
    const onDragMove = (e: PointerEvent) => {
      const d = this.drag;
      if (!d || d.id !== e.pointerId) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      const dts = Math.max(0.008, (e.timeStamp - d.t) / 1000);
      const mouse = e.pointerType === "mouse";
      d.moved += Math.abs(dx) + (mouse ? Math.abs(dy) : 0);
      d.x = e.clientX;
      d.y = e.clientY;
      d.t = e.timeStamp;
      if (d.moved > 6) {
        this.yawBase += dx * 0.006;
        this.yawVel = this.yawVel * 0.5 + ((dx * 0.006) / dts) * 0.5;
        if (mouse) {
          this.pitchOff = clamp(this.pitchOff + dy * 0.004, -0.6, 0.6);
          c.style.cursor = "grabbing";
        }
        this.invalidate();
      }
    };
    const onUp = (e: PointerEvent) => {
      const d = this.drag;
      this.drag = null;
      if (!d || d.id !== e.pointerId) return;
      if (e.pointerType === "mouse") c.style.cursor = this.ptrHover ? "pointer" : "grab";
      if (d.moved > 8) {
        if (this.reduced) this.yawVel = 0;
        return;
      }
      const r = c.getBoundingClientRect();
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;
      const id = this.pick(px, py, e.pointerType === "mouse" ? 0 : 14);
      if (id !== null && this.nodes[this.byId.get(id)!]?.kind === "token") this.cb.onSelect?.(id);
      else {
        // empty space: a ripple through the granules, and it closes an open card
        this.addRipple(px, py);
        if (this.selectedId) this.cb.onDeselect?.();
      }
    };
    const onCancel = () => {
      this.drag = null;
    };
    window.addEventListener("pointermove", onWinMove, { passive: true });
    document.addEventListener("pointerleave", onDocLeave);
    window.addEventListener("blur", onDocLeave);
    c.addEventListener("pointerdown", onDown);
    c.addEventListener("pointermove", onDragMove);
    c.addEventListener("pointerup", onUp);
    c.addEventListener("pointercancel", onCancel);

    this.cleanup.push(
      () => ro.disconnect(),
      () => io.disconnect(),
      () => document.removeEventListener("visibilitychange", onVis),
      () => window.removeEventListener("pointermove", onWinMove),
      () => document.removeEventListener("pointerleave", onDocLeave),
      () => window.removeEventListener("blur", onDocLeave),
      () => c.removeEventListener("pointerdown", onDown),
      () => c.removeEventListener("pointermove", onDragMove),
      () => c.removeEventListener("pointerup", onUp),
      () => c.removeEventListener("pointercancel", onCancel),
    );
    this.start();
    this.invalidate();
  }

  /** start the entrance: points → curves → connections → token nodes → core. The clock was frozen at 0 until now. */
  begin() {
    if (!this.held) return;
    this.held = false;
    this.last = 0;
    this.invalidate();
  }

  /** the first touch: the network wakes for ~1.2 s and settles back (does nothing twice) */
  private triggerWake() {
    if (this.woken || this.held) return;
    this.woken = true;
    this.wakeAt = this.T;
    this.cb.onWake?.();
    if (this.reduced) return;
    // a few small packets start moving along the core connections
    const cands = this.links.map((l, i) => ({ l, i })).filter(({ l }) => l.kind === "core");
    for (let k = 0; k < Math.min(4, cands.length); k++) {
      const c = cands[(k * 3) % cands.length];
      this.packets.push({ legs: [{ li: c.i, fwd: k % 2 === 0 }], leg: 0, t: 0, speed: 1 / 1100, strong: false, rgb: SIGNAL });
    }
  }

  destroy() {
    this.stop();
    this.cleanup.forEach((f) => f());
    this.cleanup = [];
    this.mounted = false;
    this.sprites.clear();
    this.body = null;
  }

  private start() {
    if (this.reduced || !this.mounted || !this.visible || document.hidden || this.raf) return;
    this.last = 0;
    this.raf = requestAnimationFrame(this.loop);
  }
  private stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
  private loop = (t: number) => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(50, this.last ? t - this.last : 16);
    this.last = t;
    this.acc += dt;
    // weaker hardware / phones: animate at ~30 fps
    if (this.compact && (this.frameNo++ & 1) === 1) return;
    const step = this.acc;
    this.acc = 0;
    this.frame(step);
  };
  /** reduced-motion mode has no loop: render one frame whenever something changed */
  invalidate() {
    if (!this.mounted) return;
    if (this.reduced) {
      if (this.pending) return;
      this.pending = true;
      requestAnimationFrame(() => {
        this.pending = false;
        this.frame(16);
      });
    }
  }

  setReduced(r: boolean) {
    if (r === this.reduced) return;
    this.reduced = r;
    if (r) {
      this.stop();
      this.T = 5000;
    } else this.start();
    this.invalidate();
  }

  private resize() {
    const p = this.canvas.parentElement!;
    const r = p.getBoundingClientRect();
    this.W = Math.max(1, r.width);
    this.H = Math.max(1, r.height);
    this.dpr = Math.min(window.devicePixelRatio || 1, this.compact ? 1.5 : this.dprCap);
    this.canvas.width = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.cx = this.W / 2;
    this.cy = this.H / 2;
    this.R = (Math.min(this.W, this.H) / 2) * 0.86;
    this.buildBody();
  }

  private buildBody() {
    const size = Math.ceil(this.R * 2 + 8);
    const c = document.createElement("canvas");
    c.width = Math.round(size * this.dpr);
    c.height = Math.round(size * this.dpr);
    const g = c.getContext("2d")!;
    g.scale(this.dpr, this.dpr);
    const m = size / 2;
    const grad = g.createRadialGradient(m - this.R * 0.28, m - this.R * 0.34, this.R * 0.05, m, m, this.R);
    grad.addColorStop(0, "rgba(40,54,66,0.96)");
    grad.addColorStop(0.55, "rgba(19,27,34,0.97)");
    grad.addColorStop(1, "rgba(9,13,17,0.98)");
    g.fillStyle = grad;
    g.beginPath();
    g.arc(m, m, this.R, 0, TAU);
    g.fill();
    // limb: thin cool rim + inner falloff
    const limb = g.createRadialGradient(m, m, this.R * 0.82, m, m, this.R);
    limb.addColorStop(0, "rgba(0,200,255,0)");
    limb.addColorStop(1, "rgba(0,200,255,0.10)");
    g.fillStyle = limb;
    g.beginPath();
    g.arc(m, m, this.R, 0, TAU);
    g.fill();
    g.strokeStyle = "rgba(245,245,242,0.16)";
    g.lineWidth = 1;
    g.beginPath();
    g.arc(m, m, this.R - 0.5, 0, TAU);
    g.stroke();
    this.body = c;
  }

  private sprite(rgb: RGB): HTMLCanvasElement {
    const key = rgb.map((v) => v | 0).join(",");
    let s = this.sprites.get(key);
    if (!s) {
      s = document.createElement("canvas");
      s.width = s.height = 64;
      const g = s.getContext("2d")!;
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, `rgba(${key},0.9)`);
      gr.addColorStop(0.35, `rgba(${key},0.22)`);
      gr.addColorStop(1, `rgba(${key},0)`);
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
      this.sprites.set(key, s);
    }
    return s;
  }

  /* ───────────── public API ───────────── */

  setData(tokens: SphereToken[], system: SphereSystem[]) {
    const prev = new Map(this.nodes.map((n) => [n.id, n]));
    // remember angles so a data refresh never makes nodes jump
    this.nodes.forEach((n) => n.kind !== "core" && this.thetaMemory.set(n.id, n.theta));
    const changed: string[] = [];
    const old = this.nodes;
    const core = old[0];
    const next: Node[] = [core];
    const cap1 = 3;
    const cap2 = this.compact ? 3 : 7;
    const toks = tokens.slice(0, cap1 + cap2);
    const place = (arr: Array<SphereToken | SphereSystem>, orbit: number, kind: "token" | "system", offset: number) => {
      arr.forEach((it, i) => {
        const p = prev.get(it.id);
        const theta = this.thetaMemory.get(it.id) ?? offset + (i / Math.max(1, arr.length)) * TAU + (i % 2) * 0.12;
        const n: Node = p ?? this.makeNode(it.id, kind, orbit, theta);
        n.kind = kind;
        n.orbit = orbit;
        n.label = "symbol" in it ? it.symbol : it.label;
        if ("status" in it) {
          if (p && p.status !== it.status) changed.push(it.id);
          n.status = it.status;
          n.active = it.active;
        } else n.health = it.health;
        next.push(n);
      });
    };
    place(toks.slice(0, cap1), 0, "token", 0.3);
    place(toks.slice(cap1), 1, "token", 1.1);
    const sys = this.compact ? system.filter((s) => s.id !== "registry" && s.id !== "prices") : system;
    place(sys, 2, "system", 0.6);
    this.nodes = next;
    this.byId = new Map(next.map((n, i) => [n.id, i]));
    this.buildLinks();
    if (this.selectedId && !this.byId.has(this.selectedId)) this.selectedId = null;
    if (this.ptrHover && !this.byId.has(this.ptrHover)) this.ptrHover = null;
    changed.forEach((id) => this.recalculate(id));
    this.invalidate();
  }

  private addCore() {
    this.nodes = [this.makeNode("core", "core", 0, 0)];
    this.nodes[0].label = "COMMS";
    // the central intelligence field comes online after the network around it
    this.nodes[0].bornAt = this.reduced ? -5000 : 950;
    this.byId = new Map([["core", 0]]);
  }
  private makeNode(id: string, kind: Node["kind"], orbit: number, theta: number): Node {
    return {
      id,
      kind,
      label: id,
      orbit,
      theta,
      status: "UNKNOWN",
      active: null,
      health: "unknown",
      hover: 0,
      sel: 0,
      glow: 0,
      bornAt: this.T + (this.reduced ? -5000 : 520 + this.nodes.length * 55),
      lx: 0,
      ly: 0,
      lz: 0,
      sx: 0,
      sy: 0,
      sc: 1,
      depth: 1,
      vz: 0,
      gx: 0,
      gy: 0,
      pull: 0,
    };
  }

  private buildLinks() {
    const prev = new Map(this.links.map((l) => [`${this.nodes[l.a]?.id}|${this.nodes[l.b]?.id}`, l]));
    const out: Link[] = [];
    const add = (a: number | undefined, b: number | undefined, strength: number, kind: Link["kind"], bend: number) => {
      if (a === undefined || b === undefined) return;
      const old = prev.get(`${this.nodes[a].id}|${this.nodes[b].id}`);
      out.push(old ? { ...old, a, b, strength } : { a, b, strength, kind, bend, energy: 0, ax: 0, ay: 0, cx: 0, cy: 0, bx: 0, by: 0, az: 0, bz: 0 });
    };
    const idx = (id: string) => this.byId.get(id);
    const tokensByOrbit: number[][] = [[], []];
    this.nodes.forEach((n, i) => {
      if (n.kind === "token") tokensByOrbit[n.orbit].push(i);
    });
    tokensByOrbit.forEach((arr, o) =>
      arr.forEach((i, k) => {
        add(0, i, o === 0 ? 0.55 : 0.32, "core", k % 2 ? 0.16 : -0.16);
        if (arr.length > 2) add(i, arr[(k + 1) % arr.length], 0.16, "ring", 0.22);
      }),
    );
    (["registry", "prices", "chain"] as SystemId[]).forEach((id, k) => add(0, idx(id), 0.34, "core", 0.2 - k * 0.14));
    add(0, idx("state"), 0.5, "pipe", 0.18);
    add(idx("state"), idx("checks"), 0.5, "pipe", 0.2);
    add(idx("checks"), idx("policy"), 0.5, "pipe", 0.2);
    add(idx("policy"), idx("decision"), 0.5, "pipe", 0.2);
    this.links = out;
  }

  setSelected(id: string | null, evaluate = true) {
    if (id === this.selectedId) return;
    if (id === null) this.yawBase = this.yaw.x;
    else if (this.selectedId === null) this.yawBase = this.yaw.x;
    this.selectedId = id;
    if (id) {
      // touching a node sends a ripple out from it through the granules
      const n = this.nodes[this.byId.get(id) ?? -1];
      if (n) this.addRipple(n.sx, n.sy);
      if (evaluate) this.evaluate(id);
    }
    this.invalidate();
  }
  private addRipple(x: number, y: number) {
    if (this.reduced) return;
    if (this.ripples.length >= 4) this.ripples.shift();
    this.ripples.push({ x, y, t: 0 });
  }
  setExternalHover(id: string | null) {
    this.extHover = id;
    this.invalidate();
  }
  setCardTarget(id: string | null) {
    this.cardId = id;
    this.invalidate();
  }
  setIntent(i: Intent) {
    this.intent = i;
    if (i === "evaluate") {
      this.evalHold = this.T + 1900;
      this.evaluate(this.selectedId ?? this.nodes.find((n) => n.kind === "token")?.id ?? null);
    }
    this.invalidate();
  }
  setScroll(p: number) {
    this.scroll = clamp(p);
    this.invalidate();
  }
  setCompact(c: boolean) {
    this.compact = c;
  }
  /** connected wallet: a thin arc on the limb. "wrong" = connected to another network. */
  setWallet(w: "none" | "ok" | "wrong") {
    this.wallet = w;
    this.invalidate();
  }

  /** a real state event for one asset: pulse the node and let the network react */
  pulse(id: string, strong = false) {
    const i = this.byId.get(id);
    if (i === undefined) return;
    this.pulses.push({ node: i, t: 0, rgb: strong ? SIGNAL : mix(SIGNAL, PAPER, 0.25), big: strong });
    this.nodes[i].glow = 1;
    this.links.forEach((l) => {
      if (l.a === i || l.b === i) l.energy = 1;
    });
    this.invalidate();
  }
  /** a real request completed: a small packet from that data source to the core */
  flow(sourceId: SystemId) {
    const i = this.byId.get(sourceId);
    if (i === undefined || this.reduced) return;
    const li = this.links.findIndex((l) => (l.a === 0 && l.b === i) || (l.a === i && l.b === 0));
    if (li < 0 || this.packets.length > 24) return;
    this.packets.push({ legs: [{ li, fwd: this.links[li].b === 0 }], leg: 0, t: 0, speed: 1 / 700, strong: false, rgb: SIGNAL });
    this.nodes[i].glow = Math.max(this.nodes[i].glow, 0.8);
  }
  /** re-run the evaluation path for a token whose real state just changed */
  recalculate(id: string) {
    this.pulse(id, true);
    this.evaluate(id);
  }

  /** token → core → state → checks → policy → decision: the actual COMMS pipeline, as a moving packet */
  evaluate(id: string | null) {
    if (!id) return;
    const ti = this.byId.get(id);
    if (ti === undefined) return;
    const tok = this.nodes[ti];
    const final = STATUS_RGB[tok.status];
    this.ring.target = final;
    this.evalHold = Math.max(this.evalHold, this.T + 1700);
    if (this.reduced) {
      this.ring.rgb = final;
      this.ring.prog = 1;
      this.ring.settled = true;
      this.invalidate();
      return;
    }
    this.ring.prog = 0;
    this.ring.settled = false;
    const seq = [ti, 0, ...STAGE_ORDER.map((s) => this.byId.get(s))].filter((v): v is number => v !== undefined);
    const legs: Leg[] = [];
    for (let k = 0; k < seq.length - 1; k++) {
      const li = this.links.findIndex((l) => (l.a === seq[k] && l.b === seq[k + 1]) || (l.a === seq[k + 1] && l.b === seq[k]));
      if (li >= 0) legs.push({ li, fwd: this.links[li].a === seq[k] });
    }
    if (!legs.length) return;
    const dest = seq[seq.length - 1];
    this.packets = this.packets.filter((p) => !p.strong);
    this.packets.push({
      legs,
      leg: 0,
      t: 0,
      speed: 1 / 300,
      strong: true,
      rgb: SIGNAL,
      done: () => {
        this.pulses.push({ node: dest, t: 0, rgb: final, big: true });
        this.ring.settled = true;
        this.nodes[dest].glow = 1;
      },
    });
    tok.glow = 1;
  }

  /* ───────────── picking ───────────── */

  private pick(px: number, py: number, slop = 0): string | null {
    let best = -1;
    let bd = Infinity;
    for (let i = 1; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      if (this.T < n.bornAt + 200) continue;
      const rad = (n.kind === "token" ? 9 : 7) * n.sc + 4 + slop;
      const d = Math.hypot(n.sx - px, n.sy - py);
      // near-side nodes win ties
      const score = d - n.depth * 3;
      if (d <= rad && score < bd) {
        bd = score;
        best = i;
      }
    }
    return best < 0 ? null : this.nodes[best].id;
  }
  private setPointerHover(id: string | null) {
    if (id === this.ptrHover) return;
    this.ptrHover = id;
    if (!this.drag || this.drag.moved <= 6) this.canvas.style.cursor = id && this.nodes[this.byId.get(id) ?? 0]?.kind === "token" ? "pointer" : "grab";
    this.cb.onHover?.(id && this.nodes[this.byId.get(id) ?? 0]?.kind === "token" ? id : null);
  }

  /* ───────────── frame ───────────── */

  private frame(dtMs: number) {
    if (this.held) {
      this.ctx.clearRect(0, 0, this.W, this.H);
      return;
    }
    const dt = dtMs / 1000;
    this.T += dtMs;
    this.dtMs = dtMs;
    this.fpsEma += (1000 / Math.max(1, dtMs) - this.fpsEma) * 0.06;
    this.update(dt, dtMs);
    this.project();
    this.draw(dtMs);
    if (this.cb.onStats && this.T - this.statsAt > 500) {
      this.statsAt = this.T;
      this.cb.onStats({ fps: Math.round(this.fpsEma), nodes: this.nodes.length, links: this.links.length, packets: this.packets.length, running: this.raf !== 0 });
    }
  }

  private orbitPos(n: Node, out: { x: number; y: number; z: number }) {
    if (n.kind === "core") {
      out.x = out.y = out.z = 0;
      return;
    }
    const o = ORBITS[n.orbit];
    const wob = 1 + 0.06 * Math.sin(2 * n.theta + o.ph);
    const x0 = o.r * wob * Math.cos(n.theta);
    const z0 = o.r * o.e * wob * Math.sin(n.theta);
    // tilt about X then Z
    const y1 = -z0 * Math.sin(o.rx);
    const z1 = z0 * Math.cos(o.rx);
    out.x = x0 * Math.cos(o.rz) - y1 * Math.sin(o.rz);
    out.y = x0 * Math.sin(o.rz) + y1 * Math.cos(o.rz);
    out.z = z1;
  }

  private update(dt: number, dtMs: number) {
    const snap = this.reduced;
    const ek = (tau: number) => (snap ? 1 : 1 - Math.exp(-dtMs / tau));

    // intents
    const evalOn = this.T < this.evalHold ? 1 : 0;
    this.evalAmt += (evalOn - this.evalAmt) * ek(260);
    this.exploreAmt += ((this.intent === "explore" ? 1 : 0) - this.exploreAmt) * ek(420);
    if (this.intent === "evaluate" && this.T >= this.evalHold) this.intent = "idle";

    // pointer smoothing
    const mk = ek(220);
    this.mouse.x += (this.mouse.tx - this.mouse.x) * mk;
    this.mouse.y += (this.mouse.ty - this.mouse.y) * mk;

    // the first touch: hovering the sphere itself (not just its surroundings) wakes the network
    if (!this.woken && this.mouse.inside && !this.reduced) {
      const d = Math.hypot(this.mouse.px - this.cx, this.mouse.py - this.cy);
      if (d < this.limbR * 1.02) this.triggerWake();
    }
    if (this.wakeAt >= 0) {
      const u = (this.T - this.wakeAt) / WAKE_MS;
      this.wakeAmt = u >= 1 ? 0 : smooth(clamp(u / 0.28)) * (1 - smooth(clamp((u - 0.55) / 0.45)));
    }
    const wake = this.wakeAmt;

    // nodes: orbit + hover / selection easing
    const hoverId = this.ptrHover ?? this.extHover;
    const pos = { x: 0, y: 0, z: 0 };
    let hoverMax = 0;
    this.nodes.forEach((n) => {
      if (n.kind !== "core") {
        const o = ORBITS[n.orbit];
        // hovering / selecting a node slows it; waking slows the whole network
        const slow = (1 - 0.9 * Math.max(n.hover, n.sel)) * (1 - 0.75 * wake);
        if (!snap) n.theta += o.dir * o.speed * (1 + this.exploreAmt * 1.4) * slow * dt;
        this.orbitPos(n, pos);
        n.lx = pos.x;
        n.ly = pos.y;
        n.lz = pos.z;
      }
      n.hover += ((n.id === hoverId ? 1 : 0) - n.hover) * ek(120);
      n.sel += ((n.id === this.selectedId ? 1 : 0) - n.sel) * ek(240);
      n.glow *= snap ? 0 : Math.exp(-dtMs / 700);
      // waking brightens the tokens facing the viewer
      if (wake > 0.02 && n.kind === "token" && n.vz > -0.2) n.glow = Math.max(n.glow, wake * 0.55);
      if (n.kind === "token") hoverMax = Math.max(hoverMax, n.hover);
    });
    this.hoverAmt += (hoverMax - this.hoverAmt) * ek(200);
    this.focusAmt += ((this.selectedId ? 1 : 0) - this.focusAmt) * ek(320);

    // stage nodes light in order as the page scrolls: token → state → checks → policy → decision
    STAGE_ORDER.forEach((s, i) => {
      const n = this.nodes[this.byId.get(s) ?? -1];
      if (n) n.glow = Math.max(n.glow, clamp(this.scroll * 5.2 - i, 0, 1) * 0.75);
    });

    // camera targets
    const sel = this.selectedId ? this.nodes[this.byId.get(this.selectedId) ?? -1] : undefined;
    const drift = this.reduced ? 0 : 0.026 * (1 + this.exploreAmt * 1.6) * (1 - 0.75 * wake);
    const dragging = !!this.drag && this.drag.moved > 6;
    if (snap) this.yawVel = 0;
    // hand-spin: momentum carries on after release and decays; a held, still hand carries none
    if (dragging) this.yawVel *= Math.exp(-dtMs / 90);
    else if (Math.abs(this.yawVel) > 0.002) {
      this.yawBase += this.yawVel * dt;
      this.yawVel *= Math.exp(-dtMs / 520);
    } else this.yawVel = 0;
    if (!this.drag) this.pitchOff *= Math.exp(-dtMs / 900);
    // with a node focused the view is locked to it, except while the hand (or its momentum) is turning the sphere
    const free = !sel || dragging || Math.abs(this.yawVel) > 0.05;
    if (!sel && !dragging) this.yawBase += drift * dt;
    const mouseYaw = this.mouse.x * 0.34 + this.scroll * 0.9;
    const mousePitch = this.mouse.y * 0.2 + this.scroll * 0.32 + this.pitchOff;
    let yawT = this.yawBase + mouseYaw;
    let pitchT = 0.12 + mousePitch;
    if (!free && sel && sel.kind === "token") {
      // bring the selected node to the near side, slightly left of centre so the card sits beside it
      const r = Math.hypot(sel.lx, sel.lz) || 1;
      const a = Math.atan2(sel.lx, sel.lz);
      const c = 0.26;
      const psi = -a + Math.asin(clamp(-c / r, -0.9, 0.9));
      const focusYaw = this.yaw.x + angDiff(this.yaw.x, psi);
      const zp = r * Math.cos(a + psi);
      const beta = Math.atan2(sel.ly, zp);
      yawT = focusYaw + mouseYaw * 0.4;
      pitchT = clamp(beta * 0.7, -0.55, 0.55) + mousePitch * 0.4;
    }
    const sub = Math.min(dt, 0.033);
    stepSpring(this.yaw, yawT, sub, snap);
    stepSpring(this.pitch, pitchT, sub, snap);
    stepSpring(this.zoom, 1 - this.scroll * 0.16 + (this.mouse.inside ? 0.015 : 0), sub, snap, 5.5);

    // ring progress
    if (!snap && !this.ring.settled) this.ring.prog = Math.min(0.96, this.ring.prog + dt / 1.5);
    else if (this.ring.settled) this.ring.prog += (1 - this.ring.prog) * ek(200);
    this.ring.rgb = mix(this.ring.rgb, this.ring.settled ? this.ring.target : SIGNAL, ek(260));

    // sparse ambient traffic, denser when exploring
    if (!snap) {
      const every = 1500 / (1 + this.exploreAmt * 2.4);
      if (this.T - this.ambientAt > every && this.packets.length < 6 + this.exploreAmt * 6) {
        this.ambientAt = this.T;
        this.spawnAmbient();
      }
    }
  }

  private spawnAmbient() {
    const cands = this.links.map((l, i) => ({ l, i })).filter(({ l }) => l.kind !== "ring");
    if (!cands.length) return;
    const pick = cands[(this.ambientN++ * 5 + 3) % cands.length];
    this.packets.push({ legs: [{ li: pick.i, fwd: this.ambientN % 3 !== 0 }], leg: 0, t: 0, speed: 1 / 3200, strong: false, rgb: PAPER });
  }

  private project() {
    const yc = Math.cos(this.yaw.x);
    const ys = Math.sin(this.yaw.x);
    const pc = Math.cos(this.pitch.x);
    const ps = Math.sin(this.pitch.x);
    const R = this.R * this.zoom.x * (this.introBody());
    for (const n of this.nodes) {
      const x1 = n.lx * yc + n.lz * ys;
      const z1 = -n.lx * ys + n.lz * yc;
      const y2 = n.ly * pc - z1 * ps;
      const z2 = n.ly * ps + z1 * pc;
      const f = 1 / (1 - 0.16 * z2);
      n.sx = this.cx + x1 * R * f;
      n.sy = this.cy + y2 * R * f;
      n.sc = f;
      n.vz = z2;
      n.depth = clamp((z2 + 1) / 2);
      if (n.kind === "token") this.gravity(n);
    }
    for (const l of this.links) {
      const a = this.nodes[l.a];
      const b = this.nodes[l.b];
      const mx = (a.sx + b.sx) / 2;
      const my = (a.sy + b.sy) / 2;
      const dx = b.sx - a.sx;
      const dy = b.sy - a.sy;
      l.ax = a.sx;
      l.ay = a.sy;
      l.bx = b.sx;
      l.by = b.sy;
      l.cx = mx - dy * l.bend;
      l.cy = my + dx * l.bend;
      l.az = a.vz;
      l.bz = b.vz;
    }
  }

  /**
   * Cursor gravity: a token near the pointer drifts 2–4.5 px toward it (springy, never snapping), and reports how strongly
   * it is being pulled so its connections and brightness can react. Screen-space only — the orbit itself is untouched.
   */
  private gravity(n: Node) {
    let tx = 0;
    let ty = 0;
    let pull = 0;
    const near = !this.reduced && this.mouse.inside && !(this.drag && this.drag.moved > 6) && n.vz > -0.35;
    if (near) {
      const dx = this.mouse.px - n.sx;
      const dy = this.mouse.py - n.sy;
      const d = Math.hypot(dx, dy);
      if (d < GRAVITY_REACH && d > 0.5) {
        pull = (1 - d / GRAVITY_REACH) ** 2;
        const mag = Math.min(GRAVITY_MAX, 1 + pull * (GRAVITY_MAX - 1)) * (d > 14 ? 1 : d / 14);
        tx = (dx / d) * mag;
        ty = (dy / d) * mag;
      }
    }
    const k = 1 - Math.exp(-this.dtMs / 140);
    n.gx += (tx - n.gx) * k;
    n.gy += (ty - n.gy) * k;
    n.pull += (pull - n.pull) * k;
    n.sx += n.gx;
    n.sy += n.gy;
  }

  private introBody() {
    if (this.reduced) return 1;
    return 0.94 + 0.06 * smooth(clamp(this.T / 700));
  }

  /* ───────────── draw ───────────── */

  private draw(dtMs: number) {
    const g = this.ctx;
    const { cx, cy } = this;
    const R = this.R * this.zoom.x * this.introBody();
    this.limbR = R;
    g.clearRect(0, 0, this.W, this.H);

    const T = this.T;
    // build order: fine points → the body they sit on → orbital curves drawing in → connections → nodes (per-node bornAt) → core
    const pointsA = smooth(clamp(T / 380));
    const bodyA = smooth(clamp((T - 160) / 520));
    const ringsA = clamp((T - 330) / 620);
    const linksA = smooth(clamp((T - 640) / 520));
    const dim = 1 - this.evalAmt * 0.28;
    const scrollFade = 1 - this.scroll * 0.35;
    // scrolling: the token links let go and the pipeline (state → checks → policy → decision) takes over
    const reorg = smooth(clamp((this.scroll - 0.3) / 0.4));
    const wake = this.wakeAmt;

    // body
    if (this.body) {
      g.globalAlpha = bodyA;
      const s = this.body.width / this.dpr;
      const sz = s * (R / this.R);
      g.drawImage(this.body, cx - sz / 2, cy - sz / 2, sz, sz);
      g.globalAlpha = 1;
    }

    // clip everything decorative to the sphere disc
    g.save();
    g.beginPath();
    g.arc(cx, cy, R - 0.5, 0, TAU);
    g.clip();

    const yc = Math.cos(this.yaw.x);
    const ys = Math.sin(this.yaw.x);
    const pc = Math.cos(this.pitch.x);
    const ps = Math.sin(this.pitch.x);
    const vp = (x: number, y: number, z: number, o: { x: number; y: number; z: number }) => {
      const x1 = x * yc + z * ys;
      const z1 = -x * ys + z * yc;
      const y2 = y * pc - z1 * ps;
      const z2 = y * ps + z1 * pc;
      const f = 1 / (1 - 0.16 * z2);
      o.x = cx + x1 * R * f;
      o.y = cy + y2 * R * f;
      o.z = z2;
    };
    const P = { x: 0, y: 0, z: 0 };

    // grid: near hemisphere only
    g.lineWidth = 1;
    g.strokeStyle = rgba(PAPER, 0.06 * bodyA * scrollFade);
    g.beginPath();
    for (const pts of this.grid) {
      let pen = false;
      for (let i = 0; i < pts.length; i += 3) {
        vp(pts[i], pts[i + 1], pts[i + 2], P);
        if (P.z > 0.02) {
          if (pen) g.lineTo(P.x, P.y);
          else g.moveTo(P.x, P.y);
          pen = true;
        } else pen = false;
      }
    }
    g.stroke();

    // granules: the dust on and inside the sphere (physics + projection happen once, painting is split in / out of the disc)
    this.stepGranules(dtMs, R);
    const grainA = pointsA * dim * scrollFade;
    this.paintGranules(0, this.gr.nIn, grainA);

    // orbit rings — back arc dim, front arc clearer
    const segs = Math.floor(RING_SEGS * ringsA);
    for (let oi = 0; oi < ORBITS.length; oi++) {
      const o = ORBITS[oi];
      const back = new Path2D();
      const front = new Path2D();
      const pos = { x: 0, y: 0, z: 0 };
      let px = 0;
      let py = 0;
      let pz = 0;
      for (let i = 0; i <= segs; i++) {
        const th = (i / RING_SEGS) * TAU;
        const wob = 1 + 0.06 * Math.sin(2 * th + o.ph);
        const x0 = o.r * wob * Math.cos(th);
        const z0 = o.r * o.e * wob * Math.sin(th);
        const y1 = -z0 * Math.sin(o.rx);
        const z1 = z0 * Math.cos(o.rx);
        vp(x0 * Math.cos(o.rz) - y1 * Math.sin(o.rz), x0 * Math.sin(o.rz) + y1 * Math.cos(o.rz), z1, pos);
        if (i > 0) {
          const path = (pz + pos.z) / 2 > 0 ? front : back;
          path.moveTo(px, py);
          path.lineTo(pos.x, pos.y);
        }
        px = pos.x;
        py = pos.y;
        pz = pos.z;
      }
      g.lineWidth = 1;
      g.strokeStyle = rgba(PAPER, 0.09 * dim * scrollFade);
      g.stroke(back);
      g.strokeStyle = rgba(oi === 2 ? SIGNAL : PAPER, (oi === 2 ? 0.26 : 0.2) * dim * scrollFade);
      g.stroke(front);
    }

    // links
    const hoverId = this.ptrHover ?? this.extHover;
    const hi = hoverId ? this.byId.get(hoverId) : undefined;
    const si = this.selectedId ? this.byId.get(this.selectedId) : undefined;
    for (const l of this.links) {
      l.energy *= Math.exp(-dtMs / 900);
      const touchH = hi !== undefined && (l.a === hi || l.b === hi);
      const touchS = si !== undefined && (l.a === si || l.b === si);
      const dz = (l.az + l.bz) / 2;
      const depthA = 0.55 + 0.45 * clamp((dz + 1) / 2);
      let a = l.strength * 0.15 * depthA * dim;
      if (this.focusAmt > 0.01 && !touchS && l.kind !== "pipe") a *= 1 - 0.55 * this.focusAmt;
      // hovering a token: connections that are not its own recede a little
      if (this.hoverAmt > 0.01 && !touchH) a *= 1 - 0.4 * this.hoverAmt;
      if (l.kind === "pipe") a *= 1 + this.evalAmt * 1.6 + reorg * 1.4;
      else a *= 1 - 0.5 * reorg;
      let col: RGB = PAPER;
      // a token the cursor is leaning toward lights its own connections
      const pullA = (this.nodes[l.a].pull + this.nodes[l.b].pull) * 0.5;
      if (pullA > 0.02) {
        a += pullA * 0.3;
        col = mix(PAPER, SIGNAL, clamp(pullA * 1.6));
      }
      // waking: connections surface, then settle
      if (wake > 0.01 && l.kind !== "ring") {
        a += wake * 0.24;
        col = mix(col, SIGNAL, wake * 0.7);
      }
      if (touchS) {
        a = Math.max(a, 0.5 * this.focusAmt);
        col = SIGNAL;
      }
      if (touchH) {
        a = Math.max(a, 0.62);
        col = SIGNAL;
      }
      if (l.energy > 0.02) {
        a += l.energy * 0.45;
        col = SIGNAL;
      }
      a *= linksA * scrollFade;
      if (a < 0.008) continue;
      g.strokeStyle = rgba(col, a);
      g.lineWidth = touchH || touchS ? 1.15 : 1;
      g.beginPath();
      g.moveTo(l.ax, l.ay);
      g.quadraticCurveTo(l.cx, l.cy, l.bx, l.by);
      g.stroke();
    }

    // packets
    for (let i = this.packets.length - 1; i >= 0; i--) {
      const p = this.packets[i];
      const leg = p.legs[p.leg];
      const l = this.links[leg.li];
      if (!l) {
        this.packets.splice(i, 1);
        continue;
      }
      // slow packets that travel through a hovered node's neighbourhood
      let sp = p.speed;
      if (hi !== undefined && !p.strong && (l.a === hi || l.b === hi)) sp *= 0.45;
      p.t += sp * dtMs;
      if (p.t >= 1) {
        const endNode = leg.fwd ? l.b : l.a;
        this.nodes[endNode].glow = Math.max(this.nodes[endNode].glow, p.strong ? 0.9 : 0.35);
        l.energy = Math.max(l.energy, p.strong ? 1 : 0.3);
        if (p.strong) this.pulses.push({ node: endNode, t: 0, rgb: SIGNAL, big: false });
        if (p.leg + 1 < p.legs.length) {
          p.leg++;
          p.t = 0;
        } else {
          p.done?.();
          this.packets.splice(i, 1);
        }
        continue;
      }
      const t = leg.fwd ? p.t : 1 - p.t;
      const u = 1 - t;
      const x = u * u * l.ax + 2 * u * t * l.cx + t * t * l.bx;
      const y = u * u * l.ay + 2 * u * t * l.cy + t * t * l.by;
      const z = l.az + (l.bz - l.az) * t;
      const dA = 0.45 + 0.55 * clamp((z + 1) / 2);
      if (p.strong) {
        g.drawImage(this.sprite(p.rgb), x - 12, y - 12, 24, 24);
        g.fillStyle = rgba(PAPER, 0.95);
        g.beginPath();
        g.arc(x, y, 2, 0, TAU);
        g.fill();
      } else {
        g.fillStyle = rgba(p.rgb, 0.5 * dA * linksA);
        g.beginPath();
        g.arc(x, y, 1.3, 0, TAU);
        g.fill();
      }
    }

    // pulses
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const q = this.pulses[i];
      q.t += dtMs / (q.big ? 1100 : 800);
      if (q.t >= 1) {
        this.pulses.splice(i, 1);
        continue;
      }
      const n = this.nodes[q.node];
      if (!n) continue;
      g.strokeStyle = rgba(q.rgb, (q.big ? 0.6 : 0.4) * (1 - q.t));
      g.lineWidth = 1;
      g.beginPath();
      g.arc(n.sx, n.sy, 6 * n.sc + q.t * (q.big ? 30 : 18), 0, TAU);
      g.stroke();
    }
    g.restore();

    // the haze just outside the limb, and the ripples travelling through everything
    this.paintGranules(this.gr.nIn, this.gr.n, grainA);
    for (const rp of this.ripples) {
      const life = 1 - rp.t / 1.2;
      if (life <= 0) continue;
      g.strokeStyle = rgba(this.cloud, 0.32 * life * life);
      g.lineWidth = 1;
      g.beginPath();
      g.arc(rp.x, rp.y, rp.t * 380, 0, TAU);
      g.stroke();
    }

    // nodes, far → near (drawn unclipped so outer nodes never get cut)
    this.wakeTok = this.nodes.find((n) => n.kind === "token");
    const order = this.nodes.map((n, i) => i).sort((a, b) => this.nodes[a].vz - this.nodes[b].vz);
    g.font = `500 ${this.compact ? 9 : 10}px ${this.fontFamily}`;
    g.textBaseline = "middle";
    for (const i of order) this.drawNode(this.nodes[i], i === hi, T, dim, scrollFade);

    // wallet: a slow arc just outside the limb
    if (this.wallet !== "none") {
      const col = this.wallet === "ok" ? SIGNAL : STATUS_RGB.CONDITIONAL;
      const a0 = this.reduced ? -1.2 : T / 4200;
      g.strokeStyle = rgba(col, 0.6 * bodyA * scrollFade);
      g.lineWidth = 1.4;
      g.beginPath();
      g.arc(cx, cy, R + 7, a0, a0 + 1.5);
      g.stroke();
      g.strokeStyle = rgba(col, 0.16 * bodyA * scrollFade);
      g.lineWidth = 1;
      g.beginPath();
      g.arc(cx, cy, R + 7, 0, TAU);
      g.stroke();
    }

    // hover halo — a faint spotlight following the cursor, inside the sphere only
    if (this.mouse.inside && !this.reduced) {
      const d = Math.hypot(this.mouse.px - cx, this.mouse.py - cy);
      if (d < R) {
        g.save();
        g.beginPath();
        g.arc(cx, cy, R - 0.5, 0, TAU);
        g.clip();
        g.globalAlpha = 0.16;
        g.drawImage(this.sprite(SIGNAL), this.mouse.px - 90, this.mouse.py - 90, 180, 180);
        g.restore();
      }
    }

    // card anchor
    const cid = this.cardId;
    const cn = cid ? this.nodes[this.byId.get(cid) ?? -1] : undefined;
    this.cb.onCard?.(cn ? { x: cn.sx, y: cn.sy, r: (cn.kind === "token" ? 6 : 4) * cn.sc, front: cn.vz > -0.15 } : null);
  }

  /** one pass over the field: project every granule, then let the cursor, touched nodes and ripples move it */
  private stepGranules(dtMs: number, R: number) {
    const G = this.gr;
    const snap = this.reduced;
    const dt = Math.min(dtMs, 50) / 1000;
    const T = this.T;
    const { cx, cy } = this;
    const yc = Math.cos(this.yaw.x);
    const ys = Math.sin(this.yaw.x);
    const pc = Math.cos(this.pitch.x);
    const ps = Math.sin(this.pitch.x);

    // interaction sources, all in screen space
    const rc = Math.max(56, this.R * 0.3);
    const cursorOn = !snap && this.mouse.inside;
    const mx = this.mouse.px;
    const my = this.mouse.py;
    let sel: Node | undefined;
    let hov: Node | undefined;
    for (const n of this.nodes) {
      if (n.kind !== "token") continue;
      if (n.sel > 0.02 && (!sel || n.sel > sel.sel)) sel = n;
    }
    for (const n of this.nodes) {
      if (n.kind !== "token" || n === sel) continue;
      if (n.hover > 0.02 && (!hov || n.hover > hov.hover)) hov = n;
    }
    const fs = this.foci[0];
    const fh = this.foci[1];
    fs.k = sel ? sel.sel : 0;
    fs.x = sel ? sel.sx : 0;
    fs.y = sel ? sel.sy : 0;
    fs.rs = this.R * 0.42;
    fh.k = hov ? hov.hover * 0.55 : 0;
    fh.x = hov ? hov.sx : 0;
    fh.y = hov ? hov.sy : 0;
    fh.rs = this.R * 0.27;
    const tone = sel ?? hov;
    this.cloud = mix(this.cloud, tone ? STATUS_RGB[tone.status] : SIGNAL, snap ? 1 : 1 - Math.exp(-dtMs / 200));

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      this.ripples[i].t += dt;
      if (this.ripples[i].t > 1.2) this.ripples.splice(i, 1);
    }

    const hk = Math.exp(-dt / 0.45);
    const tk = Math.exp(-dt / 0.7);
    const damp = Math.exp(-dt * 4.4);
    for (let i = 0; i < G.n; i++) {
      if (!snap) G.lon[i] += G.w[i] * dt;
      const r = G.rad[i] * (snap ? 1 : 1 + 0.012 * Math.sin(T / 1400 + G.ph[i]));
      const lo = G.lon[i];
      const x0 = r * G.cl[i] * Math.cos(lo);
      const z0 = r * G.cl[i] * Math.sin(lo);
      const y0 = r * G.sl[i];
      const x1 = x0 * yc + z0 * ys;
      const z1 = -x0 * ys + z0 * yc;
      const y2 = y0 * pc - z1 * ps;
      const z2 = y0 * ps + z1 * pc;
      const f = 1 / (1 - 0.16 * z2);
      const hx = cx + x1 * R * f;
      const hy = cy + y2 * R * f;
      G.pz[i] = z2;
      if (snap) {
        G.px[i] = hx;
        G.py[i] = hy;
        continue;
      }

      let dx = G.dx[i];
      let dy = G.dy[i];
      const X = hx + dx;
      const Y = hy + dy;
      // near-side dust answers fully, far-side dust only faintly
      const dw = 0.4 + 0.6 * clamp((z2 + 1) / 2);
      let ax = -4.5 * dx;
      let ay = -4.5 * dy;
      let heat = G.heat[i] * hk;
      let tint = G.tint[i] * tk;

      if (cursorOn) {
        const ex = X - mx;
        const ey = Y - my;
        const d2 = ex * ex + ey * ey;
        if (d2 < rc * rc) {
          const d = Math.sqrt(d2) + 0.001;
          const q = 1 - d / rc;
          const fo = q * q * 1150 * dw;
          ax += (ex / d) * fo;
          ay += (ey / d) * fo;
          heat = Math.max(heat, q * 0.95);
        }
      }
      for (let k = 0; k < 2; k++) {
        const fc = this.foci[k];
        if (fc.k < 0.02) continue;
        const ex = X - fc.x;
        const ey = Y - fc.y;
        const d2 = ex * ex + ey * ey;
        if (d2 >= fc.rs * fc.rs) continue;
        const d = Math.sqrt(d2) + 0.001;
        const q = (1 - d / fc.rs) * fc.k;
        // pulled toward a personal orbit around the node, and swirled along it (alternating direction per granule)
        const radial = -(d - G.ring[i]) * 9 * q;
        const swirl = (G.w[i] > 0 ? 1 : -1) * 230 * q * fc.tang;
        ax += (ex / d) * radial - (ey / d) * swirl;
        ay += (ey / d) * radial + (ex / d) * swirl;
        tint = Math.max(tint, q * 1.4);
        heat = Math.max(heat, q * 0.7);
      }
      for (const rp of this.ripples) {
        const life = 1 - rp.t / 1.2;
        const ex = X - rp.x;
        const ey = Y - rp.y;
        const d = Math.sqrt(ex * ex + ey * ey) + 0.001;
        const band = 1 - Math.abs(d - rp.t * 380) / 40;
        if (band <= 0) continue;
        const fo = band * life * 1600 * dw;
        ax += (ex / d) * fo;
        ay += (ey / d) * fo;
        heat = Math.max(heat, band * life);
      }

      const vx = (G.vx[i] + ax * dt) * damp;
      const vy = (G.vy[i] + ay * dt) * damp;
      dx += vx * dt;
      dy += vy * dt;
      G.vx[i] = vx;
      G.vy[i] = vy;
      G.dx[i] = dx;
      G.dy[i] = dy;
      G.px[i] = hx + dx;
      G.py[i] = hy + dy;
      G.heat[i] = heat;
      G.tint[i] = tint;
    }
  }

  /** paint granules [from, to): batched by colour (paper / signal / node status) and brightness level */
  private paintGranules(from: number, to: number, alpha: number) {
    const g = this.ctx;
    const G = this.gr;
    const T = this.T;
    const paths: Array<Path2D | undefined> = new Array(4 * GRAIN_LEVELS);
    const { cx, cy } = this;
    const limb2 = this.limbR * this.limbR;
    const outer = from >= G.nIn;
    for (let i = from; i < to; i++) {
      const d = clamp((G.pz[i] + 1) / 2);
      const heat = G.heat[i];
      const tint = G.tint[i];
      const tw = this.reduced ? 1 : 0.72 + 0.28 * Math.sin(T / (650 + G.ph[i] * 90) + G.ph[i] * 5);
      const a = ((0.16 + 0.44 * d) * tw + heat * 0.55 + tint * 0.15) * alpha * (outer ? 0.8 : 1);
      const lv = Math.min(GRAIN_LEVELS - 1, Math.floor(a * 7));
      if (lv < 0 || a < 0.03) continue;
      let col = tint > 0.28 ? 2 : heat > 0.3 ? 1 : 0;
      // haze beyond the limb is on the light page: dark grain there, pale grain where it crosses the disc
      if (outer && col === 0) {
        const ex = G.px[i] - cx;
        const ey = G.py[i] - cy;
        if (ex * ex + ey * ey > limb2) col = 3;
      }
      const s = G.size[i] * (0.72 + d * 0.55) + heat * 0.9 + tint * 0.5;
      const key = col * GRAIN_LEVELS + lv;
      const p = (paths[key] ??= new Path2D());
      if (s > 1.9) {
        p.moveTo(G.px[i] + s / 2, G.py[i]);
        p.arc(G.px[i], G.py[i], s / 2, 0, TAU);
      } else p.rect(G.px[i] - s / 2, G.py[i] - s / 2, s, s);
    }
    for (let key = 0; key < paths.length; key++) {
      const p = paths[key];
      if (!p) continue;
      const band = Math.floor(key / GRAIN_LEVELS);
      const col = band === 0 ? PAPER : band === 1 ? SIGNAL : band === 2 ? this.cloud : INK;
      g.fillStyle = rgba(col, Math.min(0.85, ((key % GRAIN_LEVELS) + 0.5) / 7));
      g.fill(p);
    }
  }

  private drawNode(n: Node, hovered: boolean, T: number, dim: number, scrollFade: number) {
    const g = this.ctx;
    const born = this.reduced ? 1 : smooth(clamp((T - n.bornAt) / 520));
    if (born <= 0.01) return;
    const depthA = 0.42 + 0.58 * n.depth;

    if (n.kind === "core") {
      const x = n.sx;
      const y = n.sy;
      const k = this.zoom.x * born;
      const rr = (this.compact ? 15 : 19) * k;
      g.drawImage(this.sprite(this.ring.rgb), x - rr * 3, y - rr * 3, rr * 6, rr * 6);
      // waking: the central field swells and brightens for a moment
      if (this.wakeAmt > 0.01) {
        g.globalAlpha = 0.5 * this.wakeAmt * born;
        const wr = rr * (3 + 1.6 * this.wakeAmt);
        g.drawImage(this.sprite(SIGNAL), x - wr, y - wr, wr * 2, wr * 2);
        g.globalAlpha = 1;
      }
      // eligibility ring: sweeps while COMMS evaluates, then holds the decision colour
      g.lineWidth = 1.4;
      g.strokeStyle = rgba(PAPER, 0.14 * born);
      g.beginPath();
      g.arc(x, y, rr, 0, TAU);
      g.stroke();
      const prog = this.ring.prog;
      if (prog > 0.001) {
        g.strokeStyle = rgba(this.ring.rgb, 0.9 * born);
        g.lineWidth = 1.8;
        g.beginPath();
        g.arc(x, y, rr, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, prog));
        g.stroke();
      }
      g.fillStyle = "rgba(8,12,16,0.96)";
      g.beginPath();
      g.arc(x, y, rr * 0.62, 0, TAU);
      g.fill();
      g.strokeStyle = rgba(SIGNAL, 0.55 * born);
      g.lineWidth = 1;
      g.beginPath();
      g.arc(x, y, rr * 0.62, 0, TAU);
      g.stroke();
      g.fillStyle = rgba(this.ring.settled ? this.ring.rgb : SIGNAL, 0.95 * born);
      g.beginPath();
      g.arc(x, y, rr * 0.2 * (1 + 0.12 * Math.sin(T / 900)), 0, TAU);
      g.fill();
      if (!this.compact) {
        g.textAlign = "center";
        g.fillStyle = rgba(PAPER, 0.5 * born);
        g.font = `500 8.5px ${this.fontFamily}`;
        g.fillText("COMMS", x, y + rr + 12);
        g.font = `500 10px ${this.fontFamily}`;
      }
      return;
    }

    // waking lifts the first token: its label names its real status while the network is awake
    const h = Math.max(n.hover, n === this.wakeTok ? this.wakeAmt * 0.9 : 0);
    const s = n.sel;
    const dimSel = n.kind === "token" && this.focusAmt > 0 && s < 0.5 && h < 0.5 ? 1 - 0.42 * this.focusAmt : 1;
    // hovering a token: everything unrelated to it steps back slightly
    const dimHover = this.hoverAmt > 0.01 && n.hover < 0.5 ? 1 - 0.34 * this.hoverAmt : 1;
    const inactive = n.kind === "token" && n.active === false ? 0.45 : 1;
    const alpha = born * depthA * dimSel * dimHover * inactive * dim * scrollFade;

    if (n.kind === "system") {
      const col = HEALTH_RGB[n.health];
      const lit = Math.max(n.glow, h);
      const r = (2.6 + lit * 1.6) * n.sc * born;
      if (lit > 0.05) g.drawImage(this.sprite(col), n.sx - r * 4, n.sy - r * 4, r * 8, r * 8);
      g.strokeStyle = rgba(col, (0.5 + 0.5 * lit) * alpha);
      g.fillStyle = rgba(col, (0.25 + 0.6 * lit) * alpha);
      g.lineWidth = 1.1;
      g.beginPath();
      g.moveTo(n.sx, n.sy - r);
      g.lineTo(n.sx + r, n.sy);
      g.lineTo(n.sx, n.sy + r);
      g.lineTo(n.sx - r, n.sy);
      g.closePath();
      g.fill();
      g.stroke();
      if (!this.compact || h > 0.5) {
        g.textAlign = "left";
        g.font = `500 8.5px ${this.fontFamily}`;
        g.fillStyle = rgba(PAPER, (0.5 + 0.5 * Math.max(lit, h)) * alpha * (n.depth > 0.4 || h > 0.3 ? 1 : 0.5));
        g.fillText(n.label.toUpperCase(), n.sx + r + 5, n.sy + 0.5);
        g.font = `500 ${this.compact ? 9 : 10}px ${this.fontFamily}`;
      }
      return;
    }

    // token
    const col = STATUS_RGB[n.status];
    const emph = Math.max(h, s, n.pull * 0.6);
    // hover scales the node ~1.08×; the border, brightness and label carry the rest of the emphasis
    const r = (this.compact ? 4.6 : 5.4) * n.sc * born * (1 + 0.08 * h + 0.14 * s + 0.04 * n.pull);
    if (emph > 0.02 || n.glow > 0.05) {
      const gr = r * (3.4 + emph);
      g.globalAlpha = clamp(0.16 + emph * 0.4 + n.glow * 0.3) * born;
      g.drawImage(this.sprite(hovered || s > 0.4 ? mix(col, SIGNAL, 0.45) : col), n.sx - gr, n.sy - gr, gr * 2, gr * 2);
      g.globalAlpha = 1;
    }
    g.fillStyle = rgba([9, 13, 17], 0.96 * Math.min(1, alpha * 1.6));
    g.beginPath();
    g.arc(n.sx, n.sy, r, 0, TAU);
    g.fill();
    g.strokeStyle = rgba(col, (0.55 + 0.45 * emph) * alpha * 1.25);
    g.lineWidth = 1.2 + emph * 0.7;
    g.beginPath();
    g.arc(n.sx, n.sy, r, 0, TAU);
    g.stroke();
    g.fillStyle = rgba(col, 0.85 * alpha * 1.2);
    g.beginPath();
    g.arc(n.sx, n.sy, r * 0.36, 0, TAU);
    g.fill();
    // lock brackets on the selected node
    if (s > 0.05) {
      g.strokeStyle = rgba(mix(col, PAPER, 0.35), 0.75 * s * born);
      g.lineWidth = 1;
      g.setLineDash([3, 4]);
      g.lineDashOffset = -T / 90;
      g.beginPath();
      g.arc(n.sx, n.sy, r + 6 + 1.5 * (1 - s), 0, TAU);
      g.stroke();
      g.setLineDash([]);
    }
    // ACTIVE → tiny live dot
    if (n.active === true) {
      const br = 0.65 + 0.35 * Math.sin(T / 700 + n.theta * 3);
      g.fillStyle = rgba(STATUS_RGB.ELIGIBLE, 0.9 * br * alpha * 1.3);
      g.beginPath();
      g.arc(n.sx + r * 0.85, n.sy - r * 0.85, 1.7 * n.sc, 0, TAU);
      g.fill();
    }
    // label
    g.textAlign = "left";
    g.fillStyle = rgba(PAPER, clamp((0.42 + 0.58 * emph) * alpha * 1.35));
    g.fillText(n.label, n.sx + r + 6, n.sy + 0.5);
    // touching a node (hover) names its status right beside it
    if (h > 0.3) {
      const w = g.measureText(n.label).width;
      g.fillStyle = rgba(col, clamp(h * 0.95) * born);
      g.font = `500 8.5px ${this.fontFamily}`;
      g.fillText(`· ${n.status}`, n.sx + r + 6 + w + 6, n.sy + 0.5);
      g.font = `500 ${this.compact ? 9 : 10}px ${this.fontFamily}`;
    }
  }
}
