/*! lightbox-gallery-engine v__VERSION__ | MIT | vanilla JS, zero dependencies */

const version = "__VERSION__";

// Both ends of each reveal use the SAME clip-path function, so the browser can interpolate.
const CLIP = {
  circle: { hidden: "circle(0% at 50% 50%)", shown: "circle(75% at 50% 50%)" },
  inset: { hidden: "inset(45% 45% 45% 45% round 20px)", shown: "inset(0% 0% 0% 0% round 20px)" },
  curtain: { hidden: "inset(50% 0% 50% 0%)", shown: "inset(0% 0% 0% 0%)" },
};

const ICONS = {
  close: "M6 6l12 12M18 6L6 18",
  prev: "M15 5l-7 7 7 7",
  next: "M9 5l7 7-7 7",
  play: "M8 5l11 7-11 7z",
  pause: "M8 5v14M16 5v14",
  zoomIn: "M11 5v12M5 11h12",
  zoomOut: "M5 11h12",
  info: "M12 11v6M12 7.5v.01",
};

// Masonry: push each tile's height up or down in a repeating pattern so sizes clearly differ
const PATTERN = [0, 0.7, -0.35, 0.45, -0.1, 0.9, -0.4, 0.3];

// Every option can be set from HTML: data-lg-<kebab-case-name>="value".
// The type of the default decides how the attribute is parsed.
const DEFAULTS = {
  images: [],
  layout: "masonry", // "masonry" | "grid" | "marquee"
  columns: 3,
  columnsMobile: 2, // used when the frame is under 600px wide
  rows: 0, // grid only. 0 = auto, otherwise the frame height is split evenly (needs a host height)
  gridAspect: "3 / 4",
  masonryContrast: 1,
  cardWidth: 280, // marquee
  cardHeight: 0, // marquee: 0 = fill the frame height. grid: 0 = use gridAspect
  padding: 24,
  marqueeSpeed: 60,
  marqueeDirection: "left", // "left" | "right"
  pauseOnHover: true,
  gap: 24,
  borderRadius: 16,
  reveal: "curtain", // "curtain" | "circle" | "inset"
  revealDuration: 550,
  parallax: 0.6,
  backdropBlur: 24,
  slideshowInterval: 3,
  accentColor: "#facc15",
  background: "#0b0d12",
  modalMatchBg: true,
  modalBackground: "#060709",
  modalOpacity: 0.92,
  showMetadata: true,
  showThumbnails: true,
  fontFamily: "Inter, system-ui, sans-serif",
  minHeight: 0, // px, applied to the host element (0 = none)
  static: false, // true = cards only, the lightbox cannot open
};

const CSS_TEXT = `
.lbg-card{display:block;box-sizing:border-box;margin:0;padding:0;border:0;-webkit-appearance:none;appearance:none;background:#15171c;cursor:pointer;overflow:hidden;position:relative;color:inherit;font:inherit;text-align:left}
.lbg-card img{transition:transform .6s ease}
.lbg-card:hover img{transform:scale(1.04)}
.lbg-cap{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;padding:16px;background:linear-gradient(to top,rgba(0,0,0,.75),transparent 55%);opacity:0;transition:opacity .25s}
.lbg-card:hover .lbg-cap,.lbg-card:focus-visible .lbg-cap{opacity:1}
.lbg-card:focus-visible,.lbg-btn:focus-visible,.lbg-thumb:focus-visible{outline:2px solid var(--lbg-accent);outline-offset:3px}
.lbg-btn{display:grid;place-items:center;box-sizing:border-box;margin:0;width:42px;height:42px;border-radius:50%;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.07);color:#fff;cursor:pointer;padding:0;-webkit-appearance:none;appearance:none}
.lbg-btn:hover{background:rgba(255,255,255,.16)}
.lbg-btn[aria-pressed="true"]{background:var(--lbg-accent);color:#111;border-color:var(--lbg-accent)}
.lbg-thumb{flex:0 0 auto;box-sizing:border-box;margin:0;width:48px;height:48px;border-radius:10px;overflow:hidden;border:2px solid transparent;padding:0;background:none;cursor:pointer;opacity:.45;transition:opacity .2s}
.lbg-thumb:hover{opacity:1}
.lbg-thumb[aria-current="true"]{opacity:1;border-color:var(--lbg-accent)}
.lbg-noscroll{scrollbar-width:none;-ms-overflow-style:none}
.lbg-noscroll::-webkit-scrollbar{display:none}
@keyframes lbg-fill{from{width:0}to{width:100%}}
@keyframes lbg-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.lbg-marquee[data-pause="true"]:hover .lbg-track{animation-play-state:paused}
@media (prefers-reduced-motion:reduce){.lbg-track{animation:none!important}}
`;

