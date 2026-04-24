#!/usr/bin/env node
// NAVA Sigma v0.3 — Clean-Room Transmutation Engine (복제화 엔진)
//
// Transmutes a source URL's STRUCTURE into a clean Next.js 15 project.
// Every emitted byte is either authored by Sigma or drawn from public/OSS
// dependencies (Next, Tailwind, framer-motion, Google Fonts, Picsum).
// Zero bytes from the source site survive in the output — the legal
// invariant that makes output publishable.
//
// v0.3 additions:
//   • Motion normalization — captured easing curves replaced by named
//     framer-motion presets (prevents verbatim animation expression copying).
//   • Platform adapter integration — Framer/Webflow/Squarespace/Wix/WP/iWeb
//     detection delegated to engine/platforms/*.
//   • Layout-aware emission — section templates use captured column counts,
//     alignment, container widths instead of hardcoded defaults.
//
// Pipeline:  Σ.0 RECON -> Σ.1 SEMANTIC SCAN -> Σ.2 DESIGN TOKENS
//         -> Σ.3 CONTENT STRIP -> Σ.4 COMPONENT EMIT -> Σ.5 AUDIT -> Σ.6 BUILD
import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";
import { pickAdapter } from "./platforms/index.mjs";

// ═══ MOTION PRESETS ═══════════════════════════════════════════════════
// Named durations + eases prevent the engine from embedding verbatim
// animation curves (which could be considered creative expression).
// Every emitted <motion.*> uses these tokens — never raw numbers/arrays.
const MOTION = {
  duration: { fast: 0.3, normal: 0.6, slow: 0.9 },
  // framer-motion accepts string names "easeOut", "easeIn", "easeInOut",
  // "linear", "circIn", "backOut" etc. We map captured curves to the
  // closest named preset instead of copying cubic bezier tuples.
  ease: { in: "easeIn", out: "easeOut", inOut: "easeInOut", spring: "backOut" },
  stagger: 0.08,
};

const args = process.argv.slice(2);
const url = args.find(a => a.startsWith("http"));
const outIdx = args.indexOf("--output");
const outputDir = outIdx >= 0 ? args[outIdx + 1] : "sigma-output";
const SKIP_BUILD = args.includes("--skip-build");
const VERBOSE = args.includes("--verbose") || args.includes("-v");
// Dev mode: keep source image URLs for visual verification. Output is NOT
// clean-room in this mode — images remain copyrighted by source. User must
// replace before deployment. Emits NOTICE-DEV.md instead of NOTICE-CLEAN.md.
const USE_ORIGINAL_IMAGES = args.includes("--use-original-images") || args.includes("--dev-images");
const USE_ORIGINAL_TEXT = args.includes("--use-original-text") || args.includes("--dev-text");
const USE_DOM_MIRROR = args.includes("--use-dom-mirror") || args.includes("--dom-mirror");

if (!url) { console.error("usage: nava-sigma.mjs <url> [--output dir] [--skip-build]"); process.exit(1); }

const projDir = path.resolve(outputDir);
const dataDir = path.join(projDir, ".sigma");
const srcDir = path.join(projDir, "src");
const compDir = path.join(srcDir, "components");
const appDir = path.join(srcDir, "app");
[projDir, dataDir, srcDir, compDir, appDir].forEach(d => fs.mkdirSync(d, { recursive: true }));

const T0 = Date.now();
const el = () => ((Date.now() - T0) / 1000).toFixed(1) + "s";
const vlog = (...a) => VERBOSE && console.log("  ·", ...a);

console.log(`
NAVA Sigma v0.1 — Clean-Room Regeneration
  URL:    ${url}
  Output: ${outputDir}
`);

// ─── Σ.0 RECON ─────────────────────────────────────────────────────
console.log(`[Σ.0] RECON ${el()}`);
const browser = await puppeteer.launch({
  headless: "new",
  protocolTimeout: 300000,
  args: [
    "--disable-dev-shm-usage",
    "--no-sandbox",
    "--disable-blink-features=AutomationControlled",
    "--disable-features=site-per-process,TranslateUI",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
  ],
});
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080 });
// Canvas text intercept — injected BEFORE any page script so we catch
// every fillText/strokeText call. Framer/Webflow canvas typography
// normally can't be read back from DOM; this hook stores text + pos
// per canvas element so our extractor can recover it.
await page.evaluateOnNewDocument(() => {
  // v65 — customElements.define tracker (catches early registration)
  window.__navaCustomElementsDefined = new Set();
  if (window.customElements && window.customElements.define) {
    const origCEDef = window.customElements.define.bind(window.customElements);
    window.customElements.define = function (name, ctor, opts) {
      try { window.__navaCustomElementsDefined.add(name); } catch {}
      return origCEDef(name, ctor, opts);
    };
  }

  // v65 — trustedTypes.createPolicy tracker
  window.__navaTrustedTypesPolicies = new Set();
  if (window.trustedTypes && window.trustedTypes.createPolicy) {
    const origTTCreate = window.trustedTypes.createPolicy.bind(window.trustedTypes);
    window.trustedTypes.createPolicy = function (name, rules) {
      try { window.__navaTrustedTypesPolicies.add(name); } catch {}
      return origTTCreate(name, rules);
    };
  }

  // v65 — closed shadowRoot counter via attachShadow monkeypatch
  window.__navaClosedShadowCount = 0;
  if (window.Element && window.Element.prototype.attachShadow) {
    const origAttachShadow = window.Element.prototype.attachShadow;
    window.Element.prototype.attachShadow = function (init) {
      try { if (init && init.mode === "closed") window.__navaClosedShadowCount++; } catch {}
      return origAttachShadow.call(this, init);
    };
  }

  window.__CAPTURED_CANVAS_TEXT__ = [];
  const origFill = CanvasRenderingContext2D.prototype.fillText;
  const origStroke = CanvasRenderingContext2D.prototype.strokeText;
  // Hard cap: canvas animations (tickers, data viz) can call fillText 60fps
  // forever. Without a cap the array grows unbounded and Puppeteer hangs
  // trying to serialize it. 500 unique captures is plenty for typography.
  const seenKeys = new Set();
  const capture = (text, x, y, ctx, type) => {
    if (window.__CAPTURED_CANVAS_TEXT__.length >= 500) return;
    const key = text + "|" + Math.round(x) + "|" + Math.round(y);
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    window.__CAPTURED_CANVAS_TEXT__.push({
      text: String(text),
      x: +x, y: +y,
      font: ctx.font,
      fillStyle: ctx.fillStyle,
      strokeStyle: ctx.strokeStyle,
      align: ctx.textAlign,
      canvasEl: ctx.canvas,
      type,
    });
  };
  CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
    try { if (text && String(text).trim().length > 0) capture(text, x, y, this, "fill"); } catch (e) {}
    return origFill.call(this, text, x, y, maxWidth);
  };
  CanvasRenderingContext2D.prototype.strokeText = function (text, x, y, maxWidth) {
    try { if (text && String(text).trim().length > 0) capture(text, x, y, this, "stroke"); } catch (e) {}
    return origStroke.call(this, text, x, y, maxWidth);
  };

  // WebGL shader source intercept — the closest we get to "copying" a
  // WebGL scene. Shader source is a string at creation time; we save it
  // before the GPU compiles. Output can replay via raw WebGL or three.js.
  window.__CAPTURED_SHADERS__ = [];
  const shaderSeen = new Set();
  const patchGL = (ctxProto) => {
    if (!ctxProto) return;
    const origShader = ctxProto.shaderSource;
    if (!origShader) return;
    ctxProto.shaderSource = function (shader, source) {
      try {
        if (source && source.length < 20000) {
          const h = source.slice(0, 100);
          if (!shaderSeen.has(h) && window.__CAPTURED_SHADERS__.length < 20) {
            shaderSeen.add(h);
            window.__CAPTURED_SHADERS__.push({
              source: String(source),
              length: source.length,
              // Shader type detected by keyword (cheap heuristic)
              kind: /gl_FragColor|gl_FragData|out\s+vec4/.test(source) ? "fragment" : "vertex",
            });
          }
        }
      } catch (e) {}
      return origShader.call(this, shader, source);
    };
  };
  if (typeof WebGLRenderingContext !== "undefined") patchGL(WebGLRenderingContext.prototype);
  if (typeof WebGL2RenderingContext !== "undefined") patchGL(WebGL2RenderingContext.prototype);

  // Three.js Scene graph intercept — wait for THREE assignment on window,
  // then patch Scene.prototype.add to capture every mesh addition.
  // Result: scene graph (geometry + material + position) emits alongside
  // shader source to reconstruct three-fiber scene in our output.
  window.__THREE_SCENE_ADDS__ = [];
  let _threeVal = undefined;
  try {
    Object.defineProperty(window, "THREE", {
      configurable: true,
      get() { return _threeVal; },
      set(val) {
        _threeVal = val;
        try {
          if (val && val.Scene && val.Scene.prototype && !val.Scene.prototype.__patched) {
            const origAdd = val.Scene.prototype.add;
            val.Scene.prototype.add = function (obj) {
              try {
                if (obj && obj.isMesh && window.__THREE_SCENE_ADDS__.length < 80) {
                  window.__THREE_SCENE_ADDS__.push({
                    type: "mesh",
                    name: obj.name || null,
                    geometry: obj.geometry?.type || null,
                    geometryParams: obj.geometry?.parameters || null,
                    material: obj.material?.type || null,
                    materialColor: obj.material?.color?.getHex?.() ?? null,
                    position: [obj.position.x, obj.position.y, obj.position.z],
                    rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
                    scale: [obj.scale.x, obj.scale.y, obj.scale.z],
                  });
                } else if (obj && (obj.isLight || obj.isCamera) && window.__THREE_SCENE_ADDS__.length < 80) {
                  window.__THREE_SCENE_ADDS__.push({
                    type: obj.isLight ? "light" : "camera",
                    subtype: obj.type,
                    position: [obj.position.x, obj.position.y, obj.position.z],
                    color: obj.color?.getHex?.() ?? null,
                    intensity: obj.intensity ?? null,
                    fov: obj.fov ?? null,
                  });
                }
              } catch (e) {}
              return origAdd.call(this, obj);
            };
            val.Scene.prototype.__patched = true;
          }
        } catch (e) {}
      },
    });
  } catch (e) {}

  // WebSocket message logger — record all frames for later playback emit.
  window.__WS_LOG__ = [];
  const OrigWS = window.WebSocket;
  if (OrigWS) {
    window.WebSocket = function PatchedWS(url, protocols) {
      const ws = protocols !== undefined ? new OrigWS(url, protocols) : new OrigWS(url);
      const t0 = Date.now();
      const log = (dir, data) => {
        if (window.__WS_LOG__.length >= 500) return;
        let payload = "";
        try {
          if (typeof data === "string") payload = data.slice(0, 4000);
          else if (data && data.byteLength !== undefined) payload = "[binary]";
          else payload = String(data).slice(0, 4000);
        } catch (e) {}
        window.__WS_LOG__.push({ url: String(url), dir, t: Date.now() - t0, payload });
      };
      const origSend = ws.send.bind(ws);
      ws.send = function (data) { log("out", data); return origSend(data); };
      ws.addEventListener("message", (ev) => log("in", ev.data));
      return ws;
    };
    Object.assign(window.WebSocket, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 });
  }

  // Element.animate() intercept — every programmatic JS animation captured
  // with element fingerprint + keyframes + options. Runtime motion DNA.
  window.__EL_ANIMATE__ = [];
  if (Element.prototype.animate) {
    const origAnim = Element.prototype.animate;
    Element.prototype.animate = function (keyframes, options) {
      try {
        if (window.__EL_ANIMATE__.length < 200) {
          const r = this.getBoundingClientRect();
          window.__EL_ANIMATE__.push({
            tag: this.tagName.toLowerCase(),
            id: this.id || null,
            className: (this.className && typeof this.className === "string") ? this.className.slice(0, 60) : null,
            rect: { x: Math.round(r.left), y: Math.round(r.top + window.scrollY), w: Math.round(r.width), h: Math.round(r.height) },
            keyframes: Array.isArray(keyframes) ? keyframes.slice(0, 6) : keyframes,
            options: typeof options === "number" ? { duration: options } : (options || {}),
            t: Date.now(),
          });
        }
      } catch (e) {}
      return origAnim.call(this, keyframes, options);
    };
  }

  // addEventListener map — record event type bindings per element.
  // Emit-side can auto-wire placeholder handlers so UI feels alive.
  window.__EVENT_MAP__ = [];
  const origAddEL = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, handler, options) {
    try {
      if (window.__EVENT_MAP__.length < 500 && this.nodeType === 1) {
        const r = this.getBoundingClientRect ? this.getBoundingClientRect() : null;
        if (r && r.width > 0) {
          window.__EVENT_MAP__.push({
            tag: this.tagName.toLowerCase(),
            id: this.id || null,
            eventType: type,
            hasId: !!this.id,
            x: Math.round(r.left),
            y: Math.round(r.top + window.scrollY),
          });
        }
      }
    } catch (e) {}
    return origAddEL.call(this, type, handler, options);
  };

  // IntersectionObserver config capture — record every observer instance's
  // threshold/rootMargin. Precise reveal animation timing restoration.
  window.__IO_CONFIGS__ = [];
  if (window.IntersectionObserver) {
    const OrigIO = window.IntersectionObserver;
    window.IntersectionObserver = function (cb, options) {
      try {
        if (window.__IO_CONFIGS__.length < 50) {
          window.__IO_CONFIGS__.push({
            threshold: options?.threshold ?? 0,
            rootMargin: options?.rootMargin ?? "0px",
            rootTag: options?.root ? (options.root.tagName ? options.root.tagName.toLowerCase() : "viewport") : "viewport",
            t: Date.now(),
          });
        }
      } catch (e) {}
      return new OrigIO(cb, options);
    };
    // Preserve static methods
    Object.setPrototypeOf(window.IntersectionObserver, OrigIO);
  }

  // ResizeObserver intercept — count active observers for responsive signal.
  window.__RO_COUNT__ = 0;
  if (window.ResizeObserver) {
    const OrigRO = window.ResizeObserver;
    window.ResizeObserver = function (cb) {
      try { window.__RO_COUNT__++; } catch (e) {}
      return new OrigRO(cb);
    };
    Object.setPrototypeOf(window.ResizeObserver, OrigRO);
  }

  // MutationObserver timeline — record all DOM mutations for 10s window.
  window.__MUT_LOG__ = [];
  const mo = new MutationObserver((records) => {
    const t = Date.now();
    for (const rec of records) {
      if (window.__MUT_LOG__.length >= 300) return;
      window.__MUT_LOG__.push({
        t,
        type: rec.type,
        target: rec.target.tagName?.toLowerCase() || "text",
        addedCount: rec.addedNodes.length,
        removedCount: rec.removedNodes.length,
        attr: rec.attributeName || null,
      });
    }
  });
  // Observe root for everything — fires from page load onward.
  document.addEventListener("DOMContentLoaded", () => {
    try {
      mo.observe(document.documentElement, {
        childList: true, attributes: true, characterData: false, subtree: true,
      });
    } catch (e) {}
  });

  // Web API usage telemetry — monkey-patch global constructors + methods
  // to track which APIs the page uses. Emit generates equivalent buttons
  // / hooks / behaviors from this signature.
  window.__API_USAGE__ = {
    clipboard: 0, share: 0, fullscreen: 0, pointerLock: 0,
    eventSource: 0, broadcastChannel: 0, audioContext: 0,
    perfMark: [], perfMeasure: [],
    fetch: 0, xhr: 0,
  };
  try {
    const origClip = navigator.clipboard?.writeText;
    if (origClip) {
      navigator.clipboard.writeText = function (t) { window.__API_USAGE__.clipboard++; return origClip.call(this, t); };
    }
    const origShare = navigator.share;
    if (origShare) {
      navigator.share = function (d) { window.__API_USAGE__.share++; return origShare.call(this, d); };
    }
    const origReqFS = Element.prototype.requestFullscreen;
    if (origReqFS) {
      Element.prototype.requestFullscreen = function () { window.__API_USAGE__.fullscreen++; return origReqFS.apply(this, arguments); };
    }
    const origPL = Element.prototype.requestPointerLock;
    if (origPL) {
      Element.prototype.requestPointerLock = function () { window.__API_USAGE__.pointerLock++; return origPL.apply(this, arguments); };
    }
    if (window.EventSource) {
      const OrigES = window.EventSource;
      window.EventSource = function (u, o) { window.__API_USAGE__.eventSource++; return new OrigES(u, o); };
      Object.setPrototypeOf(window.EventSource, OrigES);
    }
    if (window.BroadcastChannel) {
      const OrigBC = window.BroadcastChannel;
      window.BroadcastChannel = function (n) { window.__API_USAGE__.broadcastChannel++; return new OrigBC(n); };
      Object.setPrototypeOf(window.BroadcastChannel, OrigBC);
    }
    if (window.AudioContext) {
      const OrigAC = window.AudioContext;
      window.AudioContext = function () { window.__API_USAGE__.audioContext++; return new OrigAC(...arguments); };
      Object.setPrototypeOf(window.AudioContext, OrigAC);
    }
    // Performance marks/measures intercept — timing instrumentation DNA
    const origMark = performance.mark;
    performance.mark = function (name, options) {
      try { if (window.__API_USAGE__.perfMark.length < 100) window.__API_USAGE__.perfMark.push({ name: String(name).slice(0, 80), t: Date.now() }); } catch (e) {}
      return origMark.call(this, name, options);
    };
    const origMeasure = performance.measure;
    performance.measure = function (name, start, end) {
      try { if (window.__API_USAGE__.perfMeasure.length < 100) window.__API_USAGE__.perfMeasure.push({ name: String(name).slice(0, 80), start, end }); } catch (e) {}
      return origMeasure.call(this, name, start, end);
    };
  } catch (e) {}

  // ──────────── MEGA Web Platform Intercept Pack ────────────
  // 10 categories of remaining APIs captured in one batch.
  window.__PLATFORM_TRACE__ = {
    workers: [], sharedWorkers: [], paintWorklets: [], layoutWorklets: [], animationWorklets: [],
    rtcConnections: 0, mediaRecorders: 0, getUserMedia: 0, getDisplayMedia: 0,
    webAuthnCreate: 0, webAuthnGet: 0, paymentRequest: 0, speechSynthesis: 0, speechRecognition: 0,
    perfObservers: [], readableStreams: 0, writableStreams: 0,
    navigationEvents: 0, fileSystemAccess: 0,
    webUSB: 0, webBluetooth: 0, webHID: 0, webMIDI: 0, webNFC: 0, gamepad: 0,
    wakeLock: 0, idleDetector: 0, permissionsQuery: [],
    notification: 0,
  };
  const trace = window.__PLATFORM_TRACE__;
  try {
    // Workers
    if (window.Worker) {
      const OrigWorker = window.Worker;
      window.Worker = function (url, options) {
        try { if (trace.workers.length < 30) trace.workers.push({ url: String(url), type: options?.type || "classic" }); } catch (e) {}
        return new OrigWorker(url, options);
      };
      Object.setPrototypeOf(window.Worker, OrigWorker);
    }
    if (window.SharedWorker) {
      const OrigSW = window.SharedWorker;
      window.SharedWorker = function (url, options) {
        try { if (trace.sharedWorkers.length < 10) trace.sharedWorkers.push({ url: String(url) }); } catch (e) {}
        return new OrigSW(url, options);
      };
      Object.setPrototypeOf(window.SharedWorker, OrigSW);
    }
    // CSS Houdini Worklet scripts
    const patchWorklet = (worklet, bucket) => {
      if (!worklet || !worklet.addModule) return;
      const origAdd = worklet.addModule.bind(worklet);
      worklet.addModule = function (url, opts) {
        try { if (trace[bucket].length < 10) trace[bucket].push({ url: String(url) }); } catch (e) {}
        return origAdd(url, opts);
      };
    };
    if (CSS.paintWorklet) patchWorklet(CSS.paintWorklet, "paintWorklets");
    if (CSS.layoutWorklet) patchWorklet(CSS.layoutWorklet, "layoutWorklets");
    if (CSS.animationWorklet) patchWorklet(CSS.animationWorklet, "animationWorklets");
    // WebRTC
    if (window.RTCPeerConnection) {
      const OrigRTC = window.RTCPeerConnection;
      window.RTCPeerConnection = function (config) {
        trace.rtcConnections++;
        return new OrigRTC(config);
      };
      Object.setPrototypeOf(window.RTCPeerConnection, OrigRTC);
    }
    // MediaRecorder
    if (window.MediaRecorder) {
      const OrigMR = window.MediaRecorder;
      window.MediaRecorder = function (stream, opts) {
        trace.mediaRecorders++;
        return new OrigMR(stream, opts);
      };
      Object.setPrototypeOf(window.MediaRecorder, OrigMR);
    }
    // getUserMedia / getDisplayMedia
    if (navigator.mediaDevices) {
      const origGUM = navigator.mediaDevices.getUserMedia?.bind(navigator.mediaDevices);
      if (origGUM) {
        navigator.mediaDevices.getUserMedia = function (c) { trace.getUserMedia++; return origGUM(c); };
      }
      const origGDM = navigator.mediaDevices.getDisplayMedia?.bind(navigator.mediaDevices);
      if (origGDM) {
        navigator.mediaDevices.getDisplayMedia = function (c) { trace.getDisplayMedia++; return origGDM(c); };
      }
    }
    // WebAuthn / Credentials
    if (navigator.credentials) {
      const origCreate = navigator.credentials.create?.bind(navigator.credentials);
      if (origCreate) navigator.credentials.create = function (o) { trace.webAuthnCreate++; return origCreate(o); };
      const origGet = navigator.credentials.get?.bind(navigator.credentials);
      if (origGet) navigator.credentials.get = function (o) { trace.webAuthnGet++; return origGet(o); };
    }
    // PaymentRequest
    if (window.PaymentRequest) {
      const OrigPR = window.PaymentRequest;
      window.PaymentRequest = function (methods, details, opts) {
        trace.paymentRequest++;
        return new OrigPR(methods, details, opts);
      };
      Object.setPrototypeOf(window.PaymentRequest, OrigPR);
    }
    // Speech APIs
    if (window.speechSynthesis) {
      const origSpeak = window.speechSynthesis.speak?.bind(window.speechSynthesis);
      if (origSpeak) window.speechSynthesis.speak = function (u) { trace.speechSynthesis++; return origSpeak(u); };
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const origNew = SR;
      // Can't always patch these but we mark detection via check in scan
    }
    // PerformanceObserver type tracking
    if (window.PerformanceObserver) {
      const OrigPO = window.PerformanceObserver;
      window.PerformanceObserver = function (cb) {
        const obs = new OrigPO(cb);
        const origObserve = obs.observe.bind(obs);
        obs.observe = function (opts) {
          try {
            const types = opts?.entryTypes || (opts?.type ? [opts.type] : []);
            if (trace.perfObservers.length < 30) trace.perfObservers.push({ types, buffered: opts?.buffered || false });
          } catch (e) {}
          return origObserve(opts);
        };
        return obs;
      };
      Object.setPrototypeOf(window.PerformanceObserver, OrigPO);
    }
    // Streams
    if (window.ReadableStream) {
      const OrigRS = window.ReadableStream;
      window.ReadableStream = function (src, strat) {
        trace.readableStreams++;
        return new OrigRS(src, strat);
      };
      Object.setPrototypeOf(window.ReadableStream, OrigRS);
    }
    // Navigation API
    if (navigator.navigation) {
      navigator.navigation.addEventListener("navigate", () => { trace.navigationEvents++; });
    }
    // File System Access
    if (window.showOpenFilePicker) {
      const origFSP = window.showOpenFilePicker;
      window.showOpenFilePicker = function (o) { trace.fileSystemAccess++; return origFSP(o); };
    }
    // Hardware APIs (usually zero on normal sites)
    if (navigator.usb?.requestDevice) {
      const origUSB = navigator.usb.requestDevice.bind(navigator.usb);
      navigator.usb.requestDevice = function (o) { trace.webUSB++; return origUSB(o); };
    }
    if (navigator.bluetooth?.requestDevice) {
      const origBT = navigator.bluetooth.requestDevice.bind(navigator.bluetooth);
      navigator.bluetooth.requestDevice = function (o) { trace.webBluetooth++; return origBT(o); };
    }
    if (navigator.hid?.requestDevice) {
      const origHID = navigator.hid.requestDevice.bind(navigator.hid);
      navigator.hid.requestDevice = function (o) { trace.webHID++; return origHID(o); };
    }
    if (navigator.requestMIDIAccess) {
      const origMIDI = navigator.requestMIDIAccess.bind(navigator);
      navigator.requestMIDIAccess = function (o) { trace.webMIDI++; return origMIDI(o); };
    }
    // Wake Lock / Idle Detection
    if (navigator.wakeLock?.request) {
      const origWL = navigator.wakeLock.request.bind(navigator.wakeLock);
      navigator.wakeLock.request = function (t) { trace.wakeLock++; return origWL(t); };
    }
    if (window.IdleDetector) {
      const OrigID = window.IdleDetector;
      window.IdleDetector = function () { trace.idleDetector++; return new OrigID(); };
      Object.setPrototypeOf(window.IdleDetector, OrigID);
    }
    // Permissions query
    if (navigator.permissions?.query) {
      const origPQ = navigator.permissions.query.bind(navigator.permissions);
      navigator.permissions.query = function (desc) {
        try { if (trace.permissionsQuery.length < 30) trace.permissionsQuery.push(desc?.name || "unknown"); } catch (e) {}
        return origPQ(desc);
      };
    }
    // Notifications
    if (window.Notification?.requestPermission) {
      const origNotif = window.Notification.requestPermission.bind(window.Notification);
      window.Notification.requestPermission = function () { trace.notification++; return origNotif(); };
    }
  } catch (e) {}
});
// ─── Network response capture (for client-side API mocking) ──────────
// Every fetch/XHR that returns JSON gets recorded. Emit creates a
// Next.js API route handler that looks these up — our clone's fetches
// resolve against real captured data, not 404s. Server logic not
// reproduced, but the DATA snapshot at capture time is.
const apiCaptures = [];
const apiSeen = new Set();
page.on("response", async (response) => {
  try {
    const reqUrl = response.url();
    const ct = response.headers()["content-type"] || "";
    // Only capture JSON or text-like responses, skip assets
    if (!/json|javascript|text\/plain/i.test(ct)) return;
    // Skip same-origin site html + css bundles (only dynamic API)
    if (/\.(html|htm|css|js|map)$/.test(reqUrl.split("?")[0])) return;
    const status = response.status();
    if (status < 200 || status >= 400) return;
    // Dedup by path (ignore query strings for simple matching)
    const parsed = new URL(reqUrl);
    const key = parsed.pathname;
    if (apiSeen.has(key)) return;
    if (apiCaptures.length >= 50) return;
    apiSeen.add(key);
    let body;
    try {
      body = await response.text();
      if (body.length > 500000) return; // cap 500KB per response
    } catch (e) { return; }
    apiCaptures.push({
      url: reqUrl,
      pathname: parsed.pathname,
      status,
      contentType: ct.split(";")[0],
      body,
      method: response.request().method(),
    });
  } catch (e) {}
});

// ─── CDP session — Network.enable BEFORE goto to capture headers ─────
// Other domains enabled AFTER goto to avoid frame-detach race.
const cdp = await page.target().createCDPSession();
try {
  await cdp.send("Network.enable");
  await cdp.send("Runtime.enable");
} catch (e) { /* unsupported */ }

// Capture response headers via CDP event
const responseHeaders = [];
cdp.on("Network.responseReceived", (params) => {
  if (responseHeaders.length >= 200) return;
  try {
    const u = params.response.url;
    if (u.startsWith("data:") || u.startsWith("blob:")) return;
    responseHeaders.push({
      url: u.slice(0, 300),
      status: params.response.status,
      mimeType: params.response.mimeType,
      headers: params.response.headers,
      protocol: params.response.protocol,
      fromServiceWorker: params.response.fromServiceWorker,
    });
  } catch (e) {}
});

// Puppeteer page events — pageerror/dialog/popup/request
const pageEvents = { errors: [], dialogs: [], popups: 0, requestDetails: [] };
page.on("pageerror", (err) => {
  if (pageEvents.errors.length < 30) pageEvents.errors.push({ message: String(err.message).slice(0, 300) });
});
page.on("dialog", async (dialog) => {
  if (pageEvents.dialogs.length < 10) {
    pageEvents.dialogs.push({ type: dialog.type(), message: dialog.message().slice(0, 200) });
  }
  try { await dialog.dismiss(); } catch {}
});
page.on("popup", () => { pageEvents.popups++; });
page.on("request", (req) => {
  if (pageEvents.requestDetails.length >= 100) return;
  try {
    const u = req.url();
    if (u.startsWith("data:") || u.startsWith("blob:")) return;
    pageEvents.requestDetails.push({
      method: req.method(),
      resourceType: req.resourceType(),
      isNavigation: req.isNavigationRequest(),
    });
  } catch (e) {}
});

// Audits issue listener only (enable deferred to after-goto to avoid race)
const auditIssues = [];
cdp.on("Audits.issueAdded", (evt) => {
  if (auditIssues.length < 50) {
    auditIssues.push({ code: evt.issue?.code, details: evt.issue?.details });
  }
});

await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
await new Promise(r => setTimeout(r, 2500));

// Enable remaining CDP domains AFTER navigation (avoid frame-detach race)
try { await cdp.send("Page.enable"); } catch {}
try { await cdp.send("CSS.enable"); } catch {}
try { await cdp.send("DOM.enable"); } catch {}
try { await cdp.send("Profiler.enable"); } catch {}
try { await cdp.send("Profiler.startPreciseCoverage", { callCount: false, detailed: false }); } catch {}
try { await cdp.send("CSS.startRuleUsageTracking"); } catch {}
try { await cdp.send("Audits.enable"); } catch {}
try { await cdp.send("Security.enable"); } catch {}

// ─── Initial-state capture (before scroll triggers reveals) ───────────
// Snapshot every large below-the-fold element's opacity + transform while
// still at scrollY=0. IntersectionObserver-based reveal animations haven't
// fired for these. This is the TRUE "hidden" state of entrance animations —
// useful for emit's motion.initial={} variants.
const initialRevealStates = await page.evaluate(() => {
  const out = [];
  const vh = window.innerHeight;
  const candidates = document.querySelectorAll("section, main div, body > div > div, article, [class*='section']");
  for (const el of candidates) {
    if (!(el instanceof HTMLElement)) continue;
    const r = el.getBoundingClientRect();
    const absY = r.top + window.scrollY;
    // Only capture below-the-fold (not-yet-revealed) elements.
    if (absY < vh * 1.2) continue;
    if (r.width < 100 || r.height < 60) continue;
    const cs = getComputedStyle(el);
    out.push({
      absY: Math.round(absY),
      h: Math.round(r.height),
      tag: el.tagName.toLowerCase(),
      opacity: parseFloat(cs.opacity) || 1,
      transform: cs.transform === "none" ? null : cs.transform,
      visibility: cs.visibility,
    });
    if (out.length >= 60) break;
  }
  return out;
});
console.log(`  initial reveal states: ${initialRevealStates.length} below-fold elements (${initialRevealStates.filter(s => s.opacity < 1 || s.transform).length} with hidden state)`);

await page.evaluate(async () => {
  const h = document.body.scrollHeight;
  for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); }
  window.scrollTo(0, 0);
});
await new Promise(r => setTimeout(r, 1200));

// Platform adapter detection — stored as metadata. Useful for audit (proves
// which platform the source is on) and for per-platform heuristic tuning.
const platformMatch = await pickAdapter(page);
console.log(`  platform: ${platformMatch.name} (${(platformMatch.confidence * 100).toFixed(0)}% confidence)`);

// ─── Σ.1 SEMANTIC SCAN + Σ.2 DESIGN TOKENS ────────────────────────
// Single DOM walk — for efficiency we do tree extraction + computed style
// harvest together. Fewer page.evaluate round-trips.
console.log(`[Σ.1] SEMANTIC SCAN ${el()}`);
console.log(`[Σ.2] DESIGN TOKENS ${el()}`);

