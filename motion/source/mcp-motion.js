/* Sloosh MCP motion: a tiny timeline engine and two scripted compositions.
   - every animated layer carries data-k; a composition maps each key to keyframes [[t, props, ease]]
   - render(t) is pure: any time gives the same frame, so the page plays it and the exporter steps it
   - plays only while on screen and the tab is visible; reduced motion shows the finished frame
   Props: x y (centre, px) s (scale) r (deg) o (opacity) b (blur px) g (--ring) rg (--rg) pk (--pk) p (layer-specific progress) */
(function () {
  "use strict";
  var EZ = {
    lin: function (p) { return p; },
    out: function (p) { return 1 - Math.pow(1 - p, 3); },
    in: function (p) { return p * p * p; },
    io: function (p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; },
    sp: function (p) { return p >= 1 ? 1 : 1 - Math.exp(-6 * p) * Math.cos(9.5 * p); },    // spring, a little overshoot
    sp2: function (p) { return p >= 1 ? 1 : 1 - Math.exp(-7.5 * p) * Math.cos(6.2 * p); } // softer spring
  };

  function track(kfs) {
    var names = {};
    kfs.forEach(function (k) { Object.keys(k[1]).forEach(function (n) { names[n] = 1; }); });
    var first = {};
    Object.keys(names).forEach(function (n) { for (var i = 0; i < kfs.length; i++) if (n in kfs[i][1]) { first[n] = kfs[i][1][n]; break; } });
    var cur = Object.assign({}, first);
    var full = kfs.map(function (k) { Object.assign(cur, k[1]); return [k[0], Object.assign({}, cur), k[2] || "io"]; });
    return function (t) {
      if (t <= full[0][0]) return full[0][1];
      for (var i = 1; i < full.length; i++) {
        if (t < full[i][0]) {
          var a = full[i - 1], b = full[i], p = EZ[b[2]]((t - a[0]) / (b[0] - a[0])), o = {};
          for (var n in b[1]) o[n] = a[1][n] + (b[1][n] - a[1][n]) * p;
          return o;
        }
      }
      return full[full.length - 1][1];
    };
  }
  // hold a value, then step through a list of [t, props, ease]
  function T() { return track([].slice.call(arguments)); }

  function apply(el, st, kind) {
    if (!el) return;
    var s = el.style;
    if ("x" in st || "y" in st || "s" in st || "r" in st) {
      var x = st.x || 0, y = st.y || 0, sc = st.s == null ? 1 : st.s, r = st.r || 0;
      if (kind === "G") s.transform = "translate(" + x + "px," + y + "px) scale(" + sc + ")";
      else if (kind === "CT") s.transform = "translate(" + x + "px," + y + "px) translate(-50%,0) scale(" + sc + ")";
      else if (kind === "L0") s.transform = "translate(" + x + "px," + y + "px) scale(" + sc + ")";
      else s.transform = "translate(" + x + "px," + y + "px) translate(-50%,-50%) rotate(" + r + "deg) scale(" + sc + ")";
    }
    if ("o" in st) { s.opacity = st.o.toFixed(3); s.visibility = st.o < 0.005 ? "hidden" : ""; }
    if ("b" in st) s.filter = st.b > 0.05 ? "blur(" + st.b.toFixed(2) + "px)" : "";
    if ("g" in st) s.setProperty("--ring", st.g.toFixed(3));
    if ("rg" in st) s.setProperty("--rg", st.rg.toFixed(3));
    if ("pk" in st) s.setProperty("--pk", st.pk.toFixed(3));
    if ("p" in st) {
      var p = Math.max(0, Math.min(1, st.p));
      if (kind === "DASH") s.strokeDashoffset = (1 - p).toFixed(4);
      else if (kind === "TRAV") { s.strokeDashoffset = (0.14 - 1.14 * p).toFixed(4); s.opacity = p > 0 && p < 1 ? "1" : "0"; }
      else if (kind === "SX") s.transform = "scaleX(" + p.toFixed(4) + ")";
      else if (kind === "H") s.height = (p * (+el.getAttribute("data-h") || 40)).toFixed(1) + "px";
      else if (kind === "TYPE") {
        var full = el.getAttribute("data-text") || "", n = Math.round(p * full.length);
        if (el._n !== n || el._c !== (p > 0 && p < 1)) {
          el._n = n; el._c = p > 0 && p < 1;
          el.innerHTML = full.slice(0, n).replace(/&/g, "&amp;").replace(/</g, "&lt;") + (el._c ? '<i class="cr"></i>' : "");
        }
      }
    }
  }

  function Comp(root, spec) {
    var self = this;
    this.root = root; this.spec = spec; this.k = {};
    root.querySelectorAll("[data-k]").forEach(function (e) { self.k[e.getAttribute("data-k")] = e; });
    this.inner = root.querySelector(".mm-in");
    this.setMode();
  }
  Comp.prototype.setMode = function () {
    var m = this.spec.mobile && this.spec.mobile(this.root) ? "m" : "d";
    this.mode = m;
    this.root.classList.toggle("is-m", m === "m");
    var built = this.spec.build(m, this.k);
    this.tr = built.tracks; this.kind = built.kind || {}; this.after = built.after;
    this.size = this.spec.size[m];
    this.fit();
  };
  Comp.prototype.fit = function () {
    var w = this.root.clientWidth, h = this.root.clientHeight;
    if (!w || !h) return;
    var s = Math.min(w / this.size[0], h / this.size[1]);
    this.inner.style.setProperty("--s", s.toFixed(4));
  };
  Comp.prototype.render = function (t) {
    for (var key in this.tr) apply(this.k[key], this.tr[key](t), this.kind[key]);
    if (this.after) this.after(t, this);
  };

  /* ===================== Graphic 1: hero carousel (dark) ===================== */
  var VSTART = 6.3, VLEN = 5;
  var HERO = {
    dur: 9.6, still: 7.8,
    size: { d: [760, 500], m: [360, 320] },
    mobile: function () { return window.matchMedia && matchMedia("(max-width: 760px)").matches; },
    build: function (m) {
      var K = { row: "G", stroke: "DASH", type: "TYPE", ring: "DASH", sl0: "SX", sl1: "SX", sl2: "SX", vbar: "SX", rep: "L0", repw: "H", chat: "CT", ct: "L0", bimg: "L0" };
      var tr = {};
      var D = m === "d";
      // the agent row: tiles, the yellow stroke and the Sloosh badge, moved as one group
      var rowMini = D ? { x: -147.7, y: -89.3, s: 0.62 } : { x: -139.4, y: -78.7, s: 0.58 };
      var rowOpen = D ? { x: 0, y: 0, s: 1 } : { x: -139.4, y: -78.7, s: 0.58 };
      tr.row = T([0, rowOpen], [1.7, rowOpen], [2.15, rowMini, "io"], [8.95, rowMini], [9.55, rowOpen, "io"]);
      tr.claude = T([0, { x: D ? 300 : 430, y: 215, s: 1, o: 1 }], [0.45, {}], [1.15, { x: 430, s: 1.12 }, "sp"], [9.0, {}], [9.55, { x: D ? 300 : 430, s: 1 }, "io"]);
      tr.chatgpt = D ? T([0, { x: 380, y: 215, s: 1, o: 1 }], [0.45, {}], [1.0, { x: 300, s: 0.72, o: 0.45 }, "out"], [9.0, {}], [9.55, { x: 380, s: 1, o: 1 }, "io"]) : T([0, { x: 300, y: 215, o: 0 }]);
      tr.cursor = D ? T([0, { x: 460, y: 215, s: 1, o: 1 }], [0.45, {}], [1.0, { x: 356, s: 0.72, o: 0.45 }, "out"], [9.0, {}], [9.55, { x: 460, s: 1, o: 1 }, "io"]) : T([0, { x: 356, y: 215, o: 0 }]);
      tr.badge = T([0, { x: 600, y: 215, s: 0.9, o: 0.5, g: 0 }], [0.9, {}], [1.45, { x: 590, s: 1, o: 1, g: 1 }, "sp"], [9.0, {}], [9.55, { x: 600, s: 0.9, o: 0.5, g: 0 }, "io"]);
      tr.stroke = T([0, { p: 0 }], [1.0, {}], [1.45, { p: 1 }, "out"], [9.0, {}], [9.25, { p: 0 }, "in"]);
      tr.note = D ? T([0, { x: 380, y: 300, o: 1 }], [0.5, {}], [0.8, { o: 0, y: 308 }, "out"], [9.25, { y: 300 }], [9.55, { o: 1 }, "out"]) : T([0, { x: 0, y: 0, o: 0 }]);
      // the chat card with the brief
      var chatP = D ? { x: 174, y: 104 } : { x: 104, y: 84 }, cs = D ? 1 : 0.64;
      tr.chat = T([0, { x: chatP.x, y: chatP.y + 24, o: 0, s: cs * 0.96 }], [1.95, {}], [2.5, { y: chatP.y, o: 1, s: cs }, "sp2"], [8.9, {}], [9.3, { y: chatP.y + 12, o: 0, s: cs * 0.98 }, "io"]);
      tr.bimg = T([0, { s: 0.6, o: 0 }], [2.2, {}], [2.6, { s: 1, o: 1 }, "sp"], [9.3, {}], [9.35, { s: 0.6, o: 0 }]);
      tr.type = T([0, { p: 0 }], [2.45, {}], [3.35, { p: 1 }, "lin"], [9.35, {}], [9.4, { p: 0 }, "lin"]);
      tr.repw = T([0, { p: 0 }], [6.4, {}], [6.8, { p: 1 }, "io"], [9.3, {}], [9.4, { p: 0 }, "lin"]);
      tr.rep = T([0, { o: 0, y: 6 }], [6.55, {}], [6.95, { o: 1, y: 0 }, "out"], [8.9, {}], [9.3, { o: 0 }, "io"]);
      // the Sloosh stage (desktop only)
      tr.stage = D ? T([0, { x: 560, y: 236, o: 0, s: 0.94 }], [3.15, {}], [3.6, { y: 222, o: 1, s: 1 }, "sp2"], [5.55, {}], [6.05, { o: 0, s: 0.97 }, "out"], [9.6, {}]) : T([0, { x: 270, y: 168, o: 0, s: 0.42 }], [3.15, {}], [3.6, { y: 160, o: 1, s: 0.45 }, "sp2"], [5.55, {}], [6.05, { o: 0, s: 0.43 }, "out"], [9.6, {}]);
      tr.ring = T([0, { p: 0 }], [3.9, {}], [5.3, { p: 1 }, "io"], [6.1, {}], [6.2, { p: 0 }, "lin"]);
      tr.sl0 = T([0, { p: 0 }], [4.0, {}], [4.9, { p: 1 }, "io"], [6.1, {}], [6.2, { p: 0 }, "lin"]);
      tr.sl1 = T([0, { p: 0 }], [4.3, {}], [5.1, { p: 1 }, "io"], [6.1, {}], [6.2, { p: 0 }, "lin"]);
      tr.sl2 = T([0, { p: 0 }], [4.6, {}], [5.3, { p: 1 }, "io"], [6.1, {}], [6.2, { p: 0 }, "lin"]);
      // the reference image flies from the chat into the stage
      var flyFrom = D ? { x: 127, y: 198 } : { x: 74, y: 145 }, flyTo = D ? { x: 560, y: 223 } : { x: 270, y: 164 };
      tr.fly = T([0, { x: flyFrom.x, y: flyFrom.y, o: 0, s: cs }], [3.35, {}], [3.4, { o: 1 }, "lin"],
        [3.68, { x: (flyFrom.x + flyTo.x) / 2, y: Math.min(flyFrom.y, flyTo.y) - (D ? 70 : 40), s: cs * 1.05 }, "out"],
        [3.95, { x: flyTo.x, y: flyTo.y, s: D ? 0.6 : 0.4 }, "in"], [4.1, { o: 0, s: D ? 0.55 : 0.35 }, "out"], [9.6, {}]);
      // the three outputs: resolve out of the stage, then fan out on a spring
      var finals = D ? [{ x: 410, y: 236, r: -7, s: 1 }, { x: 538, y: 210, r: 2, s: 1 }, { x: 658, y: 244, r: 8, s: 1 }]
                     : [{ x: 240, y: 158, r: -6, s: 0.5 }, { x: 302, y: 178, r: 6, s: 0.5 }, { x: 302, y: 178, r: 6, s: 0.5 }];
      ["o1", "o2", "o3"].forEach(function (k, i) {
        var f = finals[i], st0 = { x: flyTo.x, y: flyTo.y, s: D ? 0.4 : 0.25, o: 0, b: 14, r: 0 };
        var hidden = !D && k === "o3";
        if (hidden) { tr[k] = T([0, { x: 0, y: 0, o: 0 }]); return; }
        tr[k] = T([0, st0], [5.3, {}], [5.6, { o: 1, b: 6, s: D ? 0.5 : 0.3 }, "out"], [5.7 + i * 0.1, {}],
          [6.45 + i * 0.1, { x: f.x, y: f.y, s: f.s, r: f.r, b: 0 }, "sp"], [8.9 + i * 0.05, {}],
          [9.35, { y: f.y + 16, s: f.s * 0.96, o: 0 }, "io"], [9.4, st0, "lin"]);
      });
      var doneP = D ? { x: 452, y: 428, s: 1 } : { x: 180, y: 298, s: 0.7 };
      tr.done = T([0, { x: doneP.x, y: doneP.y + 10, o: 0, s: doneP.s * 0.8 }], [6.55, {}], [7.0, { y: doneP.y, o: 1, s: doneP.s }, "sp"], [8.9, {}], [9.3, { y: doneP.y + 8, o: 0 }, "io"]);
      tr.assets = D ? T([0, { x: 684, y: 428, o: 0, s: 0.8 }], [6.75, {}], [7.15, { o: 1, s: 1 }, "sp"], [8.9, {}], [9.3, { o: 0 }, "io"]) : T([0, { x: 0, y: 0, o: 0 }]);
      tr.ct = T([0, { s: 0 }], [7.05, {}], [7.4, { s: 1 }, "sp"], [9.3, {}], [9.35, { s: 0 }, "lin"]);
      // the video card's playhead follows the clip
      var after = function (t, c) {
        var v = c.k.o3 && c.k.o3.querySelector("video"); if (!v) return;
        var on = t >= VSTART && t < 9.35;
        var local = on ? (t - VSTART) % VLEN : 0;
        if (c.exporting) { c._seek = local; }
        else if (c.live) {
          if (on) { if (v.paused) { try { v.currentTime = local; } catch (e) {} var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); } }
          else if (!v.paused || v.currentTime > 0.05) { v.pause(); try { v.currentTime = 0; } catch (e) {} }
        }
        var d = v.duration || VLEN, cur = c.exporting ? local : (on ? v.currentTime : 0);
        if (c.k.vbar) c.k.vbar.style.transform = "scaleX(" + Math.min(1, cur / d).toFixed(4) + ")";
      };
      return { tracks: tr, kind: K, after: after };
    }
  };

  /* ===================== Graphic 2: agent banner (dark) ===================== */
  var AGENTS = {
    dur: 11.5, still: 8.4,
    size: { d: [600, 560], m: [360, 600] },
    mobile: function () { return window.matchMedia && matchMedia("(max-width: 760px)").matches; },
    build: function (m, k) {
      var D = m === "d", tr = {};
      var K = { n1: "L0", n2: "L0", n3: "L0", m1: "L0", req: "CT", rep: "H", ra: "DASH", rb: "DASH", rc: "DASH", rd: "DASH", mra: "DASH", mrb: "DASH", mrc: "DASH", mrd: "DASH", mbar: "SX", c1a: "", c1b: "" };
      var P = D ? { req: [330, 40, 1], note: [86, 46], c1: [110, 370, 1], c2: [300, 370, 1], c3: [490, 370, 1], crit: [540, 246], critH: 292, res0: [300, 322], res1: [437, 295], rs: 1 }
                : { req: [180, 18, 0.8], note: [0, 0], c1: [95, 270, 0.9], c2: [265, 270, 0.9], c3: [180, 478, 0.9], crit: [228, 372], critH: 412, res0: [265, 250], res1: [132.5, 411], rs: 0.9 };
      tr.req = T([0, { x: P.req[0], y: P.req[1], s: P.req[2] }], [0.3, {}], [0.55, { s: P.req[2] * 1.025 }, "out"], [0.9, { s: P.req[2] }, "sp"], [7.0, {}], [7.25, { s: P.req[2] * 1.02 }, "out"], [7.6, { s: P.req[2] }, "sp"]);
      tr.note = D ? T([0, { x: P.note[0], y: P.note[1], o: 1 }]) : T([0, { x: 0, y: 0, o: 0 }]);
      tr.rep = T([0, { p: 0, o: 0 }], [7.2, {}], [7.65, { p: 1, o: 1 }, "out"], [10.4, {}], [10.9, { p: 0, o: 0 }, "io"]);
      var R = D ? ["ra", "rb", "rc", "rd"] : ["mra", "mrb", "mrc", "mrd"];
      var seg = [[1.0, 1.8], [2.8, 3.6], [4.9, 5.7], [6.5, 7.3]];
      R.forEach(function (key, i) {
        tr[key] = T([0, { p: 0, o: 1 }], [seg[i][0], {}], [seg[i][1], { p: 1 }, "io"], [10.3, {}], [10.8, { o: 0 }, "out"], [10.85, { p: 0 }, "lin"], [11.0, { o: 1 }, "lin"]);
      });
      function capT(key, at, end) {
        var c = P[key];
        return T([0, { x: c[0], y: c[1], s: c[2], rg: 0 }], [at, {}], [at + 0.45, { y: c[1] - 8, rg: 1 }, "sp"], [end, {}], [end + 0.4, { y: c[1], rg: 0 }, "io"]);
      }
      tr.c1 = capT("c1", 1.7, 3.6);
      tr.c2 = capT("c2", 3.5, 5.4);
      tr.c3 = T([0, { x: P.c3[0], y: P.c3[1], s: P.c3[2], rg: 0 }], [5.6, {}], [6.05, { y: P.c3[1] - 8, rg: 1 }, "sp"], [10.3, {}], [10.8, { y: P.c3[1], rg: 0 }, "io"]);
      function swap(a, b, on, off) {
        tr[a] = T([0, { o: 1 }], [on, {}], [on + 0.25, { o: 0 }, "out"], [off, {}], [off + 0.3, { o: 1 }, "out"]);
        tr[b] = T([0, { o: 0 }], [on + 0.15, {}], [on + 0.45, { o: 1 }, "out"], [off, {}], [off + 0.25, { o: 0 }, "out"]);
      }
      swap("c1a", "c1b", 1.9, 4.0);
      swap("c2a", "c2b", 3.7, 5.6);
      swap("c3a", "c3b", 6.0, 10.4);
      ["n1", "n2", "n3"].forEach(function (key, i) { tr[key] = T([0, { s: 1 }], [2.0 + i * 0.3, {}], [2.3 + i * 0.3, { s: 1.12 }, "out"], [2.55 + i * 0.3, { s: 1 }, "sp"]); });
      tr.m1 = T([0, { pk: 0, s: 1 }], [3.7, {}], [4.0, { pk: 1, s: 1.12 }, "sp"], [10.3, {}], [10.7, { pk: 0, s: 1 }, "io"]);
      tr.mpick = T([0, { o: 0 }], [3.95, {}], [4.25, { o: 1 }, "out"], [4.85, {}], [5.05, { o: 0 }, "out"]);
      tr.mbarw = T([0, { o: 0 }], [4.95, {}], [5.05, { o: 1 }, "lin"], [10.3, {}], [10.6, { o: 0 }, "out"]);
      tr.mbar = T([0, { p: 0 }], [5.0, {}], [5.6, { p: 1 }, "io"], [10.6, {}], [10.65, { p: 0 }, "lin"]);
      tr.res = T([0, { x: P.res0[0], y: P.res0[1], s: 0.6 * P.rs, o: 0, r: 0 }], [5.45, {}], [5.6, { o: 1, s: P.rs }, "out"],
        [5.85, { x: (P.res0[0] + P.res1[0]) / 2, y: Math.min(P.res0[1], P.res1[1]) - 40, r: 8 }, "out"], [6.2, { x: P.res1[0], y: P.res1[1], r: 0 }, "sp"],
        [10.3, {}], [10.7, { o: 0, s: 0.8 * P.rs }, "io"], [10.75, { x: P.res0[0], y: P.res0[1] }, "lin"]);
      tr.crit = T([0, { x: P.crit[0], y: P.critH }], [6.2, {}], [6.7, { y: P.crit[1] }, "sp"], [10.2, {}], [10.6, { y: P.critH }, "io"]);
      // the pulse rides whichever segment is running
      var after = function (t, c) {
        var pulse = c.k.pulse; if (!pulse) return;
        var active = -1, p = 0;
        for (var i = 0; i < seg.length; i++) if (t >= seg[i][0] - 0.05 && t <= seg[i][1] + 0.1) { active = i; p = Math.max(0, Math.min(1, (t - seg[i][0]) / (seg[i][1] - seg[i][0]))); }
        if (active < 0) { pulse.style.opacity = "0"; pulse.style.visibility = "hidden"; return; }
        var path = c.k[R[active]];
        p = EZ.io(p);
        var L = path.getTotalLength(), pt = path.getPointAtLength(p * L);
        pulse.style.visibility = ""; pulse.style.opacity = "1";
        pulse.style.transform = "translate(" + pt.x + "px," + pt.y + "px) translate(-50%,-50%)";
      };
      return { tracks: tr, kind: K, after: after };
    }
  };


  /* ===================== Spacelab banner canvas ===================== */
  var LAB = {
    dur: 12, still: 10.6,
    size: { d: [1200, 560], m: [760, 560] },
    mobile: function () { return window.matchMedia && matchMedia("(max-width: 760px)").matches; },
    build: function (m) {
      var D = m === "d", ox = D ? 0 : -440, tr = {};
      var K = { cam: "G", w1: "TRAV", w2: "TRAV", w3: "TRAV", ptype: "TYPE", vb: "SX", cm: "G", ca: "G", cmt: "L0", r2: "L0", pub: "", e1: "", e2: "", run1: "", run2: "", vbw: "" };
      tr.cam = T([0, { x: ox, y: 0, s: 1 }], [6, { x: ox - 26, y: -6, s: 1.045 }, "io"], [12, { x: ox, y: 0, s: 1 }, "io"]);
      tr.bar = T([0, { x: 1080 + ox, y: 40 }]);
      tr.dock = T([0, { x: 880 + ox, y: 522 }]);
      tr.ptype = T([0, { p: 0 }], [0.6, {}], [2.2, { p: 1 }, "lin"], [11.85, {}], [11.9, { p: 0 }, "lin"]);
      // Maya: types the brief, runs the model, later publishes
      tr.cm = T([0, { x: 1260 + ox, y: 250, o: 0 }], [0.05, { o: 1 }, "lin"], [0.6, { x: 690 + ox, y: 196 }, "out"], [2.2, {}], [2.45, { x: 880 + ox, y: 300 }, "io"],
        [9.6, {}], [10.15, { x: 1124 + ox, y: 44 }, "io"], [11.0, {}], [11.6, { x: 1260 + ox, y: 120, o: 0 }, "in"]);
      tr.ca = T([0, { x: 1260 + ox, y: 520, o: 0 }], [8.3, {}], [8.35, { o: 1 }, "lin"], [8.9, { x: 1018 + ox, y: 432 }, "out"], [11.0, {}], [11.6, { x: 1260 + ox, y: 560, o: 0 }, "in"]);
      tr.cmt = T([0, { o: 0, s: 0.7 }], [9.0, {}], [9.35, { o: 1, s: 1 }, "sp"], [10.8, {}], [11.0, { o: 0, s: 0.9 }, "out"]);
      tr.clk = T([0, { x: 880 + ox, y: 300, o: 0, s: 0.4 }], [2.4, {}], [2.45, { o: 1 }, "lin"], [2.9, { o: 0, s: 1.7 }, "out"],
        [10.15, { x: 1130 + ox, y: 44, s: 0.4 }, "lin"], [10.2, { o: 1 }, "lin"], [10.65, { o: 0, s: 1.7 }, "out"]);
      tr.w1 = T([0, { p: 0 }], [2.5, {}], [3.2, { p: 1 }, "io"]);
      tr.w2 = T([0, { p: 0 }], [2.6, {}], [3.3, { p: 1 }, "io"]);
      tr.w3 = T([0, { p: 0 }], [5.6, {}], [6.2, { p: 1 }, "io"]);
      tr.n1 = T([0, { x: 600, y: 168, rg: 0 }], [0.6, {}], [0.9, { rg: 0.7 }, "out"], [2.2, {}], [2.6, { rg: 0 }, "out"]);
      tr.n2 = T([0, { x: 600, y: 382 }]);
      tr.n3 = T([0, { x: 861, y: 252, rg: 0 }], [3.0, {}], [3.3, { rg: 1 }, "out"], [5.1, {}], [5.6, { rg: 0 }, "out"]);
      tr.n4 = T([0, { x: 1092, y: 330, rg: 0 }], [6.0, {}], [6.3, { rg: 1 }, "out"], [7.9, {}], [8.4, { rg: 0 }, "out"]);
      tr.run1 = T([0, { o: 0 }], [3.0, {}], [3.2, { o: 1 }, "out"], [4.9, {}], [5.1, { o: 0 }, "out"]);
      tr.run2 = T([0, { o: 0 }], [6.0, {}], [6.2, { o: 1 }, "out"], [7.7, {}], [7.9, { o: 0 }, "out"]);
      tr.e1 = T([0, { o: 1 }], [5.0, {}], [5.3, { o: 0 }, "out"], [11.4, {}], [11.8, { o: 1 }, "out"]);
      tr.e2 = T([0, { o: 1 }], [7.8, {}], [8.1, { o: 0 }, "out"], [11.4, {}], [11.8, { o: 1 }, "out"]);
      tr.r1 = T([0, { o: 0, b: 14 }], [5.0, {}], [5.7, { o: 1, b: 0 }, "out"], [11.2, {}], [11.6, { o: 0 }, "out"], [11.65, { b: 14 }, "lin"]);
      tr.r2 = T([0, { o: 0, s: 1.14 }], [7.8, {}], [8.3, { o: 1 }, "out"], [11.2, { s: 1.0 }, "lin"], [11.6, { o: 0 }, "out"], [11.65, { s: 1.14 }, "lin"]);
      tr.vbw = T([0, { o: 0 }], [8.0, {}], [8.3, { o: 1 }, "out"], [11.2, {}], [11.6, { o: 0 }, "out"]);
      tr.pub = T([0, { pk: 0 }], [10.3, {}], [10.5, { pk: 1 }, "out"], [11.4, {}], [11.7, { pk: 0 }, "out"]);
      var after = function (t, c) {
        function look(el, a, b) {
          if (!el) return; var x = 3, y = 1;
          if (t > a && t < b) { var k = (t - a) * 2.2; x = Math.sin(k * 2.1) * 4; y = Math.cos(k * 1.3) * 3; }
          el.style.setProperty("--ex", x.toFixed(2) + "px"); el.style.setProperty("--ey", y.toFixed(2) + "px");
        }
        look(c.k.e1, 3.0, 5.0); look(c.k.e2, 6.0, 7.8);
        if (c.k.vb) c.k.vb.style.transform = "scaleX(" + Math.max(0, Math.min(1, (t - 8.1) / 3)).toFixed(4) + ")";
      };
      return { tracks: tr, kind: K, after: after };
    }
  };

  var SPECS = { hero: HERO, agents: AGENTS, lab: LAB };
  var RM = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

  function mount(root) {
    var spec = SPECS[root.getAttribute("data-mm")]; if (!spec) return null;
    var c = new Comp(root, spec), raf = 0, t0 = 0, vis = false, offset = 0;
    c.live = true;
    var story = root.closest(".st");
    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (story && !story.classList.contains("on")) return;
      var t = ((now - t0) / 1000 + offset) % spec.dur;
      c.render(t);
    }
    // inside a story: start from the top each time the story comes to the front
    if (story && "MutationObserver" in window) {
      var wasOn = story.classList.contains("on");
      new MutationObserver(function () {
        var on = story.classList.contains("on");
        if (on && !wasOn) { t0 = performance.now(); offset = 0; c.render(RM ? spec.still : 0); }
        if (!on) { var v = root.querySelector("video"); if (v) v.pause(); }
        wasOn = on;
      }).observe(story, { attributes: true, attributeFilter: ["class"] });
    }
    function start() { if (raf || RM) return; t0 = performance.now(); raf = requestAnimationFrame(frame); }
    function stop() { if (!raf) return; cancelAnimationFrame(raf); raf = 0; offset = 0; var v = root.querySelector("video"); if (v) v.pause(); }
    c.start = start; c.stop = stop;
    c.render(RM ? spec.still : 0);
    if (RM) { var v = root.querySelector("video"); if (v) { v.pause(); } }
    if ("ResizeObserver" in window) new ResizeObserver(function () {
      var was = c.mode; c.fit();
      var m = spec.mobile && spec.mobile(root) ? "m" : "d";
      if (m !== was) { c.setMode(); c.render(RM ? spec.still : 0); }
    }).observe(root);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        vis = es[0].isIntersecting;
        if (vis && !document.hidden) start(); else stop();
      }, { threshold: 0.25 }).observe(root);
    } else start();
    document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else if (vis) start(); });
    root._mm = c;
    return c;
  }

  window.SlooshMCPMotion = {
    mount: mount, specs: SPECS, Comp: Comp, EZ: EZ,
    // export helper: render a frame at time t and wait for the video to land on it
    renderAt: function (root, t) {
      var c = root._mmx || (root._mmx = new Comp(root, SPECS[root.getAttribute("data-mm")]));
      c.exporting = true; c.render(t);
      var v = root.querySelector("video");
      if (v && c._seek != null) {
        return new Promise(function (res) {
          if (Math.abs(v.currentTime - c._seek) < 0.004) { res(); return; }
          var done = function () { v.removeEventListener("seeked", done); res(); };
          v.addEventListener("seeked", done); v.currentTime = c._seek;
          setTimeout(res, 1500);
        });
      }
      return Promise.resolve();
    }
  };
  if (!window.__MM_NO_AUTO) document.querySelectorAll("[data-mm]").forEach(mount);
})();