/* ---------- helpers ---------- */
function h(tag, styles, parent) {
  const e = document.createElement(tag);
  if (styles) for (const k in styles) e.style[k] = styles[k];
  if (parent) parent.appendChild(e);
  return e;
}

function setStyles(node, styles) {
  for (const k in styles) node.style[k] = styles[k] == null ? "" : styles[k];
}

function injectStyles() {
  if (typeof document === "undefined" || document.getElementById("lbg-engine-styles")) return;
  const s = document.createElement("style");
  s.id = "lbg-engine-styles";
  s.textContent = CSS_TEXT;
  (document.head || document.documentElement).appendChild(s);
}

function makeIcon(name) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  [["width", "20"], ["height", "20"], ["viewBox", "0 0 24 24"], ["fill", "none"],
   ["stroke", "currentColor"], ["stroke-width", "2"], ["stroke-linecap", "round"],
   ["stroke-linejoin", "round"], ["aria-hidden", "true"]].forEach(([k, v]) => svg.setAttribute(k, v));
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", ICONS[name]);
  svg.appendChild(path);
  return { svg, path };
}

function iconButton(name, label) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "lbg-btn";
  btn.setAttribute("aria-label", label);
  const ic = makeIcon(name);
  btn.appendChild(ic.svg);
  return { btn, path: ic.path };
}

function str(v) {
  return v == null ? "" : String(v);
}

// Accepts { image: {src, srcSet, alt} | "url", title, subtitle, ... } or a flat { src, srcSet, alt, ... }
function normItem(t) {
  t = t || {};
  const im = t.image;
  const img = typeof im === "string" ? { src: im } : im && typeof im === "object" ? im : {};
  return {
    src: str(img.src || t.src),
    srcSet: str(img.srcSet || img.srcset || t.srcSet || t.srcset),
    alt: str(img.alt || t.alt),
    title: str(t.title),
    subtitle: str(t.subtitle),
    badge: str(t.badge),
    aspect: t.aspect ? str(t.aspect) : "3 / 4",
    author: str(t.author),
    camera: str(t.camera),
    lens: str(t.lens),
  };
}

const COLOR_MIX_OK =
  typeof CSS !== "undefined" && !!CSS.supports &&
  CSS.supports("background", "color-mix(in srgb, red 50%, transparent)");

class LightboxGalleryEngine {
  constructor(target, options = {}) {
    const c = typeof target === "string" ? document.querySelector(target) : target;
    if (!c) throw new Error("[lightbox-gallery-engine] target container not found");
    this.container = c;

    const prev = LightboxGalleryEngine.instances.get(c);
    if (prev) prev.destroy();
    LightboxGalleryEngine.instances.set(c, this);

    this.given = {};
    for (const k in options) if (options[k] != null) this.given[k] = options[k];
    this.o = Object.assign({}, DEFAULTS, this.given);
    this.init();
  }

  get dur() { return this.reduced || this.isStatic ? 0 : this.o.revealDuration; }

  /* ---------------- setup ---------------- */
  init() {
    const o = this.o;
    this.items = (Array.isArray(o.images) ? o.images : []).map(normItem);
    this.n = this.items.length;
    this.isStatic = !!o.static;

    this.isOpen = false;
    this.shown = false;
    this.index = 0;
    this.playing = false;
    this.zoomed = false;
    this.meta = false;
    this.busy = false;
    this.timers = [];
    this.raf = 0;
    this.nat = {};
    this.stageBox = { w: 0, h: 0 };
    this.boxW = 0;
    this.boxH = 0;
    this.cards = [];
    this.disposers = [];
    this.m = null;
    this.slideSig = "";
    this.slideTimer = 0;
    this.swipeX = null;

    const mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    this.reduced = !!(mq && mq.matches);
    if (mq) {
      const on = () => { this.reduced = mq.matches; if (this.isOpen) this.syncModal(); };
      if (mq.addEventListener) {
        mq.addEventListener("change", on);
        this.disposers.push(() => mq.removeEventListener("change", on));
      } else if (mq.addListener) {
        mq.addListener(on);
        this.disposers.push(() => mq.removeListener(on));
      }
    }

    injectStyles();
    this.buildFrame();
    if (!this.n) {
      const p = h("p", { margin: "0", opacity: "0.6", fontSize: "14px" }, this.frame);
      p.textContent = "Add images to fill the gallery.";
      return;
    }
    if (o.layout === "marquee") this.buildMarquee();
    else this.buildGrid();
    this.measureAndObserve();
  }