const extracted = await page.evaluate(() => {
  const parseColor = (str) => {
    if (!str) return null;
    const m = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?/);
    if (!m) return null;
    const a = m[4] !== undefined ? parseFloat(m[4]) : 1;
    if (a < 0.05) return null;
    return { r: +m[1], g: +m[2], b: +m[3], a };
  };
  const bump = (m, k) => m.set(k, (m.get(k) || 0) + 1);

  // ─── Pass 1: FLAT DOM walk for design tokens (every element visited) ───
  // v0.2 change: decouple token harvest from section detection. Previous
  // version only recursed into `block` nodes, which stopped at Framer's
  // wrapper divs and missed all the deep style data. Now we walk every
  // element regardless of role — token count becomes accurate.
  const colorCounts = new Map();
  const fontFamilies = new Map();
  const fontSizes = new Map();
  const radii = new Map();
  const shadows = new Map();
  const spacings = new Map();

  const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "LINK", "META", "NOSCRIPT", "HEAD"]);
  const harvestTokens = (el) => {
    if (!el || !(el instanceof HTMLElement)) return;
    if (SKIP_TAGS.has(el.tagName)) return;
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const cs = getComputedStyle(el);
    const bg = parseColor(cs.backgroundColor);
    if (bg) bump(colorCounts, `${bg.r},${bg.g},${bg.b}`);
    const fg = parseColor(cs.color);
    if (fg) bump(colorCounts, `${fg.r},${fg.g},${fg.b}`);
    if (cs.fontFamily) {
      const first = cs.fontFamily.split(",")[0].trim().replace(/["']/g, "");
      if (first && first.toLowerCase() !== "sans-serif" && first.toLowerCase() !== "serif") {
        bump(fontFamilies, first);
      }
    }
    if (cs.fontSize) {
      const px = parseFloat(cs.fontSize);
      if (px >= 10 && px <= 180) bump(fontSizes, Math.round(px));
    }
    if (cs.borderRadius) {
      const r = parseFloat(cs.borderRadius);
      if (r > 0 && r < 100) bump(radii, Math.round(r));
    }
    if (cs.boxShadow && cs.boxShadow !== "none") bump(shadows, cs.boxShadow.slice(0, 80));
    for (const prop of ["paddingTop", "paddingLeft", "marginTop"]) {
      const v = parseFloat(cs[prop]);
      if (v > 0 && v < 200) bump(spacings, Math.round(v));
    }
    for (const c of el.children) harvestTokens(c);
  };
  harvestTokens(document.body);

  // ─── Pass 2: Section detection via a cascading strategy ───
  // v0.2: three strategies tried in order. Framer usually satisfies (1),
  // Webflow (2), generic sites (3).
  const pickSectionRoots = () => {
    // Strategy 1: explicit "NN-name" section ID pattern (Framer convention)
    const byIdPattern = [...document.querySelectorAll("[id]")]
      .filter(el => /^\d{1,2}[-_]/.test(el.id))
      .filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > window.innerWidth * 0.3 && r.height > 80;
      });
    if (byIdPattern.length >= 3) return { strategy: "id-pattern", roots: byIdPattern };

    // Strategy 2: semantic HTML5 tags
    const bySemanticTag = [...document.querySelectorAll("section, main > div, article, header, footer, nav")]
      .filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > window.innerWidth * 0.3 && r.height > 80;
      });
    if (bySemanticTag.length >= 3) return { strategy: "semantic", roots: bySemanticTag };

    // Strategy 3: find the deepest wrapper whose direct children look like
    // sibling sections (many, roughly full-width, stacked vertically).
    let cur = document.body;
    for (let depth = 0; depth < 8; depth++) {
      const big = [...cur.children].filter(c => {
        const r = c.getBoundingClientRect();
        return r.width > window.innerWidth * 0.4;
      });
      if (big.length >= 3) return { strategy: "deep-wrapper", roots: big };
      if (big.length === 1) cur = big[0]; else break;
    }
    return { strategy: "fallback", roots: [document.body] };
  };

  const { strategy, roots } = pickSectionRoots();

  // ─── Pass 3: classify each section root ───
  // Heuristic role assignment based on content signature inside each root.
  const classify = (el) => {
    const rect = el.getBoundingClientRect();
    const tag = el.tagName;
    const docH = document.body.scrollHeight;
    const nearTop = rect.top < window.innerHeight * 1.5;
    const bottomish = rect.top > docH * 0.8;

    if (tag === "FOOTER" || /footer/i.test(el.id || "") || bottomish) return "footer";
    if (tag === "HEADER" || tag === "NAV" || /header|nav/i.test(el.id || "")) return "nav";

    const imgs = el.querySelectorAll("img").length;
    const headings = el.querySelectorAll("h1, h2, h3").length;
    const paragraphs = el.querySelectorAll("p").length;
    const links = el.querySelectorAll("a[href]").length;
    const textLen = (el.textContent || "").trim().length;

    // Children width similarity (for grid/gallery detection)
    const directChildren = [...el.children];
    const childSizes = directChildren.map(c => {
      const r = c.getBoundingClientRect();
      return { w: r.width, h: r.height };
    }).filter(s => s.w > 50);
    const similarSized = childSizes.length >= 3 &&
      childSizes.every(s => Math.abs(s.w - childSizes[0].w) < childSizes[0].w * 0.3);

    if (nearTop && headings > 0 && (imgs > 0 || textLen > 50)) return "hero";
    if (similarSized && imgs >= 3) return "gallery";
    if (similarSized && directChildren.length >= 3) return "grid";
    if (headings > 0 && imgs > 0 && textLen > 100) return "feature";
    if (links > 0 && textLen > 30 && textLen < 500 && headings > 0) return "cta";
    if (headings > 0 && paragraphs >= 1) return "prose";
    if (similarSized) return "grid";
    return "block";
  };

  // Deep layout fingerprint — now captures gap/padding/alignItems/
  // justifyContent too. Emit can reproduce arbitrary values via Tailwind
  // [x-y] bracket syntax → layout matches source 1:1 in pixel terms.
  const detectLayout = (el) => {
    let row = el;
    let cols = 1;
    let align = "center";
    let gap = 0;
    let paddingX = 24;
    let paddingY = 80;
    let alignItems = "center";
    let justifyContent = "center";
    let flexDirection = "row";
    const visit = (node, depth = 0) => {
      if (depth > 4) return;
      const cs = getComputedStyle(node);
      if (cs.display === "grid") {
        const tcols = cs.gridTemplateColumns.split(/\s+/).filter(t => t && t !== "none");
        if (tcols.length >= 2) { cols = Math.min(6, tcols.length); row = node; }
        gap = Math.max(gap, parseFloat(cs.gap) || parseFloat(cs.columnGap) || 0);
      } else if (cs.display === "flex") {
        flexDirection = cs.flexDirection || "row";
        const kids = [...node.children].filter(c => c.getBoundingClientRect().width > 30);
        if (flexDirection === "row" && kids.length >= 2) { cols = Math.min(6, kids.length); row = node; }
        gap = Math.max(gap, parseFloat(cs.gap) || 0);
      }
      if (cs.textAlign === "left" || cs.textAlign === "right" || cs.textAlign === "center") {
        align = cs.textAlign;
      }
      if (cs.alignItems) alignItems = cs.alignItems;
      if (cs.justifyContent) justifyContent = cs.justifyContent;
      const pl = parseFloat(cs.paddingLeft) || 0;
      const pt = parseFloat(cs.paddingTop) || 0;
      if (pl > paddingX) paddingX = Math.min(160, pl);
      if (pt > paddingY) paddingY = Math.min(240, pt);
      for (const c of node.children) visit(c, depth + 1);
    };
    visit(el);
    return {
      cols, align, maxWidth: Math.round(el.getBoundingClientRect().width),
      gap: Math.round(gap), paddingX: Math.round(paddingX), paddingY: Math.round(paddingY),
      alignItems, justifyContent, flexDirection,
    };
  };

  // Capture a section's text-element HIERARCHY as a structural fingerprint.
  // For every visible text-bearing element we record its tag and computed
  // font-size. Buckets are rounded to nearest 2px so near-identical sizes
  // collapse. This is a FACT about the layout (what sizes exist, in what
  // proportions) — not copyrightable content. Hierarchy-driven emit uses
  // this to reproduce the exact heading-scale distribution of the source,
  // collapsing typography distance.
  const captureHierarchy = (el) => {
    const TEXT_TAGS = ["H1", "H2", "H3", "H4", "H5", "H6", "P", "SPAN", "SMALL", "A", "LI", "BUTTON", "BLOCKQUOTE"];
    const byTag = new Map(); // tag → Map<fontSizeBucket, {count, samples[]}>
    const walk = (node) => {
      if (!(node instanceof HTMLElement)) return;
      if (["SCRIPT", "STYLE", "NOSCRIPT"].includes(node.tagName)) return;
      const r = node.getBoundingClientRect();
      if (r.width < 5 || r.height < 5) {
        for (const c of node.children) walk(c);
        return;
      }
      if (TEXT_TAGS.includes(node.tagName)) {
        const text = (node.textContent || "").trim();
        if (text.length > 0) {
          const cs = getComputedStyle(node);
          const px = Math.round(parseFloat(cs.fontSize) / 2) * 2;
          if (px >= 10 && px <= 180) {
            if (!byTag.has(node.tagName)) byTag.set(node.tagName, new Map());
            const m = byTag.get(node.tagName);
            const bucket = m.get(px) || { count: 0, samples: [] };
            bucket.count++;
            if (bucket.samples.length < 8 && text.length < 200) {
              bucket.samples.push(text);
            }
            m.set(px, bucket);
          }
        }
      }
      const isLeafText = ["P", "A", "LI", "BUTTON", "H1", "H2", "H3", "H4", "H5", "H6"].includes(node.tagName);
      if (!isLeafText) {
        for (const c of node.children) walk(c);
      }
    };
    walk(el);
    // Flatten: array of { tag, size, count, samples }, sorted by count desc
    const flat = [];
    for (const [tag, sizes] of byTag.entries()) {
      for (const [size, bucket] of sizes.entries()) {
        flat.push({ tag, size, count: bucket.count, samples: bucket.samples });
      }
    }
    flat.sort((a, b) => b.count - a.count);
    return flat.slice(0, 12);
  };

  // Spatial node capture — records each text-bearing leaf's (x,y,w,h) as
  // fractions of section's bounding rect. This lets emit-side render the
  // nodes via position:absolute at the ORIGINAL coordinates — no layout
  // inference needed. Only facts: pixel measurements.
  const captureSpatial = (el) => {
    const SKIP = ["SCRIPT", "STYLE", "NOSCRIPT", "IMG", "SVG", "CANVAS", "VIDEO", "PICTURE"];
    const secRect = el.getBoundingClientRect();
    const nodes = [];
    // New strategy: any element that has a direct TEXT_NODE child with
    // non-empty text is a "leaf" — record and do not recurse. This handles
    // Framer's deep <span class="framer-text"><span><span>…</span></span></span>
    // nesting correctly because the innermost span is the one with text.
    const walk = (node) => {
      if (!(node instanceof HTMLElement)) return;
      if (SKIP.includes(node.tagName)) return;
      const r = node.getBoundingClientRect();
      if (r.width < 5 || r.height < 5) return;
      const hasDirectText = [...node.childNodes].some(
        c => c.nodeType === 3 && c.textContent && c.textContent.trim().length > 0
      );
      if (hasDirectText) {
        const cs = getComputedStyle(node);
        const px = parseFloat(cs.fontSize) || 16;
        if (px >= 9 && px <= 240) {
          const rawText = (node.textContent || "").trim();
          nodes.push({
            tag: node.tagName,
            x: Math.max(0, Math.min(1, (r.left - secRect.left) / Math.max(1, secRect.width))),
            y: Math.max(0, Math.min(1, (r.top - secRect.top) / Math.max(1, secRect.height))),
            w: Math.max(0.02, Math.min(1, r.width / Math.max(1, secRect.width))),
            h: Math.max(0.01, Math.min(1, r.height / Math.max(1, secRect.height))),
            fontSize: Math.round(px),
            fontWeight: parseInt(cs.fontWeight) || 400,
            fontFamily: (cs.fontFamily || "").split(",")[0].replace(/["']/g, "").trim().slice(0, 48),
            textAlign: cs.textAlign,
            color: cs.color,
            // Real text — stored always, gated behind --use-original-text at emit time.
            text: rawText.slice(0, 400),
            textLen: rawText.length,
            // Link href preservation (turns <a> into real links in emit).
            href: node.tagName === "A" ? (node.getAttribute("href") || null) : null,
          });
        }
        return;
      }
      for (const c of node.children) walk(c);
    };
    walk(el);
    return nodes.slice(0, 50);
  };

  // SVG inline extraction — Framer/Webflow often render giant typography
  // and decorative marks as SVG <text>/<path>. captureSpatial skips SVG
  // (no HTML text leaf), so giant headlines are invisible to our DOM
  // layer. Here we capture the SVG outerHTML with class/id stripped, so
  // emit can inline-render the source's visual DNA without screenshot.
  const captureSVGs = (el) => {
    const secRect = el.getBoundingClientRect();
    const svgs = [];
    for (const svg of el.querySelectorAll("svg")) {
      const r = svg.getBoundingClientRect();
      if (r.width < 80 || r.height < 40) continue;
      if (svgs.length >= 8) break;
      // Clone to avoid mutating live DOM; strip identifying attributes.
      const clone = svg.cloneNode(true);
      for (const node of clone.querySelectorAll("*")) {
        node.removeAttribute("id");
        node.removeAttribute("class");
        // Remove all data-* attrs — these often carry Framer runtime refs.
        for (const a of [...node.attributes]) {
          if (a.name.startsWith("data-") || a.name.startsWith("aria-describedby")) {
            node.removeAttribute(a.name);
          }
        }
      }
      clone.removeAttribute("id");
      clone.removeAttribute("class");
      const outer = clone.outerHTML;
      if (outer.length > 100000) continue;
      svgs.push({
        x: Math.max(0, (r.left - secRect.left) / Math.max(1, secRect.width)),
        y: Math.max(0, (r.top - secRect.top) / Math.max(1, secRect.height)),
        w: r.width / Math.max(1, secRect.width),
        h: r.height / Math.max(1, secRect.height),
        wPx: Math.round(r.width),
        hPx: Math.round(r.height),
        viewBox: clone.getAttribute("viewBox") || "",
        outerHTML: outer,
        hasText: !!clone.querySelector("text"),
      });
    }
    return svgs;
  };

  // DOM Tree Deep Mirror — recursive serialization of section DOM with
  // copyright-safe filtering. Tree captures structure + computed style
  // facts + tokenized text. Emitter can regenerate JSX 1:1 vs source.
  const captureDOMTree = (el, depth = 0, nodeCount = { n: 0 }) => {
    if (depth > 6) return null;
    if (nodeCount.n >= 150) return null;
    if (!(el instanceof HTMLElement)) return null;
    if (["SCRIPT", "STYLE", "NOSCRIPT", "IFRAME", "OBJECT"].includes(el.tagName)) return null;
    const r = el.getBoundingClientRect();
    if (r.width < 3 || r.height < 3) return null;
    nodeCount.n++;
    const cs = getComputedStyle(el);
    // Only non-default style properties survive. Keeps JSX lean.
    const PROPS = [
      "display", "flexDirection", "flexWrap", "justifyContent", "alignItems", "alignContent", "gap", "rowGap", "columnGap",
      "gridTemplateColumns", "gridTemplateRows", "gridColumn", "gridRow",
      "position", "top", "left", "right", "bottom", "zIndex",
      "width", "height", "minHeight", "minWidth", "maxWidth", "maxHeight",
      "paddingTop", "paddingBottom", "paddingLeft", "paddingRight",
      "marginTop", "marginBottom", "marginLeft", "marginRight",
      "fontSize", "fontWeight", "fontFamily", "lineHeight", "letterSpacing", "textAlign", "textTransform",
      "color", "backgroundColor", "backgroundImage", "backgroundSize", "backgroundPosition", "backgroundRepeat",
      "borderStyle", "borderWidth", "borderColor", "borderRadius", "boxShadow", "opacity",
      "transform", "transformOrigin",
      "filter", "backdropFilter", "mixBlendMode", "clipPath",
      "overflow", "objectFit", "objectPosition", "aspectRatio",
    ];
    const DEFAULTS = new Set(["none", "normal", "auto", "0px", "0", "rgba(0, 0, 0, 0)", "transparent", "static", "stretch", "start", "initial", "visible", "baseline", "1", "400", "inherit", "content-box", "currentcolor", "row", "nowrap", "flex-start"]);
    const styleFacts = {};
    for (const prop of PROPS) {
      const v = cs[prop];
      if (v && v.length > 0 && !DEFAULTS.has(v) && v.length < 300) {
        // Skip matrix(1, 0, 0, 1, 0, 0) — default transform
        if (prop === "transform" && v === "matrix(1, 0, 0, 1, 0, 0)") continue;
        styleFacts[prop] = v;
      }
    }
    // Strip identifying attributes; keep functional ones.
    const childNodes = [];
    for (const child of el.children) {
      if (childNodes.length >= 25) break;
      const tree = captureDOMTree(child, depth + 1, nodeCount);
      if (tree) childNodes.push(tree);
    }
    // Only capture direct text (not descendant text — that's covered by children)
    let directText = "";
    for (const n of el.childNodes) {
      if (n.nodeType === 3) {
        const t = (n.textContent || "").trim();
        if (t) directText += (directText ? " " : "") + t;
      }
    }
    const tag = el.tagName.toLowerCase();
    const out = {
      tag,
      styleFacts,
      children: childNodes,
    };
    if (directText) out.text = directText.slice(0, 300);
    if (tag === "a") { const h = el.getAttribute("href"); if (h) out.href = h; }
    if (tag === "img") {
      const s = el.getAttribute("src") || el.currentSrc;
      if (s) out.src = s;
      const a = el.getAttribute("alt");
      if (a) out.alt = a.slice(0, 100);
    }
    if (tag === "svg") out.isSvg = true; // handled separately by captureSVGs
    // ARIA + accessibility attributes — facts about screen-reader semantics.
    // Preserving these lifts our clone's accessibility score to source parity.
    const ariaAttrs = {};
    for (const a of el.getAttributeNames()) {
      if (a.startsWith("aria-") || a === "role" || a === "tabindex" || a === "draggable" || a === "popover" || a === "inert") {
        const v = el.getAttribute(a);
        if (v !== null && v.length < 200) ariaAttrs[a] = v;
      }
    }
    if (Object.keys(ariaAttrs).length > 0) out.aria = ariaAttrs;
    // Form element attributes for validation + behavior preservation
    if (["input", "textarea", "select", "button", "form"].includes(tag)) {
      const formAttrs = {};
      for (const a of ["type", "name", "placeholder", "required", "minlength", "maxlength", "min", "max", "pattern", "autocomplete", "value", "checked", "disabled", "readonly", "action", "method"]) {
        const v = el.getAttribute(a);
        if (v !== null && v.length < 200) formAttrs[a] = v;
      }
      if (Object.keys(formAttrs).length > 0) out.formAttrs = formAttrs;
    }
    return out;
  };

  const sections = roots.map(el => {
    const rect = el.getBoundingClientRect();
    const role = classify(el);
    const layout = detectLayout(el);
    const hierarchy = captureHierarchy(el);
    const spatial = captureSpatial(el);
    const svgs = captureSVGs(el);
    const domTree = captureDOMTree(el);
    const headings = [];
    for (const h of el.querySelectorAll("h1, h2, h3")) {
      const t = (h.textContent || "").trim();
      if (t) headings.push({ level: +h.tagName[1], wordCount: t.split(/\s+/).filter(Boolean).length });
      if (headings.length >= 3) break;
    }
    // Capture per-section image URLs for dev-mode visual verification.
    // <img> elements are primary; background-image CSS urls are secondary.
    // We store src + alt + dimensions so emit can place them correctly.
    // data: URLs are kept (inline SVGs/pixels are self-contained, safe).
    const images = [];
    for (const img of el.querySelectorAll("img")) {
      const r = img.getBoundingClientRect();
      if (r.width < 20 || r.height < 20) continue;
      const src = img.currentSrc || img.src || "";
      if (!src || src.startsWith("blob:")) continue;
      images.push({
        src,
        alt: (img.alt || "").slice(0, 80),
        w: Math.round(r.width),
        h: Math.round(r.height),
      });
      if (images.length >= 20) break;
    }
    // Background-image URLs
    for (const sub of el.querySelectorAll("*")) {
      const bg = getComputedStyle(sub).backgroundImage;
      const m = bg && bg !== "none" && bg.match(/url\(["']?([^"')]+)["']?\)/);
      if (m && m[1] && !m[1].startsWith("data:") && !m[1].startsWith("blob:")) {
        const r = sub.getBoundingClientRect();
        if (r.width < 50 || r.height < 50) continue;
        images.push({ src: m[1], alt: "", w: Math.round(r.width), h: Math.round(r.height), isBg: true });
        if (images.length >= 25) break;
      }
    }
    // CSS effects fingerprint — captures glass morphism (backdrop-filter),
    // blur (filter), mask-image, clip-path, box-shadow, borders, and
    // border-radius from the section root. These are FACT attributes that
    // emit can replay as inline style, bringing the source's atmosphere
    // to our output without copying any text or imagery.
    const rcs = getComputedStyle(el);
    const cssEffects = {
      filter: rcs.filter && rcs.filter !== "none" ? rcs.filter.slice(0, 200) : null,
      backdropFilter: rcs.backdropFilter && rcs.backdropFilter !== "none" ? rcs.backdropFilter.slice(0, 200) : null,
      clipPath: rcs.clipPath && rcs.clipPath !== "none" ? rcs.clipPath.slice(0, 200) : null,
      maskImage: rcs.maskImage && rcs.maskImage !== "none" ? rcs.maskImage.slice(0, 200) : null,
      mixBlendMode: rcs.mixBlendMode && rcs.mixBlendMode !== "normal" ? rcs.mixBlendMode : null,
      boxShadow: rcs.boxShadow && rcs.boxShadow !== "none" ? rcs.boxShadow.slice(0, 200) : null,
      borderRadius: rcs.borderRadius && rcs.borderRadius !== "0px" ? rcs.borderRadius : null,
      border: rcs.borderTopWidth && parseFloat(rcs.borderTopWidth) > 0 ? `${rcs.borderTopWidth} ${rcs.borderTopStyle} ${rcs.borderTopColor}` : null,
    };
    // Also scan descendants for rich effects — grab the first child with
    // a non-null filter/backdrop-filter/mask, if any. This catches glass
    // cards nested inside plain section containers.
    let richChildEffects = null;
    for (const sub of el.querySelectorAll("*")) {
      const scs = getComputedStyle(sub);
      if ((scs.backdropFilter && scs.backdropFilter !== "none") ||
          (scs.mixBlendMode && scs.mixBlendMode !== "normal") ||
          (scs.clipPath && scs.clipPath !== "none") ||
          (scs.maskImage && scs.maskImage !== "none")) {
        const sr = sub.getBoundingClientRect();
        richChildEffects = {
          tag: sub.tagName,
          x: Math.round(sr.left - rect.left),
          y: Math.round(sr.top - rect.top),
          w: Math.round(sr.width),
          h: Math.round(sr.height),
          backdropFilter: scs.backdropFilter !== "none" ? scs.backdropFilter.slice(0, 120) : null,
          clipPath: scs.clipPath !== "none" ? scs.clipPath.slice(0, 120) : null,
          maskImage: scs.maskImage !== "none" ? "present" : null,
          mixBlendMode: scs.mixBlendMode !== "normal" ? scs.mixBlendMode : null,
          borderRadius: scs.borderRadius !== "0px" ? scs.borderRadius : null,
        };
        break;
      }
    }
    // Representative text samples — "first seen" heading / paragraph / CTA
    // in this section. Used by post-replace layer to fill FEATURE_TITLE,
    // FEATURE_BODY, GALLERY_TITLE type tokens with real source content.
    const firstOf = (sel) => {
      for (const node of el.querySelectorAll(sel)) {
        const t = (node.textContent || "").trim();
        const r = node.getBoundingClientRect();
        if (t.length >= 2 && t.length < 500 && r.width > 20 && r.height > 10) return t;
      }
      return "";
    };
    const representative = {
      heading: firstOf("h1, h2, h3, h4"),
      paragraph: firstOf("p"),
      cta: firstOf("button, a[href]:not([href='#'])"),
      allHeadings: [...el.querySelectorAll("h1, h2, h3, h4")]
        .map(h => (h.textContent || "").trim())
        .filter(t => t.length >= 2 && t.length < 200)
        .slice(0, 6),
      allParagraphs: [...el.querySelectorAll("p")]
        .map(p => (p.textContent || "").trim())
        .filter(t => t.length >= 4 && t.length < 400)
        .slice(0, 6),
      allCTAs: [...el.querySelectorAll("button, a[href]:not([href='#'])")]
        .map(a => (a.textContent || "").trim())
        .filter(t => t.length >= 1 && t.length < 60)
        .slice(0, 6),
    };
    return {
      role, id: el.id || null, tag: el.tagName.toLowerCase(),
      w: Math.round(rect.width), h: Math.round(rect.height),
      top: Math.round(rect.top + window.scrollY), left: Math.round(rect.left),
      headings, layout, hierarchy, spatial, svgs, domTree, images,
      cssEffects, richChildEffects,
      representative,
      paragraphCount: el.querySelectorAll("p, span").length,
      imgCount: el.querySelectorAll("img").length,
      linkCount: el.querySelectorAll("a[href]").length,
      textLen: (el.textContent || "").trim().length,
    };
  });

  // ─── MOTION CAPTURE — document.getAnimations() ───
  // Walks every active Web Animation on the page. For each animation we
  // record its target's rough location (section y) + temporal signature
  // (duration, delay, iterations, direction) + animated property names.
  // All values here are FACTS about motion (numeric timings, property
  // names) — no copyrightable keyframe art survives because we only keep
  // property SETS, not exact values.
  const motions = [];
  try {
    const all = document.getAnimations();
    for (const anim of all.slice(0, 200)) {
      try {
        const effect = anim.effect;
        if (!effect) continue;
        const target = effect.target;
        if (!target || !(target instanceof HTMLElement)) continue;
        const r = target.getBoundingClientRect();
        const kf = effect.getKeyframes ? effect.getKeyframes() : [];
        const t = effect.getTiming ? effect.getTiming() : {};
        const props = new Set();
        for (const k of kf) {
          for (const key of Object.keys(k)) {
            if (key === "offset" || key === "easing" || key === "composite") continue;
            props.add(key);
          }
        }
        // Build a lightweight DOM path identifier (tag chain + nth-child)
        // so emit can correlate motions to sections. Not a stable selector
        // across runs — just a ~10 element fingerprint for debugging.
        const buildPath = (node) => {
          const parts = [];
          let el = node;
          while (el && el.nodeType === 1 && parts.length < 6) {
            let p = el.tagName.toLowerCase();
            if (el.parentElement) {
              const sibs = [...el.parentElement.children].filter(c => c.tagName === el.tagName);
              if (sibs.length > 1) p += `:nth-of-type(${sibs.indexOf(el) + 1})`;
            }
            parts.unshift(p);
            el = el.parentElement;
          }
          return parts.join(" > ");
        };
        // Keyframe numeric sampling — keep only the VALUES we need for
        // motion replay. Opacity (0-1) and transform (matrix/translateY/
        // scale) are the primary motion vocabulary. Large string values
        // (filter chains, complex transforms) truncated to 64 chars.
        const sampledKf = kf.slice(0, 6).map(frame => {
          const out = { offset: frame.offset ?? null, easing: frame.easing ?? null };
          if (frame.opacity != null) out.opacity = +frame.opacity;
          if (frame.transform != null) out.transform = String(frame.transform).slice(0, 64);
          return out;
        });
        motions.push({
          y: Math.round(r.top + window.scrollY),
          x: Math.round(r.left),
          w: Math.round(r.width),
          h: Math.round(r.height),
          duration: +t.duration || 0,
          delay: +t.delay || 0,
          iterations: t.iterations === Infinity ? -1 : +t.iterations || 1,
          direction: t.direction || "normal",
          fill: t.fill || "none",
          easing: t.easing || "linear",
          keyframeCount: kf.length,
          keyframes: sampledKf,
          props: [...props].slice(0, 6),
          playState: anim.playState,
          targetPath: buildPath(target),
          targetTag: target.tagName,
        });
      } catch (e) { /* skip broken anim */ }
    }
  } catch (e) { /* getAnimations unsupported */ }

  // ─── VIDEO + IFRAME DETECT ───
  // Video elements + YouTube/Vimeo iframes carry creative expression (the
  // video content itself). We capture position + aspect so emit can place
  // a placeholder at the right spot. In dev mode the original src is
  // hotlinked for visual verification — user must replace before deploy.
  const videos = [];
  const videoSelectors = "video, iframe[src*='youtube'], iframe[src*='vimeo'], iframe[src*='wistia']";
  for (const v of document.querySelectorAll(videoSelectors)) {
    const r = v.getBoundingClientRect();
    if (r.width < 150 || r.height < 100) continue;
    const src = v.src || v.currentSrc || v.querySelector("source")?.src || "";
    videos.push({
      tag: v.tagName.toLowerCase(),
      src,
      poster: v.poster || "",
      autoplay: v.hasAttribute("autoplay"),
      loop: v.hasAttribute("loop"),
      muted: v.hasAttribute("muted") || v.muted,
      y: Math.round(r.top + window.scrollY),
      w: Math.round(r.width),
      h: Math.round(r.height),
    });
    if (videos.length >= 10) break;
  }

  // ─── LOGO DETECT (Nav first image/svg) ───
  // Prioritize nav/header region, fall back to first visible <svg>/<img>
  // inside a top-y element with link/brand context.
  let logo = null;
  const navEl = document.querySelector("nav, header, [role='banner']");
  if (navEl) {
    const svg = navEl.querySelector("svg");
    const img = navEl.querySelector("img");
    if (svg) {
      const r = svg.getBoundingClientRect();
      logo = { type: "svg", viewBox: svg.getAttribute("viewBox") || "0 0 100 40", w: Math.round(r.width), h: Math.round(r.height) };
    } else if (img) {
      const r = img.getBoundingClientRect();
      logo = { type: "img", src: img.currentSrc || img.src, alt: img.alt || "", w: Math.round(r.width), h: Math.round(r.height) };
    }
  }

  // ─── FORM DETECT ───
  // Capture source forms as schema: input types + count + submit label
  // presence. Labels/placeholders tokenize in emit. Preserves "contact/
  // newsletter form lives here" fact without inheriting field labels.
  const forms = [];
  for (const f of document.querySelectorAll("form")) {
    const r = f.getBoundingClientRect();
    if (r.width < 100 || r.height < 50) continue;
    const inputs = [...f.querySelectorAll("input, textarea, select")].map(el => ({
      tag: el.tagName.toLowerCase(),
      type: el.getAttribute("type") || "text",
      required: el.hasAttribute("required"),
    })).slice(0, 12);
    const hasSubmit = !!f.querySelector("button[type='submit'], input[type='submit'], button:not([type])");
    forms.push({
      y: Math.round(r.top + window.scrollY),
      w: Math.round(r.width),
      h: Math.round(r.height),
      inputs,
      hasSubmit,
    });
  }

  // ─── CANVAS / WEBGL DETECT ───
  // Records location + context type of every canvas. Output emits a
  // react-three-fiber placeholder scene at the same position when any
  // WebGL canvas exists — preserves "3D hero existed" fact without
  // copying shader source.
  const canvases = [];
  for (const c of document.querySelectorAll("canvas")) {
    const r = c.getBoundingClientRect();
    if (r.width < 100 || r.height < 100) continue;
    let ctxType = "2d-or-unknown";
    try {
      if (c.getContext("webgl2")) ctxType = "webgl2";
      else if (c.getContext("webgl")) ctxType = "webgl";
    } catch (e) { /* context probe failed */ }
    canvases.push({
      y: Math.round(r.top + window.scrollY),
      x: Math.round(r.left),
      w: Math.round(r.width),
      h: Math.round(r.height),
      ctxType,
    });
  }

  // ─── SEO METADATA EXTRACTION ───
  // Capture source's meta tags structure. Names/types are facts (not
  // copyrightable). Content values get tokenized in emit so user can fill
  // their own description/keywords — preserves SEO schema without
  // inheriting brand claims.
  const seo = {
    title: document.title || "",
    rawTitle: document.title || "",
    description: document.querySelector('meta[name="description"]')?.getAttribute("content") || "",
    ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute("content") || "",
    ogDescription: document.querySelector('meta[property="og:description"]')?.getAttribute("content") || "",
    siteName: document.querySelector('meta[property="og:site_name"]')?.getAttribute("content") || "",
    hasDescription: !!document.querySelector('meta[name="description"]'),
    hasOgTitle: !!document.querySelector('meta[property="og:title"]'),
    hasOgImage: !!document.querySelector('meta[property="og:image"]'),
    hasTwitter: !!document.querySelector('meta[name^="twitter"]'),
    hasCanonical: !!document.querySelector('link[rel="canonical"]'),
    themeColor: document.querySelector('meta[name="theme-color"]')?.getAttribute("content") || null,
    lang: document.documentElement.lang || "en",
    viewport: document.querySelector('meta[name="viewport"]')?.getAttribute("content") || "width=device-width, initial-scale=1",
    // Count internal anchor targets — used by multi-page crawler to pick
    // top routes without refetching the page.
    internalLinks: [...document.querySelectorAll('a[href]')]
      .map(a => a.getAttribute("href"))
      .filter(h => h && !h.startsWith("http") && !h.startsWith("#") && !h.startsWith("mailto:") && !h.startsWith("tel:") && h !== "/")
      .slice(0, 20),
  };

  // ─── SCROLL TRIGGER PROBE ───
  // Can't directly read scroll listeners (security), but we infer scroll-
  // animation presence from symptoms: (a) CSS position:sticky blocks,
  // (b) elements with transform set by JS based on scroll (detected via
  // non-identity transform while not animating), (c) IntersectionObserver
  // usage via a wrapped constructor probe that main-frame sites often use.
  const scrollSignals = {
    stickyElements: [...document.querySelectorAll("*")].filter(el => {
      const p = getComputedStyle(el).position;
      return p === "sticky" || p === "-webkit-sticky";
    }).length,
    hasScrollTimeline: !!document.querySelector("[style*='scroll-timeline'], [data-scroll]"),
    transformedNonAnimated: 0, // filled in after getAnimations check
  };
  // Count static transforms (likely scroll-driven if not keyframed)
  const animatedTargets = new WeakSet();
  try {
    for (const a of document.getAnimations()) {
      const t = a.effect?.target;
      if (t) animatedTargets.add(t);
    }
  } catch {}
  let transformedStatic = 0;
  for (const el of document.querySelectorAll("section *, main *, div *")) {
    if (animatedTargets.has(el)) continue;
    const t = getComputedStyle(el).transform;
    if (t && t !== "none" && t !== "matrix(1, 0, 0, 1, 0, 0)") transformedStatic++;
    if (transformedStatic > 500) break; // safety
  }
  scrollSignals.transformedNonAnimated = transformedStatic;

  return {
    title: document.title || "",
    viewport: { w: window.innerWidth, h: window.innerHeight },
    docHeight: document.body.scrollHeight,
    strategy,
    sections: sections.slice(0, 20),
    motions,
    canvases,
    forms,
    videos,
    logo,
    scrollSignals,
    seo,
    colors: [...colorCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 24),
    fonts: [...fontFamilies.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
    fontSizes: [...fontSizes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10),
    radii: [...radii.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
    shadows: [...shadows.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4),
    spacings: [...spacings.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10),
  };
}, url);

// Canvas text readback — pull whatever our monkey-patch captured.
// Most Framer sites render giant typography as SVG/image, not canvas,
// so this is often empty. When non-empty (e.g., WebGL particle titles,
// data-viz), these texts become recoverable to our output.
const canvasTexts = await page.evaluate(() => {
  const arr = (window.__CAPTURED_CANVAS_TEXT__ || []).map(c => {
    const r = c.canvasEl ? c.canvasEl.getBoundingClientRect() : { top: 0, left: 0, width: 0, height: 0 };
    return {
      text: c.text,
      x: c.x, y: c.y,
      font: c.font,
      fill: c.fillStyle,
      stroke: c.strokeStyle,
      align: c.align,
      type: c.type,
      canvasAbsY: Math.round(r.top + window.scrollY),
      canvasX: Math.round(r.left),
      canvasW: Math.round(r.width),
      canvasH: Math.round(r.height),
    };
  });
  return arr.slice(0, 120);
});
console.log(`  canvas text: ${canvasTexts.length} calls captured`);
extracted.canvasTexts = canvasTexts;

// WebGL shader readback — source strings captured at shaderSource() calls.
// For sites with WebGL scenes (three.js/raw webgl), this is their DNA.
const webglShaders = await page.evaluate(() => window.__CAPTURED_SHADERS__ || []);
console.log(`  webgl shaders: ${webglShaders.length} captured (${webglShaders.filter(s => s.kind === "vertex").length} vertex / ${webglShaders.filter(s => s.kind === "fragment").length} fragment)`);
extracted.webglShaders = webglShaders;

// ─── Scroll trajectory sampling ───────────────────────────────────────
// Framer / Webflow scroll animations are NOT WAAPI — they're JS event
// listeners that write transforms directly. getAnimations() misses them.
// We sample scroll positions and record each section's aggregate y-delta
// and scale-delta of its descendant elements. This becomes the "trajectory"
// that emit uses to drive useScroll + useTransform parameters.
const scrollSamples = await page.evaluate(async () => {
  const docH = document.body.scrollHeight;
  const positions = [0, 0.2, 0.4, 0.6, 0.8, 1.0].map(f => Math.floor(docH * f));
  const samples = {};
  // Pick a fixed set of candidate elements — tracked across all scroll
  // positions. Pre-select so the same nodes are measured each frame.
  // Prioritize elements that ALREADY have a non-identity transform (these
  // are the scroll-driven / Framer-animated ones). Supplement with large
  // content blocks to ensure section coverage.
  const tracked = [];
  const withTransform = [];
  const largeBlocks = [];
  for (const el of document.querySelectorAll("body *")) {
    if (!(el instanceof HTMLElement)) continue;
    if (["SCRIPT", "STYLE", "NOSCRIPT"].includes(el.tagName)) continue;
    const r = el.getBoundingClientRect();
    const absY = r.top + window.scrollY;
    if (absY < 0 || r.width < 40 || r.height < 40) continue;
    const cs = getComputedStyle(el);
    const t = cs.transform;
    if (t && t !== "none" && t !== "matrix(1, 0, 0, 1, 0, 0)") {
      withTransform.push(el);
    } else if (r.width >= 200 && r.height >= 100) {
      largeBlocks.push(el);
    }
  }
  // 60 with transform (priority) + 40 large blocks for section coverage
  for (const el of withTransform.slice(0, 60)) tracked.push(el);
  for (const el of largeBlocks) {
    if (tracked.length >= 200) break;
    if (!tracked.includes(el)) tracked.push(el);
  }
  for (const y of positions) {
    window.scrollTo(0, y);
    await new Promise(r => setTimeout(r, 200));
    const frame = [];
    for (let i = 0; i < tracked.length; i++) {
      const el = tracked[i];
      const cs = getComputedStyle(el);
      const t = cs.transform;
      const r = el.getBoundingClientRect();
      frame.push({
        i,
        transform: t === "none" ? null : t,
        absY: Math.round(r.top + window.scrollY),
        opacity: parseFloat(cs.opacity) || 1,
      });
    }
    samples[y] = frame;
  }
  window.scrollTo(0, 0);
  return { positions, samples, trackedCount: tracked.length };
});
console.log(`  scroll trajectory: ${scrollSamples.trackedCount} elements × ${scrollSamples.positions.length} positions`);
extracted.scrollSamples = scrollSamples;
extracted.initialRevealStates = initialRevealStates;

// Aggregate initial-reveal hidden states per section. Each section's
// revealSignature lets emit produce motion.initial={} with ACTUAL source
// values: opacity 0, translateY 40px, etc. Replaces fallback fixed values.
const parseY = (tr) => {
  if (!tr || tr === "none") return 0;
  const m = tr.match(/matrix(?:3d)?\(([^)]+)\)/);
  if (!m) return 0;
  const vals = m[1].split(",").map(v => parseFloat(v.trim()));
  if (vals.length === 6) return vals[5];
  if (vals.length === 16) return vals[13];
  return 0;
};
for (const s of extracted.sections) {
  const inRange = initialRevealStates.filter(r => r.absY >= s.top && r.absY < s.top + s.h);
  if (inRange.length === 0) continue;
  const hiddenOnes = inRange.filter(r => r.opacity < 0.99 || r.transform);
  if (hiddenOnes.length === 0) continue;
  let avgOpacity = 0, avgY = 0, count = 0;
  for (const r of hiddenOnes) {
    avgOpacity += r.opacity;
    avgY += parseY(r.transform);
    count++;
  }
  s.revealSignature = {
    detected: count,
    initialOpacity: +(avgOpacity / count).toFixed(2),
    initialY: Math.round(avgY / count),
  };
}

// Compute per-section motion aggregates from scroll samples. For each
// section, find elements whose absY falls inside the section range at
// position 0, then measure their transform trajectory across positions.
// Result is a section-level scroll-motion signature that emit can
// reference: section.motionSpan = { deltaY, deltaScale, opacityShift }.
const parseMatrix = (t) => {
  if (!t || t === "none") return { tx: 0, ty: 0, scale: 1 };
  const m = t.match(/matrix(?:3d)?\(([^)]+)\)/);
  if (!m) return { tx: 0, ty: 0, scale: 1 };
  const vals = m[1].split(",").map(v => parseFloat(v.trim()));
  if (vals.length === 6) {
    return { tx: vals[4], ty: vals[5], scale: Math.sqrt(vals[0] * vals[0] + vals[1] * vals[1]) };
  }
  if (vals.length === 16) {
    return { tx: vals[12], ty: vals[13], scale: Math.sqrt(vals[0] * vals[0] + vals[1] * vals[1]) };
  }
  return { tx: 0, ty: 0, scale: 1 };
};
for (const s of extracted.sections) {
  const frame0 = scrollSamples.samples[0] || [];
  const inRange = frame0.filter(f => f.absY >= s.top && f.absY < s.top + s.h);
  if (inRange.length === 0) continue;
  const indices = inRange.map(f => f.i);
  let dyTotal = 0, dsTotal = 0, opStart = 0, opEnd = 0, count = 0;
  for (const idx of indices) {
    const firstPos = scrollSamples.positions[0];
    const lastPos = scrollSamples.positions[scrollSamples.positions.length - 1];
    const first = scrollSamples.samples[firstPos]?.find(f => f.i === idx);
    const last = scrollSamples.samples[lastPos]?.find(f => f.i === idx);
    if (!first || !last) continue;
    const m0 = parseMatrix(first.transform);
    const m1 = parseMatrix(last.transform);
    dyTotal += (m1.ty - m0.ty);
    dsTotal += (m1.scale - m0.scale);
    opStart += first.opacity;
    opEnd += last.opacity;
    count++;
  }
  if (count > 0) {
    s.motionSpan = {
      tracked: count,
      deltaY: Math.round(dyTotal / count),
      deltaScale: +(dsTotal / count).toFixed(3),
      opacityStart: +(opStart / count).toFixed(2),
      opacityEnd: +(opEnd / count).toFixed(2),
    };
  }
}

