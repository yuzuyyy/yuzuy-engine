(function () {
"use strict";
/*! chat-bubble-engine v1.0.0 | MIT | vanilla JS, zero dependencies */

const version = "1.0.0";

const FALLBACK_FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// Layered, soft shadow (tight contact layer + two wide, faint layers)
const SOFT_SHADOW = [
  "0 1px 2px rgba(0,0,0,0.10)",
  "0 6px 14px -4px rgba(0,0,0,0.14)",
  "0 16px 24px -10px rgba(0,0,0,0.20)",
].join(", ");

// Motion presets (identical numbers to the Framer component)
const MOTION = {
  subtle: {
    y: 24, x: 0, scale: 0.9, rot: 0, exitY: 20, delay: 0.04,
    spring: { stiffness: 300, damping: 34, mass: 0.9 },
    layout: { stiffness: 280, damping: 36, mass: 0.9 },
  },
  smooth: {
    y: 52, x: 22, scale: 0.78, rot: 1.5, exitY: 32, delay: 0.1,
    spring: { stiffness: 220, damping: 28, mass: 1 },
    layout: { stiffness: 190, damping: 32, mass: 1 },
  },
  dramatic: {
    y: 100, x: 80, scale: 0.5, rot: 6, exitY: 64, delay: 0.16,
    spring: { stiffness: 170, damping: 19, mass: 1 },
    layout: { stiffness: 130, damping: 27, mass: 1.1 },
  },
};

const DEFAULT_TESTIMONIALS = [
  {
    name: "Sarah Mitchell",
    role: "Product Lead",
    timestamp: "2m ago",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
    message: "The push and slide animation feels incredibly smooth. There are no sudden layout shifts at all.",
  },
  {
    name: "Daniel Carter",
    role: "Frontend Developer",
    timestamp: "5m ago",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
    message: "The typewriter effect makes the conversation feel alive as each new message appears one by one.",
  },
  {
    name: "Emily Johnson",
    role: "UI/UX Designer",
    timestamp: "12m ago",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    message: "The flexible transform origin makes it easy to match an iMessage or WhatsApp style animation.",
  },
  {
    name: "Michael Brooks",
    role: "Tech Founder",
    timestamp: "20m ago",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
    message: "We dropped this into our landing page in minutes and it looks professional right away.",
  },
  {
    name: "Olivia Bennett",
    role: "Marketing Manager",
    timestamp: "30m ago",
    message: "Our testimonials section finally feels like a real conversation instead of a static grid.",
  },
];

// Every option can be set from HTML: data-bc-<kebab-case-name>="value".
// The type of the default decides how the attribute is parsed.
const ENGINE_DEFAULTS = {
  testimonials: DEFAULT_TESTIMONIALS,
  fontFamily: "Inter",
  fontSize: "14px",
  fontWeight: "400",
  lineHeight: "1.6em",
  letterSpacing: "normal",
  bubbleColor: "#121723",
  borderColor: "#1F293D",
  nameColor: "#FFFFFF",
  textColor: "#E5E7EB",
  subTextColor: "#9CA3AF",
  accentColor: "#6366F1",
  glassBlur: false,
  shadow: true,
  alignment: "alternating", // "alternating" | "left" | "center" | "right"
  transformOrigin: "auto",
  animationStyle: "dramatic", // "subtle" | "smooth" | "dramatic"
  animationSpeed: 0.5,
  autoplay: true,
  pauseOnHover: true,
  showArrows: true,
  controlsWithAutoplay: false,
  typewriter: true,
  typewriterSpeed: 25,
  displayDuration: 3.5,
  showAvatar: true,
  avatarSize: 32,
  avatarRadius: 50, // percent: 50 = circle, 0 = square
  showTimestamp: true,
  showTail: true,
  maxStacked: 4,
  inactiveOpacity: 0.5,
  maxWidth: 440,
  gap: 16,
  radius: 16,
  minHeight: 360,
  static: false, // true = no animation, no timers
};

/* ---------- Spring -> CSS linear() easing ----------
   Samples a damped spring (0 -> 1, zero initial velocity). animationSpeed `s`
   rescales stiffness*s^2 and damping*s, i.e. every duration is divided by s. */
const LINEAR_OK =
  typeof CSS !== "undefined" && !!CSS.supports &&
  CSS.supports("animation-timing-function", "linear(0, 1)");
const springCache = new Map();

function spring(p) {
  const key = p.stiffness + "/" + p.damping + "/" + p.mass;
  const hit = springCache.get(key);
  if (hit) return hit;
  const w0 = Math.sqrt(p.stiffness / p.mass);
  const z = p.damping / (2 * Math.sqrt(p.stiffness * p.mass));
  const x = (t) => {
    if (z < 1) {
      const wd = w0 * Math.sqrt(1 - z * z);
      return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
    }
    if (z === 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
    const wd = w0 * Math.sqrt(z * z - 1);
    return 1 - Math.exp(-z * w0 * t) * (Math.cosh(wd * t) + ((z * w0) / wd) * Math.sinh(wd * t));
  };
  let settle = 0;
  for (let t = 0; t < 5; t += 1 / 120) if (Math.abs(1 - x(t)) > 0.002) settle = t;
  const dur = Math.min(5, settle + 1 / 60);
  const steps = Math.max(2, Math.ceil(dur * 60));
  const pts = [];
  for (let i = 0; i <= steps; i++) pts.push((i === steps ? 1 : x((dur * i) / steps)).toFixed(4));
  const out = {
    dur: dur * 1000,
    css: LINEAR_OK ? "linear(" + pts.join(",") + ")" : "cubic-bezier(0.22,1,0.36,1)",
  };
  springCache.set(key, out);
  return out;
}

/* ---------- Stack state helpers (pure) ---------- */
function stackForward(v, idx, cap, nk) {
  const l = v.stack[v.stack.length - 1];
  const k = nk();
  const next = v.stack.concat([{ k, idx, side: 1 - l.side, from: "bottom" }]).slice(-cap);
  return { stack: next, typingK: k, dir: 1 };
}

// Go back to a testimonial that is already visible: drop the newer bubbles,
// then refill older ones at the top so the stack stays full.
function stackRewind(v, i, n, cap, nk) {
  const st = v.stack.slice(-cap);
  let p = -1;
  for (let j = st.length - 2; j >= 0; j--) {
    if (st[j].idx % n === i) { p = j; break; }
  }
  if (p < 0) return null;
  const next = st.slice(0, p + 1);
  while (next.length < cap) {
    const f = next[0];
    next.unshift({ k: nk(), idx: (((f.idx - 1) % n) + n) % n, side: 1 - f.side, from: "top" });
  }
  return { stack: next, typingK: -1, dir: -1 };
}

/* ---------- DOM helpers ---------- */
function h(tag, styles, parent) {
  const e = document.createElement(tag);
  if (styles) Object.assign(e.style, styles);
  if (parent) parent.appendChild(e);
  return e;
}

function normItem(t) {
  t = t || {};
  return {
    name: t.name != null ? String(t.name) : "",
    role: t.role != null ? String(t.role) : "",
    timestamp: t.timestamp ? String(t.timestamp) : "",
    avatar: typeof t.avatar === "string" ? t.avatar : (t.avatar && t.avatar.src) || "",
    message: t.message != null ? String(t.message) : "",
  };
}

class ChatBubbleEngine {
  constructor(containerSelector, options = {}) {
    const c = typeof containerSelector === "string"
      ? document.querySelector(containerSelector)
      : containerSelector;
    if (!c) throw new Error("[chat-bubble-engine] target container not found");
    this.container = c;

    const prev = ChatBubbleEngine.instances.get(c);
    if (prev) prev.destroy();
    ChatBubbleEngine.instances.set(c, this);

    this.given = {};
    for (const k in options) if (options[k] != null) this.given[k] = options[k];
    this.o = Object.assign({}, ENGINE_DEFAULTS, this.given);
    this.init();
  }

  get reduce() { return this.rmq.matches; }
  get currentIndex() { return this.last.idx % this.n; }
  get last() { return this.view.stack[this.view.stack.length - 1]; }

  /* ---------------- setup ---------------- */
  init() {
    const o = this.o;
    const raw = Array.isArray(o.testimonials) && o.testimonials.length ? o.testimonials : DEFAULT_TESTIMONIALS;
    this.list = raw.map(normItem);
    this.n = this.list.length;
    this.cap = Math.max(1, Math.min(5, Math.round(o.maxStacked) || 1, this.n));
    this.m = MOTION[o.animationStyle] || MOTION.dramatic;
    this.s = Math.max(0.2, Number(o.animationSpeed) || 1);
    this.isStatic = !!o.static;
    this.rmq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
    this.arrowsOn = (!o.autoplay || o.controlsWithAutoplay) && o.showArrows && this.n > 1;
    this.sidePad = this.arrowsOn ? 58 : 16; // ARROW_EDGE * 2 + ARROW_SIZE

    this.rows = new Map(); // live rows by key (leaving rows are removed from the map)
    this.disposers = [];
    this.keySeq = 100;
    this.doneK = -1;
    this.typingJob = null;
    this.timer = 0;
    this.inView = typeof IntersectionObserver === "undefined";
    this.pageVisible = document.visibilityState !== "hidden";
    this.hovered = false;

    // Starting point: the stack is already full (testimonials 1..cap), nothing typing.
    this.view = {
      stack: Array.from({ length: this.cap }, (_, i) => ({ k: i, idx: i, side: i % 2, from: "bottom" })),
      typingK: -1,
      dir: 1,
    };

    this.setupDOM();

    const initial = this.view.stack.slice(-this.cap);
    initial.forEach((e, i) => {
      const r = this.createRow(e, this.depthOf(i, initial.length));
      this.rows.set(e.k, r);
      this.innerBox.appendChild(r.row);
    });

    if (this.arrowsOn) {
      this.renderArrow("prev");
      this.renderArrow("next");
    }
    if (!this.isStatic) {
      this.setupMeasure();
      this.bindEvents();
    }
    this.schedule();
  }

  // Everything the engine renders lives inside ONE frame element appended to the
  // container, so any markup already in the container (e.g. CMS items) is untouched.
  setupDOM() {
    const o = this.o;
    this.frame = h("div", {
      position: "relative",
      width: "100%",
      height: "100%",
      boxSizing: "border-box",
      overflowX: "clip",
      overflowY: "visible", // tall stacks are never cut off at the top
      overflowClipMargin: "24px",
    }, this.container);
    this.frame.setAttribute("data-bc-frame", "");
    this.frame.setAttribute("role", "region");
    this.frame.setAttribute("aria-label", "Testimonials");

    this.stackBox = h("div", {
      position: "relative",
      boxSizing: "border-box",
      width: "100%",
      height: "100%",
      minHeight: o.minHeight + "px",
      padding: "16px " + this.sidePad + "px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-end",
    }, this.frame);

    if (!this.isStatic) {
      // Hidden measurer: zero height, no paint, same width as the real stack
      this.measureBox = h("div", {
        position: "absolute",
        top: "0",
        left: this.sidePad + "px",
        right: this.sidePad + "px",
        height: "0",
        overflow: "hidden",
        visibility: "hidden",
        pointerEvents: "none",
      }, this.stackBox);
      this.measureBox.setAttribute("aria-hidden", "true");
    }

    this.innerBox = h("div", {
      position: "relative", // anchor for rows that pop out of the flow while exiting
      width: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-end",
      gap: o.gap + "px",
    }, this.stackBox);
  }

  posOf(side) {
    return this.o.alignment === "alternating" ? (side === 0 ? "left" : "right") : this.o.alignment;
  }

  originOf(pos) {
    const t = this.o.transformOrigin;
    if (t !== "auto") return t;
    return pos === "left" ? "bottom left" : pos === "right" ? "bottom right" : "bottom center";
  }

  depthOf(i, len) {
    const latest = i === len - 1;
    return {
      scale: this.isStatic || latest ? 1 : Math.max(0.88, 1 - (len - 1 - i) * 0.03),
      opacity: latest ? 1 : this.o.inactiveOpacity,
    };
  }

  /* ---------------- bubble ---------------- */
  buildBubble(item, pos, measure) {
    const o = this.o;
    const border = "1px solid " + o.borderColor;
    const bubble = h("div", {
      position: "relative",
      width: "100%",
      boxSizing: "border-box",
      padding: "16px",
      borderRadius: o.radius + "px",
      background: o.bubbleColor,
      border: border,
      color: o.textColor,
      textAlign: "left",
      boxShadow: o.shadow && !measure ? SOFT_SHADOW : "none",
      fontFamily: o.fontFamily === "inherit" ? "inherit" : o.fontFamily + ", " + FALLBACK_FONT,
      fontSize: o.fontSize,
      fontWeight: String(o.fontWeight),
      lineHeight: o.lineHeight,
      letterSpacing: o.letterSpacing,
    });
    if (o.glassBlur && !measure) {
      bubble.style.backdropFilter = "blur(16px)";
      bubble.style.webkitBackdropFilter = "blur(16px)";
    }

    const head = h("div", { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }, bubble);
    const who = h("div", { display: "flex", alignItems: "center", gap: "10px", minWidth: "0" }, head);

    if (o.showAvatar) {
      const px = o.avatarSize + "px";
      if (measure) {
        // same box as the real avatar, no network request
        h("div", { width: px, height: px, flexShrink: "0" }, who);
      } else if (item.avatar) {
        const img = h("img", {
          width: px, height: px, maxWidth: "none",
          borderRadius: o.avatarRadius + "%",
          objectFit: "cover", flexShrink: "0", display: "block",
        }, who);
        img.src = item.avatar;
        img.alt = item.name;
        img.width = img.height = o.avatarSize;
        img.decoding = "async";
        img.draggable = false;
      } else {
        const ph = h("div", {
          width: px, height: px,
          borderRadius: o.avatarRadius + "%",
          background: o.accentColor, color: "#fff",
          fontSize: "13px", fontWeight: "700",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0",
        }, who);
        ph.textContent = item.name.charAt(0);
      }
    }

    const meta = h("div", { minWidth: "0" }, who);
    h("div", { fontSize: "1em", fontWeight: "700", color: o.nameColor, lineHeight: "1.2" }, meta).textContent = item.name;
    h("div", { fontSize: "0.8em", color: o.subTextColor, lineHeight: "1.3" }, meta).textContent = item.role;

    if (o.showTimestamp && item.timestamp) {
      h("span", { fontSize: "0.75em", color: o.subTextColor, flexShrink: "0" }, head).textContent = item.timestamp;
    }

    const msg = h("div", { marginTop: "10px" }, bubble);
    msg.textContent = "\u201C" + item.message + "\u201D";

    if (o.showTail && pos !== "center" && !measure) {
      const tail = h("span", {
        position: "absolute",
        bottom: "-6px",
        width: "12px",
        height: "12px",
        boxSizing: "border-box",
        background: o.bubbleColor,
        borderRight: border,
        borderBottom: border,
        transform: "rotate(45deg)",
        // only the half that sticks out, so translucent bubbles don't show a seam
        clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
      }, bubble);
      tail.style[pos === "left" ? "left" : "right"] = "20px";
    }
    return { bubble, msg };
  }

  // row (layout/FLIP + inactive opacity) > pose (enter/exit) > bubble (depth scale)
  createRow(e, st) {
    const o = this.o, m = this.m, s = this.s;
    const pos = this.posOf(e.side);
    const item = this.list[e.idx % this.n];
    const justify = pos === "left" ? "flex-start" : pos === "right" ? "flex-end" : "center";
    const row = h("div", { display: "flex", justifyContent: justify });
    const pose = h("div", { width: "100%", maxWidth: o.maxWidth + "px" }, row);
    const b = this.buildBubble(item, pos, false);
    pose.appendChild(b.bubble);
    const org = this.originOf(pos);
    pose.style.transformOrigin = org;
    b.bubble.style.transformOrigin = org;

    // transitions are declared first, values after: the first paint never animates
    const lay = spring(m.layout);
    row.style.transition = this.reduce ? "opacity 200ms ease-out" : "opacity " + 450 / s + "ms ease-out";
    b.bubble.style.transition = this.reduce ? "scale 200ms ease-out" : "scale " + lay.dur / s + "ms " + lay.css;
    row.style.opacity = String(st.opacity);
    b.bubble.style.scale = String(st.scale);

    return { k: e.k, entry: e, item, pos, row, pose, bubble: b.bubble, msg: b.msg, layout: null, from: null };
  }

  /* ---------------- arrows ---------------- */
  renderArrow(dir) {
    const o = this.o;
    const b = h("button", {
      position: "absolute",
      top: "50%",
      margin: "-17px 0 0 0",
      zIndex: "3",
      width: "34px",
      height: "34px",
      boxSizing: "border-box",
      borderRadius: "50%",
      border: "1px solid " + o.borderColor,
      background: o.bubbleColor,
      color: o.textColor,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      padding: "0",
      font: "inherit",
      lineHeight: "0",
      WebkitAppearance: "none",
      appearance: "none",
    }, this.frame);
    b.style[dir === "prev" ? "left" : "right"] = "12px";
    b.type = "button";
    b.setAttribute("aria-label", dir === "prev" ? "Previous testimonial" : "Next testimonial");

    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    [["width", "16"], ["height", "16"], ["viewBox", "0 0 24 24"], ["fill", "none"],
     ["stroke", "currentColor"], ["stroke-width", "2.5"], ["stroke-linecap", "round"],
     ["stroke-linejoin", "round"]].forEach(([k, v]) => svg.setAttribute(k, v));
    const pl = document.createElementNS(ns, "polyline");
    pl.setAttribute("points", dir === "prev" ? "15 18 9 12 15 6" : "9 18 15 12 9 6");
    svg.appendChild(pl);
    b.appendChild(svg);

    // whileHover 1.1 / whileTap 0.9 with the same spring as the Framer button
    if (!this.isStatic && !this.reduce) {
      const sp = spring({ stiffness: 420, damping: 20, mass: 1 });
      b.style.transition = "transform " + sp.dur + "ms " + sp.css;
      let hov = false, down = false;
      const paint = () => { b.style.transform = "scale(" + (down ? 0.9 : hov ? 1.1 : 1) + ")"; };
      b.addEventListener("pointerenter", () => { hov = true; paint(); });
      b.addEventListener("pointerleave", () => { hov = false; down = false; paint(); });
      b.addEventListener("pointerdown", () => { down = true; paint(); });
      b.addEventListener("pointerup", () => { down = false; paint(); });
      b.addEventListener("pointercancel", () => { down = false; paint(); });
    }

    b.addEventListener("click", () => {
      if (this.isStatic) return;
      this.goTo(dir === "prev" ? (this.currentIndex - 1 + this.n) % this.n : (this.currentIndex + 1) % this.n);
    });
  }

  /* ---------------- reserve the worst-case height ----------------
     Hidden copies of every testimonial are measured (and re-measured on resize).
     We take the tallest run of `cap` consecutive testimonials (cyclic, so the
     wrap-around n-1 -> 0 is included). The container never has to grow later. */
  setupMeasure() {
    const o = this.o;
    this.list.forEach((item) => {
      const r = h("div", { display: "flex", justifyContent: "flex-start" }, this.measureBox);
      const p = h("div", { width: "100%", maxWidth: o.maxWidth + "px" }, r);
      p.appendChild(this.buildBubble(item, "left", true).bubble);
    });
    const calc = () => {
      const hs = Array.from(this.measureBox.children).map((c) => c.offsetHeight);
      if (!hs.length) return;
      let best = 0;
      for (let a = 0; a < hs.length; a++) {
        let sum = 0;
        for (let j = 0; j < this.cap; j++) sum += hs[(a + j) % hs.length];
        if (sum > best) best = sum;
      }
      this.innerBox.style.minHeight = Math.ceil(best + (this.cap - 1) * o.gap) + "px";
    };
    calc();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(calc);
      ro.observe(this.measureBox);
      Array.from(this.measureBox.children).forEach((c) => ro.observe(c));
      this.disposers.push(() => ro.disconnect());
    }
  }

  /* ---------------- typewriter ----------------
     Writes straight into the DOM (no re-render per character). Typed text + hidden
     remainder share one inline flow, so line breaks are final from the first frame. */
  get useTyping() { return !this.isStatic && this.o.typewriter && !this.reduce; }
  get typingDelay() { return this.reduce ? 0 : Math.round((this.m.delay * 1000 + 180) / this.s); }

  finishTyping(job) {
    cancelAnimationFrame(job.raf);
    job.r.msg.textContent = job.full;
    if (this.typingJob === job) this.typingJob = null;
  }

  stopTyping() {
    if (this.typingJob) this.finishTyping(this.typingJob);
  }

  startTyping(r) {
    this.stopTyping();
    const full = "\u201C" + r.item.message + "\u201D";
    r.msg.textContent = "";
    const tw = h("span", { display: "block" }, r.msg);
    const vis = h("span", null, tw);
    const cw = h("span", { position: "relative" }, tw); // zero-width cursor: never affects wrapping
    h("span", { position: "absolute", left: "0", top: "0", color: this.o.accentColor }, cw).textContent = "\u2502";
    const hid = h("span", { visibility: "hidden" }, tw);
    hid.textContent = full;

    const job = { r, full, raf: 0 };
    this.typingJob = job;
    const speed = Math.max(1, Number(this.o.typewriterSpeed) || 25);
    const start = performance.now() + this.typingDelay;
    let last = -1;
    const step = (now) => {
      const c = Math.max(0, Math.min(full.length, Math.floor((now - start) / speed)));
      if (c !== last) {
        last = c;
        vis.textContent = full.slice(0, c);
        hid.textContent = full.slice(c);
      }
      if (c < full.length) {
        job.raf = requestAnimationFrame(step);
      } else {
        this.finishTyping(job);
        this.doneK = r.k;
        this.schedule();
      }
    };
    job.raf = requestAnimationFrame(step);
  }

  /* ---------------- navigation ---------------- */
  nk() { return this.keySeq++; }

  next() {
    this.applyView(stackForward(this.view, (this.last.idx + 1) % this.n, this.cap, () => this.nk()));
  }

  prev() {
    this.goTo((this.currentIndex - 1 + this.n) % this.n);
  }

  goTo(i) {
    i = ((i % this.n) + this.n) % this.n;
    const l = this.last;
    if (l.idx % this.n === i) return;
    const nk = () => this.nk();
    if (i === (l.idx + 1) % this.n) return this.applyView(stackForward(this.view, i, this.cap, nk));
    this.applyView(stackRewind(this.view, i, this.n, this.cap, nk) || stackForward(this.view, i, this.cap, nk));
  }

  /* Reconcile the DOM with a new view using FLIP + Web Animations. */
  applyView(nv) {
    if (this.isStatic) return;
    const m = this.m, s = this.s, rows = this.rows, inner = this.innerBox;
    const reduce = this.reduce;
    this.stopTyping();
    this.view = nv;
    const visible = nv.stack.slice(-this.cap);
    const keep = new Set(visible.map((e) => e.k));

    // FIRST: visual positions before any change. `sc` compensates for scaled ancestors.
    const ir = inner.getBoundingClientRect();
    const sc = inner.offsetWidth ? ir.width / inner.offsetWidth : 1;
    const first = new Map();
    rows.forEach((r) => first.set(r.k, r.row.getBoundingClientRect().top));

    // Leaving rows: freeze their visual spot and pop them out of the flow (popLayout).
    const leaving = [];
    rows.forEach((r) => { if (!keep.has(r.k)) leaving.push(r); });
    leaving.forEach((r) => {
      const rc = r.row.getBoundingClientRect();
      const cs = getComputedStyle(r.pose);
      r.from = { opacity: cs.opacity, translate: cs.translate, scale: cs.scale };
      if (r.layout) r.layout.cancel();
      r.pose.getAnimations().forEach((a) => a.cancel());
      Object.assign(r.row.style, {
        position: "absolute",
        pointerEvents: "none",
        top: (rc.top - ir.top) / sc + "px",
        left: (rc.left - ir.left) / sc + "px",
        width: rc.width / sc + "px",
        height: rc.height / sc + "px",
      });
      rows.delete(r.k);
    });

    // Staying rows: drop running layout animations so LAST is measured clean.
    rows.forEach((r) => { if (r.layout) { r.layout.cancel(); r.layout = null; } });

    // New rows, inserted before the next already-existing row (existing nodes never move).
    const created = [];
    visible.forEach((e, i) => {
      if (rows.has(e.k)) return;
      const r = this.createRow(e, this.depthOf(i, visible.length));
      rows.set(e.k, r);
      created.push(r);
      let ref = null;
      for (let j = i + 1; j < visible.length; j++) {
        const x = rows.get(visible[j].k);
        if (x) { ref = x.row; break; }
      }
      inner.insertBefore(r.row, ref);
    });

    // Depth (scale + opacity) of rows that stay; CSS transitions do the tweening.
    visible.forEach((e, i) => {
      const r = rows.get(e.k);
      if (created.indexOf(r) !== -1) return;
      const st = this.depthOf(i, visible.length);
      r.bubble.style.scale = String(st.scale);
      r.row.style.opacity = String(st.opacity);
    });

    // LAST + INVERT + PLAY: older bubbles glide to their new spot (layout spring, no delay).
    if (!reduce) {
      const sp = spring(m.layout);
      rows.forEach((r) => {
        if (created.indexOf(r) !== -1) return;
        const d = (first.get(r.k) - r.row.getBoundingClientRect().top) / sc;
        if (Math.abs(d) > 0.5) {
          r.layout = r.row.animate(
            { translate: ["0px " + d + "px", "0px 0px"] },
            { duration: sp.dur / s, easing: sp.css }
          );
        }
      });
    }

    // Enter: new bubbles wait a beat so older ones glide first, then spring in.
    created.forEach((r) => {
      if (reduce) {
        r.pose.animate({ opacity: [0, 1] }, { duration: 200, fill: "backwards" });
        return;
      }
      const dirX = r.pos === "left" ? -1 : r.pos === "right" ? 1 : 0;
      const sp = spring(m.spring);
      const delay = (m.delay / s) * 1000;
      r.pose.animate(
        {
          translate: [dirX * m.x + "px " + (r.entry.from === "top" ? -m.y * 0.5 : m.y) + "px", "0px 0px"],
          scale: [m.scale, 1],
          rotate: [dirX * m.rot + "deg", "0deg"],
        },
        { duration: sp.dur / s, delay, easing: sp.css, fill: "backwards" }
      );
      r.pose.animate(
        { opacity: [0, 1] },
        { duration: 450 / s, delay, easing: "ease-out", fill: "backwards" }
      );
    });

    // Exit (forward: up, back: down).
    leaving.forEach((r) => {
      const f = r.from;
      const kf = reduce
        ? { opacity: [f.opacity, 0] }
        : {
            opacity: [f.opacity, 0],
            translate: [f.translate, "0px " + (nv.dir === 1 ? -m.exitY : m.exitY * 1.2) + "px"],
            scale: [f.scale, 0.82],
          };
      const a = r.pose.animate(kf, {
        duration: reduce ? 200 : (nv.dir === 1 ? 500 : 400) / s,
        easing: "cubic-bezier(0.4,0,0.2,1)",
        fill: "forwards",
      });
      const done = () => r.row.remove();
      a.onfinish = done;
      a.oncancel = done;
    });

    // Typewriter for the newest bubble.
    const latest = rows.get(visible[visible.length - 1].k);
    if (latest && nv.typingK === latest.k && this.useTyping) this.startTyping(latest);
    this.schedule();
  }

  /* ---------------- autoplay ---------------- */
  get running() {
    const o = this.o;
    return !this.isStatic && o.autoplay && this.n > 1 && this.inView && this.pageVisible &&
      !(o.pauseOnHover && this.hovered);
  }

  get typingDone() {
    return !this.useTyping || this.view.typingK !== this.last.k || this.doneK === this.last.k;
  }

  // Wait for typing, hold, then push the next testimonial.
  schedule() {
    clearTimeout(this.timer);
    this.timer = 0;
    if (!this.running || !this.typingDone) return;
    this.timer = setTimeout(() => this.next(), Math.max(0, this.o.displayDuration) * 1000);
  }

  startAutoplay() { this.o.autoplay = true; this.schedule(); }
  stopAutoplay() { clearTimeout(this.timer); this.timer = 0; }

  bindEvents() {
    if (typeof IntersectionObserver !== "undefined") {
      const io = new IntersectionObserver((ents) => {
        this.inView = ents[ents.length - 1].isIntersecting;
        this.schedule();
      }, { rootMargin: "120px" });
      io.observe(this.frame);
      this.disposers.push(() => io.disconnect());
    }
    const onVis = () => {
      this.pageVisible = document.visibilityState !== "hidden";
      this.schedule();
    };
    document.addEventListener("visibilitychange", onVis);
    this.disposers.push(() => document.removeEventListener("visibilitychange", onVis));

    if (this.o.autoplay && this.o.pauseOnHover) {
      const enter = () => { this.hovered = true; this.schedule(); };
      const leave = () => { this.hovered = false; this.schedule(); };
      this.frame.addEventListener("mouseenter", enter);
      this.frame.addEventListener("mouseleave", leave);
      this.disposers.push(() => {
        this.frame.removeEventListener("mouseenter", enter);
        this.frame.removeEventListener("mouseleave", leave);
      });
    }
  }

  /* ---------------- public ---------------- */
  // Re-render with merged options (restarts from the first testimonial).
  update(patch) {
    return new ChatBubbleEngine(this.container, Object.assign({}, this.given, patch));
  }

  destroy() {
    this.stopAutoplay();
    this.stopTyping();
    this.disposers.forEach((f) => f());
    this.disposers = [];
    if (this.frame) this.frame.remove(); // only our own frame; other container content stays
    this.rows = new Map();
    if (ChatBubbleEngine.instances.get(this.container) === this) {
      ChatBubbleEngine.instances.delete(this.container);
    }
  }

  static autoMount(scope) { return autoMount(scope); }
}
ChatBubbleEngine.instances = new WeakMap();
ChatBubbleEngine.version = version;
ChatBubbleEngine.DEFAULTS = ENGINE_DEFAULTS;

/* =========================================================
   HTML API: data-bc-* attributes
   ========================================================= */
const kebab = (k) => k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());

function readImg(x) {
  if (!x) return "";
  if (x.tagName === "IMG") return x.getAttribute("src") || x.currentSrc || "";
  const mm = /url\(["']?(.*?)["']?\)/.exec(getComputedStyle(x).backgroundImage || "");
  return mm ? mm[1] : "";
}

function readItems(host) {
  const raw = host.getAttribute("data-bc-testimonials");
  if (raw) {
    try {
      const j = JSON.parse(raw);
      if (Array.isArray(j)) return j;
    } catch (err) {
      console.warn("[chat-bubble-engine] invalid JSON in data-bc-testimonials", err);
    }
  }
  const out = [];
  host.querySelectorAll("[data-bc-item]").forEach((node) => {
    const t = (sel) => {
      const x = node.querySelector(sel);
      return x ? x.textContent.trim() : "";
    };
    out.push({
      name: t("[data-bc-name]"),
      role: t("[data-bc-role]"),
      timestamp: t("[data-bc-time]"),
      message: t("[data-bc-message]"),
      avatar: readImg(node.querySelector("[data-bc-avatar]")),
    });
  });
  return out.filter((x) => x.message);
}

// Priority (low -> high): defaults < data-bc-options (JSON) < individual data-bc-* attributes
function readOptions(host) {
  const out = {};
  const json = host.getAttribute("data-bc-options");
  if (json) {
    try {
      Object.assign(out, JSON.parse(json));
    } catch (err) {
      console.warn("[chat-bubble-engine] invalid JSON in data-bc-options", err);
    }
  }
  for (const key in ENGINE_DEFAULTS) {
    if (key === "testimonials") continue;
    const raw = host.getAttribute("data-bc-" + kebab(key));
    if (raw == null) continue;
    const d = ENGINE_DEFAULTS[key];
    if (typeof d === "boolean") {
      out[key] = !/^(false|0|off|no)$/i.test(raw.trim());
    } else if (typeof d === "number") {
      const v = parseFloat(raw);
      if (!isNaN(v)) out[key] = v;
    } else {
      out[key] = raw;
    }
  }
  const items = readItems(host);
  if (items.length) out.testimonials = items;
  return out;
}

function hideSource(node) {
  if (node.nodeType !== 1 || node.hasAttribute("data-bc-frame")) return;
  node.style.setProperty("display", "none", "important");
  node.setAttribute("data-bc-source", "");
}

function autoMount(scope) {
  if (typeof document === "undefined") return;
  (scope || document).querySelectorAll("[data-bc]").forEach((host) => {
    if (ChatBubbleEngine.instances.has(host)) return;
    const opts = readOptions(host);
    if (!Array.isArray(opts.testimonials) || !opts.testimonials.length) {
      console.warn("[chat-bubble-engine] no testimonials found (add [data-bc-item] children or data-bc-testimonials)", host);
      return;
    }
    Array.from(host.children).forEach(hideSource); // keep source markup in the DOM, but not rendered
    new ChatBubbleEngine(host, opts);
  });
}

/* ---------- auto boot (IIFE build only) ---------- */
const SCRIPT = typeof document !== "undefined" ? document.currentScript : null;

function boot() {
  if (typeof document === "undefined") return;
  if (SCRIPT && SCRIPT.getAttribute("data-auto") === "false") return;
  const run = () => {
    autoMount();
    if (typeof MutationObserver === "undefined") return;
    new MutationObserver((muts) => {
      for (const mu of muts) {
        for (const nd of mu.addedNodes) {
          if (nd.nodeType !== 1) continue;
          if (nd.closest && nd.closest("[data-bc-frame]")) continue; // our own rendering
          if (nd.matches("[data-bc]") || (nd.querySelector && nd.querySelector("[data-bc]"))) {
            autoMount(nd.parentNode || document);
          }
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
}


window.ChatBubbleEngine = ChatBubbleEngine;
boot();
})();