  buildFrame() {
    const o = this.o, host = this.container;
    // These layouts split the HOST height, so the host must have one.
    this.needsHeight = (o.layout === "marquee" && !(o.cardHeight > 0)) || (o.layout === "grid" && o.rows > 0);
    if (o.minHeight > 0) host.style.minHeight = o.minHeight + "px";
    const fill = this.needsHeight
      ? { position: "absolute", top: "0", right: "0", bottom: "0", left: "0" }
      : { position: "relative", width: "100%", height: "100%" };
    if (this.needsHeight) {
      if (host.clientHeight === 0 && !(o.minHeight > 0)) host.style.minHeight = "360px";
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
    }
    this.frame = h("div", Object.assign({
      overflowX: "hidden",
      overflowY: "auto",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      padding: o.padding + "px",
      background: o.background,
      color: "#fff",
      fontFamily: o.fontFamily,
      textAlign: "left",
    }, fill), host);
    this.frame.className = "lbg-noscroll";
    this.frame.setAttribute("data-lg-frame", "");
    this.frame.setAttribute("role", "region");
    this.frame.setAttribute("aria-label", "Gallery");
    this.frame.style.setProperty("--lbg-accent", o.accentColor);
  }

  makeCard(it, i, dup) {
    const o = this.o;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lbg-card";
    btn.setAttribute("aria-label", "Open " + (it.title || "image " + (i + 1)));
    if (dup) {
      btn.setAttribute("aria-hidden", "true");
      btn.tabIndex = -1;
    }
    if (it.src) {
      const img = h("img", { width: "100%", height: "100%", objectFit: "cover", display: "block", maxWidth: "none" }, btn);
      img.src = it.src;
      if (it.srcSet) img.srcset = it.srcSet;
      img.sizes = "(max-width: 700px) 100vw, 33vw";
      img.alt = dup ? "" : it.alt || it.title;
      img.loading = "lazy";
      img.decoding = "async";
      img.draggable = false;
    }
    const cap = h("span", null, btn);
    cap.className = "lbg-cap";
    if (it.badge) {
      const b = h("span", { fontSize: "11px", letterSpacing: "1px", color: o.accentColor }, cap);
      b.textContent = it.badge;
    }
    h("span", { fontSize: "15px", fontWeight: "600" }, cap).textContent = it.title;
    btn.addEventListener("click", () => this.openAt(i));
    return { btn, it, i };
  }

  buildGrid() {
    this.gridEl = h("div", null, this.frame);
    this.items.forEach((it, i) => {
      const c = this.makeCard(it, i, false);
      this.cards.push(c);
      this.gridEl.appendChild(c.btn);
    });
    this.measure();
    this.layoutCards();
  }

  // Marquee: repeat an even number of copies, animate -50% for a seamless loop
  buildMarquee() {
    const o = this.o, n = this.n;
    const fill = !(o.cardHeight > 0);
    const copies = n >= 6 ? 2 : 4;
    const dur = Math.max(5, ((copies / 2) * n * (o.cardWidth + o.gap)) / Math.max(10, o.marqueeSpeed));
    const mask = "linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)";
    const wrap = h("div", {
      overflow: "hidden",
      flex: fill ? "1 1 0" : "0 0 auto",
      minHeight: fill ? "0" : "",
      webkitMaskImage: mask,
      maskImage: mask,
    }, this.frame);
    wrap.className = "lbg-marquee";
    wrap.setAttribute("data-pause", String(!!o.pauseOnHover));
    const track = h("div", {
      display: "flex",
      width: "max-content",
      height: fill ? "100%" : "",
      animation: "lbg-marquee " + dur + "s linear infinite",
      animationDirection: o.marqueeDirection === "right" ? "reverse" : "normal",
      animationPlayState: this.isStatic ? "paused" : "",
    }, wrap);
    track.className = "lbg-track";
    for (let c = 0; c < copies; c++) {
      this.items.forEach((it, i) => {
        const card = this.makeCard(it, i, c > 0);
        this.cards.push(card);
        track.appendChild(card.btn);
      });
    }
    this.layoutCards();
  }