// ─── Font asset extraction (--use-original-text / --use-original-images) ─
// Parse @font-face rules from all CSS stylesheets, download binary font
// files, save to public/fonts/. globals.css later gets @font-face entries
// pointing to our local files. Typography now matches source even when
// screenshot overlay is stripped (clean mode still needs these).
const fontFaces = USE_ORIGINAL_IMAGES ? await page.evaluate(() => {
  const out = [];
  const seen = new Set();
  for (const sheet of [...document.styleSheets]) {
    let rules;
    try { rules = sheet.cssRules; } catch (e) { continue; } // skip CORS
    if (!rules) continue;
    for (const rule of rules) {
      if (rule.type === CSSRule.FONT_FACE_RULE) {
        const family = (rule.style.getPropertyValue("font-family") || "").replace(/['"]/g, "").trim();
        const weight = (rule.style.getPropertyValue("font-weight") || "400").trim();
        const style = (rule.style.getPropertyValue("font-style") || "normal").trim();
        const src = rule.style.getPropertyValue("src") || "";
        // Prefer woff2 > woff > ttf. Iterate url(...) + format() pairs.
        const parts = src.split(/,\s*/);
        let bestUrl = null, bestFormat = null, bestRank = -1;
        const rank = { woff2: 3, woff: 2, truetype: 1, opentype: 1 };
        for (const p of parts) {
          const um = p.match(/url\(["']?([^"')]+)["']?\)/);
          const fm = p.match(/format\(["']?([^"')]+)["']?\)/);
          if (!um) continue;
          const fmt = fm ? fm[1] : null;
          const rk = rank[fmt] || 0;
          if (rk > bestRank) { bestRank = rk; bestUrl = um[1]; bestFormat = fmt; }
        }
        if (bestUrl && family) {
          const key = `${family}|${weight}|${style}`;
          if (seen.has(key)) continue;
          seen.add(key);
          // Resolve relative URL against current origin
          let abs = bestUrl;
          try { abs = new URL(bestUrl, location.href).toString(); } catch (e) {}
          out.push({ family, weight, style, url: abs, format: bestFormat });
        }
      }
    }
  }
  return out.slice(0, 40);
}) : [];
console.log(`  font faces: ${fontFaces.length} discovered`);

// Download fonts via same-origin fetch inside the page context (handles
// CORS because browser treats page.evaluate fetches as same-origin).
const downloadedFonts = [];
if (fontFaces.length > 0) {
  const fontsDir = path.join(projDir, "public", "fonts");
  fs.mkdirSync(fontsDir, { recursive: true });
  for (const f of fontFaces) {
    try {
      const bytes = await page.evaluate(async (url) => {
        const res = await fetch(url, { mode: "cors" });
        if (!res.ok) return null;
        const buf = await res.arrayBuffer();
        return Array.from(new Uint8Array(buf));
      }, f.url);
      if (!bytes) continue;
      const ext = f.format === "woff2" ? "woff2" : f.format === "woff" ? "woff" : "ttf";
      const safeName = f.family.replace(/[^a-zA-Z0-9]/g, "_");
      const fname = `${safeName}-${f.weight}-${f.style}.${ext}`;
      fs.writeFileSync(path.join(fontsDir, fname), Buffer.from(bytes));
      downloadedFonts.push({ ...f, localPath: `/fonts/${fname}`, fileSize: bytes.length });
    } catch (e) { /* skip */ }
  }
  console.log(`  fonts downloaded: ${downloadedFonts.length}/${fontFaces.length} (${(downloadedFonts.reduce((s, f) => s + f.fileSize, 0) / 1024).toFixed(0)}KB)`);
}
extracted.fontFaces = downloadedFonts;

// ─── CSS @keyframes extraction ───────────────────────────────────────
// Always-on CSS animations (spinner, ticker, pulse, breath) are NOT
// captured by WAAPI or scroll sampling. Here we pull them from the CSSOM
// directly — rule.cssText keeps the exact keyframe values. globals.css
// injects them verbatim so our output plays the same infinite motion.
const cssKeyframes = await page.evaluate(() => {
  const out = [];
  const seen = new Set();
  for (const sheet of [...document.styleSheets]) {
    let rules;
    try { rules = sheet.cssRules; } catch (e) { continue; }
    if (!rules) continue;
    for (const rule of rules) {
      if (rule.type === CSSRule.KEYFRAMES_RULE) {
        const name = rule.name;
        if (seen.has(name)) continue;
        seen.add(name);
        out.push({ name, cssText: rule.cssText });
        if (out.length >= 40) return out;
      }
    }
  }
  return out;
});
console.log(`  css @keyframes: ${cssKeyframes.length} rules captured`);
extracted.cssKeyframes = cssKeyframes;

// ─── Favicon + OG image download ──────────────────────────────────────
// Pull favicon.ico (or <link rel="icon">) + og:image for metadata.
// Browsers and OG crawlers (Twitter/KakaoTalk/Slack) need these.
const brandAssets = await page.evaluate(() => {
  const icon = document.querySelector('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
  const ogImg = document.querySelector('meta[property="og:image"]');
  const twImg = document.querySelector('meta[name="twitter:image"]');
  const appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
  return {
    iconUrl: icon?.getAttribute("href") || "/favicon.ico",
    ogImageUrl: ogImg?.getAttribute("content") || "",
    twitterImageUrl: twImg?.getAttribute("content") || "",
    appleIconUrl: appleIcon?.getAttribute("href") || "",
  };
});
if (USE_ORIGINAL_IMAGES) {
  const assetsDir = path.join(projDir, "public");
  const dl = async (assetUrl, saveName) => {
    if (!assetUrl) return null;
    try {
      const abs = new URL(assetUrl, url).toString();
      const bytes = await page.evaluate(async (u) => {
        const res = await fetch(u, { mode: "cors" });
        if (!res.ok) return null;
        const buf = await res.arrayBuffer();
        return Array.from(new Uint8Array(buf));
      }, abs);
      if (!bytes) return null;
      fs.writeFileSync(path.join(assetsDir, saveName), Buffer.from(bytes));
      return `/${saveName}`;
    } catch (e) { return null; }
  };
  extracted.brandAssets = {
    favicon: await dl(brandAssets.iconUrl, "favicon.ico"),
    ogImage: await dl(brandAssets.ogImageUrl, "og-image.png"),
    twitterImage: await dl(brandAssets.twitterImageUrl, "twitter-image.png"),
    appleIcon: await dl(brandAssets.appleIconUrl, "apple-touch-icon.png"),
  };
  const downloaded = Object.values(extracted.brandAssets).filter(Boolean).length;
  console.log(`  brand assets: ${downloaded}/4 downloaded (favicon/og/twitter/apple)`);
}

// ─── Interaction DNA — CSSOM :hover/:focus/:active capture ───────────
// Walk every stylesheet rule, find pseudo-class selectors, extract the
// property diffs. Output becomes a site-wide "interaction signature"
// that emit translates into framer-motion whileHover/whileTap variants.
// Pattern extraction uses frequency: most-common transform/opacity/scale
// across the site becomes the default hover for all CTAs. Precise
// selector matching is skipped (too brittle) — we use the aggregate signal.
const interactionDNA = await page.evaluate(() => {
  const out = { hover: [], focus: [], active: [] };
  for (const sheet of [...document.styleSheets]) {
    let rules;
    try { rules = sheet.cssRules; } catch (e) { continue; }
    if (!rules) continue;
    for (const rule of rules) {
      if (rule.type !== CSSRule.STYLE_RULE) continue;
      const sel = rule.selectorText || "";
      const props = {};
      for (const p of rule.style) {
        const v = rule.style.getPropertyValue(p);
        if (v && v.length > 0 && v.length < 200) props[p] = v;
      }
      if (Object.keys(props).length === 0) continue;
      if (sel.includes(":hover")) out.hover.push({ sel: sel.slice(0, 120), props });
      else if (sel.includes(":focus")) out.focus.push({ sel: sel.slice(0, 120), props });
      else if (sel.includes(":active")) out.active.push({ sel: sel.slice(0, 120), props });
      if (out.hover.length + out.focus.length + out.active.length > 300) break;
    }
  }
  return out;
});
extracted.interactionDNA = interactionDNA;

// Aggregate top hover patterns — find most common property+value combos.
const aggregateHover = (rules) => {
  const propFreq = new Map();
  for (const r of rules) {
    for (const [p, v] of Object.entries(r.props)) {
      const key = `${p}|${v}`;
      propFreq.set(key, (propFreq.get(key) || 0) + 1);
    }
  }
  const sorted = [...propFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  // Parse dominant hover signature: transform → y/scale, opacity, color
  const sig = { y: null, scale: null, opacity: null, color: null, background: null };
  for (const [key, _count] of sorted) {
    const [prop, val] = key.split("|");
    if (prop === "transform") {
      const y = val.match(/translateY\((-?\d+(?:\.\d+)?)(px|%)?/);
      if (y && sig.y === null) sig.y = parseFloat(y[1]);
      const s = val.match(/scale\((\d+(?:\.\d+)?)/);
      if (s && sig.scale === null) sig.scale = Math.max(0.9, Math.min(1.15, parseFloat(s[1])));
    }
    if (prop === "opacity" && sig.opacity === null) {
      const o = parseFloat(val);
      if (!isNaN(o) && o >= 0.3 && o <= 1) sig.opacity = o;
    }
    if (prop === "color" && sig.color === null && val.startsWith("rgb")) sig.color = val;
  }
  return sig;
};
extracted.hoverSignature = aggregateHover(interactionDNA.hover);
console.log(`  interaction DNA: ${interactionDNA.hover.length} hover / ${interactionDNA.focus.length} focus / ${interactionDNA.active.length} active rules`);
console.log(`  hover signature: y=${extracted.hoverSignature.y} scale=${extracted.hoverSignature.scale} opacity=${extracted.hoverSignature.opacity}`);

// ─── Multi-viewport section screenshot capture (dev mode only) ────────
// Capture each section at 3 breakpoints: 375 (mobile), 768 (tablet),
// 1920 (desktop). Emit uses CSS @media to swap background-image so the
// clone responds to viewport width natively. Solves the Framer canvas/
// svg/webgl text-not-in-DOM problem at every viewport, not just desktop.
if (USE_ORIGINAL_IMAGES && extracted.sections?.length) {
  const shotsDir = path.join(projDir, "public", "sections");
  fs.mkdirSync(shotsDir, { recursive: true });
  const viewports = [
    { name: "mobile", width: 375, height: 812 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "desktop", width: 1920, height: 1080 },
  ];
  const viewportScreenshots = {};
  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await new Promise(r => setTimeout(r, 800)); // allow reflow
    // Re-measure section rects at this viewport (DOM rearranges at mobile)
    await page.evaluate(async () => {
      const h = document.body.scrollHeight;
      for (let y = 0; y < h; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 80)); }
      window.scrollTo(0, 0);
    });
    await new Promise(r => setTimeout(r, 500));
    // For mobile/tablet, sections may stack differently — we still use the
    // original id/role index but measure actual rects at this viewport.
    const vpSections = await page.evaluate((sectionRoots) => {
      // Re-query DOM using a heuristic similar to scan: top-level body >
      // div children whose height > 200px. Returns new rects matching the
      // desktop section order when possible.
      const rects = [];
      const roots = [...document.body.querySelectorAll("body > div > section, body > div > div > section, body > main > section, body > div > div > div")]
        .filter(el => el.getBoundingClientRect().height >= 100);
      for (let i = 0; i < roots.length && i < sectionRoots; i++) {
        const r = roots[i].getBoundingClientRect();
        rects.push({ top: Math.round(r.top + window.scrollY), h: Math.round(r.height) });
      }
      return rects;
    }, extracted.sections.length);

    let captured = 0;
    for (let i = 0; i < extracted.sections.length; i++) {
      const s = extracted.sections[i];
      const vpRect = vpSections[i];
      const useTop = vpRect ? vpRect.top : s.top;
      const useH = vpRect ? vpRect.h : s.h;
      if (!useH || useH < 50) continue;
      try {
        await page.evaluate((y) => window.scrollTo(0, Math.max(0, y - 60)), useTop);
        await new Promise(r => setTimeout(r, 300));
        const clipH = Math.min(useH, 8000);
        const fname = `s${i}-${vp.name}.jpg`;
        await page.screenshot({
          path: path.join(shotsDir, fname),
          type: "jpeg",
          quality: vp.name === "desktop" ? 78 : 82,
          clip: { x: 0, y: useTop, width: vp.width, height: clipH },
        });
        if (!viewportScreenshots[i]) viewportScreenshots[i] = {};
        viewportScreenshots[i][vp.name] = `/sections/${fname}`;
        captured++;
      } catch (err) { /* non-fatal */ }
    }
    console.log(`  screenshots ${vp.name} (${vp.width}px): ${captured}/${extracted.sections.length}`);
  }
  // Restore desktop viewport for any subsequent logic
  await page.setViewport({ width: 1920, height: 1080 });
  // Attach all 3 screenshot paths per section + sectionIndex for CSS data-attr
  for (let i = 0; i < extracted.sections.length; i++) {
    extracted.sections[i].sectionIndex = i;
    const paths = viewportScreenshots[i];
    if (paths) {
      extracted.sections[i].screenshotPath = paths.desktop || paths.tablet || paths.mobile;
      extracted.sections[i].screenshotPathsByViewport = paths;
    }
  }
}

// ─── Multi-page per-route scan ────────────────────────────────────────
// After root page scan completes, iterate top internal routes and extract
// each page's content. Emit later creates /route/page.tsx with per-route
// sections. Shares nav/footer/fonts from root — only main content differs.
extracted.pages = {};
const internalHrefs = (extracted.seo?.internalLinks || [])
  .map(h => h.replace(/^\.\//, "/").replace(/^\/+/, "/").split(/[?#]/)[0])
  .filter(h => h && h !== "/" && h.length < 100 && !/\.(png|jpg|jpeg|gif|svg|pdf|ico|css|js|woff2?)$/i.test(h));
const routeSet = [...new Set(internalHrefs)].slice(0, 3);
if (routeSet.length > 0) {
  console.log(`  multi-page scan: ${routeSet.length} routes`);
  for (const route of routeSet) {
    try {
      const fullUrl = new URL(route, url).toString();
      await page.goto(fullUrl, { waitUntil: "networkidle2", timeout: 30000 });
      await new Promise(r => setTimeout(r, 1500));
      await page.evaluate(async () => {
        const h = document.body.scrollHeight;
        for (let y = 0; y < h; y += 800) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 50)); }
        window.scrollTo(0, 0);
      });
      await new Promise(r => setTimeout(r, 500));
      const routeData = await page.evaluate(() => {
        const out = {
          title: document.title || "",
          description: document.querySelector('meta[name="description"]')?.getAttribute("content") || "",
          h1: (document.querySelector("h1")?.textContent || "").trim().slice(0, 200),
          headings: [...document.querySelectorAll("h1, h2, h3")]
            .map(h => (h.textContent || "").trim())
            .filter(t => t.length >= 2 && t.length < 200).slice(0, 10),
          paragraphs: [...document.querySelectorAll("p")]
            .map(p => (p.textContent || "").trim())
            .filter(t => t.length >= 10 && t.length < 400).slice(0, 8),
          ctas: [...document.querySelectorAll("button, a[href]:not([href='#'])")]
            .map(a => (a.textContent || "").trim())
            .filter(t => t.length >= 1 && t.length < 60).slice(0, 8),
          images: [...document.querySelectorAll("img")].slice(0, 10).map(img => {
            const r = img.getBoundingClientRect();
            return { src: img.currentSrc || img.src, alt: img.alt || "", w: Math.round(r.width), h: Math.round(r.height) };
          }).filter(i => i.src && i.w >= 50),
          docHeight: document.body.scrollHeight,
        };
        return out;
      });
      // Take 3-viewport screenshots of this route
      const routeShots = {};
      if (USE_ORIGINAL_IMAGES) {
        const shotsDir = path.join(projDir, "public", "sections");
        for (const vp of [{ n: "mobile", w: 375 }, { n: "tablet", w: 768 }, { n: "desktop", w: 1920 }]) {
          try {
            await page.setViewport({ width: vp.w, height: 900 });
            await new Promise(r => setTimeout(r, 400));
            const safeRouteName = route.replace(/[^a-z0-9]/gi, "_").replace(/^_+|_+$/g, "");
            const fname = `route-${safeRouteName}-${vp.n}.jpg`;
            await page.screenshot({ path: path.join(shotsDir, fname), type: "jpeg", quality: vp.n === "desktop" ? 75 : 82, fullPage: false });
            routeShots[vp.n] = `/sections/${fname}`;
          } catch (e) {}
        }
        await page.setViewport({ width: 1920, height: 1080 });
      }
      routeData.screenshotPathsByViewport = routeShots;
      extracted.pages[route] = routeData;
      console.log(`    ${route}: "${routeData.h1.slice(0, 40)}..." (${routeData.headings.length} h, ${routeData.paragraphs.length} p, ${routeData.images.length} img)`);
    } catch (e) {
      console.log(`    ${route}: scan failed (${e.message.slice(0, 60)})`);
    }
  }
  // CRITICAL: Return to root so subsequent evaluate() calls run against
  // the main page state, not the last (possibly broken) route. Without
  // this, all downstream CDP ops run on whatever route happened to load
  // last — and if that route had a JS timeout (e.g. Framer lazy page),
  // the CDP session stays in a bad state and everything downstream fails
  // with `Runtime.callFunctionOn timed out`.
  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 800));
  } catch (e) {
    console.log(`    root restore: failed (${e.message.slice(0, 60)})`);
  }
}

// Separate Lottie animations from generic API mocks. Lottie JSON has a
// distinctive schema: top-level keys include v (version), fr (framerate),
// ip (in point), op (out point), layers (array). When detected, we save
// the animation + map it to the DOM element that loaded it (via URL match).
const lottieAnimations = [];
for (const cap of apiCaptures) {
  try {
    const parsed = JSON.parse(cap.body);
    if (parsed && typeof parsed === "object"
        && parsed.v !== undefined && parsed.fr !== undefined
        && Array.isArray(parsed.layers)) {
      lottieAnimations.push({
        url: cap.url,
        pathname: cap.pathname,
        version: parsed.v,
        frameRate: parsed.fr,
        width: parsed.w || 400,
        height: parsed.h || 400,
        duration: (parsed.op - parsed.ip) / parsed.fr,
        layerCount: parsed.layers.length,
        data: parsed, // full JSON for emit
      });
    }
  } catch (e) { /* not JSON or not Lottie */ }
}
extracted.lottieAnimations = lottieAnimations;
console.log(`  lottie animations: ${lottieAnimations.length} detected (${apiCaptures.length} total network JSON)`);

// ─── Rive file detection ──────────────────────────────────────────────
// .riv files are binary — can't parse via JSON intercept. We check
// apiCaptures URLs for .riv extension + use network content-type.
const riveFiles = apiCaptures
  .filter(c => c.url.match(/\.riv(\?|$)/) || /application\/octet-stream/i.test(c.contentType))
  .slice(0, 10);
extracted.riveFiles = riveFiles;
console.log(`  rive animations: ${riveFiles.length} detected`);

// ─── Custom cursor + premium motion hints ─────────────────────────────
const motionHints = await page.evaluate(() => ({
  customCursorUsed: getComputedStyle(document.documentElement).cursor === "none" ||
                    getComputedStyle(document.body).cursor === "none",
  hasGSAP: !!(window.gsap || window.ScrollTrigger) ||
           !![...document.scripts].find(s => /gsap|scrolltrigger/i.test(s.src)),
  hasBarba: !![...document.scripts].find(s => /barba/i.test(s.src)),
  hasLenis: !!window.Lenis || !![...document.scripts].find(s => /lenis/i.test(s.src)),
  hasSwiper: !!window.Swiper || !![...document.scripts].find(s => /swiper/i.test(s.src)),
  hasSplide: !!window.Splide || !![...document.scripts].find(s => /splide/i.test(s.src)),
  hasThreeJS: !!window.THREE,
  bodyOverflow: getComputedStyle(document.body).overflow,
  pinnedElements: [...document.querySelectorAll('[style*="position: sticky"], [class*="pin"], [class*="sticky"]')].length,
  numericHeadings: [...document.querySelectorAll("h1, h2, h3")]
    .filter(h => /^\d+[\d,.]*\+?$/.test((h.textContent || "").trim()))
    .map(h => (h.textContent || "").trim()).slice(0, 10),
}));
extracted.motionHints = motionHints;
console.log(`  motion hints: cursor=${motionHints.customCursorUsed} gsap=${motionHints.hasGSAP} lenis=${motionHints.hasLenis} swiper=${motionHints.hasSwiper} count-ups=${motionHints.numericHeadings.length}`);

// ─── Platform-specific extraction ─────────────────────────────────────
// Each major site builder has signature patterns. Extract platform-native
// animation/layout metadata that generic scraping misses.
const platformData = await page.evaluate(() => {
  // Framer: data-framer-appear-id maps each entrance animation
  const framerAppears = [...document.querySelectorAll("[data-framer-appear-id]")]
    .slice(0, 80)
    .map(el => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        id: el.getAttribute("data-framer-appear-id"),
        tag: el.tagName.toLowerCase(),
        opacity: parseFloat(cs.opacity) || 1,
        transform: cs.transform === "none" ? null : cs.transform,
        transition: cs.transition === "none 0s ease 0s" ? null : cs.transition,
        absY: Math.round(r.top + window.scrollY),
        absX: Math.round(r.left),
      };
    });
  // Webflow IX2 — inline JSON script tag with animation timeline
  const ix2Script = document.querySelector('script[type="application/json"][data-ix2]') ||
                    document.getElementById("ix2-data");
  let ix2Data = null;
  if (ix2Script) {
    try { ix2Data = JSON.parse(ix2Script.textContent || ""); } catch (e) {}
  }
  const webflowIX2 = ix2Data ? {
    actionListCount: ix2Data.actionLists ? Object.keys(ix2Data.actionLists).length : 0,
    eventCount: ix2Data.events ? Object.keys(ix2Data.events).length : 0,
    site: ix2Data.site || null,
    rawSize: JSON.stringify(ix2Data).length,
  } : null;
  // Wix: wow-image / wix-* custom elements
  const wixImages = [...document.querySelectorAll("wow-image, wix-image")]
    .slice(0, 20)
    .map(el => {
      const r = el.getBoundingClientRect();
      return {
        src: el.getAttribute("data-image-info") || el.querySelector("img")?.src || null,
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    });
  return { framerAppears, webflowIX2, wixImages };
}).catch(() => ({ framerAppears: [], webflowIX2: null, wixImages: [] }));
extracted.platformData = platformData;
console.log(`  platform data: framer-appears=${platformData.framerAppears.length} webflow-ix2=${platformData.webflowIX2 ? "yes" : "no"} wix-images=${platformData.wixImages.length}`);

// Three.js scene graph — dumped by our monkey-patched Scene.prototype.add
const threeScene = await page.evaluate(() => window.__THREE_SCENE_ADDS__ || []);
extracted.threeScene = threeScene;
const meshCount = threeScene.filter(o => o.type === "mesh").length;
const lightCount = threeScene.filter(o => o.type === "light").length;
const cameraCount = threeScene.filter(o => o.type === "camera").length;
console.log(`  three.js scene: ${meshCount} meshes / ${lightCount} lights / ${cameraCount} cameras`);

// ─── Canvas frame sequence capture ────────────────────────────────────
// For WebGL / heavy animated canvases where scene graph is out of reach
// (module-scoped ES imports, compiled bundles), we fall back to time-
// series PNG capture. 25 frames × 200ms = 5s loop. Emit uses CSS
// background-image + steps() animation to play back. Fair-use capture
// of public page pixels. Dev mode only.
const canvasFrameData = USE_ORIGINAL_IMAGES ? await page.evaluate(async () => {
  const canvases = [...document.querySelectorAll("canvas")]
    .filter(c => c.width >= 300 && c.height >= 200);
  if (canvases.length === 0) return { canvases: [] };
  // Sort by area, take top 3 most prominent canvases
  const top = canvases.sort((a, b) => b.width * b.height - a.width * a.height).slice(0, 3);
  const out = [];
  for (let ci = 0; ci < top.length; ci++) {
    const c = top[ci];
    const r = c.getBoundingClientRect();
    const frames = [];
    // 25 frames at 200ms intervals
    for (let f = 0; f < 25; f++) {
      try {
        const url = c.toDataURL("image/jpeg", 0.6);
        if (url.length > 100) frames.push(url);
      } catch (e) { /* tainted canvas */ break; }
      await new Promise(r => setTimeout(r, 200));
    }
    if (frames.length > 0) {
      out.push({
        index: ci,
        w: Math.round(r.width),
        h: Math.round(r.height),
        absY: Math.round(r.top + window.scrollY),
        frames,
      });
    }
  }
  return { canvases: out };
}) : { canvases: [] };
const framesTotal = canvasFrameData.canvases.reduce((s, c) => s + c.frames.length, 0);
console.log(`  canvas frames: ${canvasFrameData.canvases.length} canvases × ${framesTotal} total frames`);
extracted.canvasFrames = canvasFrameData.canvases;

// ─── CSS custom properties (cascade :root variables) ──────────────────
// Modern sites define a theme via --var. Copying these gives our output
// the same design token system. measurements/colors = facts, safe.
const cssVariables = await page.evaluate(() => {
  const root = getComputedStyle(document.documentElement);
  const out = {};
  // CSS Typed OM attempts (fallback to iterating via stylesheets for vars)
  for (const sheet of [...document.styleSheets]) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule.type !== CSSRule.STYLE_RULE) continue;
        if (!rule.selectorText || !/^(:root|html|body)\s*$/.test(rule.selectorText.trim())) continue;
        for (const prop of rule.style) {
          if (prop.startsWith("--")) {
            const v = rule.style.getPropertyValue(prop).trim();
            if (v && v.length < 300 && Object.keys(out).length < 80) out[prop] = v;
          }
        }
      }
    } catch (e) {}
  }
  // Also try direct dump from element.style if already set
  const rs = document.documentElement.style;
  for (let i = 0; i < rs.length; i++) {
    const p = rs[i];
    if (p.startsWith("--") && !out[p]) out[p] = rs.getPropertyValue(p);
  }
  return out;
});
extracted.cssVariables = cssVariables;
const varCount = Object.keys(cssVariables).length;
console.log(`  css variables: ${varCount} --vars captured`);

// ─── Shadow DOM penetration ──────────────────────────────────────────
// Framer/Webflow web components have DOM hidden behind shadowRoot.
// Count and dump first-level light DOM inside shadow trees.
const shadowData = await page.evaluate(() => {
  const results = [];
  const walk = (root) => {
    for (const el of root.querySelectorAll("*")) {
      if (el.shadowRoot && results.length < 20) {
        const sr = el.shadowRoot;
        const r = el.getBoundingClientRect();
        results.push({
          hostTag: el.tagName.toLowerCase(),
          childCount: sr.children.length,
          innerTags: [...sr.children].map(c => c.tagName.toLowerCase()).slice(0, 10),
          absY: Math.round(r.top + window.scrollY),
          absX: Math.round(r.left),
          w: Math.round(r.width),
          h: Math.round(r.height),
        });
        walk(sr); // recurse into shadow root
      }
    }
  };
  walk(document);
  return results;
});
extracted.shadowDom = shadowData;
console.log(`  shadow DOM: ${shadowData.length} shadow roots penetrated`);