  masonryRatio(aspect, i) {
    const parts = str(aspect || "3 / 4").split("/").map((v) => parseFloat(v));
    const w = parts[0], hgt = parts[1];
    const base = w > 0 && hgt > 0 ? hgt / w : 4 / 3;
    const hw = Math.min(2.4, Math.max(0.5, base * (1 + this.o.masonryContrast * PATTERN[i % PATTERN.length])));
    return "1 / " + hw.toFixed(3);
  }

  cardStyle(it, marquee, i, rowH) {
    const o = this.o;
    const gridFixed = o.layout === "grid" && (o.cardHeight > 0 || rowH > 0);
    let height = "";
    if (gridFixed && rowH > 0) height = "100%";
    else if ((marquee || gridFixed) && o.cardHeight > 0) height = o.cardHeight + "px";
    return {
      borderRadius: o.borderRadius + "px",
      width: marquee ? o.cardWidth + "px" : "100%",
      maxWidth: "100%",
      height,
      minHeight: marquee && !(o.cardHeight > 0) ? "120px" : "",
      flex: marquee ? "0 0 auto" : "",
      breakInside: "avoid",
      marginBottom: o.layout === "masonry" ? o.gap + "px" : "0px",
      marginRight: marquee ? o.gap + "px" : "0px",
      aspectRatio: marquee || gridFixed ? "" : o.layout === "grid" ? o.gridAspect : this.masonryRatio(it.aspect, i),
    };
  }

  layoutCards() {
    const o = this.o;
    const marquee = o.layout === "marquee";
    const cols = this.boxW && this.boxW < 600 ? o.columnsMobile : o.columns;
    // Fixed rows: split the frame height evenly; extra items continue in new rows of the same height
    const rowH =
      o.layout === "grid" && o.rows > 0 && this.boxH
        ? Math.max(40, (this.boxH - o.padding * 2 - o.gap * (o.rows - 1)) / o.rows)
        : 0;
    if (this.gridEl) {
      if (o.layout === "masonry") {
        setStyles(this.gridEl, { columnCount: String(cols), columnGap: o.gap + "px", flexShrink: "0" });
      } else {
        setStyles(this.gridEl, {
          display: "grid",
          gridTemplateColumns: "repeat(" + cols + ", minmax(0, 1fr))",
          gridAutoRows: rowH ? rowH + "px" : "",
          gap: o.gap + "px",
          alignItems: "start",
          justifyItems: "stretch",
          justifyContent: "start",
          alignContent: "start",
          flexShrink: "0",
        });
      }
    }
    this.cards.forEach((c) => setStyles(c.btn, this.cardStyle(c.it, marquee, c.i, rowH)));
  }

  measure() {
    this.boxW = this.frame.clientWidth;
    this.boxH = this.frame.clientHeight;
  }

  measureAndObserve() {
    this.measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const w = this.frame.clientWidth, hh = this.frame.clientHeight;
      if (w === this.boxW && hh === this.boxH) return;
      this.boxW = w;
      this.boxH = hh;
      if (!this.gridEl) return;
      this.layoutCards();
    });
    ro.observe(this.frame);
    this.disposers.push(() => ro.disconnect());
    this.layoutCards();
  }

  /* ---------------- lightbox state machine ---------------- */
  after(ms, fn) {
    this.timers.push(window.setTimeout(fn, ms));
  }

  nextFrame(fn) {
    requestAnimationFrame(() => requestAnimationFrame(fn));
  }

  openAt(i) {
    if (this.isStatic || !this.n) return;
    this.lastFocus = document.activeElement;
    this.index = i;
    this.shown = false;
    this.isOpen = true;
    this.buildModal();
    this.syncModal();
    this.preload();
    this.nextFrame(() => {
      if (!this.isOpen) return;
      this.shown = true;
      this.syncModal();
    });
  }

  close() {
    if (this.busy) return;
    this.busy = true;
    this.playing = false;
    this.zoomed = false;
    this.shown = false;
    this.syncModal();
    this.after(this.dur, () => {
      this.isOpen = false;
      this.meta = false;
      this.destroyModal();
      this.busy = false;
      if (this.lastFocus && this.lastFocus.focus) this.lastFocus.focus();
    });
  }

  swapTo(target) {
    if (this.busy || !this.n || target === this.index) return;
    this.busy = true;
    this.zoomed = false;
    this.shown = false;
    this.syncModal();
    this.after(this.dur, () => {
      this.index = target;
      this.syncModal();
      this.preload();
      this.nextFrame(() => {
        if (!this.isOpen) return;
        this.shown = true;
        this.syncModal();
      });
      this.after(this.dur + 30, () => { this.busy = false; });
    });
  }

  go(dir) {
    this.swapTo((this.index + dir + this.n) % this.n);
  }

  noteSize(src, el) {
    if (!src || !el.naturalWidth || this.nat[src]) return;
    this.nat[src] = { w: el.naturalWidth, h: el.naturalHeight };
    this.updateFit();
  }

  // Preload neighbours
  preload() {
    if (!this.isOpen || !this.n) return;
    [0, -1, 1].forEach((d) => {
      const it = this.items[(this.index + d + this.n) % this.n];
      if (!it || !it.src) return;
      const im = new Image();
      im.onload = () => this.noteSize(it.src, im);
      im.src = it.src;
    });
  }

  updateFit() {
    const m = this.m;
    if (!m) return;
    const a = this.items[this.index];
    const nat = a && this.nat[a.src];
    const sb = this.stageBox;
    if (nat && sb.w > 0 && sb.h > 0) {
      const sc = Math.min(sb.w / nat.w, sb.h / nat.h);
      m.img.style.width = Math.round(nat.w * sc) + "px";
      m.img.style.height = Math.round(nat.h * sc) + "px";
    } else {
      m.img.style.width = "";
      m.img.style.height = "";
    }
  }

  /* ---------------- modal DOM ---------------- */
  buildModal() {
    if (this.m) this.destroyModal();
    const o = this.o;
    const base = o.modalMatchBg ? o.background : o.modalBackground;
    const bg = COLOR_MIX_OK
      ? "color-mix(in srgb, " + base + " " + Math.round(o.modalOpacity * 100) + "%, transparent)"
      : base;
    const root = h("div", {
      position: "fixed",
      top: "0",
      right: "0",
      bottom: "0",
      left: "0",
      zIndex: "9999",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      padding: "max(16px, env(safe-area-inset-top)) 20px max(16px, env(safe-area-inset-bottom))",
      boxSizing: "border-box",
      background: bg,
      backdropFilter: "blur(" + o.backdropBlur + "px)",
      webkitBackdropFilter: "blur(" + o.backdropBlur + "px)",
      color: "#fff",
      fontFamily: o.fontFamily,
      touchAction: "pan-y",
      textAlign: "left",
    });
    root.setAttribute("data-lg-modal", "");
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.style.setProperty("--lbg-accent", o.accentColor);

    const m = { root, bar: null, barKey: -1 };

    // header
    const header = h("div", { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }, root);
    const left = h("div", { minWidth: "0" }, header);
    m.title = h("div", { fontSize: "16px", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, left);
    m.sub = h("div", { fontSize: "12px", opacity: "0.6" }, left);
    const right = h("div", { display: "flex", gap: "8px" }, header);
    const meta = iconButton("info", "Photo details");
    const zoom = iconButton("zoomIn", "Zoom in");
    const play = iconButton("play", "Play slideshow");
    const close = iconButton("close", "Close viewer");
    [meta, zoom, play, close].forEach((b) => right.appendChild(b.btn));
    m.btnMeta = meta.btn;
    m.btnZoom = zoom.btn; m.zoomPath = zoom.path;
    m.btnPlay = play.btn; m.playPath = play.path;
    m.btnClose = close.btn;
    meta.btn.addEventListener("click", () => { this.meta = !this.meta; this.syncModal(); });
    zoom.btn.addEventListener("click", () => { this.zoomed = !this.zoomed; this.syncModal(); });
    play.btn.addEventListener("click", () => { this.playing = !this.playing; this.syncModal(); });
    close.btn.addEventListener("click", () => this.close());

    // stage row
    const row = h("div", {
      flex: "1",
      minHeight: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px",
      margin: "12px 0",
      perspective: "1000px",
    }, root);
    const prev = iconButton("prev", "Previous image");
    const next = iconButton("next", "Next image");
    prev.btn.addEventListener("click", () => this.go(-1));
    next.btn.addEventListener("click", () => this.go(1));
    m.prev = prev.btn;
    m.next = next.btn;
    row.appendChild(prev.btn);
    m.stage = h("div", {
      position: "relative",
      flex: "1",
      minWidth: "0",
      alignSelf: "stretch",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "transform .2s ease-out",
    }, row);
    row.appendChild(next.btn);

    m.img = h("img", { maxWidth: "100%", maxHeight: "100%", flex: "none", objectFit: "contain", borderRadius: "16px" }, m.stage);
    m.img.draggable = false;
    m.img.addEventListener("load", () => this.noteSize(this.items[this.index] && this.items[this.index].src, m.img));
    m.img.addEventListener("click", () => { this.zoomed = !this.zoomed; this.syncModal(); });

    m.metaPanel = h("div", {
      position: "absolute",
      top: "8px",
      right: "8px",
      width: "240px",
      padding: "14px",
      borderRadius: "14px",
      background: "rgba(20,22,27,.92)",
      border: "1px solid rgba(255,255,255,.12)",
      fontSize: "12px",
      display: "none",
    }, m.stage);

    // thumbnails
    m.thumbs = [];
    if (o.showThumbnails && this.n > 1) {
      const strip = h("div", { display: "flex", justifyContent: "center", gap: "10px", overflowX: "auto", padding: "6px" }, root);
      strip.className = "lbg-noscroll";
      this.items.forEach((it, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "lbg-thumb";
        b.setAttribute("aria-label", "Show " + (it.title || "image " + (i + 1)));
        const im = h("img", { width: "100%", height: "100%", objectFit: "cover", display: "block", maxWidth: "none" }, b);
        im.src = it.src;
        im.alt = "";
        im.loading = "lazy";
        b.addEventListener("click", () => this.swapTo(i));
        strip.appendChild(b);
        m.thumbs.push(b);
      });
    }

    // events
    root.addEventListener("pointermove", (e) => this.onPointerMove(e));
    root.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") this.swipeX = e.clientX; });
    root.addEventListener("pointerup", (e) => this.onPointerUp(e));

    this.prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.appendChild(root);
    this.m = m;

    this.onKey = (e) => {
      if (e.key === "Escape") this.close();
      else if (e.key === "ArrowLeft") this.go(-1);
      else if (e.key === "ArrowRight") this.go(1);
      else if (e.key === "p" || e.key === "P") { this.playing = !this.playing; this.syncModal(); }
      else if (e.key === "Tab") {
        const f = Array.from(root.querySelectorAll("button:not([disabled])")).filter((x) => x.getClientRects().length);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", this.onKey);

    if (typeof ResizeObserver !== "undefined") {
      const measureStage = () => {
        this.stageBox = { w: m.stage.clientWidth, h: m.stage.clientHeight };
        this.updateFit();
      };
      this.stageRO = new ResizeObserver(measureStage);
      this.stageRO.observe(m.stage);
      measureStage();
    }
    m.btnClose.focus();
  }

  syncModal() {
    const m = this.m;
    if (!m) return;
    const o = this.o;
    const a = this.items[this.index];
    if (!a) return;
    const hasMeta = !!(a.author || a.camera || a.lens);

    m.root.setAttribute("aria-label", a.title || "Image viewer");
    m.title.textContent = a.title;
    m.sub.textContent = a.subtitle + " (" + (this.index + 1) + " of " + this.n + ")";

    // image
    if (a.src) {
      if (m.img.getAttribute("src") !== a.src) m.img.src = a.src;
    } else m.img.removeAttribute("src");
    if (a.srcSet) {
      if (m.img.getAttribute("srcset") !== a.srcSet) m.img.srcset = a.srcSet;
    } else m.img.removeAttribute("srcset");
    m.img.alt = a.alt || a.title;
    this.updateFit();

    // controls
    m.btnMeta.style.display = o.showMetadata && hasMeta ? "" : "none";
    m.btnMeta.setAttribute("aria-pressed", String(this.meta));
    m.btnZoom.setAttribute("aria-label", this.zoomed ? "Zoom out" : "Zoom in");
    m.btnZoom.setAttribute("aria-pressed", String(this.zoomed));
    m.zoomPath.setAttribute("d", ICONS[this.zoomed ? "zoomOut" : "zoomIn"]);
    m.btnPlay.style.display = this.n > 1 && !this.reduced ? "" : "none";
    m.btnPlay.setAttribute("aria-label", this.playing ? "Pause slideshow" : "Play slideshow");
    m.btnPlay.setAttribute("aria-pressed", String(this.playing));
    m.playPath.setAttribute("d", ICONS[this.playing ? "pause" : "play"]);
    m.prev.style.display = this.n > 1 ? "" : "none";
    m.next.style.display = this.n > 1 ? "" : "none";

    // reveal
    const clip = CLIP[o.reveal] || CLIP.curtain;
    const dur = this.dur;
    m.stage.style.overflow = this.zoomed ? "hidden" : "visible";
    setStyles(m.img, {
      clipPath: this.shown ? clip.shown : clip.hidden,
      opacity: this.shown ? "1" : "0.15",
      transform: this.zoomed ? "scale(1.8)" : "scale(1)",
      cursor: this.zoomed ? "zoom-out" : "zoom-in",
      transition: "clip-path " + dur + "ms cubic-bezier(.77,0,.175,1), opacity " + dur + "ms ease, transform .35s ease-out",
    });

    // metadata panel
    const showPanel = this.meta && hasMeta;
    m.metaPanel.style.display = showPanel ? "" : "none";
    if (showPanel) {
      m.metaPanel.textContent = "";
      [["Photographer", a.author], ["Camera", a.camera], ["Lens", a.lens]]
        .filter((p) => p[1])
        .forEach((p) => {
          const r = h("div", { display: "flex", justifyContent: "space-between", gap: "8px", padding: "3px 0" }, m.metaPanel);
          h("span", { opacity: "0.55" }, r).textContent = p[0];
          h("span", null, r).textContent = p[1];
        });
    }

    // thumbnails
    m.thumbs.forEach((b, i) => b.setAttribute("aria-current", String(i === this.index)));

    this.syncBar();
    this.restartSlideshow();
  }

  // Progress bar: re-created on every slide so its CSS animation restarts
  syncBar() {
    const m = this.m;
    const want = this.playing && !this.reduced && this.n > 1 ? this.index : -1;
    if (m.barKey === want) return;
    m.barKey = want;
    if (m.bar) { m.bar.remove(); m.bar = null; }
    if (want < 0) return;
    const bar = h("div", { position: "absolute", top: "0", left: "0", right: "0", height: "3px", background: "rgba(255,255,255,.12)" }, m.root);
    bar.setAttribute("aria-hidden", "true");
    h("i", {
      display: "block",
      height: "100%",
      background: this.o.accentColor,
      animation: "lbg-fill " + this.o.slideshowInterval + "s linear forwards",
    }, bar);
    m.bar = bar;
  }

  // Slideshow: the interval restarts whenever open / playing / index changes (not on zoom etc.)
  restartSlideshow() {
    const run = this.isOpen && this.playing && !this.reduced && this.n > 1;
    const sig = [run, this.index].join();
    if (sig === this.slideSig) return;
    this.slideSig = sig;
    clearInterval(this.slideTimer);
    this.slideTimer = 0;
    if (run) this.slideTimer = window.setInterval(() => this.go(1), this.o.slideshowInterval * 1000);
  }

  // Parallax / zoom-pan: direct DOM writes, no re-render per mouse move
  onPointerMove(e) {
    if (e.pointerType !== "mouse") return;
    const cx = e.clientX, cy = e.clientY;
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => {
      const m = this.m;
      if (!m) return;
      if (this.zoomed) {
        const r = m.img.getBoundingClientRect();
        m.img.style.transformOrigin = ((cx - r.left) / r.width) * 100 + "% " + ((cy - r.top) / r.height) * 100 + "%";
        return;
      }
      if (this.reduced || this.o.parallax === 0) return;
      const x = ((cx - innerWidth / 2) / (innerWidth / 2)) * 22 * this.o.parallax;
      const y = ((cy - innerHeight / 2) / (innerHeight / 2)) * 22 * this.o.parallax;
      m.stage.style.transform = "translate3d(" + x + "px, " + y + "px, 0) rotateY(" + x / 5 + "deg)";
    });
  }

  onPointerUp(e) {
    if (this.swipeX === null || this.zoomed) return;
    const dx = e.clientX - this.swipeX;
    this.swipeX = null;
    if (Math.abs(dx) > 50) this.go(dx < 0 ? 1 : -1);
  }

  destroyModal() {
    clearInterval(this.slideTimer);
    this.slideTimer = 0;
    this.slideSig = "";
    cancelAnimationFrame(this.raf);
    if (this.onKey) window.removeEventListener("keydown", this.onKey);
    this.onKey = null;
    if (this.stageRO) this.stageRO.disconnect();
    this.stageRO = null;
    if (this.m) {
      this.m.root.remove();
      document.body.style.overflow = this.prevOverflow || "";
    }
    this.m = null;
    this.stageBox = { w: 0, h: 0 };
  }

  /* ---------------- public ---------------- */
  open(i) { this.openAt(i || 0); }

  // Re-render with merged options (restarts the gallery).
  update(patch) {
    return new LightboxGalleryEngine(this.container, Object.assign({}, this.given, patch));
  }

  destroy() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    cancelAnimationFrame(this.raf);
    this.destroyModal();
    this.disposers.forEach((f) => f());
    this.disposers = [];
    if (this.frame) this.frame.remove(); // only our own frame; other container content stays
    if (LightboxGalleryEngine.instances.get(this.container) === this) {
      LightboxGalleryEngine.instances.delete(this.container);
    }
  }

  static autoMount(scope) { return autoMount(scope); }
}
LightboxGalleryEngine.instances = new WeakMap();
LightboxGalleryEngine.version = version;
LightboxGalleryEngine.DEFAULTS = DEFAULTS;