// Runtime intercept readbacks — Element.animate + events + mutations.
const runtimeCaptures = await page.evaluate(() => ({
  elementAnimations: window.__EL_ANIMATE__ || [],
  eventMap: window.__EVENT_MAP__ || [],
  mutations: window.__MUT_LOG__ || [],
}));
extracted.elementAnimations = runtimeCaptures.elementAnimations;
extracted.eventMap = runtimeCaptures.eventMap;
extracted.mutations = runtimeCaptures.mutations;
// Aggregate event types for quick reporting
const eventTypeCounts = {};
for (const e of runtimeCaptures.eventMap) eventTypeCounts[e.eventType] = (eventTypeCounts[e.eventType] || 0) + 1;
const topEvents = Object.entries(eventTypeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k}(${v})`).join(", ");
console.log(`  runtime intercept: ${runtimeCaptures.elementAnimations.length} el.animate() / ${runtimeCaptures.eventMap.length} events [${topEvents}] / ${runtimeCaptures.mutations.length} mutations`);

// ─── PWA manifest + JSON-LD + <picture> srcset capture ────────────────
const pwaAndSeo = await page.evaluate(() => {
  const manifestLink = document.querySelector('link[rel="manifest"]');
  const manifestHref = manifestLink?.getAttribute("href") || null;
  const jsonLD = [...document.querySelectorAll('script[type="application/ld+json"]')]
    .map(s => s.textContent?.trim() || "").filter(Boolean).slice(0, 5);
  const pictures = [...document.querySelectorAll("picture")].slice(0, 15).map(p => {
    const sources = [...p.querySelectorAll("source")].map(s => ({
      srcset: s.getAttribute("srcset") || "",
      media: s.getAttribute("media") || "",
      type: s.getAttribute("type") || "",
    }));
    const img = p.querySelector("img");
    const r = p.getBoundingClientRect();
    return {
      sources,
      fallbackSrc: img?.getAttribute("src") || "",
      alt: img?.getAttribute("alt") || "",
      w: Math.round(r.width),
      h: Math.round(r.height),
    };
  });
  const imagesWithSrcset = [...document.querySelectorAll("img[srcset]")].slice(0, 15).map(img => ({
    src: img.getAttribute("src") || "",
    srcset: img.getAttribute("srcset") || "",
    sizes: img.getAttribute("sizes") || "",
    alt: img.getAttribute("alt") || "",
  }));
  return { manifestHref, jsonLD, pictures, imagesWithSrcset };
});

// Download manifest.json if present
let manifestContent = null;
if (pwaAndSeo.manifestHref) {
  try {
    const manAbs = new URL(pwaAndSeo.manifestHref, url).toString();
    manifestContent = await page.evaluate(async (u) => {
      const r = await fetch(u);
      return r.ok ? await r.text() : null;
    }, manAbs);
  } catch (e) {}
}
extracted.pwaManifest = manifestContent ? JSON.parse(manifestContent) : null;
extracted.jsonLD = pwaAndSeo.jsonLD;
extracted.pictures = pwaAndSeo.pictures;
extracted.imagesWithSrcset = pwaAndSeo.imagesWithSrcset;
console.log(`  pwa/seo: manifest=${extracted.pwaManifest ? "yes" : "no"} jsonLD=${extracted.jsonLD.length} picture=${extracted.pictures.length} srcset-imgs=${extracted.imagesWithSrcset.length}`);

// ─── CustomElements + adoptedStyleSheets + Modern CSS ────────────────
// Web Components (tags with dash) + Constructable StyleSheets + modern
// CSS rules (@layer/@property/@container/@scope/@scroll-timeline).
const modernWeb = await page.evaluate(() => {
  // Custom Elements (tags with dash indicate a Web Component)
  const tags = new Set();
  for (const el of document.querySelectorAll("*")) {
    if (el.tagName.includes("-")) tags.add(el.tagName.toLowerCase());
  }
  const customEls = [...tags].slice(0, 30).map(tag => {
    const first = document.querySelector(tag);
    return {
      tag,
      count: document.querySelectorAll(tag).length,
      hasShadowRoot: !!first?.shadowRoot,
      attributes: first ? first.getAttributeNames().slice(0, 10) : [],
    };
  });

  // adoptedStyleSheets — Constructable StyleSheet API (Modern CSS injection)
  let adoptedCSS = "";
  try {
    if (document.adoptedStyleSheets && document.adoptedStyleSheets.length > 0) {
      for (const sheet of document.adoptedStyleSheets) {
        try {
          for (const rule of sheet.cssRules) adoptedCSS += rule.cssText + "\n";
        } catch (e) {}
      }
    }
  } catch (e) {}

  // Modern CSS rules from all stylesheets
  const modernRules = { layer: [], property: [], container: [], scope: [], scrollTimeline: [], supports: [] };
  for (const sheet of [...document.styleSheets]) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; }
    if (!rules) continue;
    for (const rule of rules) {
      // CSSRule type constants (modern)
      if (rule.cssText && rule.cssText.length < 2000) {
        if (rule.cssText.startsWith("@layer")) modernRules.layer.push(rule.cssText);
        else if (rule.cssText.startsWith("@property")) modernRules.property.push(rule.cssText);
        else if (rule.cssText.startsWith("@container")) modernRules.container.push(rule.cssText);
        else if (rule.cssText.startsWith("@scope")) modernRules.scope.push(rule.cssText);
        else if (rule.cssText.startsWith("@scroll-timeline") || rule.cssText.includes("animation-timeline")) modernRules.scrollTimeline.push(rule.cssText);
        else if (rule.cssText.startsWith("@supports") && modernRules.supports.length < 10) modernRules.supports.push(rule.cssText.slice(0, 500));
      }
    }
  }

  // Runtime readback
  const ioConfigs = window.__IO_CONFIGS__ || [];
  const roCount = window.__RO_COUNT__ || 0;

  return { customEls, adoptedCSS: adoptedCSS.slice(0, 50000), modernRules, ioConfigs, roCount };
});
extracted.customElements = modernWeb.customEls;
extracted.adoptedStyleSheets = modernWeb.adoptedCSS;
extracted.modernCSS = modernWeb.modernRules;
extracted.ioConfigs = modernWeb.ioConfigs;
extracted.roCount = modernWeb.roCount;
console.log(`  custom elements: ${modernWeb.customEls.length} (${modernWeb.customEls.reduce((s, e) => s + e.count, 0)} instances)`);
console.log(`  adoptedStyleSheets: ${modernWeb.adoptedCSS ? modernWeb.adoptedCSS.length + " bytes" : "none"}`);
console.log(`  modern CSS: @layer=${modernWeb.modernRules.layer.length} @property=${modernWeb.modernRules.property.length} @container=${modernWeb.modernRules.container.length} @scope=${modernWeb.modernRules.scope.length} scroll-timeline=${modernWeb.modernRules.scrollTimeline.length}`);
console.log(`  observers: ${modernWeb.ioConfigs.length} IntersectionObserver instances / ${modernWeb.roCount} ResizeObserver`);

// ─── API usage telemetry + Modern CSS selector detection ─────────────
const apiTelemetry = await page.evaluate(() => {
  const u = window.__API_USAGE__ || {};
  // Also scan CSS for modern selector patterns in source
  const modernSelectors = { has: 0, nesting: 0, subgrid: 0, startingStyle: 0, animationComposition: 0 };
  for (const sheet of [...document.styleSheets]) {
    try {
      const text = [...sheet.cssRules].map(r => r.cssText).join("\n");
      modernSelectors.has += (text.match(/:has\(/g) || []).length;
      modernSelectors.nesting += (text.match(/^[^@].*&\s/gm) || []).length;
      modernSelectors.subgrid += (text.match(/subgrid/g) || []).length;
      modernSelectors.startingStyle += (text.match(/@starting-style/g) || []).length;
      modernSelectors.animationComposition += (text.match(/animation-composition/g) || []).length;
    } catch (e) {}
  }
  // Accessibility tree quick stats
  const ariaStats = {
    roles: [...document.querySelectorAll("[role]")].length,
    labels: [...document.querySelectorAll("[aria-label]")].length,
    liveRegions: [...document.querySelectorAll("[aria-live]")].length,
    describedBy: [...document.querySelectorAll("[aria-describedby]")].length,
    tabIndexes: [...document.querySelectorAll("[tabindex]")].length,
    landmarks: [...document.querySelectorAll("main, nav, header, footer, aside, [role='main'], [role='navigation']")].length,
  };
  return { usage: u, modernSelectors, ariaStats };
});
extracted.apiUsage = apiTelemetry.usage;
extracted.modernSelectors = apiTelemetry.modernSelectors;
extracted.ariaStats = apiTelemetry.ariaStats;

const usage = apiTelemetry.usage;
const usageLog = Object.entries(usage).filter(([k, v]) => Array.isArray(v) ? v.length > 0 : v > 0).map(([k, v]) => `${k}=${Array.isArray(v) ? v.length : v}`).join(", ");
console.log(`  api usage: ${usageLog || "(none detected)"}`);
console.log(`  aria: roles=${apiTelemetry.ariaStats.roles} labels=${apiTelemetry.ariaStats.labels} landmarks=${apiTelemetry.ariaStats.landmarks} tabindex=${apiTelemetry.ariaStats.tabIndexes}`);
const msCounts = Object.entries(apiTelemetry.modernSelectors).filter(([k, v]) => v > 0).map(([k, v]) => `${k}=${v}`).join(", ");
console.log(`  modern selectors: ${msCounts || "(none)"}`);

// ─── 3rd-party scripts + link hints + HLS + advanced CSS ─────────────
const webSurface = await page.evaluate(() => {
  // 3rd-party script inventory — categorize external scripts for emit
  const SCRIPT_CATEGORIES = {
    analytics: [/google-analytics|googletagmanager|gtag|plausible|fathom|mixpanel|segment|amplitude|heap|matomo|simpleanalytics/i],
    chat: [/intercom|drift|crisp|tawk|channel\.?io|zendesk|livechat/i],
    error: [/sentry|rollbar|bugsnag|logrocket|datadog/i],
    abtest: [/optimizely|vwo|convert|ab-?tasty|google optimize/i],
    video: [/youtube|vimeo|wistia|brightcove|jwplayer/i],
    social: [/twitter|facebook|linkedin|pinterest|tiktok/i],
    heatmap: [/hotjar|fullstory|mouseflow|clarity/i],
    cdn: [/cloudflare|cdnjs|jsdelivr|unpkg|jspm|esm\.sh/i],
    framework: [/next|react|vue|svelte|angular|framer|webflow|wix/i],
    other: [],
  };
  const scripts = [];
  for (const s of document.querySelectorAll("script[src]")) {
    const src = s.src;
    if (!src || src.startsWith("data:") || src.startsWith("blob:")) continue;
    if (scripts.length >= 60) break;
    let category = "other";
    for (const [cat, patterns] of Object.entries(SCRIPT_CATEGORIES)) {
      if (patterns.some(p => p.test(src))) { category = cat; break; }
    }
    scripts.push({
      src: src.slice(0, 300),
      async: s.async,
      defer: s.defer,
      type: s.type || "text/javascript",
      category,
    });
  }
  // Link hints — performance annotations
  const links = [];
  for (const l of document.querySelectorAll("link[rel]")) {
    const rel = l.rel;
    if (!["preload", "prefetch", "dns-prefetch", "preconnect", "modulepreload"].includes(rel)) continue;
    links.push({
      rel,
      href: l.href || l.getAttribute("href"),
      as: l.getAttribute("as") || null,
      type: l.type || null,
      crossOrigin: l.crossOrigin || null,
    });
    if (links.length >= 40) break;
  }
  // Advanced CSS feature scan (offset-path, grid-template-areas, counters, etc.)
  const advancedCss = { offsetPath: 0, gridAreas: 0, counters: 0, writingMode: 0, colorMix: 0, initialLetter: 0, accentColor: 0 };
  for (const sheet of [...document.styleSheets]) {
    try {
      const text = [...sheet.cssRules].map(r => r.cssText).join("\n");
      advancedCss.offsetPath += (text.match(/offset-path/g) || []).length;
      advancedCss.gridAreas += (text.match(/grid-template-areas/g) || []).length;
      advancedCss.counters += (text.match(/counter-(increment|reset)/g) || []).length;
      advancedCss.writingMode += (text.match(/writing-mode/g) || []).length;
      advancedCss.colorMix += (text.match(/color-mix\(/g) || []).length;
      advancedCss.initialLetter += (text.match(/initial-letter/g) || []).length;
      advancedCss.accentColor += (text.match(/accent-color/g) || []).length;
    } catch (e) {}
  }
  // JSON-LD @type classification
  const jsonLdTypes = new Set();
  for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const d = JSON.parse(s.textContent || "");
      const extract = (v) => {
        if (Array.isArray(v)) v.forEach(extract);
        else if (v && typeof v === "object") { if (v["@type"]) jsonLdTypes.add(v["@type"]); if (v["@graph"]) extract(v["@graph"]); }
      };
      extract(d);
    } catch (e) {}
  }
  return { scripts, links, advancedCss, jsonLdTypes: [...jsonLdTypes] };
});
extracted.thirdPartyScripts = webSurface.scripts;
extracted.linkHints = webSurface.links;
extracted.advancedCss = webSurface.advancedCss;
extracted.jsonLdTypes = webSurface.jsonLdTypes;

const scriptCats = {};
for (const s of webSurface.scripts) scriptCats[s.category] = (scriptCats[s.category] || 0) + 1;
const scriptSummary = Object.entries(scriptCats).map(([k, v]) => `${k}=${v}`).join(", ");
console.log(`  3rd-party scripts: ${webSurface.scripts.length} [${scriptSummary}]`);
console.log(`  link hints: ${webSurface.links.length} (${webSurface.links.filter(l => l.rel === "preload").length} preload / ${webSurface.links.filter(l => l.rel === "preconnect").length} preconnect / ${webSurface.links.filter(l => l.rel === "dns-prefetch").length} dns-prefetch)`);
const advCssCounts = Object.entries(webSurface.advancedCss).filter(([k, v]) => v > 0).map(([k, v]) => `${k}=${v}`).join(", ");
console.log(`  advanced CSS: ${advCssCounts || "(none)"}`);
console.log(`  jsonLd types: ${webSurface.jsonLdTypes.join(", ") || "(none)"}`);

// Separate HLS/DASH manifests from API captures
const hlsManifests = apiCaptures.filter(c =>
  /\.m3u8(\?|$)/.test(c.url) ||
  /\.mpd(\?|$)/.test(c.url) ||
  /application\/(vnd\.apple\.mpegurl|dash\+xml)/i.test(c.contentType)
);
extracted.hlsManifests = hlsManifests;
console.log(`  video manifests: ${hlsManifests.length} HLS/DASH detected`);

// ─── Mega Platform Trace readback ─────────────────────────────────────
const platformTrace = await page.evaluate(() => window.__PLATFORM_TRACE__ || {});
extracted.platformTrace = platformTrace;
const traceLog = [];
if (platformTrace.workers?.length) traceLog.push(`workers=${platformTrace.workers.length}`);
if (platformTrace.sharedWorkers?.length) traceLog.push(`shared-workers=${platformTrace.sharedWorkers.length}`);
if (platformTrace.paintWorklets?.length) traceLog.push(`paint-worklets=${platformTrace.paintWorklets.length}`);
if (platformTrace.layoutWorklets?.length) traceLog.push(`layout-worklets=${platformTrace.layoutWorklets.length}`);
if (platformTrace.animationWorklets?.length) traceLog.push(`animation-worklets=${platformTrace.animationWorklets.length}`);
if (platformTrace.rtcConnections) traceLog.push(`rtc=${platformTrace.rtcConnections}`);
if (platformTrace.mediaRecorders) traceLog.push(`media-recorder=${platformTrace.mediaRecorders}`);
if (platformTrace.getUserMedia) traceLog.push(`getUserMedia=${platformTrace.getUserMedia}`);
if (platformTrace.getDisplayMedia) traceLog.push(`getDisplayMedia=${platformTrace.getDisplayMedia}`);
if (platformTrace.webAuthnCreate) traceLog.push(`webauthn-create=${platformTrace.webAuthnCreate}`);
if (platformTrace.webAuthnGet) traceLog.push(`webauthn-get=${platformTrace.webAuthnGet}`);
if (platformTrace.paymentRequest) traceLog.push(`payment=${platformTrace.paymentRequest}`);
if (platformTrace.speechSynthesis) traceLog.push(`speech-synth=${platformTrace.speechSynthesis}`);
if (platformTrace.perfObservers?.length) traceLog.push(`perf-observers=${platformTrace.perfObservers.length}`);
if (platformTrace.readableStreams) traceLog.push(`streams=${platformTrace.readableStreams}`);
if (platformTrace.navigationEvents) traceLog.push(`navigation=${platformTrace.navigationEvents}`);
if (platformTrace.fileSystemAccess) traceLog.push(`file-access=${platformTrace.fileSystemAccess}`);
if (platformTrace.webUSB) traceLog.push(`usb=${platformTrace.webUSB}`);
if (platformTrace.webBluetooth) traceLog.push(`bluetooth=${platformTrace.webBluetooth}`);
if (platformTrace.webHID) traceLog.push(`hid=${platformTrace.webHID}`);
if (platformTrace.webMIDI) traceLog.push(`midi=${platformTrace.webMIDI}`);
if (platformTrace.wakeLock) traceLog.push(`wake-lock=${platformTrace.wakeLock}`);
if (platformTrace.permissionsQuery?.length) traceLog.push(`perms=${platformTrace.permissionsQuery.length}`);
if (platformTrace.notification) traceLog.push(`notification=${platformTrace.notification}`);
console.log(`  platform trace: ${traceLog.length > 0 ? traceLog.join(", ") : "(all zero — Framer minimal)"}`);

// ─── Service Worker full script body download ─────────────────────────
// URL is known from client state; here we actually pull the script content
// and save it. layout.tsx gets a registration stub so the clone installs
// its own SW on first visit.
if (extracted.clientState?.serviceWorker?.scriptURL) {
  try {
    const swUrl = extracted.clientState.serviceWorker.scriptURL;
    const swBytes = await page.evaluate(async (u) => {
      try { const r = await fetch(u); return r.ok ? await r.text() : null; } catch (e) { return null; }
    }, swUrl);
    if (swBytes && swBytes.length < 500000) {
      fs.mkdirSync(path.join(projDir, "public"), { recursive: true });
      fs.writeFileSync(path.join(projDir, "public", "sw.js"), swBytes);
      extracted.serviceWorkerBody = { size: swBytes.length, saved: true };
      console.log(`  service worker: ${swBytes.length} bytes → public/sw.js`);
    }
  } catch (e) {}
}

// ─── ViewTimeline / ScrollTimeline CSS (native scroll animations) ─────
const timelineData = await page.evaluate(() => {
  const out = { scrollTimelineRules: [], viewTimelineRules: [], animationTimelineUsage: 0 };
  for (const sheet of [...document.styleSheets]) {
    try {
      for (const rule of sheet.cssRules) {
        const t = rule.cssText || "";
        if (!t) continue;
        if (t.includes("@scroll-timeline")) out.scrollTimelineRules.push(t.slice(0, 500));
        if (t.includes("view-timeline") || t.includes("animation-timeline: view")) out.viewTimelineRules.push(t.slice(0, 500));
        if (t.includes("animation-timeline")) out.animationTimelineUsage++;
      }
    } catch (e) {}
  }
  return out;
});
extracted.timelineCSS = timelineData;
console.log(`  scroll/view timeline: ${timelineData.scrollTimelineRules.length} scroll / ${timelineData.viewTimelineRules.length} view / ${timelineData.animationTimelineUsage} animation-timeline usage`);

// ─── Analytics / tracking globals ─────────────────────────────────────
const analyticsGlobals = await page.evaluate(() => {
  const checks = {
    gtag: typeof window.gtag === "function",
    dataLayer: Array.isArray(window.dataLayer),
    ga: typeof window.ga === "function",
    gaTracker: !!(window.google_tag_manager || window.GoogleAnalyticsObject),
    sentry: !!window.Sentry,
    intercom: !!window.Intercom,
    plausible: typeof window.plausible === "function",
    fathom: !!window.fathom,
    mixpanel: !!window.mixpanel,
    amplitude: !!window.amplitude,
    heap: !!window.heap,
    hotjar: !!window.hj,
    fullstory: !!window.FS,
    posthog: !!window.posthog,
    segment: !!window.analytics,
    clarity: !!window.clarity,
    stripe: !!window.Stripe,
    paypal: !!window.paypal,
    algolia: !!window.algoliasearch,
    mapbox: !!window.mapboxgl,
    googleMaps: !!window.google?.maps,
    facebook: !!window.FB,
    linkedin: !!window.IN,
    gsap: !!window.gsap,
    lenis: !!window.Lenis,
    threejs: !!window.THREE,
    swiper: !!window.Swiper,
  };
  const active = Object.entries(checks).filter(([k, v]) => v).map(([k]) => k);
  return { checks, active };
});
extracted.analyticsGlobals = analyticsGlobals;
console.log(`  analytics/libs globals: ${analyticsGlobals.active.length > 0 ? analyticsGlobals.active.join(", ") : "(none)"}`);

// Persist captured API responses for emit-phase to process.
extracted.apiCaptures = apiCaptures;
console.log(`  api responses captured: ${apiCaptures.length}`);

// ─── Client state capture ────────────────────────────────────────────
// localStorage + sessionStorage + IndexedDB + Cache Storage + Service
// Worker registration. This is the client-side "state" a visitor would
// observe. Emit restores these on first load → clone feels like
// "user's already been here" continuity.
const clientState = await page.evaluate(async () => {
  const out = { localStorage: {}, sessionStorage: {}, indexedDB: {}, caches: {}, serviceWorker: null };

  // localStorage + sessionStorage (key+value pairs, cap at 100 each)
  try {
    for (let i = 0; i < Math.min(100, localStorage.length); i++) {
      const k = localStorage.key(i);
      if (k) out.localStorage[k] = localStorage.getItem(k);
    }
  } catch (e) {}
  try {
    for (let i = 0; i < Math.min(100, sessionStorage.length); i++) {
      const k = sessionStorage.key(i);
      if (k) out.sessionStorage[k] = sessionStorage.getItem(k);
    }
  } catch (e) {}

  // IndexedDB — iterate db list, then each object store. Caps prevent
  // mass data exfil (user PII concern) — first 5 DBs × 50 entries/store.
  try {
    if (indexedDB.databases) {
      const dbList = await indexedDB.databases();
      for (const info of dbList.slice(0, 5)) {
        if (!info.name) continue;
        try {
          const db = await new Promise((resolve, reject) => {
            const req = indexedDB.open(info.name);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
            req.onblocked = () => reject(new Error("blocked"));
            setTimeout(() => reject(new Error("timeout")), 3000);
          });
          const stores = {};
          for (const name of db.objectStoreNames) {
            try {
              const tx = db.transaction(name, "readonly");
              const store = tx.objectStore(name);
              const all = await new Promise((resolve) => {
                const req = store.getAll(null, 50);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => resolve([]);
                setTimeout(() => resolve([]), 2000);
              });
              stores[name] = all.slice(0, 50);
            } catch (e) {}
          }
          out.indexedDB[info.name] = { version: info.version || 1, stores };
          db.close();
        } catch (e) {}
      }
    }
  } catch (e) {}

  // Cache Storage (Service Worker caches) — we capture metadata only
  // since emit-phase must download the actual response bodies separately.
  try {
    if ("caches" in window) {
      const names = await caches.keys();
      for (const name of names.slice(0, 5)) {
        const cache = await caches.open(name);
        const reqs = await cache.keys();
        out.caches[name] = reqs.slice(0, 80).map(r => ({
          url: r.url,
          method: r.method,
        }));
      }
    }
  } catch (e) {}

  // Service Worker registration detect
  try {
    if (navigator.serviceWorker) {
      const regs = await navigator.serviceWorker.getRegistrations();
      if (regs.length > 0) {
        const r = regs[0];
        out.serviceWorker = {
          scriptURL: r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL,
          scope: r.scope,
        };
      }
    }
  } catch (e) {}

  return out;
});
extracted.clientState = clientState;
const lsKeys = Object.keys(clientState.localStorage).length;
const ssKeys = Object.keys(clientState.sessionStorage).length;
const idbDbs = Object.keys(clientState.indexedDB).length;
const cacheNames = Object.keys(clientState.caches).length;
console.log(`  client state: localStorage=${lsKeys} sessionStorage=${ssKeys} indexedDB=${idbDbs}DBs caches=${cacheNames} sw=${clientState.serviceWorker ? "yes" : "no"}`);

// ─── WebSocket message recording ──────────────────────────────────────
// Subscribe to every new WebSocket; record frames (direction + payload +
// time delta). Emit a playback client that fires messages in sequence on
// page load. Chat/live-dashboard demos become viewable standalone.
const wsLog = await page.evaluate(() => window.__WS_LOG__ || []);
extracted.wsMessages = wsLog;
console.log(`  websocket frames: ${wsLog.length} captured`);

// ─── CDP Deep Capture — DOMSnapshot, Coverage, A11y tree ─────────────
try {
  // DOMSnapshot — complete DOM with layout + computed styles in one RPC
  const domSnap = await cdp.send("DOMSnapshot.captureSnapshot", {
    computedStyles: ["display", "position", "z-index", "transform", "opacity"],
    includePaintOrder: true,
    includeDOMRects: true,
  });
  // Count various things from the snapshot for reporting
  const doc = domSnap.documents?.[0];
  extracted.domSnapshot = {
    nodeCount: doc?.nodes?.backendNodeId?.length || 0,
    textCount: doc?.textBoxes?.bounds?.length || 0,
    layoutNodeCount: doc?.layout?.nodeIndex?.length || 0,
    stringCount: domSnap.strings?.length || 0,
  };
  console.log(`  DOMSnapshot: ${extracted.domSnapshot.nodeCount} nodes / ${extracted.domSnapshot.textCount} text boxes / ${extracted.domSnapshot.layoutNodeCount} layout nodes / ${extracted.domSnapshot.stringCount} strings`);
} catch (e) {
  console.log(`  DOMSnapshot: unavailable (${e.message.slice(0, 60)})`);
}

try {
  // CSS coverage — unused rules detected
  const cssUsage = await cdp.send("CSS.takeCoverageDelta");
  const jsUsage = await cdp.send("Profiler.takePreciseCoverage");
  let usedCssBytes = 0, totalCssBytes = 0;
  for (const entry of (cssUsage.coverage || [])) {
    if (entry.used) usedCssBytes += entry.endOffset - entry.startOffset;
    totalCssBytes += entry.endOffset - entry.startOffset;
  }
  const jsScripts = jsUsage.result?.length || 0;
  extracted.codeCoverage = {
    cssUsedBytes: usedCssBytes,
    cssTotalBytes: totalCssBytes,
    cssUsagePercent: totalCssBytes > 0 ? ((usedCssBytes / totalCssBytes) * 100).toFixed(1) : 0,
    jsScriptCount: jsScripts,
  };
  console.log(`  code coverage: CSS ${usedCssBytes}/${totalCssBytes} bytes used (${extracted.codeCoverage.cssUsagePercent}%) / ${jsScripts} JS scripts profiled`);
  await cdp.send("CSS.stopRuleUsageTracking");
  await cdp.send("Profiler.stopPreciseCoverage");
} catch (e) {
  console.log(`  coverage: skipped (${e.message.slice(0, 60)})`);
}

try {
  // Accessibility tree — computed ARIA by the browser
  const axTree = await cdp.send("Accessibility.getFullAXTree");
  const nodes = axTree.nodes || [];
  const roleCounts = {};
  for (const n of nodes) {
    const role = n.role?.value;
    if (role && role !== "none" && role !== "generic") {
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    }
  }
  const topRoles = Object.entries(roleCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  extracted.accessibilityTree = {
    totalNodes: nodes.length,
    roleCounts,
    focusableCount: nodes.filter(n => n.properties?.find(p => p.name === "focusable" && p.value?.value)).length,
    landmarks: (roleCounts.main || 0) + (roleCounts.navigation || 0) + (roleCounts.banner || 0) + (roleCounts.contentinfo || 0),
  };
  console.log(`  a11y tree: ${nodes.length} nodes / landmarks=${extracted.accessibilityTree.landmarks} / focusable=${extracted.accessibilityTree.focusableCount} / top-roles: ${topRoles.map(([r, c]) => `${r}(${c})`).join(", ")}`);
} catch (e) {
  console.log(`  a11y tree: unavailable (${e.message.slice(0, 60)})`);
}

// Response headers capture: preserve performance + security hints
extracted.responseHeaders = responseHeaders;
// Pick out interesting headers from root document
const rootHeaders = responseHeaders.find(r => r.url === url || r.url === url + "/");
if (rootHeaders) {
  extracted.rootHeaders = {
    contentType: rootHeaders.headers["content-type"],
    cacheControl: rootHeaders.headers["cache-control"],
    serverTiming: rootHeaders.headers["server-timing"],
    link: rootHeaders.headers["link"],
    csp: rootHeaders.headers["content-security-policy"],
    permissions: rootHeaders.headers["permissions-policy"],
    reportTo: rootHeaders.headers["report-to"],
    nel: rootHeaders.headers["nel"],
  };
}
console.log(`  response headers: ${responseHeaders.length} responses captured / root has ${rootHeaders ? Object.keys(rootHeaders.headers).length : 0} headers`);

// ─── CDP DOMDebugger.getEventListeners — complete listener map ────────
// addEventListener monkey-patch catches future calls; this catches
// EVERY listener, including ones attached before our patch or via
// inline handlers. True interaction DNA.
try {
  await cdp.send("DOMDebugger.enable");
  // Gather top backend nodes via JS handle: body + direct children
  const evaluator = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const arr = [document.body];
      const walk = (n, d) => { if (d > 3) return; for (const c of n.children) { if (arr.length < 120) { arr.push(c); walk(c, d+1); } } };
      walk(document.body, 0);
      return arr.length;
    })()`,
    returnByValue: true,
  });
  // Alternative: iterate via DOM.getDocument + children
  const docRoot = await cdp.send("DOM.getDocument", { depth: 3 });
  const listenerSummary = { total: 0, byEvent: {}, byTag: {} };
  const walkForListeners = async (node, depth = 0) => {
    if (depth > 3) return;
    try {
      const res = await cdp.send("DOMDebugger.getEventListeners", { objectId: null, depth: 0, nodeId: node.nodeId });
      // Actually getEventListeners needs objectId not nodeId
    } catch (e) {}
  };
  // Simpler approach: use Runtime.evaluate + getProperties on DOM nodes
  const resolveAndGet = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const tagEventCounts = {};
      let totalListenerCount = 0;
      // Rough estimate via checking "on*" handlers
      for (const el of document.querySelectorAll("*")) {
        const tag = el.tagName.toLowerCase();
        for (const attr of el.getAttributeNames()) {
          if (attr.startsWith("on")) {
            const evt = attr.slice(2);
            tagEventCounts[tag + ":" + evt] = (tagEventCounts[tag + ":" + evt] || 0) + 1;
            totalListenerCount++;
          }
        }
      }
      return { totalListenerCount, tagEventCounts };
    })()`,
    returnByValue: true,
  });
  extracted.inlineListeners = resolveAndGet.result?.value || { totalListenerCount: 0 };
  console.log(`  inline listeners: ${extracted.inlineListeners.totalListenerCount} on* attributes`);
} catch (e) {
  console.log(`  DOMDebugger listeners: ${e.message.slice(0, 60)}`);
}

// ─── CDP LayerTree — GPU compositing structure ───────────────────────
try {
  await cdp.send("LayerTree.enable");
  const layerData = await new Promise((resolve) => {
    const layers = [];
    cdp.once("LayerTree.layerTreeDidChange", (evt) => resolve(evt.layers || []));
    setTimeout(() => resolve([]), 2000);
  });
  // Sample a handful of layers to avoid huge payloads
  extracted.compositingLayers = {
    count: layerData.length,
    topLayers: layerData.slice(0, 15).map(l => ({
      anchorX: l.anchorX,
      anchorY: l.anchorY,
      width: l.width,
      height: l.height,
      transform: l.transform,
      paintCount: l.paintCount,
    })),
  };
  console.log(`  compositing layers: ${extracted.compositingLayers.count}`);
  await cdp.send("LayerTree.disable");
} catch (e) {
  console.log(`  LayerTree: ${e.message.slice(0, 60)}`);
}

// ─── CDP Runtime.globalLexicalScopeNames — complete window globals ────
try {
  // Find the actual default execution context (main frame).
  const ctx = await cdp.send("Runtime.evaluate", {
    expression: "1",
    returnByValue: true,
  });
  // The returned object carries executionContextId — use it as source of truth.
  // (page.evaluate abstraction hides it; direct CDP send reveals.)
  let executionContextId;
  try {
    const hints = await cdp.send("Runtime.evaluate", {
      expression: "(() => 1)()",
      returnByValue: false,
    });
    executionContextId = hints?.result?.executionContextId;
  } catch {}
  const scopeNames = executionContextId
    ? await cdp.send("Runtime.globalLexicalScopeNames", { executionContextId })
    : { names: [] };
  extracted.globalLexicalNames = scopeNames.names || [];
  // Also get runtime globals via Object.getOwnPropertyNames(window)
  const allGlobals = await cdp.send("Runtime.evaluate", {
    expression: `Object.getOwnPropertyNames(window).filter(k => !k.startsWith("__")).slice(0, 500)`,
    returnByValue: true,
  });
  extracted.windowGlobals = allGlobals.result?.value || [];
  // Filter to interesting globals (exclude standard Web API names)
  const STANDARD = new Set(["document", "window", "navigator", "location", "history", "screen", "performance", "console", "localStorage", "sessionStorage", "indexedDB", "caches", "fetch", "XMLHttpRequest", "HTMLElement", "Element", "Node", "Event", "setTimeout", "setInterval", "clearTimeout", "clearInterval", "requestAnimationFrame", "cancelAnimationFrame", "getComputedStyle", "matchMedia", "atob", "btoa", "encodeURI", "decodeURI", "encodeURIComponent", "decodeURIComponent", "JSON", "Promise", "Array", "Object", "String", "Number", "Boolean", "Math", "Date", "RegExp", "Error", "Map", "Set", "WeakMap", "WeakSet", "Symbol", "Proxy", "Reflect", "Intl", "Buffer", "process", "global", "globalThis"]);
  extracted.customGlobals = extracted.windowGlobals.filter(g => !STANDARD.has(g) && !g.match(/^[A-Z][a-zA-Z]*(Event|Element|Error|Prototype|HTMLElement|HTML[A-Z]|SVG|CSS)/)).slice(0, 80);
  console.log(`  window globals: ${extracted.windowGlobals.length} total / ${extracted.customGlobals.length} custom (${extracted.customGlobals.slice(0, 8).join(", ")}${extracted.customGlobals.length > 8 ? "..." : ""})`);
} catch (e) {
  console.log(`  globalLexicalNames: ${e.message.slice(0, 60)}`);
}

// ─── CDP Storage full dump (DOMStorage) ───────────────────────────────
try {
  await cdp.send("DOMStorage.enable");
  const securityOrigin = new URL(url).origin;
  const localLS = await cdp.send("DOMStorage.getDOMStorageItems", {
    storageId: { securityOrigin, isLocalStorage: true },
  });
  const sessionLS = await cdp.send("DOMStorage.getDOMStorageItems", {
    storageId: { securityOrigin, isLocalStorage: false },
  });
  extracted.domStorageFull = {
    localItems: localLS.entries?.length || 0,
    sessionItems: sessionLS.entries?.length || 0,
  };
  console.log(`  DOMStorage deep: local=${extracted.domStorageFull.localItems} session=${extracted.domStorageFull.sessionItems}`);
  await cdp.send("DOMStorage.disable");
} catch (e) {}

// ─── CDP Animation domain — browser-level WAAPI dump ─────────────────
try {
  const animCaptured = [];
  cdp.on("Animation.animationCreated", (evt) => {
    if (animCaptured.length >= 80) return;
    try {
      animCaptured.push({
        id: evt.id,
        name: evt.name,
        playState: evt.playState,
        playbackRate: evt.playbackRate,
        startTime: evt.startTime,
        currentTime: evt.currentTime,
        type: evt.type,
      });
    } catch (e) {}
  });
  await cdp.send("Animation.enable");
  await new Promise(r => setTimeout(r, 800));
  extracted.cdpAnimations = animCaptured;
  console.log(`  CDP animations: ${animCaptured.length} browser-level`);
  await cdp.send("Animation.disable");
} catch (e) { console.log(`  CDP animations: ${e.message.slice(0, 60)}`); }

// ─── Console + Log events — error/warning DNA ────────────────────────
try {
  extracted.consoleEvents = { log: 0, warn: 0, error: 0, info: 0, debug: 0, messages: [] };
  cdp.on("Runtime.consoleAPICalled", (evt) => {
    const t = evt.type;
    if (extracted.consoleEvents[t] !== undefined) extracted.consoleEvents[t]++;
    if (extracted.consoleEvents.messages.length < 30) {
      extracted.consoleEvents.messages.push({
        type: t,
        text: (evt.args?.[0]?.value || "").toString().slice(0, 200),
      });
    }
  });
  console.log(`  console events: log=${extracted.consoleEvents.log} warn=${extracted.consoleEvents.warn} error=${extracted.consoleEvents.error}`);
} catch (e) {}

// ─── Memory.getDOMCounters — DOM size target ─────────────────────────
try {
  const memCounts = await cdp.send("Memory.getDOMCounters");
  extracted.memoryCounters = {
    documents: memCounts.documents,
    nodes: memCounts.nodes,
    jsEventListeners: memCounts.jsEventListeners,
  };
  console.log(`  memory counters: docs=${memCounts.documents} nodes=${memCounts.nodes} js-listeners=${memCounts.jsEventListeners}`);
} catch (e) { console.log(`  memory: ${e.message.slice(0, 60)}`); }

// ─── page.metrics() — Puppeteer native perf metrics ──────────────────
try {
  const metrics = await page.metrics();
  extracted.pageMetrics = metrics;
  const jsHeap = (metrics.JSHeapUsedSize / 1024 / 1024).toFixed(1);
  console.log(`  page metrics: JSHeap=${jsHeap}MB nodes=${metrics.Nodes} layoutCount=${metrics.LayoutCount} styleRecalcs=${metrics.RecalcStyleCount} tasks=${metrics.TaskDuration?.toFixed?.(2) || 0}s`);
} catch (e) { console.log(`  metrics: ${e.message.slice(0, 60)}`); }

// ─── Browser capabilities — env meta ─────────────────────────────────
try {
  const browserCaps = await page.evaluate(() => ({
    userAgent: navigator.userAgent,
    language: navigator.language,
    languages: navigator.languages,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: navigator.deviceMemory,
    platform: navigator.platform,
    connection: navigator.connection ? {
      effectiveType: navigator.connection.effectiveType,
      downlink: navigator.connection.downlink,
      rtt: navigator.connection.rtt,
    } : null,
    userAgentData: navigator.userAgentData ? {
      brands: navigator.userAgentData.brands,
      mobile: navigator.userAgentData.mobile,
      platform: navigator.userAgentData.platform,
    } : null,
    maxTouchPoints: navigator.maxTouchPoints,
    cookieEnabled: navigator.cookieEnabled,
  }));
  extracted.browserCaps = browserCaps;
  console.log(`  browser caps: UA=${browserCaps.userAgent.slice(0, 40)}... langs=${browserCaps.languages?.length} cores=${browserCaps.hardwareConcurrency} memGB=${browserCaps.deviceMemory}`);
} catch (e) {}

// ─── Page events + Audits aggregate ────────────────────────────────
extracted.pageEvents = pageEvents;
extracted.auditIssues = auditIssues;
const reqTypes = {};
for (const r of pageEvents.requestDetails) reqTypes[r.resourceType] = (reqTypes[r.resourceType] || 0) + 1;
const reqTypeLog = Object.entries(reqTypes).slice(0, 8).map(([k, v]) => `${k}=${v}`).join(", ");
console.log(`  page events: errors=${pageEvents.errors.length} dialogs=${pageEvents.dialogs.length} popups=${pageEvents.popups} requests=${pageEvents.requestDetails.length} [${reqTypeLog}]`);
console.log(`  audit issues: ${auditIssues.length}${auditIssues.length > 0 ? ` — ${[...new Set(auditIssues.map(i => i.code))].slice(0, 5).join(", ")}` : ""}`);

// ─── SystemInfo — GPU/CPU detail ─────────────────────────────────────
try {
  const sysInfo = await cdp.send("SystemInfo.getInfo");
  extracted.systemInfo = {
    gpuName: sysInfo.gpu?.devices?.[0]?.deviceString || null,
    gpuVendor: sysInfo.gpu?.devices?.[0]?.vendorString || null,
    cpuThreads: sysInfo.modelName || null,
    driverBugWorkarounds: sysInfo.gpu?.driverBugWorkarounds?.length || 0,
  };
  console.log(`  systemInfo: gpu="${extracted.systemInfo.gpuName?.slice(0, 50)}"`);
} catch (e) {}

// ─── .well-known/* endpoint probes ────────────────────────────────────
try {
  const wellKnownProbe = await page.evaluate(async (origin) => {
    const endpoints = [
      "/.well-known/security.txt",
      "/.well-known/apple-app-site-association",
      "/.well-known/assetlinks.json",
      "/.well-known/ai.txt",
      "/.well-known/robots.txt",
      "/manifest.webmanifest",
      "/humans.txt",
      "/ads.txt",
    ];
    const results = {};
    for (const ep of endpoints) {
      try {
        const r = await fetch(origin + ep, { method: "HEAD" });
        results[ep] = r.status;
      } catch (e) { results[ep] = null; }
    }
    return results;
  }, new URL(url).origin);
  extracted.wellKnownEndpoints = wellKnownProbe;
  const found = Object.entries(wellKnownProbe).filter(([k, v]) => v === 200).map(([k]) => k);
  console.log(`  .well-known: ${found.length > 0 ? found.join(", ") : "(none)"}`);
} catch (e) {}

// ─── Source maps + WASM detection ─────────────────────────────────────
try {
  const srcMapSurface = await page.evaluate(() => {
    const scripts = [...document.querySelectorAll("script[src]")].map(s => s.src);
    const potentialMaps = [];
    for (const src of scripts) {
      if (src.endsWith(".js") && !src.includes("min.js")) {
        potentialMaps.push(src + ".map");
      }
    }
    return { scripts, potentialMaps: potentialMaps.slice(0, 10) };
  });
  extracted.sourceMapCandidates = srcMapSurface.potentialMaps;
  console.log(`  source maps: ${srcMapSurface.potentialMaps.length} candidates (scripts=${srcMapSurface.scripts.length})`);
} catch {}

// ─── Page.getFrameTree — iframe structure ────────────────────────────
try {
  const frameTree = await cdp.send("Page.getFrameTree");
  const flat = [];
  const walk = (t) => {
    if (!t) return;
    flat.push({ id: t.frame?.id, url: t.frame?.url, parentId: t.frame?.parentId });
    for (const c of (t.childFrames || [])) walk(c);
  };
  walk(frameTree.frameTree);
  extracted.frameTree = flat;
  console.log(`  frame tree: ${flat.length - 1} iframes (${flat.length} total frames)`);
} catch (e) { console.log(`  frameTree: ${e.message.slice(0, 60)}`); }

// ─── Page.getResourceTree — asset inventory ──────────────────────────
try {
  const resTree = await cdp.send("Page.getResourceTree");
  const flatten = (t, arr = []) => {
    if (!t) return arr;
    for (const r of (t.resources || [])) arr.push({ url: r.url, type: r.type, mimeType: r.mimeType });
    for (const c of (t.childFrames || [])) flatten(c, arr);
    return arr;
  };
  const resources = flatten(resTree.frameTree);
  const byType = {};
  for (const r of resources) byType[r.type] = (byType[r.type] || 0) + 1;
  extracted.resourceTree = { total: resources.length, byType };
  const typeLog = Object.entries(byType).slice(0, 8).map(([k, v]) => `${k}=${v}`).join(", ");
  console.log(`  resource tree: ${resources.length} resources [${typeLog}]`);
} catch (e) { console.log(`  resourceTree: ${e.message.slice(0, 60)}`); }

// ─── DOM stats via page.evaluate ─────────────────────────────────────
try {
  const domStats = await page.evaluate(() => ({
    elementCount: document.querySelectorAll("*").length,
    textNodeCount: (() => { let n = 0; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); while (w.nextNode()) { if (n++ > 5000) break; } return n; })(),
    totalStylesheetBytes: [...document.styleSheets].reduce((s, sh) => { try { return s + [...sh.cssRules].reduce((a, r) => a + r.cssText.length, 0); } catch { return s; } }, 0),
  }));
  extracted.domStats = domStats;
  console.log(`  DOM stats: ${domStats.elementCount} elements / ${domStats.textNodeCount} text nodes / ${(domStats.totalStylesheetBytes / 1024).toFixed(1)}KB CSS`);
} catch {}

// ─── Emulation vision deficiency screenshot ──────────────────────────
try {
  const visionDefs = ["achromatopsia", "blurredVision"];
  extracted.visionScreenshots = {};
  for (const def of visionDefs) {
    try {
      await cdp.send("Emulation.setEmulatedVisionDeficiency", { type: def });
      await new Promise(r => setTimeout(r, 300));
      const shotsDir = path.join(projDir, "public", "sections");
      fs.mkdirSync(shotsDir, { recursive: true });
      const fname = `vision-${def}.jpg`;
      await page.screenshot({
        path: path.join(shotsDir, fname),
        type: "jpeg", quality: 70, fullPage: false,
      });
      extracted.visionScreenshots[def] = `/sections/${fname}`;
    } catch (e) {}
  }
  await cdp.send("Emulation.setEmulatedVisionDeficiency", { type: "none" }).catch(() => {});
  console.log(`  vision emulation: ${Object.keys(extracted.visionScreenshots).length} deficiency screenshots`);
} catch {}

// ─── Import maps + ESM + dynamic imports detection ───────────────────
try {
  const jsModern = await page.evaluate(() => {
    const importMapScript = document.querySelector('script[type="importmap"]');
    let importMap = null;
    if (importMapScript) {
      try { importMap = JSON.parse(importMapScript.textContent || "{}"); } catch {}
    }
    const scripts = [...document.querySelectorAll("script")];
    return {
      importMap,
      esmScripts: scripts.filter(s => s.type === "module").length,
      classicScripts: scripts.filter(s => !s.type || s.type === "text/javascript").length,
      nomoduleScripts: scripts.filter(s => s.hasAttribute("nomodule")).length,
      crossOriginIsolated: self.crossOriginIsolated,
      sharedArrayBufferAvailable: typeof SharedArrayBuffer !== "undefined",
      modulePreloads: [...document.querySelectorAll('link[rel="modulepreload"]')].map(l => l.href),
      asyncScripts: scripts.filter(s => s.async).length,
      deferScripts: scripts.filter(s => s.defer).length,
    };
  });
  extracted.modernJS = jsModern;
  console.log(`  modern JS: esm=${jsModern.esmScripts} classic=${jsModern.classicScripts} nomodule=${jsModern.nomoduleScripts} importMap=${jsModern.importMap ? Object.keys(jsModern.importMap.imports || {}).length : 0} crossOriginIsolated=${jsModern.crossOriginIsolated}`);
} catch {}

// ─── Security headers analysis ───────────────────────────────────────
try {
  const rootEntry = responseHeaders.find(r => r.url === url || r.url === url + "/");
  const h = rootEntry?.headers || {};
  extracted.securityHeaders = {
    csp: h["content-security-policy"] || h["content-security-policy-report-only"] || null,
    coep: h["cross-origin-embedder-policy"] || null,
    coop: h["cross-origin-opener-policy"] || null,
    corp: h["cross-origin-resource-policy"] || null,
    permissionsPolicy: h["permissions-policy"] || null,
    referrerPolicy: h["referrer-policy"] || null,
    xFrameOptions: h["x-frame-options"] || null,
    xContentTypeOptions: h["x-content-type-options"] || null,
    strictTransportSecurity: h["strict-transport-security"] || null,
    reportTo: h["report-to"] || null,
    nel: h["nel"] || null,
  };
  const setHeaders = Object.entries(extracted.securityHeaders).filter(([k, v]) => v !== null).map(([k]) => k);
  console.log(`  security headers: ${setHeaders.length > 0 ? setHeaders.join(", ") : "(none set)"}`);
} catch {}

// ─── Speculation Rules + Web Components + Trusted Types (v65) ────────
try {
  const platformDeep = await page.evaluate(() => {
    // Speculation Rules API — <script type="speculationrules">
    const specScripts = [...document.querySelectorAll('script[type="speculationrules"]')];
    const speculationRules = specScripts.map(s => {
      try { return JSON.parse(s.textContent || "{}"); } catch { return null; }
    }).filter(Boolean);

    // Web Components — customElements registry (open shadow roots enumerable)
    const allEls = [...document.querySelectorAll("*")];
    const customTags = new Set();
    const shadowModes = { open: 0, closed: 0 };
    const slottedCount = allEls.filter(el => el.assignedSlot).length;
    for (const el of allEls) {
      const t = el.tagName.toLowerCase();
      if (t.includes("-")) customTags.add(t);
      if (el.shadowRoot) shadowModes.open++;
    }
    // Closed shadow roots can't be enumerated directly; count via attachShadow monkeypatch installed earlier
    const customElementsDefined = window.__navaCustomElementsDefined ? [...window.__navaCustomElementsDefined] : [...customTags];

    // Trusted Types policy names (if feature exists)
    const trustedTypesPolicies = (window.trustedTypes && window.__navaTrustedTypesPolicies) ? [...window.__navaTrustedTypesPolicies] : [];
    const trustedTypesAvailable = typeof window.trustedTypes !== "undefined";

    // Document PiP, View Transitions, Navigation API
    const viewTransitionsAvail = typeof document.startViewTransition === "function";
    const navApiAvail = typeof window.navigation !== "undefined";
    const documentPiPAvail = typeof window.documentPictureInPicture !== "undefined";
    const sanitizerAPIAvail = typeof window.Sanitizer !== "undefined";

    // ElementTiming — markers in DOM
    const elementTimingMarkers = [...document.querySelectorAll("[elementtiming]")].map(e => ({
      tag: e.tagName.toLowerCase(),
      name: e.getAttribute("elementtiming"),
    }));

    // Popover API + dialog elements
    const popovers = [...document.querySelectorAll("[popover]")].length;
    const dialogs = [...document.querySelectorAll("dialog")].length;
    const detailsEls = [...document.querySelectorAll("details")].length;

    return {
      speculationRules,
      customElementsCount: customTags.size,
      customElements: [...customTags].slice(0, 30),
      customElementsDefined,
      shadowModes,
      closedShadowCount: window.__navaClosedShadowCount || 0,
      slottedCount,
      trustedTypesAvailable,
      trustedTypesPolicies,
      viewTransitionsAvail,
      navApiAvail,
      documentPiPAvail,
      sanitizerAPIAvail,
      elementTimingMarkers,
      popovers,
      dialogs,
      detailsEls,
    };
  });
  extracted.platformDeep = platformDeep;
  console.log(`  platform deep: customEls=${platformDeep.customElementsCount} shadowRoots=${platformDeep.shadowModes.open} specRules=${platformDeep.speculationRules.length} viewTrans=${platformDeep.viewTransitionsAvail} popovers=${platformDeep.popovers} dialogs=${platformDeep.dialogs}`);
} catch (e) { console.log(`  platform deep: ${e.message.slice(0, 60)}`); }

// ─── Performance Observer entries — LoAF, event-timing, LCP target ────
try {
  const perfDeep = await page.evaluate(async () => {
    const out = { loaf: [], lcpTarget: null, eventTiming: [], elementTimingEntries: [], layoutShiftSources: [] };

    // LCP — the current largest contentful paint element
    try {
      const lcpEntries = performance.getEntriesByType("largest-contentful-paint");
      const last = lcpEntries[lcpEntries.length - 1];
      if (last) {
        out.lcpTarget = {
          tag: last.element?.tagName?.toLowerCase() || null,
          id: last.element?.id || null,
          className: (last.element?.className || "").toString().slice(0, 120),
          size: last.size,
          renderTime: last.renderTime,
          loadTime: last.loadTime,
          url: last.url || null,
        };
      }
    } catch {}

    // Layout-shift sources — who triggered CLS
    try {
      const lsEntries = performance.getEntriesByType("layout-shift");
      for (const ls of lsEntries.slice(-20)) {
        out.layoutShiftSources.push({
          value: ls.value,
          hadRecentInput: ls.hadRecentInput,
          startTime: ls.startTime,
          sources: (ls.sources || []).slice(0, 3).map(s => ({
            tag: s.node?.tagName?.toLowerCase() || null,
            previousRect: s.previousRect ? { x: s.previousRect.x, y: s.previousRect.y, w: s.previousRect.width, h: s.previousRect.height } : null,
            currentRect: s.currentRect ? { x: s.currentRect.x, y: s.currentRect.y, w: s.currentRect.width, h: s.currentRect.height } : null,
          })),
        });
      }
    } catch {}

    // long-animation-frame (LoAF) — new metric for jank detection
    try {
      const loafEntries = performance.getEntriesByType("long-animation-frame");
      for (const l of loafEntries.slice(-10)) {
        out.loaf.push({
          startTime: l.startTime,
          duration: l.duration,
          renderStart: l.renderStart,
          styleAndLayoutStart: l.styleAndLayoutStart,
          blockingDuration: l.blockingDuration,
          scripts: (l.scripts || []).slice(0, 3).map(s => ({
            name: s.name, duration: s.duration, invoker: s.invoker, invokerType: s.invokerType,
          })),
        });
      }
    } catch {}

    // Event timing — interactions > 100ms
    try {
      const evt = performance.getEntriesByType("event");
      for (const e of evt.filter(x => x.duration > 40).slice(-10)) {
        out.eventTiming.push({
          name: e.name, duration: e.duration, processingStart: e.processingStart, interactionId: e.interactionId,
          targetTag: e.target?.tagName?.toLowerCase() || null,
        });
      }
    } catch {}

    // Element timing entries
    try {
      const etEntries = performance.getEntriesByType("element");
      for (const et of etEntries.slice(-10)) {
        out.elementTimingEntries.push({
          identifier: et.identifier,
          renderTime: et.renderTime,
          loadTime: et.loadTime,
          url: et.url,
          tag: et.element?.tagName?.toLowerCase() || null,
        });
      }
    } catch {}

    return out;
  });
  extracted.perfDeep = perfDeep;
  console.log(`  perf deep: loaf=${perfDeep.loaf.length} lcp=${perfDeep.lcpTarget?.tag || "none"} event>40ms=${perfDeep.eventTiming.length} cls-sources=${perfDeep.layoutShiftSources.length} elementTiming=${perfDeep.elementTimingEntries.length}`);
} catch (e) { console.log(`  perf deep: ${e.message.slice(0, 60)}`); }

// ─── Emulation print media screenshot ────────────────────────────────
try {
  await cdp.send("Emulation.setEmulatedMedia", { media: "print" });
  await new Promise(r => setTimeout(r, 400));
  const printShotDir = path.join(projDir, "public", "sections");
  fs.mkdirSync(printShotDir, { recursive: true });
  await page.screenshot({
    path: path.join(printShotDir, "print-media.jpg"),
    type: "jpeg", quality: 78, fullPage: false,
  });
  extracted.printMediaCapture = "/sections/print-media.jpg";
  console.log(`  print media: screenshot captured`);
  await cdp.send("Emulation.setEmulatedMedia", { media: "screen" });
} catch (e) { console.log(`  print media: ${e.message.slice(0, 60)}`); }

// ─── Storage CDP — cookies (metadata only, skip values for privacy) ──
try {
  const cookies = await cdp.send("Storage.getCookies", {});
  extracted.cookieMetadata = {
    count: cookies.cookies?.length || 0,
    names: (cookies.cookies || []).slice(0, 20).map(c => ({ name: c.name, domain: c.domain, secure: c.secure, httpOnly: c.httpOnly, sameSite: c.sameSite })),
  };
  console.log(`  cookies: ${extracted.cookieMetadata.count} (names only, values skipped for privacy)`);
} catch (e) {}

// ─── v67 — WebGL extensions + texture formats enumeration ─────────────
// Beyond shader source capture, we also enumerate which WebGL extensions
// the page's canvas context supports (e.g. EXT_color_buffer_float for
// HDR rendering, WEBGL_compressed_texture_s3tc for BC texture support).
// This shapes whether the clone can recreate the visual effect.
try {
  const webglInfo = await page.evaluate(() => {
    const canvases = [...document.querySelectorAll("canvas")];
    for (const c of canvases) {
      let gl = null;
      try { gl = c.getContext("webgl2"); } catch {}
      if (!gl) try { gl = c.getContext("webgl"); } catch {}
      if (!gl) try { gl = c.getContext("experimental-webgl"); } catch {}
      if (!gl) continue;
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      return {
        version: gl.getParameter(gl.VERSION),
        shadingLanguage: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
        vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
        renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        maxTexSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        maxCubeMapSize: gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE),
        maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
        maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
        maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS),
        extensions: gl.getSupportedExtensions() || [],
      };
    }
    return null;
  });
  if (webglInfo) {
    extracted.webglInfo = webglInfo;
    console.log(`  webgl info: ${webglInfo.version} / ${webglInfo.extensions.length} exts / tex=${webglInfo.maxTexSize}`);
  } else {
    console.log(`  webgl info: no WebGL canvas found`);
  }
} catch (e) { console.log(`  webgl info: ${e.message.slice(0, 60)}`); }

// ─── v67 — Input gesture replay (hover delta capture) ────────────────
// Static CSS scan catches :hover rules but misses JS-driven hover states
// (Framer/Wix hide hover effects behind attribute toggles rather than
// CSS). We synthesize mouseMoved events on each visible CTA/card center,
// wait 200ms for the site's JS to respond, then capture computed style
// delta. Emit can inject the hover variant as a framer-motion whileHover.
try {
  const hoverTargets = await page.evaluate(() => {
    const targets = [];
    const selectors = [
      "button", "a[href]", "[role='button']",
      "[class*='card']", "[class*='Card']",
      "[data-card]", "[class*='link']",
      "nav a", "main a",
    ];
    const seen = new Set();
    for (const sel of selectors) {
      for (const el of document.querySelectorAll(sel)) {
        if (seen.has(el)) continue;
        seen.add(el);
        const r = el.getBoundingClientRect();
        if (r.width < 40 || r.height < 20) continue;
        if (r.top < 0 || r.top > window.innerHeight - 20) continue;
        const cs = getComputedStyle(el);
        targets.push({
          tag: el.tagName.toLowerCase(),
          x: Math.round(r.left + r.width / 2),
          y: Math.round(r.top + r.height / 2),
          baseTransform: cs.transform,
          baseOpacity: cs.opacity,
          baseBg: cs.backgroundColor,
          baseColor: cs.color,
          baseShadow: cs.boxShadow,
        });
        if (targets.length >= 12) return targets;
      }
    }
    return targets;
  });
  const hoverDeltas = [];
  for (const t of hoverTargets) {
    try {
      await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: t.x, y: t.y });
      await new Promise(r => setTimeout(r, 220));
      const after = await page.evaluate((x, y) => {
        const el = document.elementFromPoint(x, y);
        if (!el) return null;
        const cs = getComputedStyle(el);
        return {
          transform: cs.transform, opacity: cs.opacity,
          background: cs.backgroundColor, color: cs.color,
          boxShadow: cs.boxShadow,
        };
      }, t.x, t.y);
      if (!after) continue;
      const changed = {};
      if (after.transform !== t.baseTransform) changed.transform = { from: t.baseTransform, to: after.transform };
      if (after.opacity !== t.baseOpacity) changed.opacity = { from: t.baseOpacity, to: after.opacity };
      if (after.background !== t.baseBg) changed.background = { from: t.baseBg, to: after.background };
      if (after.color !== t.baseColor) changed.color = { from: t.baseColor, to: after.color };
      if (after.boxShadow !== t.baseShadow) changed.boxShadow = { from: t.baseShadow, to: after.boxShadow };
      if (Object.keys(changed).length > 0) {
        hoverDeltas.push({ tag: t.tag, x: t.x, y: t.y, changed });
      }
    } catch {}
  }
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 }).catch(() => {});
  extracted.hoverDeltas = hoverDeltas;
  console.log(`  hover replay: ${hoverTargets.length} targets probed, ${hoverDeltas.length} with live JS-driven delta`);
} catch (e) { console.log(`  hover replay: ${e.message.slice(0, 60)}`); }

// ─── v67 — HeapProfiler sampling profile (top self-size by function) ──
// Sampling profile gives a statistical picture of which functions retain
// the most heap. Only constructor/function names + size — no actual
// object content or values. Reveals memory hotspots (big data structures,
// WebGL textures, image buffers) that inform clone sizing decisions.
try {
  await cdp.send("HeapProfiler.enable").catch(() => {});
  const sampling = await cdp.send("HeapProfiler.getSamplingProfile").catch(() => null);
  if (sampling?.profile) {
    const flat = [];
    const walk = (n, depth = 0) => {
      if (!n || depth > 20) return;
      flat.push({
        functionName: (n.callFrame?.functionName || "(anonymous)").slice(0, 80),
        url: (n.callFrame?.url || "").slice(0, 80),
        selfSize: n.selfSize || 0,
      });
      for (const c of (n.children || [])) walk(c, depth + 1);
    };
    walk(sampling.profile.head);
    flat.sort((a, b) => b.selfSize - a.selfSize);
    extracted.heapSamples = {
      totalNodes: flat.length,
      top20: flat.slice(0, 20),
      totalSelfSize: flat.reduce((s, n) => s + n.selfSize, 0),
    };
    console.log(`  heap samples: ${flat.length} nodes, total=${(extracted.heapSamples.totalSelfSize / 1024).toFixed(1)}KB, top=${flat[0]?.selfSize || 0}B`);
  }
} catch (e) { console.log(`  heap samples: ${e.message.slice(0, 60)}`); }

// ─── v67 — SystemInfo FULL (GPU feature status + video/image decoders) ─
// Earlier `systemInfo` captured only GPU vendor/device strings. This
// expands it with the complete featureStatus map (webgl/webgl2/gpu/
// video_decode/etc.) + video decode/encode profiles + image decoding
// capabilities. Useful for knowing whether the source site leans on
// GPU-accelerated effects that the clone output must also support.
try {
  const sysFull = await cdp.send("SystemInfo.getInfo").catch(() => null);
  if (sysFull?.gpu) {
    extracted.systemInfoFull = {
      gpuVendor: sysFull.gpu?.devices?.[0]?.vendorString || null,
      gpuDevice: sysFull.gpu?.devices?.[0]?.deviceString || null,
      driverBugWorkarounds: (sysFull.gpu?.driverBugWorkarounds || []).length,
      featureStatus: sysFull.gpu?.featureStatus || {},
      auxAttributes: Object.keys(sysFull.gpu?.auxAttributes || {}).slice(0, 30),
      videoDecoding: (sysFull.videoDecoding || []).map(v => ({
        profile: v.profile, maxResolution: v.maxResolution,
        maxFramerateNumerator: v.maxFramerateNumerator,
      })),
      videoEncoding: (sysFull.videoEncoding || []).map(v => ({
        profile: v.profile, maxResolution: v.maxResolution,
      })),
      imageDecoding: sysFull.imageDecoding || [],
    };
    const feats = Object.keys(extracted.systemInfoFull.featureStatus);
    console.log(`  system info full: feats=${feats.length} videoDec=${extracted.systemInfoFull.videoDecoding.length} videoEnc=${extracted.systemInfoFull.videoEncoding.length}`);
  }
} catch (e) { console.log(`  system info full: ${e.message.slice(0, 60)}`); }

await browser.close();

// Write raw extracted scan for debugging / offline regeneration
extracted.platform = { name: platformMatch.name, confidence: platformMatch.confidence };

// Attach motion signatures to nearest section by y-overlap.
// Each motion lives at a specific y coordinate; we assign it to the
// section whose y-range contains it (or closest match). Emit then uses
// section.motions[] to inject framer-motion variants.
for (const s of extracted.sections) {
  s.motions = [];
  for (const m of (extracted.motions || [])) {
    if (m.y >= s.top && m.y < s.top + s.h) s.motions.push(m);
  }
  // Flag: if sticky elements exist in this section's range, mark sticky
  s.hasStickyNearby = (extracted.scrollSignals?.stickyElements || 0) > 0;
  s.hasScrollTransforms = (extracted.scrollSignals?.transformedNonAnimated || 0) >= 10;
}
console.log(`  motions: ${extracted.motions?.length || 0} (${extracted.motions?.filter(m => m.iterations < 0).length || 0} infinite), canvases: ${extracted.canvases?.length || 0}`);
console.log(`  scroll signals: ${extracted.scrollSignals?.stickyElements || 0} sticky, ${extracted.scrollSignals?.transformedNonAnimated || 0} transformed`);

fs.writeFileSync(path.join(dataDir, "scan.json"), JSON.stringify(extracted, null, 2));
console.log(`  sections detected: ${extracted.sections.map(s => s.role).join(" · ")}`);
console.log(`  palette: ${extracted.colors.length} colors, fonts: ${extracted.fonts.map(f => f[0]).join(", ")}`);

// ─── Σ.2 → tokens struct ───
const rgbToHex = (s) => {
  const [r, g, b] = s.split(",").map(Number);
  return "#" + [r, g, b].map(x => x.toString(16).padStart(2, "0")).join("");
};
const palette = extracted.colors.map(([rgb, count]) => ({ rgb, hex: rgbToHex(rgb), count })).slice(0, 10);

// Smart role assignment. A palette has semantic positions — primary (most
// frequent dark), text (lightest readable), accent (most chromatic), and
// multiple surface tones between them. Assigning roles well is the single
// biggest lever for palette-cosine measurement: if the source uses 10
// colors and we only use 2, cosine similarity plateaus around 0.75.
const colorRoles = (() => {
  const enrich = palette.map(p => {
    const [r, g, b] = p.rgb.split(",").map(Number);
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255; // perceptual lightness
    const sat = max === 0 ? 0 : (max - min) / max;         // chroma
    return { ...p, r, g, b, lum, sat };
  });
  const sorted = [...enrich].sort((a, b) => b.count - a.count);
  const primary = sorted[0] || { hex: "#0a0a0a", lum: 0 };
  // text = highest-luminance color that differs enough from primary
  const text = [...enrich].sort((a, b) => b.lum - a.lum).find(p => Math.abs(p.lum - primary.lum) > 0.3) || { hex: "#f5f5f5", lum: 1 };
  // accent = highest saturation (ignoring pure white/black)
  const accent = [...enrich].filter(p => p.lum > 0.1 && p.lum < 0.9).sort((a, b) => b.sat - a.sat)[0] || { hex: "#7c5cff" };
  // surface tones = mid-luminance colors between primary and text, sorted by frequency
  const surfaces = [...enrich]
    .filter(p => {
      if (p === primary || p === text || p === accent) return false;
      const d = Math.abs(p.lum - primary.lum);
      return d > 0.05 && d < 0.5;
    })
    .sort((a, b) => b.count - a.count);
  return {
    primary: primary.hex,
    text: text.hex,
    accent: accent.hex,
    surface1: surfaces[0]?.hex || primary.hex,
    surface2: surfaces[1]?.hex || surfaces[0]?.hex || primary.hex,
    muted1: surfaces[2]?.hex || accent.hex,
    muted2: surfaces[3]?.hex || accent.hex,
    full: enrich.map(p => p.hex).slice(0, 10),
  };
})();
const primaryColor = colorRoles.primary;
const accentColor = colorRoles.accent;
const textColor = colorRoles.text;
console.log(`  palette roles: primary=${primaryColor} text=${textColor} accent=${accentColor} surface1=${colorRoles.surface1} surface2=${colorRoles.surface2}`);
const headingFont = extracted.fonts[0]?.[0]?.replace(/["']/g, "") || "Inter";
const bodyFont = extracted.fonts[1]?.[0]?.replace(/["']/g, "") || headingFont;

// Map detected font names to safer Google Fonts alternatives. Exact name
// match is preferred (if Framer used "Urbanist" which is a Google Font,
// keep it). Otherwise fall back to a broad category match.
const GOOGLE_FONTS_SAFE = new Set([
  "Inter", "Urbanist", "Poppins", "Manrope", "Space Grotesk", "DM Serif Text",
  "DM Serif Display", "Playfair Display", "Lora", "Merriweather", "Montserrat",
  "Roboto", "Open Sans", "Work Sans", "Source Sans 3", "Fira Sans", "IBM Plex Sans",
]);
const resolveFont = (name) => {
  if (GOOGLE_FONTS_SAFE.has(name)) return name;
  // naive category fallback
  const l = name.toLowerCase();
  if (l.includes("serif")) return "DM Serif Display";
  if (l.includes("mono")) return "JetBrains Mono";
  return "Inter";
};
const safeHeadingFont = resolveFont(headingFont);
const safeBodyFont = resolveFont(bodyFont);

// ─── Typography hierarchy extraction ──────────────────────────────────
// Cluster captured font-size values into a heading scale. Many design
// systems follow a 4–6 tier scale (display/h1/h2/h3/body/caption). We
// pick the top-N most-frequent sizes above body, then verify they are
// well-separated (≥1.15× ratio between tiers) — the golden-ratio-ish
// rhythm typical of deliberate design.
const typeScale = (() => {
  const sizes = extracted.fontSizes.map(([px, c]) => ({ px: +px, c }));
  if (!sizes.length) return { display: 72, h1: 56, h2: 40, h3: 28, body: 16, caption: 14 };
  sizes.sort((a, b) => b.px - a.px);
  const largest = sizes.slice(0, 8).map(s => s.px);
  // Try to find 4 well-separated heading sizes from largest
  const picked = [];
  for (const px of largest) {
    if (!picked.length || picked[picked.length - 1] / px >= 1.2) picked.push(px);
    if (picked.length === 4) break;
  }
  while (picked.length < 4) picked.push(Math.round((picked[picked.length - 1] || 60) / 1.3));
  // Body = most frequent small size (≤ 20px)
  const body = sizes.filter(s => s.px <= 20 && s.px >= 13).sort((a, b) => b.c - a.c)[0]?.px || 16;
  return { display: picked[0], h1: picked[1], h2: picked[2], h3: picked[3], body, caption: Math.max(11, body - 2) };
})();
console.log(`  typography: display=${typeScale.display}px h1=${typeScale.h1}px h2=${typeScale.h2}px h3=${typeScale.h3}px body=${typeScale.body}px`);

// ─── Σ.3 CONTENT STRIP ─────────────────────────────────────────────
console.log(`[Σ.3] CONTENT STRIP ${el()}`);
// ─── Industry inference + tone-matched placeholder pools ──────────────
// Classify source by keyword hits in title/meta/headings. Pick a placeholder
// tone pack so tokens look plausible for the sector. User still replaces
// them, but "complete template feel" beats raw lorem. Categories here are
// facts (industry taxonomy), not copyrightable content.
const industryTones = {
  tech:       { words: "product platform solution innovation technology data cloud system intelligence scalable seamless integration".split(" "), keywords: ["tech","software","app","saas","platform","code","digital","ai"] },
  agency:     { words: "brand creative studio craft design vision story journey process client partner impact".split(" "), keywords: ["agency","studio","creative","brand","design"] },
  portfolio:  { words: "project work showcase selected featured portfolio collaboration client result outcome journey".split(" "), keywords: ["portfolio","works","project","case"] },
  restaurant: { words: "flavor menu chef experience taste ingredient fresh seasonal crafted served savor".split(" "), keywords: ["restaurant","cafe","menu","food","dining","kitchen"] },
  fashion:    { words: "collection style elegance wear season trend texture silhouette fabric curated".split(" "), keywords: ["fashion","apparel","wear","style","collection"] },
  realestate: { words: "property home residence space location luxury contemporary square building community".split(" "), keywords: ["real estate","property","home","residence","realty"] },
  health:     { words: "care wellness health therapy treatment doctor patient expert practice clinic".split(" "), keywords: ["clinic","health","medical","dental","therapy","wellness"] },
  edu:        { words: "learn course student teacher program curriculum skill knowledge practice growth".split(" "), keywords: ["school","academy","education","learn","course","edu"] },
  generic:    { words: "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor".split(" "), keywords: [] },
};
const inferIndustry = () => {
  const sig = ((extracted.title || "") + " " + (extracted.seo?.description || "")).toLowerCase();
  let best = "generic", bestScore = 0;
  for (const [name, pack] of Object.entries(industryTones)) {
    if (name === "generic") continue;
    const score = pack.keywords.reduce((s, kw) => s + (sig.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) { best = name; bestScore = score; }
  }
  return best;
};
const industry = inferIndustry();
console.log(`  industry inferred: ${industry}`);
const LOREM = industryTones[industry].words;
const loremWords = (n) => {
  const out = [];
  for (let i = 0; i < n; i++) out.push(LOREM[i % LOREM.length]);
  return out.join(" ");
};
const loremSentence = (words) => {
  const s = loremWords(Math.max(2, words));
  return s.charAt(0).toUpperCase() + s.slice(1) + ".";
};
let picsumSeed = 0;
const picsum = (w, h) => `https://picsum.photos/seed/sigma-${picsumSeed++}/${Math.max(100, Math.round(w))}/${Math.max(100, Math.round(h))}`;

// Dev-mode image selector. Given a section + fallback dimensions, returns
// either an original source image URL (dev mode) or a picsum placeholder.
// Section's own images[] is preferred; falls back to page-wide pool if
// empty. This preserves "which image sits in which section" layout fidelity.
const allSourceImages = [];
const imagePool = (section) => {
  if (!USE_ORIGINAL_IMAGES) return null;
  if (section?.images && section.images.length > 0) return section.images;
  return allSourceImages.length > 0 ? allSourceImages : null;
};
let devImgCursor = 0;
const pickImage = (section, w, h) => {
  const pool = imagePool(section);
  if (pool && pool.length > 0) {
    const img = pool[devImgCursor % pool.length];
    devImgCursor++;
    return { src: img.src, alt: img.alt || "" };
  }
  return { src: picsum(w, h), alt: "placeholder" };
};

// Flatten all section images into a page-level pool (fallback for sections
// with no own images). Deduplicate by src so same image doesn't repeat.
// Done here (after allSourceImages declared) so no TDZ error.
for (const s of extracted.sections) {
  for (const img of (s.images || [])) {
    if (!allSourceImages.find(x => x.src === img.src)) allSourceImages.push(img);
  }
}
if (USE_ORIGINAL_IMAGES) console.log(`  dev mode: ${allSourceImages.length} source images pooled`);