/* =========================================================
   HTML API: data-lg-* attributes
   ========================================================= */
const kebab = (k) => k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
const FIELDS = ["title", "subtitle", "badge", "aspect", "author", "camera", "lens"];

function readItems(host) {
  const raw = host.getAttribute("data-lg-items");
  if (raw) {
    try {
      const j = JSON.parse(raw);
      if (Array.isArray(j)) return j;
    } catch (err) {
      console.warn("[lightbox-gallery-engine] invalid JSON in data-lg-items", err);
    }
  }
  const out = [];
  host.querySelectorAll("[data-lg-item]").forEach((node) => {
    const el = node.querySelector("[data-lg-image]") || node.querySelector("img");
    let src = "", srcSet = "", alt = "";
    if (el) {
      if (el.tagName === "IMG") {
        src = el.getAttribute("src") || el.currentSrc || "";
        srcSet = el.getAttribute("srcset") || "";
        alt = el.getAttribute("alt") || "";
      } else {
        const mm = /url\(["']?(.*?)["']?\)/.exec(getComputedStyle(el).backgroundImage || "");
        src = mm ? mm[1] : "";
      }
    }
    const item = { image: { src, srcSet, alt } };
    FIELDS.forEach((f) => {
      const x = node.querySelector("[data-lg-" + f + "]");
      item[f] = x ? x.textContent.trim() : node.getAttribute("data-lg-" + f) || "";
    });
    out.push(item);
  });
  return out.filter((x) => x.image.src);
}

// Priority (low -> high): defaults < data-lg-options (JSON) < individual data-lg-* attributes
function readOptions(host) {
  const out = {};
  const json = host.getAttribute("data-lg-options");
  if (json) {
    try {
      Object.assign(out, JSON.parse(json));
    } catch (err) {
      console.warn("[lightbox-gallery-engine] invalid JSON in data-lg-options", err);
    }
  }
  for (const key in DEFAULTS) {
    if (key === "images") continue;
    const raw = host.getAttribute("data-lg-" + kebab(key));
    if (raw == null) continue;
    const d = DEFAULTS[key];
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
  if (items.length) out.images = items;
  return out;
}

function hideSource(node) {
  if (node.nodeType !== 1 || node.hasAttribute("data-lg-frame")) return;
  node.style.setProperty("display", "none", "important");
  node.setAttribute("data-lg-source", "");
}

function autoMount(scope) {
  if (typeof document === "undefined") return;
  (scope || document).querySelectorAll("[data-lg]").forEach((host) => {
    if (LightboxGalleryEngine.instances.has(host)) return;
    const opts = readOptions(host);
    if (!Array.isArray(opts.images) || !opts.images.length) {
      console.warn("[lightbox-gallery-engine] no images found (add [data-lg-item] children or data-lg-items)", host);
      return;
    }
    Array.from(host.children).forEach(hideSource); // keep source markup in the DOM, but not rendered
    new LightboxGalleryEngine(host, opts);
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
          if (nd.closest && nd.closest("[data-lg-frame],[data-lg-modal]")) continue; // our own rendering
          if (nd.matches("[data-lg]") || (nd.querySelector && nd.querySelector("[data-lg]"))) {
            autoMount(nd.parentNode || document);
          }
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
}

export { LightboxGalleryEngine, autoMount, readOptions, DEFAULTS, version };