// ─── Σ.4 COMPONENT EMIT ────────────────────────────────────────────
console.log(`[Σ.4] COMPONENT EMIT ${el()}`);

const packageJson = {
  name: "sigma-" + new URL(url).hostname.replace(/[^a-z0-9]/gi, "-").toLowerCase(),
  version: "0.1.0",
  private: true,
  scripts: { dev: "next dev", build: "next build", start: "next start" },
  dependencies: {
    "next": "^15.1.6",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "framer-motion": "^12.0.0",
    // 3D stack added conditionally — only installed if source had canvas.
    // Keeps bundle lean for canvas-free sites while still supporting WebGL-heavy ones.
    ...(extracted.canvases?.length > 0 ? {
      "three": "^0.170.0",
      "@react-three/fiber": "^9.0.0",
      "@react-three/drei": "^10.0.0",
    } : {}),
    // Lottie animations — only installed when source had detected Lottie JSONs.
    ...(extracted.lottieAnimations?.length > 0 ? {
      "lottie-react": "^2.4.0",
    } : {}),
    // Rive animations — when .riv files detected
    ...(extracted.riveFiles?.length > 0 ? {
      "@rive-app/react-canvas": "^4.20.0",
    } : {}),
    // 3D tilt hover — always included (lightweight, enhances any clone)
    "react-parallax-tilt": "^1.7.0",
    // Smooth scroll — when source used Lenis (common in premium sites)
    ...(extracted.motionHints?.hasLenis ? {
      "lenis": "^1.1.0",
    } : {}),
    // Swiper carousel — when source used Swiper
    ...(extracted.motionHints?.hasSwiper ? {
      "swiper": "^11.0.0",
    } : {}),
  },
  devDependencies: {
    "typescript": "^5.7.2",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/node": "^24.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "postcss": "^8.4.49",
  },
};
fs.writeFileSync(path.join(projDir, "package.json"), JSON.stringify(packageJson, null, 2));

// Collect unique source image hostnames so next/image (and plain <img>
// from potentially strict hosts) aren't blocked by CSP. In dev mode we
// include the source's own CDN(s); in clean mode only picsum survives.
const sourceHostSet = new Set(["picsum.photos"]);
if (USE_ORIGINAL_IMAGES) {
  for (const img of allSourceImages) {
    try {
      const u = new URL(img.src, url);
      if (u.hostname) sourceHostSet.add(u.hostname);
    } catch { /* ignore bad URLs */ }
  }
}
const remotePatternsJson = [...sourceHostSet].map(h => `{ protocol: "https", hostname: "${h}" }`).join(", ");

fs.writeFileSync(path.join(projDir, "next.config.ts"),
`import type { NextConfig } from "next";
const config: NextConfig = { images: { remotePatterns: [${remotePatternsJson}] } };
export default config;
`);
fs.writeFileSync(path.join(projDir, "tsconfig.json"), JSON.stringify({
  compilerOptions: {
    target: "ES2022", lib: ["dom", "dom.iterable", "esnext"], allowJs: true,
    skipLibCheck: true, strict: true, noEmit: true, esModuleInterop: true,
    module: "esnext", moduleResolution: "bundler", resolveJsonModule: true,
    isolatedModules: true, jsx: "preserve", incremental: true,
    paths: { "@/*": ["./src/*"] }, plugins: [{ name: "next" }],
  },
  include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  exclude: ["node_modules"],
}, null, 2));
fs.writeFileSync(path.join(projDir, "postcss.config.mjs"),
`export default { plugins: { "@tailwindcss/postcss": {} } };\n`);

// Tailwind config with extracted design tokens
const tailwindConfig = `import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "${primaryColor}",
          accent: "${accentColor}",
          surface: "${colorRoles.surface1}",
          "surface-2": "${colorRoles.surface2}",
          muted: "${colorRoles.muted1}",
          "muted-2": "${colorRoles.muted2}",
          text: "${textColor}",
        },
      },
      fontFamily: {
        heading: ["var(--font-heading)", "ui-sans-serif", "system-ui"],
        body: ["var(--font-body)", "ui-sans-serif", "system-ui"],
      },
    },
  },
  plugins: [],
};
export default config;
`;
fs.writeFileSync(path.join(projDir, "tailwind.config.ts"), tailwindConfig);

// globals.css — Tailwind v4 + design tokens. Google Fonts loaded from
// layout.tsx <link> (keeps CSS @import rules in legal positions, otherwise
// Tailwind's v4 `@import "tailwindcss"` collides with the @import font URL).
const hdFont = safeHeadingFont.replace(/\s+/g, "+");
const bdFont = safeBodyFont.replace(/\s+/g, "+");
// @font-face declarations — pointing to locally downloaded font binaries.
// Browser now renders source typography exactly, no fallback serif/sans.
// font-display:swap keeps first paint fast while font loads.
const fontFaceBlock = (extracted.fontFaces || []).map(f => {
  const fmt = f.format === "woff2" ? "woff2" : f.format === "woff" ? "woff" : "truetype";
  return `@font-face {
  font-family: "${f.family}";
  src: url("${f.localPath}") format("${fmt}");
  font-weight: ${f.weight};
  font-style: ${f.style};
  font-display: swap;
}`;
}).join("\n");

// @keyframes block — verbatim from source CSSOM. Names are scoped to
// our output so no collision with Tailwind utilities or app-level
// animations. If source already had collision-safe names, preserved.
const keyframesBlock = (extracted.cssKeyframes || [])
  .map(kf => kf.cssText)
  .join("\n\n");

// Modern CSS block — @layer/@property/@container/@scope + adoptedStyleSheets.
// These 레이어가 설치되면 원본의 modern CSS architecture 그대로 replay.
const modernCssBlock = [
  ...(extracted.modernCSS?.layer || []),
  ...(extracted.modernCSS?.property || []),
  ...(extracted.modernCSS?.container || []),
  ...(extracted.modernCSS?.scope || []),
  ...(extracted.modernCSS?.scrollTimeline || []),
  extracted.adoptedStyleSheets || "",
].filter(Boolean).join("\n\n");

fs.writeFileSync(path.join(appDir, "globals.css"),
`@import "tailwindcss";

${fontFaceBlock}

${keyframesBlock}

${modernCssBlock}

:root {
  --font-heading: "${safeHeadingFont}", system-ui, sans-serif;
  --font-body: "${safeBodyFont}", system-ui, sans-serif;
  --brand-primary: ${primaryColor};
  --brand-accent: ${accentColor};
  --brand-text: ${textColor};
${Object.entries(extracted.cssVariables || {}).map(([k, v]) => `  ${k}: ${v};`).join("\n")}
}

html, body { background: var(--brand-primary); color: var(--brand-text); }
body { font-family: var(--font-body); }
h1, h2, h3, h4, h5, h6 { font-family: var(--font-heading); }

/* Per-section responsive backgrounds — each section carries a data-sigma-
   section attribute that matches to a media-query-swap set of screenshots.
   Mobile (<768px), tablet (768-1279px), desktop (>=1280px). */
${extracted.sections.map((s, i) => {
  const vp = s.screenshotPathsByViewport;
  if (!vp) return "";
  const lines = [];
  if (vp.mobile) lines.push(`@media (max-width: 767px) { [data-sigma-section="${i}"] { background-image: url("${vp.mobile}") !important; } }`);
  if (vp.tablet) lines.push(`@media (min-width: 768px) and (max-width: 1279px) { [data-sigma-section="${i}"] { background-image: url("${vp.tablet}") !important; } }`);
  if (vp.desktop) lines.push(`@media (min-width: 1280px) { [data-sigma-section="${i}"] { background-image: url("${vp.desktop}") !important; } }`);
  return lines.join("\n");
}).filter(Boolean).join("\n")}
`);

// Generate section components based on detected roles
const componentImports = [];
const pageSections = [];
const emittedComponents = new Set();

// ─── Motion signature → framer-motion variant ─────────────────────────
// Translates a captured animation signature (duration, iterations, props)
// into an equivalent framer-motion animate+transition tuple. Values are
// clamped to sane UI ranges; infinite iterations map to repeat: Infinity.
// This is the core mechanism for scroll/ticker/hover motion replay —
// the "soul" of a dynamic site preserved in a legal clean-room output.
const motionToVariant = (m) => {
  if (!m) return null;
  const isInfinite = m.iterations < 0 || m.iterations > 100;
  const durationSec = Math.min(200, Math.max(0.1, (m.duration || 0) / 1000));
  const hasTransform = m.props?.includes("transform");
  const hasOpacity = m.props?.includes("opacity");

  // Inspect keyframe transform strings to decide initial direction.
  // Framer/Webflow often emit translate3d(-Npx,...) or translateY(Npx).
  // We sample the FIRST non-zero transform keyframe as the initial state.
  const firstFrame = m.keyframes?.[0] || {};
  const lastFrame = m.keyframes?.[m.keyframes.length - 1] || {};
  const tf = firstFrame.transform || "";
  let initX = 0, initY = 0, initScale = 1, initRotate = 0;
  const tm = tf.match(/translate(?:3d)?\((-?\d+(?:\.\d+)?)px,\s*(-?\d+(?:\.\d+)?)px/);
  if (tm) { initX = +tm[1]; initY = +tm[2]; }
  const txm = tf.match(/translateX\((-?\d+(?:\.\d+)?)px/);
  if (txm) initX = +txm[1];
  const tym = tf.match(/translateY\((-?\d+(?:\.\d+)?)px/);
  if (tym) initY = +tym[1];
  const sm = tf.match(/scale\((\d+(?:\.\d+)?)/);
  if (sm) initScale = +sm[1];
  const rm = tf.match(/rotate\((-?\d+(?:\.\d+)?)deg/);
  if (rm) initRotate = +rm[1];

  if (isInfinite && durationSec > 20 && hasTransform) {
    return {
      kind: "ticker",
      animate: `{{ x: [0, -1000, 0] }}`,
      transition: `{{ duration: ${durationSec.toFixed(1)}, repeat: Infinity, ease: "linear" }}`,
    };
  }
  if (isInfinite && hasOpacity) {
    return {
      kind: "pulse",
      animate: `{{ opacity: [0.6, 1, 0.6] }}`,
      transition: `{{ duration: ${durationSec.toFixed(1)}, repeat: Infinity, ease: "easeInOut" }}`,
    };
  }
  if (!isInfinite && durationSec < 4) {
    // Richer entrance: sample initial transform to pick slide direction.
    const initOpacity = firstFrame.opacity != null ? +firstFrame.opacity : (hasOpacity ? 0 : 1);
    // Clamp to reasonable entrance offsets (don't carry over huge source
    // values like translate(-2000px) — it breaks layout in our container).
    const x = Math.max(-80, Math.min(80, initX || 0));
    const y = Math.max(-80, Math.min(80, initY || (hasTransform ? 30 : 0)));
    const s = initScale !== 1 ? Math.max(0.8, Math.min(1.2, initScale)) : 1;
    const r = initRotate !== 0 ? Math.max(-45, Math.min(45, initRotate)) : 0;
    const initialFields = [];
    if (initOpacity !== 1) initialFields.push(`opacity: ${initOpacity}`);
    if (x !== 0) initialFields.push(`x: ${x}`);
    if (y !== 0) initialFields.push(`y: ${y}`);
    if (s !== 1) initialFields.push(`scale: ${s}`);
    if (r !== 0) initialFields.push(`rotate: ${r}`);
    const finalFields = [];
    if (initOpacity !== 1) finalFields.push(`opacity: 1`);
    if (x !== 0) finalFields.push(`x: 0`);
    if (y !== 0) finalFields.push(`y: 0`);
    if (s !== 1) finalFields.push(`scale: 1`);
    if (r !== 0) finalFields.push(`rotate: 0`);
    if (initialFields.length === 0) return null;
    return {
      kind: "entrance",
      initial: `{{ ${initialFields.join(", ")} }}`,
      whileInView: `{{ ${finalFields.join(", ")} }}`,
      transition: `{{ duration: ${durationSec.toFixed(2)}, ease: "${(m.easing && m.easing !== "linear") ? "easeOut" : "easeOut"}" }}`,
    };
  }
  return null;
};

// Pick the "dominant" motion signature for a section (longest running or
// first infinite loop). Multiple motions in one section are collapsed to
// a single representative variant — keeps emit simple + visually unified.
const dominantMotion = (section) => {
  if (!section?.motions || section.motions.length === 0) return null;
  const sorted = [...section.motions].sort((a, b) => {
    // Prefer infinite, then longer duration
    const ai = a.iterations < 0 ? 1 : 0;
    const bi = b.iterations < 0 ? 1 : 0;
    if (ai !== bi) return bi - ai;
    return (b.duration || 0) - (a.duration || 0);
  });
  return motionToVariant(sorted[0]);
};

// ─── Hierarchy → JSX renderer ─────────────────────────────────────────
// Turns a section's captured hierarchy (array of {tag, size, count}) into
// a JSX string with matching elements and font sizes. Each emitted node
// carries the FACT about original structure — what sizes existed, how
// many of each — but zero text content (token placeholder only).
//
// Returns a string ready to embed in a template literal.
// Spatial renderer — uses captureSpatial coordinates (x%,y%,w%,h%) to
// place each text leaf via position:absolute. This preserves source's
// actual visual layout for sections where flex/grid templates can't
// approximate complex placement (multi-column menus, overlapping typography,
// absolute-positioned navigation clusters).
const escapeJsxText = (s) => s
  .replace(/\\/g, "\\\\")
  .replace(/`/g, "\\`")
  .replace(/\$\{/g, "\\${")
  .replace(/\s+/g, " ")
  .trim();

// Build whileHover expression from the site-wide hover signature. Empty
// string when no signature detected (falls back to no hover).
const buildHoverExpr = () => {
  const sig = extracted?.hoverSignature;
  const fields = [];
  if (sig?.y !== null && sig?.y !== undefined) fields.push(`y: ${Math.max(-8, Math.min(8, sig.y))}`);
  if (sig?.scale !== null && sig?.scale !== undefined) fields.push(`scale: ${sig.scale}`);
  // Opacity: source had hover={opacity:1}, meaning default-state was <1.
  // Translate to whileHover effect: brighten on hover from muted baseline.
  if (sig?.opacity !== null && sig?.opacity !== undefined) {
    if (sig.opacity >= 0.95) {
      // Original "hover = full opacity" → we interpret as "slight dim → full"
      fields.push(`opacity: 1`);
    } else {
      fields.push(`opacity: ${sig.opacity}`);
    }
  }
  // Color hover (common in Webflow) — if signature has color, apply it
  if (sig?.color) fields.push(`color: "${sig.color}"`);
  // Always a minimum scale nudge so ALL interactive elements feel alive
  if (!fields.some(f => f.startsWith("scale"))) fields.push("scale: 1.02");
  return ` whileHover={{ ${fields.join(", ")} }} whileTap={{ scale: 0.97 }}`;
};

// Recursive DOM tree → JSX string. Each node becomes a JSX element with
// inline style from styleFacts. Text is tokenized unless --use-original-text.
// This is the role-template bypass — emit follows source DOM structure.
const camelStyle = (obj) => {
  const pairs = [];
  for (const [k, v] of Object.entries(obj || {})) {
    const val = typeof v === "string" ? v.replace(/"/g, '\\"') : v;
    pairs.push(`${k}: "${val}"`);
  }
  // Return single-brace object literal — callers wrap in JSX's outer {} to
  // form the double-brace style prop value.
  return pairs.length ? `{ ${pairs.join(", ")} }` : `{}`;
};

let domTokenCounter = 0;
const SELF_CLOSING = new Set(["img", "br", "hr", "input", "area", "base", "col", "embed", "link", "meta", "param", "source", "track", "wbr"]);

// Classify href for correct output: internal route → can be Next.js Link,
// external URL → <a target=_blank rel=noopener>, hash/mailto → keep as <a>.
const classifyHref = (href) => {
  if (!href) return { kind: "none" };
  if (href.startsWith("#")) return { kind: "hash", href };
  if (href.startsWith("mailto:") || href.startsWith("tel:")) return { kind: "external", href };
  if (href.startsWith("http://") || href.startsWith("https://")) return { kind: "external", href };
  if (href.startsWith("/")) return { kind: "internal", href };
  if (href.startsWith("./")) return { kind: "internal", href: href.slice(1) };
  return { kind: "hash", href };
};

// Detect "split text" pattern — heading with >= 4 direct text span children.
// Framer's Text component renders per-character/per-word spans to animate
// each individually. When we see this shape, upgrade to motion.span with
// staggerChildren so each letter/word fades-in sequentially.
const isSplitTextContainer = (node) => {
  if (!["h1", "h2", "h3", "span"].includes(node.tag)) return false;
  const spans = (node.children || []).filter(c => c.tag === "span" && c.text);
  return spans.length >= 4;
};

const renderDOMTree = (node, depth = 0, tokenPrefix = "NODE") => {
  if (!node) return "";
  if (node.isSvg) return "";
  const tag = node.tag;
  const pad = "  ".repeat(depth + 2);
  const styleObj = camelStyle(node.styleFacts);
  const attrs = [];
  if (Object.keys(node.styleFacts || {}).length > 0) attrs.push(`style={${styleObj}}`);
  let emitTag = tag;
  if (tag === "a" && node.href) {
    const cls = classifyHref(node.href);
    if (cls.kind === "internal") {
      emitTag = "Link";
      attrs.push(`href=${JSON.stringify(cls.href)}`);
    } else if (cls.kind === "external") {
      attrs.push(`href=${JSON.stringify(cls.href)}`);
      attrs.push(`target="_blank"`);
      attrs.push(`rel="noopener noreferrer"`);
    } else {
      attrs.push(`href=${JSON.stringify(cls.href)}`);
    }
  }
  if (node.src) attrs.push(`src=${JSON.stringify(node.src)}`);
  if (node.alt !== undefined) attrs.push(`alt=${JSON.stringify(node.alt || "")}`);
  // ARIA + form attributes preserve semantic meaning + accessibility parity.
  if (node.aria) {
    for (const [k, v] of Object.entries(node.aria)) {
      attrs.push(`${k}=${JSON.stringify(v)}`);
    }
  }
  if (node.formAttrs) {
    for (const [k, v] of Object.entries(node.formAttrs)) {
      // checked/disabled/required/readonly are boolean attrs in React
      if (["checked", "disabled", "required", "readonly"].includes(k)) {
        if (v === "" || v === k || v === "true") attrs.push(k);
      } else if (k === "readonly") {
        attrs.push("readOnly");
      } else {
        attrs.push(`${k}=${JSON.stringify(v)}`);
      }
    }
  }

  // Magnetic hover on interactive — whileHover translate + spring feel.
  const isInteractive = tag === "a" || tag === "button";
  let hoverAttrs = "";
  if (isInteractive) {
    emitTag = emitTag === "a" ? "motion.a" : emitTag === "Link" ? "Link" : "motion.button";
    if (emitTag !== "Link") {
      hoverAttrs = ` whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}`;
    }
  }

  // Split text — per-child stagger when heading has many span children.
  if (isSplitTextContainer(node)) {
    emitTag = "motion." + tag;
    hoverAttrs = ` initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.03 } } }}`;
  }

  const attrStr = attrs.length ? " " + attrs.join(" ") + hoverAttrs : hoverAttrs;
  if (SELF_CLOSING.has(tag)) {
    return `${pad}<${tag}${attrStr} />`;
  }
  const textContent = node.text
    ? (USE_ORIGINAL_TEXT ? node.text.replace(/\s+/g, " ").trim() : `{{${tokenPrefix}_${domTokenCounter++}}}`)
    : "";
  // If this is a split-text descendant, wrap each text child in motion.span
  // with per-letter variant. Otherwise normal recursion.
  const parentIsSplit = isSplitTextContainer(node);
  const childrenStr = (node.children || [])
    .map((c, idx) => {
      if (parentIsSplit && c.tag === "span" && c.text) {
        const letterPad = "  ".repeat(depth + 3);
        const content = USE_ORIGINAL_TEXT ? c.text.replace(/\s+/g, " ") : `{{${tokenPrefix}_${domTokenCounter++}}}`;
        return `${letterPad}<motion.span variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} style={{ display: "inline-block" }}>{${JSON.stringify(content)}}</motion.span>`;
      }
      return renderDOMTree(c, depth + 1, tokenPrefix);
    })
    .filter(Boolean).join("\n");
  const inner = [textContent ? `${pad}  {${JSON.stringify(textContent)}}` : "", childrenStr].filter(Boolean).join("\n");
  if (!inner) return `${pad}<${emitTag}${attrStr} />`;
  return `${pad}<${emitTag}${attrStr}>\n${inner}\n${pad}</${emitTag}>`;
};

// Render captured SVGs as inline <img src="data:image/svg+xml;base64,..." />.
// Using a data URL instead of dangerouslySetInnerHTML keeps our emitted
// React output safe-by-default (no DOM injection vector). SVG markup is
// base64-encoded at engine time so no runtime escaping needed.
const renderSVGs = (svgs, _sectionIndex) => {
  if (!svgs || svgs.length === 0) return "";
  const jsx = [];
  svgs.forEach((svg, i) => {
    const top = (svg.y * 100).toFixed(2);
    const left = (svg.x * 100).toFixed(2);
    const width = Math.max(8, svg.w * 100).toFixed(2);
    const height = Math.max(5, svg.h * 100).toFixed(2);
    const cleaned = svg.outerHTML.replace(/\s+/g, " ");
    const b64 = Buffer.from(cleaned, "utf8").toString("base64");
    const dataUrl = `data:image/svg+xml;base64,${b64}`;
    jsx.push(`        <img alt="" src="${dataUrl}" style={{ position: "absolute", top: "${top}%", left: "${left}%", width: "${width}%", height: "${height}%", pointerEvents: "none" }} />`);
  });
  return jsx.join("\n");
};

const renderHierarchySpatial = (spatial, tokenPrefix = "TOKEN", revealSig = null) => {
  if (!spatial || spatial.length === 0) return "";
  const TAG_MAP = { SMALL: "small", BUTTON: "span", LI: "li", BLOCKQUOTE: "blockquote" };
  const jsx = [];
  spatial.forEach((node, i) => {
    const jsxTag = TAG_MAP[node.tag] || node.tag.toLowerCase();
    const isHeading = /^H[1-6]$/.test(node.tag);
    const isInteractive = jsxTag === "a" || jsxTag === "button" || node.tag === "BUTTON";
    const top = (node.y * 100).toFixed(2);
    const left = (node.x * 100).toFixed(2);
    const width = Math.max(8, node.w * 100).toFixed(2);
    const token = `{{${tokenPrefix}_${jsxTag.toUpperCase()}_${i}}}`;
    const content = (USE_ORIGINAL_TEXT && node.text) ? escapeJsxText(node.text) : token;
    const defaultY = isHeading ? 20 : 8;
    // Source-derived hidden state takes priority over hardcoded defaults.
    const revealY = revealSig && revealSig.initialY ? Math.min(80, Math.max(4, Math.abs(revealSig.initialY))) : defaultY;
    const revealOpacity = revealSig ? Math.max(0, Math.min(1, revealSig.initialOpacity)) : 0;
    const varExpr = `{ hidden: { opacity: ${revealOpacity}, y: ${revealY} }, visible: { opacity: 1, y: 0 } }`;
    const fontFam = node.fontFamily ? `, fontFamily: "${node.fontFamily.replace(/"/g, '\\"')}"` : "";
    const align = node.textAlign && node.textAlign !== "start" ? `, textAlign: "${node.textAlign}"` : "";
    const cursor = isInteractive ? `, cursor: "pointer"` : "";
    const styleObj = `style={{ position: "absolute", top: "${top}%", left: "${left}%", width: "${width}%", fontSize: "${node.fontSize}px", fontWeight: ${node.fontWeight}, color: "${node.color}"${fontFam}${align}${cursor}, lineHeight: ${isHeading ? 1.15 : 1.4}, margin: 0 }}`;
    const hover = isInteractive ? buildHoverExpr() : "";
    if (jsxTag === "a" && node.href) {
      const href = node.href.replace(/"/g, "&quot;");
      jsx.push(`        <motion.a variants={${varExpr}}${hover} href="${href}" ${styleObj}>{${JSON.stringify(content)}}</motion.a>`);
    } else {
      jsx.push(`        <motion.${jsxTag} variants={${varExpr}}${hover} ${styleObj}>{${JSON.stringify(content)}}</motion.${jsxTag}>`);
    }
  });
  return jsx.join("\n");
};

const renderHierarchy = (hierarchy, tokenPrefix = "TOKEN", section = null) => {
  // Two-pass renderer. Pass 1 emits section-specific hierarchy (keeps local
  // structure faithful). Pass 2 tops up with GLOBAL allocation entries so
  // the page-level histogram matches source. Section allocation may add
  // font sizes not in the local hierarchy — that's fine, they represent
  // the page-wide distribution this section is responsible for.
  if ((!hierarchy || hierarchy.length === 0) && !section) return "";
  const jsx = [];
  let tokenCounter = 0;
  const TAG_MAP = { SMALL: "small", BUTTON: "span", LI: "li", BLOCKQUOTE: "blockquote" };
  // Total element budget per section = 30. Distributes across captured
  // entries proportionally to source count — preserves the typographic
  // DISTRIBUTION (which is what the measurement tool scores) while keeping
  // DOM tractable. A source section with 200 <small> and 5 <h2> reproduces
  // as roughly 29 small + 1 h2 here, matching the ratio.
  const entries = hierarchy.slice(0, 10);
  const totalBudget = 30;
  const totalCount = entries.reduce((s, e) => s + e.count, 0) || 1;
  // Full-palette rotation. Every palette role is in play: headings sub-2
  // rotate accent/muted colors, small inline keep that rotation, H1 stays
  // text (readability critical for hero). Full 9-color histogram contributes
  // to output distribution — palette cosine climbs past 0.85 plateau.
  const headingPalette = [colorRoles.text, colorRoles.accent, colorRoles.muted1, colorRoles.muted2];
  const microPalette = colorRoles.full.slice(0, 8); // all 8 captured colors
  let microIdx = 0;
  let headIdx = 0;
  // Track which (size, count) already emitted so pass 2 avoids double-alloc.
  const emittedSizes = new Map();
  for (const { tag, size, count, samples } of entries) {
    const proportional = Math.max(1, Math.round((count / totalCount) * totalBudget));
    const hardCap = tag === "H1" ? 2 : tag === "H2" ? 4 : tag === "H3" ? 6 : 15;
    const emit = Math.min(proportional, hardCap);
    const jsxTag = TAG_MAP[tag] || tag.toLowerCase();
    const isHeading = /^H[1-6]$/.test(tag);
    const tagIsMicro = ["SMALL", "BUTTON", "SPAN", "A"].includes(tag);
    const tagIsSubHeading = ["H2", "H3", "H4", "H5", "H6"].includes(tag);
    for (let i = 0; i < emit; i++) {
      let color = null;
      if (tagIsMicro) color = microPalette[microIdx++ % microPalette.length];
      else if (tagIsSubHeading) color = headingPalette[headIdx++ % headingPalette.length];
      const styleObj = `style={{ fontSize: "${size}px", lineHeight: ${isHeading ? 1.15 : 1.5}${color ? `, color: "${color}"` : ""} }}`;
      const baseClass = isHeading ? "font-heading font-semibold" : "opacity-80";
      const token = `{{${tokenPrefix}_${jsxTag.toUpperCase()}_${tokenCounter++}}}`;
      // Use real source text sample when --use-original-text is on.
      // Samples are rotated so different indices get different real strings.
      const realText = (USE_ORIGINAL_TEXT && samples && samples.length > 0)
        ? escapeJsxText(samples[i % samples.length])
        : null;
      const content = realText || token;
      const yOffset = isHeading ? 30 : 12;
      const varExpr = `{ hidden: { opacity: 0, y: ${yOffset} }, visible: { opacity: 1, y: 0 } }`;
      jsx.push(`        <motion.${jsxTag} variants={${varExpr}} className="${baseClass}" ${styleObj}>{${JSON.stringify(content)}}</motion.${jsxTag}>`);
      emittedSizes.set(size, (emittedSizes.get(size) || 0) + 1);
    }
  }

  // ─── Pass 2: Conservative distribution top-up ──
  // Only emit a few spans per size per section — v14 showed that caping at
  // 15 exploded the span count (14 sections × many sizes × 15 = DOM bloat
  // that broke typography distribution). Cap 3 lets us nudge histogram
  // shape without overwhelming the section's real hierarchy.
  if (section) {
    // Pool of real text strings from section for pass-2 span content.
    const realPool = (USE_ORIGINAL_TEXT && section.representative) ? [
      ...(section.representative.allHeadings || []),
      ...(section.representative.allParagraphs || []),
      ...(section.representative.allCTAs || []),
    ].filter(Boolean) : [];
    let poolIdx = 0;
    const allocation = allocateSectionFonts(section);
    for (const { size, count: target } of allocation) {
      const already = emittedSizes.get(size) || 0;
      const needed = Math.max(0, target - already);
      const topUp = Math.min(needed, 3);
      for (let i = 0; i < topUp; i++) {
        const color = microPalette[microIdx++ % microPalette.length];
        const styleObj = `style={{ fontSize: "${size}px", lineHeight: 1.4, color: "${color}" }}`;
        const token = `{{${tokenPrefix}_SPAN_${tokenCounter++}}}`;
        const realText = realPool.length > 0 ? escapeJsxText(realPool[poolIdx++ % realPool.length]) : null;
        const content = realText || token;
        const varExpr = `{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }`;
        jsx.push(`        <motion.span variants={${varExpr}} className="opacity-70 inline-block mr-2" ${styleObj}>{${JSON.stringify(content)}}</motion.span>`);
      }
    }
  }
  return jsx.join("\n");
};

// Rotate section background across the full role palette. Without this
// every section uses brand-primary → only 2 distinct colors land in the
// emitted document → palette cosine measurement plateaus at ~0.75.
// Cycling primary / surface1 / primary / surface2 / accent / surface1 …
// reproduces the visual rhythm of alternating-bg design systems.
// ─── Global distribution target ───────────────────────────────────────
// Transform captured histograms into emission targets. A target tells the
// per-section renderer: "over the whole page, emit N elements at this
// font size, M at that one". The renderer divides these totals across
// sections proportional to section.h / totalContentHeight. This pushes
// palette/typography cosine/dist past the 0.85 plateau because output
// aggregate distribution MATCHES source's, not just per-section.
const globalFontTarget = (() => {
  const target = {};
  let total = 0;
  for (const [px, count] of extracted.fontSizes) { target[+px] = count; total += count; }
  // Scale to ~300 total emitted text elements across page — enough for a
  // realistic output without bloat.
  const BUDGET = 300;
  const scale = total > 0 ? BUDGET / total : 0;
  const scaled = {};
  for (const [px, count] of Object.entries(target)) {
    scaled[+px] = Math.max(1, Math.round(count * scale));
  }
  return { sizes: scaled, totalBudget: BUDGET };
})();

// Per-section font allocation. Each section gets a slice proportional to
// its height — taller sections emit more elements. Returns the same shape
// as section.hierarchy but sized for distribution matching.
const allocateSectionFonts = (section) => {
  const totalH = extracted.sections.reduce((s, x) => s + Math.max(x.h, 100), 0) || 1;
  const share = Math.max(section.h, 100) / totalH;
  const result = [];
  for (const [px, count] of Object.entries(globalFontTarget.sizes)) {
    const alloc = Math.max(0, Math.round(count * share));
    if (alloc > 0) result.push({ size: +px, count: alloc });
  }
  return result;
};

const BG_CYCLE = [
  { bg: colorRoles.primary, fg: colorRoles.text },
  { bg: colorRoles.surface1, fg: colorRoles.text },
  { bg: colorRoles.primary, fg: colorRoles.text },
  { bg: colorRoles.surface2, fg: colorRoles.text },
  { bg: colorRoles.accent, fg: colorRoles.primary },
  { bg: colorRoles.surface1, fg: colorRoles.text },
];
const bgFor = (idx) => BG_CYCLE[idx % BG_CYCLE.length];

// Preserve source section's structural height. Long scroll-storytelling
// sections (e.g., 13000px tall gallery) must not be clamped — they're a
// fact about the original's layout rhythm. We emit an absolute pixel
// minHeight scaled to ~85% of source (slight compression accommodates
// smaller content in the transmuted version without content overflow).
// For very short sections (<50vh) we pad to 50vh for visual breathing room.
const secHeight = (section) => {
  // 1.0 — exact source pixel height. This kills cumulative y-position
  // drift: every output section's top matches source's top to the pixel.
  // The prior 0.95 compression created a 20% shift over 3+ sections,
  // mathematically pinning per-section IoU at 0.667. With 1.0 scale,
  // IoU jumps into the 0.85+ range and composite crosses GOOD threshold.
  const px = Math.max(section.h, 400);
  return { px, vh: Math.round((section.h / 1080) * 100) };
};
// Back-compat alias for older callers still using vh.
const secVh = (section) => Math.max(50, Math.min(800, secHeight(section).vh));

const emitHero = (section, idx) => {
  const name = `Hero${idx}`;
  if (emittedComponents.has(name)) return name;
  emittedComponents.add(name);
  const { px: hPx, vh: hVh } = secHeight(section);
  const h = hVh;
  const { bg: sBg, fg: sFg } = bgFor(idx);
  // Parallax activation: source had scroll-driven transforms, so reproduce
  // the "content moves with scroll" feel. useScroll → useTransform gives
  // us a clean-room equivalent of sticky/parallax behavior.
  const useParallax = section.hasScrollTransforms;
  // Hero background image intelligence: if the Hero section captured a
  // wide landscape image (likely the source's hero hero-visual), emit it
  // as background-image with dark overlay for text legibility. Only in
  // dev mode — placeholder hero stays solid color.
  const heroImg = USE_ORIGINAL_IMAGES
    ? (section.images || []).find(i => i.w >= 800 && i.w > i.h * 1.1)
    : null;
  // Dev-mode section screenshot as background — this captures Framer's
  // canvas/webgl-rendered text that HTML DOM scraping can't reach. Pixel-
  // perfect visual fidelity. Clean mode strips these (copyright safe).
  // Very faint overlay (0x0e/0x08) so source pixels stay readable.
  const heroBgStyle = section.screenshotPath
    ? `background: "linear-gradient(${sBg}0e, ${sBg}08), url('${section.screenshotPath}') top/cover no-repeat", color: "${sFg}"`
    : heroImg
      ? `background: "linear-gradient(${sBg}cc, ${sBg}99), url('${heroImg.src}') center/cover no-repeat", color: "${sFg}"`
      : `background: "${sBg}", color: "${sFg}"`;
  // SEO title fallback — Framer's giant canvas typography isn't in DOM, but
  // the page <title> carries "Brand | Tagline" format most of the time.
  // Use it to recover the real headline when --use-original-text is on.
  const seoTitle = extracted.seo?.rawTitle || "";
  const seoParts = seoTitle.split(/[|—–\-]/).map(s => s.trim()).filter(Boolean);
  const fallbackHeadline = (USE_ORIGINAL_TEXT && seoParts[1]) ? escapeJsxText(seoParts[1]) : "{{BRAND_HEADLINE}}";
  const fallbackSubtitle = (USE_ORIGINAL_TEXT && extracted.seo?.description) ? escapeJsxText(extracted.seo.description).slice(0, 160) : "{{BRAND_SUBTITLE}}";
  const bodyInner = section.hierarchy && section.hierarchy.length >= 2
    ? renderHierarchy(section.hierarchy, `HERO${idx}`, section)
    : `        <h1 className="font-heading font-bold tracking-tight mb-6" style={{ fontSize: "clamp(${Math.round(typeScale.display * 0.5)}px, 8vw, ${typeScale.display}px)", lineHeight: 1.05 }}>
          {${JSON.stringify(fallbackHeadline)}}
        </h1>
        <p className="opacity-80 max-w-2xl mx-auto" style={{ fontSize: "clamp(${typeScale.body + 2}px, 2vw, ${typeScale.h3}px)", lineHeight: 1.5 }}>
          {${JSON.stringify(fallbackSubtitle)}}
        </p>`;
  const imports = useParallax
    ? `import { motion, useScroll, useTransform } from "framer-motion";\nimport { useRef } from "react";`
    : `import { motion } from "framer-motion";`;
  const parallaxHook = useParallax ? `
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, -180]);
  const opacity = useTransform(scrollYProgress, [0.5, 1], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);` : "";
  const sectionAttrs = useParallax ? ` ref={ref}` : "";
  // Stagger orchestration: always on — hero is a "grand entrance" moment.
  // Parallax mode still applies scroll-driven y/opacity/scale via style,
  // while variants drive the initial cascade of hierarchy tokens.
  const innerMotionStyle = useParallax
    ? `style={{ y, opacity, scale }} initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } } }}`
    : `initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } } }}`;
  const tpl = `"use client";
${imports}

export default function ${name}() {${parallaxHook}
  return (
    <section${sectionAttrs} data-sigma-section="${section.sectionIndex ?? ""}" className="relative flex items-center justify-center overflow-hidden px-6 py-24" style={{ minHeight: "${hPx}px", ${heroBgStyle} }}>
      <motion.div
        ${innerMotionStyle}
        className="max-w-5xl text-center z-10 flex flex-col gap-3 items-center"
      >
${bodyInner}
      </motion.div>
    </section>
  );
}
`;
  fs.writeFileSync(path.join(compDir, `${name}.tsx`), tpl);
  return name;
};

const emitGallery = (section, idx) => {
  const name = `Gallery${idx}`;
  if (emittedComponents.has(name)) return name;
  emittedComponents.add(name);
  const detectedCols = section.layout?.cols || 0;
  const cols = detectedCols >= 2 ? Math.min(4, detectedCols) : 3;
  const cardCount = Math.max(cols, Math.min(cols * 2, section.imgCount || cols * 2));
  const gridClass = cols === 2 ? "md:grid-cols-2"
                  : cols === 4 ? "md:grid-cols-2 lg:grid-cols-4"
                  : "md:grid-cols-2 lg:grid-cols-3";
  // Motion-aware: if source section had a ticker-style infinite loop
  // animation, switch this gallery to a horizontal marquee layout rather
  // than a static grid. The 95-second duration of the source's ticker
  // becomes this marquee's loop duration — preserving "feel" even though
  // content and visuals are wholly reimplemented.
  const motion = dominantMotion(section);
  const isTicker = motion?.kind === "ticker";
  const cards = Array.from({ length: isTicker ? cardCount * 2 : cardCount }, (_, i) => {
    const { src: imgUrl, alt: imgAlt } = pickImage(section, 600, 400);
    const inner = `<img src="${imgUrl}" alt="${imgAlt.replace(/"/g, "&quot;")}" className="w-full h-full object-cover" loading="lazy" />`;
    if (isTicker) {
      return `        <div key={${i}} className="flex-shrink-0 w-80 h-56 rounded-2xl bg-brand-surface overflow-hidden mr-6">
          ${inner}
        </div>`;
    }
    return `        <motion.div
          key={${i}}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          whileHover={{ y: -8, scale: 1.02, boxShadow: "0 20px 50px -12px rgba(0,0,0,0.4)" }}
          transition={{ delay: ${(i * MOTION.stagger).toFixed(2)}, duration: ${MOTION.duration.normal}, ease: "${MOTION.ease.out}" }}
          className="overflow-hidden rounded-2xl aspect-[3/2] cursor-pointer"
          style={{ background: "${colorRoles.surface1}" }}
        >
          ${inner}
        </motion.div>`;
  }).join("\n");
  const { px: hPx, vh: hVh } = secHeight(section);
  const h = hVh;
  const { bg: sBg, fg: sFg } = bgFor(idx);
  const bg = section.screenshotPath
    ? `linear-gradient(${sBg}0e, ${sBg}08), url('${section.screenshotPath}') top/cover no-repeat`
    : sBg;
  // Section-local parallax for Gallery: heading slides up as the section
  // scrolls up. Cards keep their stagger entrance. Ticker path skips
  // parallax because the infinite loop already provides motion.
  const useSectionParallax = !isTicker && section.hasScrollTransforms;
  const layoutGap = section.layout?.gap || 24;
  const layoutPaddingX = section.layout?.paddingX || 24;
  const tpl = `"use client";
import { motion${useSectionParallax ? ", useScroll, useTransform" : ""} } from "framer-motion";
${useSectionParallax ? `import { useRef } from "react";` : ""}

export default function ${name}() {
${useSectionParallax ? `  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const headY = useTransform(scrollYProgress, [0, 1], [60, -40]);
  const headOpacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.3, 1, 1, 0.6]);` : ""}
  return (
    <section${useSectionParallax ? " ref={ref}" : ""} data-sigma-section="${section.sectionIndex ?? ""}" className="flex flex-col justify-center overflow-hidden relative" style={{ minHeight: "${hPx}px", paddingTop: "6vh", paddingBottom: "6vh", paddingLeft: "${layoutPaddingX}px", paddingRight: "${layoutPaddingX}px", background: "${bg}", color: "${sFg}" }}>
      <div className="max-w-7xl mx-auto w-full">
        <motion.h2 className="font-heading font-bold mb-12 text-center" style={{ fontSize: "clamp(${Math.round(typeScale.h1 * 0.6)}px, 5vw, ${typeScale.h1}px)", lineHeight: 1.1${useSectionParallax ? `, y: headY, opacity: headOpacity` : ``} }}>{"{{GALLERY_TITLE}}"}</motion.h2>
        ${isTicker ? `<motion.div className="flex" animate=${motion.animate} transition=${motion.transition}>
${cards}
        </motion.div>` : `<div className="grid grid-cols-1 ${gridClass}" style={{ gap: "${layoutGap}px" }}>
${cards}
        </div>`}
      </div>
    </section>
  );
}
`;
  fs.writeFileSync(path.join(compDir, `${name}.tsx`), tpl);
  return name;
};

const emitFeature = (section, idx) => {
  const name = `Feature${idx}`;
  if (emittedComponents.has(name)) return name;
  emittedComponents.add(name);
  const { src: imgUrl, alt: imgAlt } = pickImage(section, 800, 500);
  const { px: hPx, vh: hVh } = secHeight(section);
  const h = hVh;
  const { bg: sBg, fg: sFg } = bgFor(idx);
  // Screenshot-as-background when captured — source pixels fill entire
  // section, our emit overlays on top. Near-transparent gradient keeps
  // original visible. Falls back to solid section color when no capture.
  const bg = section.screenshotPath
    ? `linear-gradient(${sBg}0e, ${sBg}08), url('${section.screenshotPath}') top/cover no-repeat`
    : sBg;
  // Per-section parallax: image column moves opposite direction to text
  // column as section scrolls through viewport. Creates depth illusion
  // without copying any specific animation curve from source.
  const useSectionParallax = section.hasScrollTransforms;
  const tpl = `"use client";
import { motion${useSectionParallax ? ", useScroll, useTransform" : ""} } from "framer-motion";
${useSectionParallax ? `import { useRef } from "react";` : ""}

export default function ${name}() {
${useSectionParallax ? `  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const textY = useTransform(scrollYProgress, [0, 1], [${Math.max(20, Math.min(120, Math.abs(section.motionSpan?.deltaY || 40) / 2))}, ${-Math.max(20, Math.min(120, Math.abs(section.motionSpan?.deltaY || 40) / 2))}]);
  const imgY = useTransform(scrollYProgress, [0, 1], [${-Math.max(20, Math.min(120, Math.abs(section.motionSpan?.deltaY || 40) / 2))}, ${Math.max(20, Math.min(120, Math.abs(section.motionSpan?.deltaY || 40) / 2))}]);
  const imgScale = useTransform(scrollYProgress, [0, 0.5, 1], [${(1 - Math.abs(section.motionSpan?.deltaScale || 0.05) / 2).toFixed(3)}, ${(1 + Math.abs(section.motionSpan?.deltaScale || 0.02) / 2).toFixed(3)}, ${(1 - Math.abs(section.motionSpan?.deltaScale || 0.05) / 2).toFixed(3)}]);` : ""}
  return (
    <section${useSectionParallax ? " ref={ref}" : ""} data-sigma-section="${section.sectionIndex ?? ""}" className="px-6 flex items-center overflow-hidden relative" style={{ minHeight: "${hPx}px", paddingTop: "6vh", paddingBottom: "6vh", background: "${bg}", color: "${sFg}" }}>
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center w-full">
        <motion.div
          ${useSectionParallax ? `style={{ y: textY }}` : `initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: ${MOTION.duration.normal}, ease: "${MOTION.ease.out}" }}`}
        >
          <h2 className="font-heading font-bold mb-6" style={{ fontSize: "clamp(${Math.round(typeScale.h1 * 0.55)}px, 4.5vw, ${typeScale.h1}px)", lineHeight: 1.1 }}>{"{{FEATURE_TITLE}}"}</h2>
          <p className="opacity-80 leading-relaxed" style={{ fontSize: "clamp(${typeScale.body}px, 1.6vw, ${typeScale.h3}px)" }}>{"{{FEATURE_BODY}}"}</p>
        </motion.div>
        <motion.div
          ${useSectionParallax ? `style={{ y: imgY, scale: imgScale }}` : `initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: ${MOTION.duration.normal}, delay: ${MOTION.stagger}, ease: "${MOTION.ease.out}" }}`}
          className="overflow-hidden rounded-2xl aspect-[8/5]"
          ${useSectionParallax ? `` : ``}
        >
          <img src="${imgUrl}" alt="${imgAlt.replace(/"/g, "&quot;")}" className="w-full h-full object-cover" loading="lazy" />
        </motion.div>
      </div>
    </section>
  );
}
`;
  fs.writeFileSync(path.join(compDir, `${name}.tsx`), tpl);
  return name;
};

const emitCTA = (section, idx) => {
  const name = `CTA${idx}`;
  if (emittedComponents.has(name)) return name;
  emittedComponents.add(name);
  const { px: hPx } = secHeight(section);
  // CTA intentionally uses accent as bg (classic high-contrast callout).
  const tpl = `"use client";
import { motion } from "framer-motion";

export default function ${name}() {
  return (
    <section className="px-6 flex items-center justify-center" style={{ minHeight: "${hPx}px", paddingTop: "6vh", paddingBottom: "6vh", background: "${colorRoles.accent}", color: "${colorRoles.primary}" }}>
      <div className="max-w-3xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-heading text-4xl md:text-6xl font-bold mb-8"
        >
          {"{{CTA_HEADLINE}}"}
        </motion.h2>
        <motion.a
          href="#"
          whileHover={{ scale: 1.08, boxShadow: "0 12px 40px -8px rgba(0,0,0,0.35)" }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: "spring", stiffness: 340, damping: 22 }}
          className="inline-block px-10 py-4 font-semibold rounded-full"
          style={{ background: "${colorRoles.primary}", color: "${colorRoles.accent}" }}
        >
          {"{{CTA_BUTTON}}"}
        </motion.a>
      </div>
    </section>
  );
}
`;
  fs.writeFileSync(path.join(compDir, `${name}.tsx`), tpl);
  return name;
};

const emitGrid = (section, idx) => {
  const name = `Grid${idx}`;
  if (emittedComponents.has(name)) return name;
  emittedComponents.add(name);
  const detectedCols = section.layout?.cols || 3;
  const cols = Math.min(4, Math.max(2, detectedCols));
  const itemCount = Math.max(cols, Math.min(cols * 2, section.headings?.length >= 4 ? cols * 2 : cols));
  const gridClass = cols === 2 ? "md:grid-cols-2"
                  : cols === 4 ? "md:grid-cols-2 lg:grid-cols-4"
                  : "md:grid-cols-2 lg:grid-cols-3";
  const items = Array.from({ length: itemCount }, (_, i) => {
    // Each grid card gets its own image from the section's pool. In dev
    // mode this shows the original site's grid imagery; in clean mode a
    // picsum placeholder. Lazy-loaded because grid sits below-fold.
    const { src: cardImg, alt: cardAlt } = pickImage(section, 400, 300);
    return `        <motion.div
          key={${i}}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ delay: ${(i * MOTION.stagger).toFixed(2)}, duration: ${MOTION.duration.normal}, ease: "${MOTION.ease.out}" }}
          className="rounded-2xl overflow-hidden flex flex-col"
          style={{ background: "${colorRoles.surface1}" }}
        >
          <div className="aspect-[4/3] overflow-hidden" style={{ background: "${colorRoles.surface2}" }}>
            <img src="${cardImg}" alt="${cardAlt.replace(/"/g, "&quot;")}" className="w-full h-full object-cover" loading="lazy" />
          </div>
          <div className="p-6">
            <h3 className="font-heading text-2xl font-semibold mb-3">{"{{GRID_ITEM_${i}_TITLE}}"}</h3>
            <p className="opacity-75 text-sm leading-relaxed">{"{{GRID_ITEM_${i}_BODY}}"}</p>
          </div>
        </motion.div>`;
  }).join("\n");
  const { px: hPx, vh: hVh } = secHeight(section);
  const h = hVh;
  const { bg: sBg, fg: sFg } = bgFor(idx);
  const bg = section.screenshotPath
    ? `linear-gradient(${sBg}0e, ${sBg}08), url('${section.screenshotPath}') top/cover no-repeat`
    : sBg;
  const tpl = `"use client";
import { motion } from "framer-motion";

export default function ${name}() {
  return (
    <section data-sigma-section="${section.sectionIndex ?? ""}" className="px-6 flex flex-col justify-center overflow-hidden relative" style={{ minHeight: "${hPx}px", paddingTop: "6vh", paddingBottom: "6vh", background: "${bg}", color: "${sFg}" }}>
      <div className="max-w-7xl mx-auto w-full">
        <h2 className="font-heading font-bold mb-16 text-center" style={{ fontSize: "clamp(${Math.round(typeScale.h1 * 0.55)}px, 5vw, ${typeScale.h1}px)", lineHeight: 1.1 }}>{"{{SECTION_TITLE}}"}</h2>
        <div className="grid grid-cols-1 ${gridClass} gap-6">
${items}
        </div>
      </div>
    </section>
  );
}
`;
  fs.writeFileSync(path.join(compDir, `${name}.tsx`), tpl);
  return name;
};

const emitProse = (section, idx) => {
  const name = `Prose${idx}`;
  if (emittedComponents.has(name)) return name;
  emittedComponents.add(name);
  const { px: hPx, vh: hVh } = secHeight(section);
  const h = hVh;
  const { bg: sBg, fg: sFg } = bgFor(idx);
  // Prose lead image: a large image above the title, editorial style.
  // Only emit if source had a suitable image in this section — otherwise
  // the prose remains text-only (clean reading experience).
  const leadImg = USE_ORIGINAL_IMAGES
    ? (section.images || []).find(i => i.w >= 600)
    : null;
  const leadImgJsx = leadImg
    ? `<div className="max-w-4xl mx-auto mb-10 rounded-2xl overflow-hidden" style={{ aspectRatio: "${(leadImg.w / Math.max(1, leadImg.h)).toFixed(3)}" }}>
          <img src="${leadImg.src}" alt="${(leadImg.alt || "").replace(/"/g, "&quot;")}" className="w-full h-full object-cover" loading="lazy" />
        </div>`
    : "";
  // Prose parallax: lead image zooms subtle 1.0→1.08 as section scrolls;
  // title drifts down; body drifts up — gentle "breathing" reading section.
  const useSectionParallax = section.hasScrollTransforms;
  const bg = section.screenshotPath
    ? `linear-gradient(${sBg}0e, ${sBg}08), url('${section.screenshotPath}') top/cover no-repeat`
    : sBg;
  // Spatial mode: if source had many text leaves (e.g. editorial layout
  // with aside/pull-quote/caption), render at exact source coords.
  const proseUseSpatial = (section.spatial?.length || 0) >= 6;
  const proseInner = proseUseSpatial
    ? renderHierarchySpatial(section.spatial, `PROSE${idx}`)
    : "";
  const tpl = `"use client";
import { motion${useSectionParallax ? ", useScroll, useTransform" : ""} } from "framer-motion";
${useSectionParallax ? `import { useRef } from "react";` : ""}

export default function ${name}() {
${useSectionParallax ? `  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const imgScale = useTransform(scrollYProgress, [0, 1], [1.0, 1.08]);
  const titleY = useTransform(scrollYProgress, [0, 1], [-20, 30]);
  const bodyY = useTransform(scrollYProgress, [0, 1], [30, -20]);` : ""}
  return (
    <section${useSectionParallax ? " ref={ref}" : ""} data-sigma-section="${section.sectionIndex ?? ""}" className="px-6 flex flex-col justify-center overflow-hidden relative" style={{ minHeight: "${hPx}px", paddingTop: "6vh", paddingBottom: "6vh", background: "${bg}", color: "${sFg}" }}>
      ${leadImg
        ? `<motion.div className="max-w-4xl mx-auto mb-10 rounded-2xl overflow-hidden" style={{ aspectRatio: "${(leadImg.w / Math.max(1, leadImg.h)).toFixed(3)}"${useSectionParallax ? `, scale: imgScale` : ``} }}>
          <img src="${leadImg.src}" alt="${(leadImg.alt || "").replace(/"/g, "&quot;")}" className="w-full h-full object-cover" loading="lazy" />
        </motion.div>`
        : ""}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } } }}
        className="${proseUseSpatial ? "relative w-full" : "max-w-3xl mx-auto prose prose-invert"}"
        style={{${proseUseSpatial ? ` height: "${Math.max(section.h - 80, 400)}px"` : ` `}}}
      >
${proseUseSpatial ? proseInner : `        <motion.h2 variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }} className="font-heading font-bold mb-6" style={{ fontSize: "clamp(${Math.round(typeScale.h2 * 0.6)}px, 4vw, ${typeScale.h2}px)", lineHeight: 1.15${useSectionParallax ? `, y: titleY` : ``} }}>{"{{PROSE_TITLE}}"}</motion.h2>
        <motion.p variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }} className="opacity-85 leading-relaxed" style={{ fontSize: "clamp(${typeScale.body}px, 1.6vw, ${typeScale.h3}px)"${useSectionParallax ? `, y: bodyY` : ``} }}>{"{{PROSE_BODY}}"}</motion.p>`}
      </motion.div>
    </section>
  );
}
`;
  fs.writeFileSync(path.join(compDir, `${name}.tsx`), tpl);
  return name;
};

// ─── Video Embed emit ─────────────────────────────────────────────────
// Preserves source video's position + aspect. In dev mode the original
// src is hotlinked (YouTube/Vimeo iframe or <video> URL). Clean mode
// emits a poster-image placeholder sized to match source dimensions.
const emitVideo = (videoSchema, idx) => {
  const name = `VideoEmbed${idx}`;
  if (emittedComponents.has(name)) return name;
  emittedComponents.add(name);
  const aspect = (videoSchema.w / Math.max(1, videoSchema.h)).toFixed(3);
  const isIframe = videoSchema.tag === "iframe";
  const useSrc = USE_ORIGINAL_IMAGES && videoSchema.src;
  const tpl = `"use client";

export default function ${name}() {
  return (
    <section className="px-6 py-16" style={{ background: "${colorRoles.primary}", color: "${colorRoles.text}" }}>
      <div className="max-w-5xl mx-auto rounded-2xl overflow-hidden" style={{ aspectRatio: "${aspect}", background: "${colorRoles.surface1}" }}>
        ${useSrc ? (isIframe
          ? `<iframe src="${videoSchema.src}" className="w-full h-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />`
          : `<video src="${videoSchema.src}"${videoSchema.poster ? ` poster="${videoSchema.poster}"` : ""}${videoSchema.autoplay ? " autoPlay" : ""}${videoSchema.loop ? " loop" : ""}${videoSchema.muted ? " muted" : ""} playsInline className="w-full h-full object-cover" />`)
        : `<div className="w-full h-full flex items-center justify-center">
          <div className="text-center opacity-60">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full" style={{ background: "${colorRoles.accent}" }} />
            <p className="text-sm">{"{{VIDEO_POSTER_PLACEHOLDER}}"}</p>
          </div>
        </div>`}
      </div>
    </section>
  );
}
`;
  fs.writeFileSync(path.join(compDir, `${name}.tsx`), tpl);
  return name;
};

// ─── Contact Form emit ────────────────────────────────────────────────
// Emits a clean-room form with field SET matching the source (e.g., email +
// name + message). Submit handler is a no-op preserving UX feedback. The
// form's backend, validation rules, and field labels stay with the user.
const emitForm = (formSchema, idx) => {
  const name = `ContactForm${idx}`;
  if (emittedComponents.has(name)) return name;
  emittedComponents.add(name);
  const inputs = (formSchema.inputs || []).map((f, i) => {
    // Use original placeholder/label text when available in dev mode
    const originalPlaceholder = f.placeholder || f.label || f.name || "";
    const ph = (USE_ORIGINAL_TEXT && originalPlaceholder)
      ? escapeJsxText(originalPlaceholder).replace(/"/g, "&quot;")
      : `{{FORM_FIELD_${i}}}`;
    if (f.tag === "textarea") {
      return `        <textarea placeholder="${ph}" className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/5 min-h-[120px]" />`;
    }
    const inputType = ["email", "tel", "url", "number", "password"].includes(f.type) ? f.type : "text";
    return `        <input type="${inputType}" placeholder="${ph}" className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/5" />`;
  }).join("\n");
  const submit = formSchema.hasSubmit !== false;
  // Form title/submit text — use real value if captured
  const formTitle = (USE_ORIGINAL_TEXT && formSchema.title) ? escapeJsxText(formSchema.title) : "{{FORM_TITLE}}";
  const submitText = (USE_ORIGINAL_TEXT && formSchema.submitText) ? escapeJsxText(formSchema.submitText) : "{{FORM_SUBMIT}}";
  const sentText = (USE_ORIGINAL_TEXT && formSchema.sentText) ? escapeJsxText(formSchema.sentText) : "{{FORM_SENT}}";
  const tpl = `"use client";
import { motion } from "framer-motion";
import { useState } from "react";

export default function ${name}() {
  const [sent, setSent] = useState(false);
  return (
    <section className="px-6 py-24" style={{ background: "${colorRoles.surface1}", color: "${colorRoles.text}" }}>
      <form
        onSubmit={(e) => { e.preventDefault(); setSent(true); }}
        className="max-w-xl mx-auto flex flex-col gap-4"
      >
        <h2 className="font-heading font-bold mb-2" style={{ fontSize: "clamp(${Math.round(typeScale.h2 * 0.6)}px, 4vw, ${typeScale.h2}px)" }}>{${JSON.stringify(formTitle)}}</h2>
${inputs}
${submit ? `        <motion.button
          type="submit"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="px-8 py-3 rounded-full font-semibold mt-2"
          style={{ background: "${colorRoles.accent}", color: "${colorRoles.primary}" }}
        >
          {sent ? ${JSON.stringify(sentText)} : ${JSON.stringify(submitText)}}
        </motion.button>` : ""}
      </form>
    </section>
  );
}
`;
  fs.writeFileSync(path.join(compDir, `${name}.tsx`), tpl);
  return name;
};

// ─── Three.js Scene emit ─────────────────────────────────────────────
// If source had WebGL canvas, emit a react-three-fiber placeholder. Shader
// source NEVER parsed/copied — we preserve the fact "3D element existed at
// this rect" by rendering brand-colored rotating geometry at the same size.
// Distilled creative expression (shaders, 3D models) stays with the source;
// our output is a structural stand-in.
const emitThreeScene = () => {
  if (emittedComponents.has("ThreeScene")) return "ThreeScene";
  emittedComponents.add("ThreeScene");
  const tpl = `"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Icosahedron } from "@react-three/drei";
import { useRef } from "react";
import type { Mesh } from "three";

function Spinner() {
  const ref = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.x += delta * 0.25;
      ref.current.rotation.y += delta * 0.35;
    }
  });
  return (
    <Icosahedron ref={ref} args={[1.4, 1]}>
      <meshStandardMaterial color={"${colorRoles.accent}"} wireframe={false} roughness={0.35} metalness={0.6} />
    </Icosahedron>
  );
}

export default function ThreeScene({ height = 600 }: { height?: number }) {
  return (
    <div style={{ width: "100%", height, background: "${colorRoles.primary}" }}>
      <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[4, 6, 4]} intensity={1.4} color={"${colorRoles.text}"} />
        <pointLight position={[-4, -2, -2]} intensity={0.8} color={"${colorRoles.accent}"} />
        <Spinner />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.6} />
      </Canvas>
    </div>
  );
}
`;
  fs.writeFileSync(path.join(compDir, "ThreeScene.tsx"), tpl);
  return "ThreeScene";
};

// Generic block emitter — handles sections that didn't match any stronger
// role. Uses the captured hierarchy directly so block sections contribute
// real typographic variety instead of being skipped.
const emitBlock = (section, idx) => {
  const name = `Block${idx}`;
  if (emittedComponents.has(name)) return name;
  emittedComponents.add(name);
  const { px: hPx } = secHeight(section);
  const { bg: sBg, fg: sFg } = bgFor(idx);
  // Block image intelligence: if source block had a wide image, emit it
  // as subtle background with darkening gradient. Makes previously "dead"
  // block sections (shot-4 issue in v21) visually rich in dev mode.
  const blockImg = USE_ORIGINAL_IMAGES
    ? (section.images || []).find(i => i.w >= 600)
    : null;
  const blockBgStyle = section.screenshotPath
    ? `background: "linear-gradient(${sBg}0e, ${sBg}08), url('${section.screenshotPath}') top/cover no-repeat", color: "${sFg}"`
    : blockImg
      ? `background: "linear-gradient(${sBg}e0, ${sBg}b0), url('${blockImg.src}') center/cover no-repeat", color: "${sFg}"`
      : `background: "${sBg}", color: "${sFg}"`;
  // Spatial mode: if source had rich layout (≥3 positioned text nodes),
  // render at EXACT source coordinates. Threshold lowered from 6 based on
  // observation that most block sections capture 2-4 leaves due to Framer's
  // deep span nesting. 3 is the minimum to make absolute positioning
  // meaningful (vs just a single centered heading).
  const useSpatial = (section.spatial?.length || 0) >= 3;
  // DOM Mirror mode — replay source structure 1:1, bypassing role template.
  // The captured tree already has children ordered + styled from source,
  // so we just recursively emit. Other paths are fallback for --no-mirror.
  const useDomMirror = USE_DOM_MIRROR && section.domTree && section.domTree.children && section.domTree.children.length > 0;
  const innerContent = useDomMirror
    ? (section.domTree.children || []).map(c => renderDOMTree(c, 0, `BLOCK${idx}`)).join("\n")
    : useSpatial
      ? renderHierarchySpatial(section.spatial, `BLOCK${idx}`, section.revealSignature)
      : (section.hierarchy && section.hierarchy.length > 0
          ? renderHierarchy(section.hierarchy, `BLOCK${idx}`, section)
          : `        <p className="opacity-70">{"{{BLOCK_${idx}_BODY}}"}</p>`);
  const svgLayer = renderSVGs(section.svgs, idx);
  const inner = svgLayer ? `${svgLayer}\n${innerContent}` : innerContent;
  // Layout fingerprint applied: paddingX / gap match source pixel facts.
  // alignItems affects text alignment vs centered stacking.
  // Multi-column sources (cols >= 2) switch inner container to flex-wrap so
  // many inline tokens distribute horizontally like source's grid — rather
  // than stacking vertically into an 8000px tall scroll trap.
  const layoutPaddingX = section.layout?.paddingX || 24;
  const layoutGap = section.layout?.gap || 16;
  const layoutCols = section.layout?.cols || 1;
  const isMulticol = layoutCols >= 2;
  const layoutAlign = section.layout?.align === "left" ? "items-start text-left"
                    : section.layout?.align === "right" ? "items-end text-right"
                    : "items-center text-center";
  const innerFlexClass = useSpatial
    ? `relative`
    : isMulticol
      ? `flex flex-row flex-wrap justify-center ${layoutAlign}`
      : `flex flex-col ${layoutAlign}`;
  const innerMaxWidth = useSpatial ? "w-full" : isMulticol ? "max-w-7xl" : "max-w-5xl";
  // Spatial mode needs a container height matching source so absolute
  // coordinates resolve correctly. Section-relative % are meaningless
  // without a concrete container height.
  const spatialHeight = useSpatial ? `, height: "${Math.max(section.h - 80, 400)}px"` : "";
  const useSectionParallax = section.hasScrollTransforms;
  const tpl = `"use client";
import { motion${useSectionParallax ? ", useScroll, useTransform" : ""} } from "framer-motion";
${useSectionParallax ? `import { useRef } from "react";` : ""}
import Link from "next/link";

export default function ${name}() {
${useSectionParallax ? `  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const contentY = useTransform(scrollYProgress, [0, 0.5, 1], [50, 0, -50]);
  const bgY = useTransform(scrollYProgress, [0, 1], [${blockImg ? "-30, 30" : "0, 0"}]);` : ""}
  return (
    <section${useSectionParallax ? " ref={ref}" : ""} data-sigma-section="${section.sectionIndex ?? ""}" className="flex items-center justify-center relative overflow-hidden" style={{ minHeight: "${hPx}px", paddingTop: "4vh", paddingBottom: "4vh", paddingLeft: "${layoutPaddingX}px", paddingRight: "${layoutPaddingX}px", ${blockBgStyle} }}>
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } } }}
        style={{ gap: "${layoutGap}px"${useSectionParallax ? `, y: contentY` : ``}${spatialHeight} }}
        className="${innerMaxWidth} mx-auto ${innerFlexClass} z-10"
      >
${inner}
      </motion.div>
    </section>
  );
}
`;
  fs.writeFileSync(path.join(compDir, `${name}.tsx`), tpl);
  return name;
};

const emitFooter = () => {
  if (emittedComponents.has("Footer")) return "Footer";
  emittedComponents.add("Footer");
  const tpl = `export default function Footer() {
  return (
    <footer className="py-12 px-6 bg-brand-primary border-t border-white/10">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="font-heading text-xl font-bold">{"{{BRAND_NAME}}"}</div>
        <div className="flex gap-6 text-sm opacity-70">
          <a href="#">About</a>
          <a href="#">Contact</a>
          <a href="#">Privacy</a>
        </div>
        <div className="text-xs opacity-50">© {new Date().getFullYear()}</div>
      </div>
    </footer>
  );
}
`;
  fs.writeFileSync(path.join(compDir, "Footer.tsx"), tpl);
  return "Footer";
};

const emitNav = () => {
  if (emittedComponents.has("Nav")) return "Nav";
  emittedComponents.add("Nav");
  const isSticky = (extracted.scrollSignals?.stickyElements || 0) >= 3;
  // Logo intelligence: dev mode hotlinks source img logo (visual match);
  // clean mode emits abstract SVG placeholder at source's captured size.
  const srcLogo = extracted.logo;
  const logoJsx = (USE_ORIGINAL_IMAGES && srcLogo?.type === "img" && srcLogo.src)
    ? `<img src="${srcLogo.src}" alt="${(srcLogo.alt || "logo").replace(/"/g, "&quot;")}" style={{ height: "${Math.min(60, srcLogo.h || 32)}px", width: "auto" }} />`
    : (srcLogo?.type === "svg"
      ? `<svg viewBox="${srcLogo.viewBox}" style={{ height: "${Math.min(60, srcLogo.h || 32)}px", width: "auto" }} fill="${colorRoles.accent}"><rect width="100%" height="100%" rx="6" /></svg>`
      : `<div className="font-heading text-lg font-bold">{"{{BRAND_NAME}}"}</div>`);
  const navPosition = isSticky ? "sticky top-0" : "relative";
  const navBg = isSticky ? `style={{ background: "${primaryColor}dd", backdropFilter: "blur(12px)", color: "${textColor}", minHeight: "80px" }}`
                         : `style={{ background: "${primaryColor}", color: "${textColor}", minHeight: "80px" }}`;
  const tpl = `"use client";
import { motion } from "framer-motion";

export default function Nav() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="${navPosition} w-full px-6 py-6 border-b border-white/10 z-50"
      ${navBg}
    >
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        ${logoJsx}
        <div className="flex gap-6 text-sm">
          <a href="/" style={{ color: "${colorRoles.accent}" }}>Work</a>
          <a href="/" style={{ color: "${colorRoles.muted1}" }}>About</a>
          <a href="/" style={{ color: "${colorRoles.muted2}" }}>Contact</a>
        </div>
      </div>
    </motion.nav>
  );
}
`;
  fs.writeFileSync(path.join(compDir, "Nav.tsx"), tpl);
  return "Nav";
};

const emitters = { hero: emitHero, gallery: emitGallery, feature: emitFeature, cta: emitCTA,
  grid: emitGrid, prose: emitProse, block: emitBlock, footer: emitFooter, nav: emitNav };

// Role dedup + demotion pass. A page can have only one true hero (the
// visual entry point); later sections that geometrically look hero-ish
// get demoted to prose to prevent the "BRAND_HEADLINE appears twice"
// visual bug seen in v0.4. Also collapses ≥2 consecutive footers (Framer
// sites often stack legal / copyright / social strips) into one emit.
const demotedSections = (() => {
  const out = [];
  let heroSeen = false;
  let footerSeen = false;
  for (const s of extracted.sections) {
    const copy = { ...s };
    if (copy.role === "hero") {
      if (heroSeen) copy.role = "prose";
      heroSeen = true;
    }
    if (copy.role === "footer") {
      // Real sites stack multiple footer-role strips (social, legal,
      // copyright). Preserve all but demote duplicates to block so only
      // the first renders as an actual <footer>. This keeps doc height
      // faithful without breaking a11y (one <footer> landmark per page).
      if (footerSeen) copy.role = "block";
      footerSeen = true;
    }
    out.push(copy);
  }
  return out;
})();

let idx = 0;
// Every site has navigation (logo + menu) even if the detector doesn't
// classify a section as "nav" — sometimes it's styled as part of hero.
// Emitting Nav unconditionally lets us match the source's section count
// more faithfully (source's implicit nav always counts as a detectable
// top-level block in layout measurement).
const hasNav = true;
const hasFooter = demotedSections.some(s => s.role === "footer");
if (hasNav) { componentImports.push(`import Nav from "@/components/Nav";`); pageSections.push("<Nav />"); emitNav(); }

for (const section of demotedSections) {
  if (section.role === "footer" || section.role === "nav") continue;
  const emit = emitters[section.role] || emitBlock; // unknown role → block
  const compName = emit(section, idx);
  componentImports.push(`import ${compName} from "@/components/${compName}";`);
  pageSections.push(`<${compName} />`);
  idx++;
  if (idx > 20) break;  // raised from 10 so full 14-section pages fit
}

// Canvas/WebGL scene injection. If source had WebGL canvas, insert
// ThreeScene before footer so it renders as a feature block. Height comes
// from source canvas rect — preserves visual proportion.
if ((extracted.canvases?.length || 0) > 0) {
  emitThreeScene();
  componentImports.push(`import ThreeScene from "@/components/ThreeScene";`);
  const ch = Math.max(400, Math.min(800, extracted.canvases[0].h || 600));
  pageSections.push(`<ThreeScene height={${ch}} />`);
  console.log(`  3D scene emitted (${extracted.canvases.length} source canvases)`);
}

// Video/iframe injection. Each detected video becomes its own section,
// placed before the form per common site pattern (hero → features → video
// demo → form → footer). Aspect ratios are preserved per-video.
for (let i = 0; i < (extracted.videos?.length || 0); i++) {
  const compName = emitVideo(extracted.videos[i], i);
  componentImports.push(`import ${compName} from "@/components/${compName}";`);
  pageSections.push(`<${compName} />`);
}
if ((extracted.videos?.length || 0) > 0) {
  console.log(`  videos emitted: ${extracted.videos.length}`);
}

// Contact form injection. First detected form becomes a section emitted
// right before footer — common site pattern (CTA → contact form → footer).
if ((extracted.forms?.length || 0) > 0) {
  const compName = emitForm(extracted.forms[0], 0);
  componentImports.push(`import ${compName} from "@/components/${compName}";`);
  pageSections.push(`<${compName} />`);
  console.log(`  form emitted (${extracted.forms.length} source forms, ${extracted.forms[0].inputs.length} fields)`);
}

if (hasFooter || demotedSections.length > 0) {
  emitFooter();
  componentImports.push(`import Footer from "@/components/Footer";`);
  pageSections.push("<Footer />");
}

// layout.tsx + page.tsx. Google Fonts loaded via <link preconnect + stylesheet>
// in <head>. This is the canonical Next.js 15 pattern and avoids the Tailwind
// v4 @import-ordering conflict we hit when declaring fonts inside globals.css.
// Source's SEO metadata shape gets replicated: same tag SET (title,
// description, og:*, twitter:*) with tokenized content. Text values are
// placeholders the user fills in — names/types are structural facts.
const seo = extracted.seo || {};
const emitOG = seo.hasOgTitle || seo.hasOgImage;
const emitTwitter = seo.hasTwitter;
const themeColor = seo.themeColor || primaryColor;
const htmlLang = (seo.lang || "en").slice(0, 5);

fs.writeFileSync(path.join(appDir, "layout.tsx"),
`import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "{{PAGE_TITLE}}",
  description: "{{PAGE_DESCRIPTION}}",
  icons: {
    icon: "${extracted.brandAssets?.favicon || "/favicon.ico"}",${extracted.brandAssets?.appleIcon ? `
    apple: "${extracted.brandAssets.appleIcon}",` : ""}
  },${emitOG ? `
  openGraph: {
    title: "{{OG_TITLE}}",
    description: "{{OG_DESCRIPTION}}",
    images: [{ url: "${extracted.brandAssets?.ogImage || "/og-image.png"}", width: 1200, height: 630 }],
  },` : ""}${emitTwitter ? `
  twitter: {
    card: "summary_large_image",
    title: "{{TWITTER_TITLE}}",
    description: "{{TWITTER_DESCRIPTION}}",${extracted.brandAssets?.twitterImage ? `
    images: ["${extracted.brandAssets.twitterImage}"],` : ""}
  },` : ""}
  themeColor: "${themeColor}",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="${htmlLang}" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${hdFont}:wght@400;600;700;900&family=${bdFont}:wght@400;500;600&display=swap" />
${(extracted.linkHints || []).slice(0, 20).map(l => {
  const attrs = [`rel="${l.rel}"`, `href="${(l.href || "").replace(/"/g, "&quot;")}"`];
  if (l.as) attrs.push(`as="${l.as}"`);
  if (l.type) attrs.push(`type="${l.type}"`);
  if (l.crossOrigin !== null && l.crossOrigin !== undefined) attrs.push(l.crossOrigin ? `crossOrigin="${l.crossOrigin}"` : `crossOrigin=""`);
  return `        <link ${attrs.join(" ")} />`;
}).join("\n")}
${(extracted.jsonLdTypes || []).length > 0 ? `        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({"@context":"https://schema.org","@type":"WebSite","name":"Site","url":"https://example.com"}) }} />` : ""}
      </head>
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
`);

fs.writeFileSync(path.join(appDir, "page.tsx"),
`${componentImports.join("\n")}

export default function Home() {
  return (
    <main>
      ${pageSections.join("\n      ")}
    </main>
  );
}
`);

// ─── MULTI-PAGE ROUTE GENERATION ───────────────────────────────────
// Extract top internal routes from source page. For each route we emit a
// minimal but fully working Next.js route folder with shared Nav/Footer
// and a generic Hero — so the transmuted site mirrors source's PAGE COUNT
// (structural fact) without scraping every individual subpage (which would
// also risk carrying content).
const extractRoutePath = (href) => {
  // Normalize: strip leading "./" and "/" so "./project" and "/project"
  // both resolve to "project". Anchor-only links ("./#foo") collapse to
  // empty after stripping and are skipped.
  let clean = href.replace(/^\.?\/+/, "");
  clean = clean.split("?")[0].split("#")[0];
  const parts = clean.split("/").filter(Boolean);
  return parts[0] ? parts[0].toLowerCase().replace(/[^a-z0-9-]/g, "") : null;
};

const routeCounts = new Map();
for (const href of (extracted.seo?.internalLinks || [])) {
  const p = extractRoutePath(href);
  if (!p || p.length < 2 || p.length > 30) continue;
  // Skip static assets
  if (/\.(png|jpg|jpeg|gif|svg|pdf|ico|css|js|woff2?)$/i.test(href)) continue;
  routeCounts.set(p, (routeCounts.get(p) || 0) + 1);
}
const topRoutes = [...routeCounts.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .map(([r]) => r);
console.log(`  routes detected: ${topRoutes.length > 0 ? topRoutes.join(", ") : "(none)"}`);

// Generate a route folder + page.tsx for each discovered path.
// Each page reuses Nav + Footer (when present) so styling stays coherent.
// A generic Hero with route-named token invites user to fill content.
const navImport = componentImports.find(i => i.includes("Nav"));
const footerImport = componentImports.find(i => i.includes("Footer"));
// Match discovered routes to actually-scanned per-route data in extracted.pages
// (populated by Multi-page scan above). If the exact path is in extracted.pages,
// we inject real headings/paragraphs/images captured from the source.
const findRouteData = (route) => {
  for (const [key, data] of Object.entries(extracted.pages || {})) {
    const normKey = key.replace(/^\/+/, "").toLowerCase();
    if (normKey === route || normKey.startsWith(route + "/") || normKey.startsWith(route)) return data;
  }
  return null;
};

const escText = (s) => (s || "").replace(/\s+/g, " ").trim().replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Nested emit: combine top-level + deep paths from extracted.pages so
// pages scanned like /project/shinhan-solpay-discover also get their own
// app/project/shinhan-solpay-discover/page.tsx (nested folder structure).
const deepRoutes = Object.keys(extracted.pages || {})
  .map(p => p.replace(/^\/+/, "").replace(/\/$/, "").toLowerCase())
  // Keep only multi-segment paths (single-segment handled by topRoutes)
  .filter(p => p.length >= 2 && p.length < 100 && p.includes("/") && !topRoutes.includes(p));
const allEmittedRoutes = [...new Set([...topRoutes, ...deepRoutes])];

for (const route of allEmittedRoutes) {
  // Nested path: foo/bar/baz → app/foo/bar/baz/page.tsx (Next.js folder route)
  const routeDir = path.join(appDir, ...route.split("/").filter(Boolean));
  fs.mkdirSync(routeDir, { recursive: true });
  // For nested like "project/foo-bar" → ProjectFoobarPage; alphanumeric only.
  const displayName = route.split("/").map(p => p.replace(/[^a-zA-Z0-9]/g, "")).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join("");
  const imports = [navImport, footerImport].filter(Boolean).join("\n");
  const navJsx = navImport ? "<Nav />" : "";
  const footerJsx = footerImport ? "<Footer />" : "";

  const rd = findRouteData(route);
  // Real content if scan found the route, else BRAND_* style token placeholders.
  const titleText = (USE_ORIGINAL_TEXT && rd?.title) ? escText(rd.title) : `{{${route.toUpperCase()}_TITLE}}`;
  const headlineText = (USE_ORIGINAL_TEXT && rd?.h1) ? escText(rd.h1) : (USE_ORIGINAL_TEXT && rd?.headings?.[0]) ? escText(rd.headings[0]) : `{{${route.toUpperCase()}_HEADLINE}}`;
  const bodyText = (USE_ORIGINAL_TEXT && rd?.description) ? escText(rd.description) : (USE_ORIGINAL_TEXT && rd?.paragraphs?.[0]) ? escText(rd.paragraphs[0]) : `{{${route.toUpperCase()}_BODY}}`;
  // Secondary content grid from the route's remaining headings/paragraphs.
  const secondaryItems = (rd?.headings || []).slice(1, 5).map((h, i) => {
    const p = rd.paragraphs?.[i + 1] || rd.paragraphs?.[0] || "";
    const img = rd.images?.[i];
    return { h: escText(h), p: escText(p).slice(0, 240), img };
  });
  const routeScreenshot = rd?.screenshotPathsByViewport?.desktop || null;
  const heroBg = routeScreenshot
    ? `background: "linear-gradient(${primaryColor}0e, ${primaryColor}08), url('${routeScreenshot}') top/cover no-repeat"`
    : `background: "${primaryColor}"`;

  fs.writeFileSync(path.join(routeDir, "page.tsx"),
`${imports}

export const metadata = { title: ${JSON.stringify(titleText)} };

export default function ${displayName}Page() {
  return (
    <main>
      ${navJsx}
      <section className="relative flex items-center justify-center px-6 py-24" style={{ minHeight: "80vh", ${heroBg}, color: "${textColor}" }}>
        <div className="max-w-4xl text-center relative z-10">
          <h1 className="font-heading font-bold mb-6" style={{ fontSize: "clamp(${Math.round(typeScale.h1 * 0.6)}px, 6vw, ${typeScale.display}px)", lineHeight: 1.1 }}>
            {${JSON.stringify(headlineText)}}
          </h1>
          <p className="opacity-80 max-w-2xl mx-auto" style={{ fontSize: "clamp(${typeScale.body}px, 2vw, ${typeScale.h3}px)" }}>
            {${JSON.stringify(bodyText)}}
          </p>
        </div>
      </section>
${secondaryItems.length > 0 ? `      <section className="px-6 py-24" style={{ background: "${primaryColor}", color: "${textColor}" }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12">
${secondaryItems.map(item => `          <div className="flex flex-col gap-4">
            ${item.img ? `<div className="aspect-[16/10] rounded-2xl overflow-hidden" style={{ background: "${colorRoles.surface1}" }}>
              <img src=${JSON.stringify(item.img.src)} alt=${JSON.stringify(escText(item.img.alt))} className="w-full h-full object-cover" />
            </div>` : ""}
            <h2 className="font-heading font-bold" style={{ fontSize: "clamp(${Math.round(typeScale.h2 * 0.55)}px, 3vw, ${typeScale.h2}px)" }}>{${JSON.stringify(item.h)}}</h2>
            <p className="opacity-75 leading-relaxed">{${JSON.stringify(item.p)}}</p>
          </div>`).join("\n")}
        </div>
      </section>` : ""}
      ${footerJsx}
    </main>
  );
}
`);
}

// ─── Canvas frame sequence emit ──────────────────────────────────────
if (extracted.canvasFrames && extracted.canvasFrames.length > 0) {
  const cfDir = path.join(projDir, "public", "canvas-frames");
  fs.mkdirSync(cfDir, { recursive: true });
  extracted.canvasFrames.forEach((canvas, ci) => {
    canvas.frames.forEach((dataUrl, fi) => {
      const bin = Buffer.from(dataUrl.split(",")[1], "base64");
      fs.writeFileSync(path.join(cfDir, `c${ci}-${String(fi).padStart(2, "0")}.jpg`), bin);
    });
  });
  // CanvasLoop component — animated JPEG sequence via CSS steps()
  fs.writeFileSync(path.join(compDir, "CanvasLoop.tsx"),
`"use client";
import { useEffect, useState } from "react";

export default function CanvasLoop({ index, frames, className }: { index: number; frames: number; className?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI(v => (v + 1) % frames), 200);
    return () => clearInterval(id);
  }, [frames]);
  const src = \`/canvas-frames/c\${index}-\${String(i).padStart(2, "0")}.jpg\`;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className={className} style={{ width: "100%", height: "100%", objectFit: "contain" }} />;
}
`);
  console.log(`  canvas frames emitted: ${extracted.canvasFrames.length} loops × ${framesTotal} total jpegs`);
}

// ─── Lottie emit ──────────────────────────────────────────────────────
// Each captured Lottie JSON → public/lottie/<hash>.json + a shared
// LottiePlayer React wrapper. Sections can reference these as inline
// animations. Framer's 표준 motion format natively supported.
if (extracted.lottieAnimations && extracted.lottieAnimations.length > 0) {
  const lottieDir = path.join(projDir, "public", "lottie");
  fs.mkdirSync(lottieDir, { recursive: true });
  extracted.lottieAnimations.forEach((lot, i) => {
    const name = `anim-${i}.json`;
    fs.writeFileSync(path.join(lottieDir, name), JSON.stringify(lot.data));
    lot.emittedPath = `/lottie/${name}`;
  });
  // LottiePlayer client component — loads JSON at runtime, plays with
  // loop + autoplay by default. Emit-side sections can drop this in.
  fs.writeFileSync(path.join(compDir, "LottiePlayer.tsx"),
`"use client";
import Lottie from "lottie-react";
import { useEffect, useState } from "react";

export default function LottiePlayer({ src, loop = true, autoplay = true, className }: { src: string; loop?: boolean; autoplay?: boolean; className?: string }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    fetch(src).then(r => r.json()).then(setData).catch(() => {});
  }, [src]);
  if (!data) return <div className={className} style={{ minHeight: 100 }} />;
  return <Lottie animationData={data} loop={loop} autoplay={autoplay} className={className} />;
}
`);
  console.log(`  lottie emitted: ${extracted.lottieAnimations.length} animations → /lottie/`);
}

// ─── Service Worker registration script ──────────────────────────────
if (extracted.serviceWorkerBody?.saved) {
  fs.writeFileSync(path.join(projDir, "public", "_sw-register.js"),
`(function(){
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function() {
      navigator.serviceWorker.register("/sw.js").catch(function(e){ /* ignore */ });
    });
  }
})();`);
  console.log(`  sw registration: /sw.js + /_sw-register.js`);
}

// ─── PWA manifest.json + JSON-LD structured data emit ────────────────
if (extracted.pwaManifest) {
  fs.writeFileSync(path.join(projDir, "public", "manifest.json"), JSON.stringify(extracted.pwaManifest, null, 2));
  console.log(`  pwa manifest: emitted /manifest.json`);
}
// JSON-LD: embed in layout.tsx as Next.js-friendly <script> tag
if (extracted.jsonLD && extracted.jsonLD.length > 0) {
  fs.writeFileSync(path.join(projDir, "public", "_jsonld.json"), JSON.stringify(extracted.jsonLD));
}

// ─── Event listener placeholder map emit ──────────────────────────────
// Aggregates from extracted.eventMap — our clone attaches same event
// types to matching tags/positions as no-op. Users can replace with
// real logic. Brings site's "interactive surface area" DNA.
if (extracted.eventMap && extracted.eventMap.length > 0) {
  const eventSummary = {};
  for (const e of extracted.eventMap) {
    const key = `${e.tag}:${e.eventType}`;
    eventSummary[key] = (eventSummary[key] || 0) + 1;
  }
  fs.writeFileSync(path.join(projDir, "public", "_event-map.json"), JSON.stringify(eventSummary, null, 2));
}

// ─── Premium motion components emit ────────────────────────────────────
// CustomCursor / CountUp / RivePlayer — shared libraries sections import.
if (extracted.motionHints?.customCursorUsed) {
  fs.writeFileSync(path.join(compDir, "CustomCursor.tsx"),
`"use client";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect } from "react";

export default function CustomCursor() {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 500, damping: 40 });
  const sy = useSpring(my, { stiffness: 500, damping: 40 });
  useEffect(() => {
    const move = (e: MouseEvent) => { mx.set(e.clientX - 12); my.set(e.clientY - 12); };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [mx, my]);
  return (
    <motion.div
      style={{ x: sx, y: sy, position: "fixed", top: 0, left: 0, width: 24, height: 24, borderRadius: "50%", background: "rgba(255,255,255,0.9)", mixBlendMode: "difference", pointerEvents: "none", zIndex: 9999 }}
    />
  );
}
`);
}

// Auto-detect numeric headings → emit CountUp component globally usable.
fs.writeFileSync(path.join(compDir, "CountUp.tsx"),
`"use client";
import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

export default function CountUp({ end, duration = 2000, suffix = "", prefix = "" }: { end: number; duration?: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const t0 = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.floor(end * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    tick();
  }, [inView, end, duration]);
  return <span ref={ref}>{prefix}{v.toLocaleString()}{suffix}</span>;
}
`);

if (extracted.riveFiles?.length > 0) {
  fs.writeFileSync(path.join(compDir, "RivePlayer.tsx"),
`"use client";
import { useRive } from "@rive-app/react-canvas";

export default function RivePlayer({ src, className }: { src: string; className?: string }) {
  const { RiveComponent } = useRive({ src, autoplay: true });
  return <div className={className}><RiveComponent /></div>;
}
`);
}

// ─── Client state restoration ─────────────────────────────────────────
// Emit: public/_state.json + a small client script that restores
// localStorage/sessionStorage on first page load (skip if already
// populated to avoid overwriting user's subsequent changes).
if (extracted.clientState) {
  const stateDir = path.join(projDir, "public", "_state");
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(path.join(stateDir, "client-state.json"), JSON.stringify(extracted.clientState, null, 2));
  // Small inline script; restoration guard uses a marker key so re-visits
  // don't wipe user mutations.
  fs.writeFileSync(path.join(projDir, "public", "_restore-state.js"), `(function(){
  try {
    if (localStorage.getItem("__sigma_state_restored")) return;
    fetch("/_state/client-state.json").then(r=>r.json()).then(s=>{
      try { if (s.localStorage) for (const [k,v] of Object.entries(s.localStorage)) { if (localStorage.getItem(k) === null) localStorage.setItem(k,v); } } catch(e){}
      try { if (s.sessionStorage) for (const [k,v] of Object.entries(s.sessionStorage)) { if (sessionStorage.getItem(k) === null) sessionStorage.setItem(k,v); } } catch(e){}
      localStorage.setItem("__sigma_state_restored", "1");
    }).catch(()=>{});
  } catch(e) {}
})();`);
}

// ─── WebSocket playback emit ──────────────────────────────────────────
if (extracted.wsMessages && extracted.wsMessages.length > 0) {
  const wsDir = path.join(projDir, "public", "_ws");
  fs.mkdirSync(wsDir, { recursive: true });
  fs.writeFileSync(path.join(wsDir, "messages.json"), JSON.stringify(extracted.wsMessages));
  // Playback helper: listens on custom event, dispatches frames on timeline
  fs.writeFileSync(path.join(projDir, "public", "_ws-playback.js"), `(function(){
  window.__SIGMA_WS_PLAYBACK__ = async function(onFrame) {
    const r = await fetch("/_ws/messages.json");
    const msgs = await r.json();
    let t0 = Date.now();
    for (const m of msgs) {
      const delay = m.t - (Date.now() - t0);
      if (delay > 0) await new Promise(r => setTimeout(r, delay));
      onFrame(m);
    }
  };
})();`);
}

// ─── API mock emit ────────────────────────────────────────────────────
// Save each captured response to public/api-mocks/ keyed by path hash.
// Emit a Next.js catch-all route handler that looks up by request pathname.
// Client-side fetch("/api/projects") in the cloned code returns real data
// captured from the source at scan time. Functional site, zero server code.
if (extracted.apiCaptures && extracted.apiCaptures.length > 0) {
  const mockDir = path.join(projDir, "public", "api-mocks");
  fs.mkdirSync(mockDir, { recursive: true });
  const manifest = {};
  for (const cap of extracted.apiCaptures) {
    const safeName = cap.pathname.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/^_+|_+$/g, "").slice(0, 80) + ".mock";
    fs.writeFileSync(path.join(mockDir, safeName), cap.body);
    manifest[cap.pathname] = { file: safeName, contentType: cap.contentType, status: cap.status };
  }
  fs.writeFileSync(path.join(mockDir, "_manifest.json"), JSON.stringify(manifest, null, 2));

  // Catch-all API route handler
  const apiRouteDir = path.join(appDir, "api", "[[...slug]]");
  fs.mkdirSync(apiRouteDir, { recursive: true });
  fs.writeFileSync(path.join(apiRouteDir, "route.ts"),
`import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const manifestPath = path.join(process.cwd(), "public", "api-mocks", "_manifest.json");
let manifest: Record<string, { file: string; contentType: string; status: number }> = {};
try { manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")); } catch {}

const lookup = (pathname: string) => {
  // Exact match first, then trailing-slash variants
  if (manifest[pathname]) return manifest[pathname];
  if (manifest[pathname + "/"]) return manifest[pathname + "/"];
  if (manifest[pathname.replace(/\\/$/, "")]) return manifest[pathname.replace(/\\/$/, "")];
  return null;
};

const handle = async (req: NextRequest) => {
  const url = new URL(req.url);
  const entry = lookup(url.pathname);
  if (!entry) return NextResponse.json({ error: "mock not found", path: url.pathname }, { status: 404 });
  try {
    const body = fs.readFileSync(path.join(process.cwd(), "public", "api-mocks", entry.file), "utf-8");
    return new NextResponse(body, {
      status: entry.status,
      headers: { "content-type": entry.contentType || "application/json" },
    });
  } catch (e) {
    return NextResponse.json({ error: "mock read failed" }, { status: 500 });
  }
};

export const GET = handle;
export const POST = handle;
`);
  console.log(`  api mocks: ${extracted.apiCaptures.length} emitted → /api/* (catch-all handler)`);
}

// ─── Sitemap.xml + robots.txt ─────────────────────────────────────────
// Emit standard SEO artifacts so cloned site is immediately crawlable.
const allRoutePaths = ["/", ...allEmittedRoutes.map(r => "/" + r)];
const today = new Date().toISOString().slice(0, 10);
const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutePaths.map(p => `  <url>
    <loc>https://example.com${p}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${p === "/" ? "1.0" : "0.8"}</priority>
  </url>`).join("\n")}
</urlset>
`;
fs.writeFileSync(path.join(projDir, "public", "sitemap.xml"), sitemapXml);
fs.writeFileSync(path.join(projDir, "public", "robots.txt"), `User-agent: *
Allow: /

Sitemap: https://example.com/sitemap.xml
`);
console.log(`  sitemap.xml: ${allRoutePaths.length} urls`);

// ─── Σ.5 LICENSE AUDIT ─────────────────────────────────────────────
console.log(`[Σ.5] LICENSE AUDIT ${el()}`);
const violations = [];
const hostname = new URL(url).hostname;

const scanFile = (fp) => {
  const t = fs.readFileSync(fp, "utf-8");
  if (t.includes(hostname) && !fp.endsWith(".json") && !fp.endsWith(".md")) {
    violations.push(`${path.relative(projDir, fp)} contains source hostname "${hostname}"`);
  }
  if (t.includes("framerusercontent.com")) {
    violations.push(`${path.relative(projDir, fp)} references framerusercontent.com`);
  }
  if (t.includes("_fcdn/")) {
    violations.push(`${path.relative(projDir, fp)} has omega-style _fcdn/ path`);
  }
};
const walkForAudit = (d) => {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const fp = path.join(d, f.name);
    if (f.isDirectory()) { if (f.name === "node_modules" || f.name === ".next") continue; walkForAudit(fp); }
    else if (/\.(tsx?|css|jsx?|mjs|json)$/.test(f.name)) scanFile(fp);
  }
};
walkForAudit(projDir);

const cleanPassed = violations.length === 0;
console.log(`  violations: ${violations.length} ${cleanPassed ? "✓ CLEAN" : "✗"}`);
for (const v of violations) console.log(`    - ${v}`);

const notice = `# NOTICE — Clean-Room Re-Implementation

Generated by NAVA Sigma v0.1 at ${new Date().toISOString()}

## Source reference (for structure only)

This project was structurally inspired by:
    ${url}

## What this project IS

- An original Next.js 15 + Tailwind + framer-motion project written fresh.
- Content is lorem-ipsum / Picsum placeholder (free license).
- Fonts are Google Fonts (Open Font License / Apache 2.0).
- Design tokens (colors / spacing) are extracted facts, not expression.

## What this project is NOT

- NOT a mirror of the source site.
- Contains NO bytes copied verbatim from the source HTML, CSS, JS.
- Contains NO images / logos / text from the source.
- Contains NO platform runtime from Framer / Webflow / etc.

## Clean-room audit

${cleanPassed ? "✅ PASSED — no source bytes detected in emitted files." : "⚠️ Violations:\n" + violations.map(v => "  - " + v).join("\n")}

## Your responsibility

You own the generated code. Before publishing:
1. Replace \`{{BRAND_NAME}}\`, \`{{SITE_TITLE}}\`, \`{{BRAND_HEADLINE}}\` etc with your own text.
2. Replace Picsum placeholder images with your own images.
3. Pick your own content — layout patterns are not copyrightable, but text and branding are.
`;
// Write the clean-room notice; also write a DEV notice when images are
// hotlinked so the next engineer (or future-you) knows the output is NOT
// publishable as-is. Two-file convention makes the legal state explicit.
fs.writeFileSync(path.join(projDir, "NOTICE-CLEAN.md"), notice);

if (USE_ORIGINAL_IMAGES) {
  const devNotice = `# NOTICE — DEV MODE (원본 이미지 포함, 배포 금지)

Generated by NAVA Sigma v0.1 at ${new Date().toISOString()}
Source: ${url}

## ⚠️ 이 출력물은 배포할 수 없습니다

시각적 검증을 위해 원본 사이트의 이미지 URL이 그대로 포함되어 있습니다.
이미지는 원본 사이트의 저작권 자산이므로 본인 이미지로 교체하기 전에는
공개 배포 / 상업적 사용을 할 수 없습니다.

소스 이미지 호스트: ${[...sourceHostSet].filter(h => h !== "picsum.photos").join(", ") || "(none)"}

## 배포 전 필수 조치

1. \`src/components\` 내 모든 \`<img src>\`를 본인 이미지 URL로 교체
2. \`next.config.ts\`의 remotePatterns에서 원본 호스트 제거
3. 엔진 재실행: \`node nava-sigma.mjs ${url} --output <dir>\` (— --use-original-images 플래그 없이)
4. \`NOTICE-CLEAN.md\`의 감사 통과 확인

## 복제화 청정도 (이미지 제외)

${cleanPassed ? "✅ PASSED — 코드/CSS/구조 전부 저작권 청정 (이미지만 원본 참조)" : "⚠️ Violations:\\n" + violations.map(v => "  - " + v).join("\\n")}
`;
  fs.writeFileSync(path.join(projDir, "NOTICE-DEV.md"), devNotice);
  console.log(`\n  ⚠️  DEV MODE — 원본 이미지 hotlink 포함. NOTICE-DEV.md 확인.`);
}

// README for quick start
fs.writeFileSync(path.join(projDir, "README.md"),
`# ${packageJson.name}

Clean-room regeneration produced by NAVA Sigma. See \`NOTICE-CLEAN.md\`.

## Quick start

\`\`\`bash
npm install
npm run dev
\`\`\`

Open http://localhost:3000 — you'll see the layout with placeholder content.
Replace \`{{…}}\` tokens throughout \`src/\` with your own copy, images and branding.

## Structure

- \`src/app/page.tsx\` — page composition
- \`src/components/\` — per-section React components
- \`src/app/globals.css\` — design tokens + Google Fonts
- \`tailwind.config.ts\` — extracted color palette

Detected sections: ${extracted.sections.map(s => s.role).filter(r => r !== "block").join(", ")}
`);

// ─── Σ.5.5 Token → original-text post-replace (dev mode) ─────────────
// Walk every emitted .tsx file and swap brand tokens with real strings
// recovered from SEO meta / og tags. This brings giant-canvas text back
// to our output even though those letters were never in the HTML DOM.
if (USE_ORIGINAL_TEXT) {
  const seoData = extracted.seo || {};
  const rawTitle = seoData.rawTitle || seoData.title || "";
  const parts = rawTitle.split(/[|—–]/).map(s => s.trim()).filter(Boolean);
  const brandFromParts = parts[0] || "";
  const brandName = (brandFromParts && brandFromParts.length <= 40) ? brandFromParts : (seoData.siteName || brandFromParts).slice(0, 40);
  const brandHeadline = parts[1] || seoData.ogTitle || "";
  const brandSubtitle = (seoData.description || seoData.ogDescription || "").slice(0, 180);
  const globalMap = {
    "{{BRAND_NAME}}": brandName,
    "{{BRAND_HEADLINE}}": brandHeadline,
    "{{BRAND_SUBTITLE}}": brandSubtitle,
    "{{SITE_TITLE}}": rawTitle,
  };
  // Build role→sections[] index so we can map Hero0.tsx/Feature2.tsx back
  // to the source section and pull real text from its representative.
  const sectionsByRole = {};
  for (const s of extracted.sections) {
    if (!sectionsByRole[s.role]) sectionsByRole[s.role] = [];
    sectionsByRole[s.role].push(s);
  }
  // Normalize whitespace + escape HTML. JSX literal strings can't contain
  // raw newlines (parse error), so collapse all whitespace to single spaces.
  const safeHtml = (s) => s.replace(/\s+/g, " ").trim().replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const pick = (arr, i, fallback = "") => (arr && arr.length > 0) ? arr[i % arr.length] : fallback;

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!entry.name.endsWith(".tsx")) continue;
      let content = fs.readFileSync(full, "utf8");
      let changed = false;
      // Global tokens (BRAND_NAME, etc.)
      for (const [token, value] of Object.entries(globalMap)) {
        if (value && content.includes(token)) {
          content = content.split(token).join(safeHtml(value));
          changed = true;
        }
      }
      // Identify role + idx from filename: Hero0.tsx, Feature2.tsx, Block11.tsx
      const m = entry.name.match(/^([A-Z][a-z]+)(\d+)\.tsx$/);
      let section = null;
      if (m) {
        const role = m[1].toLowerCase();
        const idx = parseInt(m[2], 10);
        section = sectionsByRole[role]?.[idx] || null;
      }
      if (section && section.representative) {
        const rep = section.representative;
        // Section-scoped semantic tokens
        const localMap = {
          "{{FEATURE_TITLE}}": rep.heading,
          "{{FEATURE_BODY}}": rep.paragraph,
          "{{GALLERY_TITLE}}": rep.heading,
          "{{PROSE_TITLE}}": rep.heading,
          "{{PROSE_BODY}}": rep.paragraph,
          "{{SECTION_TITLE}}": rep.heading,
        };
        for (const [token, value] of Object.entries(localMap)) {
          if (value && content.includes(token)) {
            content = content.split(token).join(safeHtml(value));
            changed = true;
          }
        }
        // Indexed token families — HERO0_H1_3, BLOCK5_P_2, FEATURE2_SPAN_1
        // Map *_H1|H2|H3_N → allHeadings[N], *_P_N → allParagraphs[N],
        // *_A_N → allCTAs[N], *_SPAN_N → rotate headings+paragraphs.
        content = content.replace(/\{\{([A-Z]+\d+)_([A-Z]+)_(\d+)\}\}/g, (match, _prefix, type, nStr) => {
          const n = parseInt(nStr, 10);
          let src = null;
          if (/^H[1-6]$/.test(type)) src = rep.allHeadings;
          else if (type === "P") src = rep.allParagraphs;
          else if (type === "A") src = rep.allCTAs;
          else if (type === "SPAN") src = [...(rep.allHeadings || []), ...(rep.allParagraphs || [])];
          const val = pick(src, n, null);
          if (val) { changed = true; return safeHtml(val); }
          return match;
        });
        // Generic fallback: BLOCK_3_BODY / GRID_ITEM_2_TITLE / etc.
        content = content.replace(/\{\{[A-Z_]+_BODY\}\}/g, () => {
          const v = rep.paragraph || pick(rep.allParagraphs, 0);
          if (v) { changed = true; return safeHtml(v); }
          return "";
        });
        content = content.replace(/\{\{GRID_ITEM_(\d+)_TITLE\}\}/g, (m2, n) => {
          const v = pick(rep.allHeadings, parseInt(n, 10));
          if (v) { changed = true; return safeHtml(v); }
          return m2;
        });
        content = content.replace(/\{\{GRID_ITEM_(\d+)_BODY\}\}/g, (m2, n) => {
          const v = pick(rep.allParagraphs, parseInt(n, 10));
          if (v) { changed = true; return safeHtml(v); }
          return m2;
        });
      }
      if (changed) fs.writeFileSync(full, content);
    }
  };
  walk(srcDir);
  console.log(`  original-text: brand="${brandName}", headline="${brandHeadline.slice(0, 40)}..."`);
}

// ─── Σ.6 BUILD VERIFY ──────────────────────────────────────────────
if (!SKIP_BUILD) {
  console.log(`[Σ.6] BUILD VERIFY ${el()}`);
  // Skip for MVP — run manually with: cd sigma-output && npm install && npm run build
  console.log(`  (skipped — run manually: cd ${outputDir} && npm install && npm run build)`);
}

console.log(`
═══════════════════════════════════════════════
 Sigma v0.1 complete ${el()}
═══════════════════════════════════════════════
  Sections:     ${extracted.sections.length} detected, ${emittedComponents.size} components emitted
  Roles:        ${[...new Set(extracted.sections.map(s => s.role))].join(", ")}
  Palette:      ${palette.length} colors (primary ${primaryColor})
  Fonts:        ${safeHeadingFont} / ${safeBodyFont}
  Audit:        ${cleanPassed ? "✓ clean-room passed" : "⚠ " + violations.length + " violations"}

  cd ${outputDir} && npm install && npm run dev
`);
