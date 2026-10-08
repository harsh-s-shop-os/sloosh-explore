/* Sloosh Explore: page behaviours (kit.js handles theme, sounds, logo eyes, arrivals, hover video).
   - stories: one banner; tap right for next, left for previous, press and hold to pause, swipe on touch,
     arrow keys, click a tab to jump to that story; each story times itself (data-dur)
   - tabs (series, tools, agent steps)
   - copy the MCP server address
   - click sounds for the page's own controls */
(function () {
  "use strict";
  var doc = document;
  var snd = function (k) { if (window.slSound) window.slSound(k); };

  /* ---------- stories ---------- */
  var root = doc.querySelector("[data-stories]");
  if (root) {
    var cards = [].slice.call(root.querySelectorAll(".st"));
    var tabs = [].slice.call(root.querySelectorAll(".st-tab"));
    var bars = tabs.map(function (t) { return t.querySelector("i"); });
    var live = root.querySelector("[data-st-live]");
    var pauseBtn = root.querySelector(".st-pause");
    var n = cards.length, i = 0, timer = 0, startAt = 0, remain = 0;
    var paused = false, hold = false, inView = true;

    var play = function (v) { v.muted = true; var p = v.play(); if (p && p.catch) p.catch(function () {}); };
    var stalled = function () { return paused || hold || !inView || doc.hidden; };
    var sync = function () { root.classList.toggle("hold", hold || !inView || doc.hidden); root.classList.toggle("paused", paused); };

    function stopClock() {
      if (!timer) return;
      clearTimeout(timer); timer = 0;
      remain = Math.max(0, remain - (Date.now() - startAt));
    }
    function startClock() {
      clearTimeout(timer); timer = 0;
      if (stalled()) return;
      startAt = Date.now();
      timer = setTimeout(function () { timer = 0; go(i + 1); }, remain);
    }
    function media(on) {
      var v = cards[i].querySelector("video");
      if (!v) return;
      if (on) play(v); else v.pause();
    }

    function go(to, byUser) {
      i = ((to % n) + n) % n;
      cards.forEach(function (c, k) {
        var d = k === i ? 0 : 1;
        c.classList.toggle("on", d === 0);
        c.setAttribute("aria-hidden", d === 0 ? "false" : "true");
        c.querySelectorAll("a, button:not(.st-tap)").forEach(function (el) { el.tabIndex = d === 0 ? 0 : -1; });
        var v = c.querySelector("video");
        if (v) { if (d === 0) { try { v.currentTime = 0; } catch (e) {} if (!paused && !hold) play(v); } else v.pause(); }
        var lt = c.querySelector(".lt");
        if (lt && d === 0) { lt.classList.remove("in"); void lt.offsetWidth; lt.classList.add("in"); }
      });
      var dur = +cards[i].getAttribute("data-dur") || 7000;
      root.style.setProperty("--dur", dur + "ms");
      bars.forEach(function (bar, k) { bar.classList.toggle("done", k < i); bar.classList.remove("now"); tabs[k].setAttribute("aria-current", k === i ? "true" : "false"); });
      void bars[i].offsetWidth;
      bars[i].classList.add("now");
      remain = dur;
      startClock();
      if (live) live.textContent = "Story " + cards[i].getAttribute("aria-label");
      if (byUser) snd("tick");
    }

    function setPaused(p) {
      paused = p;
      if (pauseBtn) pauseBtn.setAttribute("aria-label", p ? "Play stories" : "Pause stories");
      sync();
      if (p) { stopClock(); media(false); } else { media(true); startClock(); }
    }

    /* tap, hold, swipe on the story in front */
    var press = null;
    root.addEventListener("pointerdown", function (e) {
      if (!e.target.classList.contains("st-tap")) return;
      var box = e.target.getBoundingClientRect();
      press = { x: e.clientX, y: e.clientY, left: e.clientX - box.left < box.width * 0.3, held: false, id: e.pointerId };
      press.t = setTimeout(function () {
        if (!press) return;
        press.held = true; hold = true; sync(); stopClock(); media(false);
      }, 220);
    });
    function endPress(e, cancel) {
      if (!press || (e && e.pointerId !== press.id)) return;
      var p = press; press = null; clearTimeout(p.t);
      if (p.held) { hold = false; sync(); if (!paused) { media(true); startClock(); } return; }
      if (cancel) return;
      var dx = e.clientX - p.x, dy = e.clientY - p.y;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { go(i + (dx < 0 ? 1 : -1), true); return; }
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) go(i + (p.left ? -1 : 1), true);
    }
    root.addEventListener("pointerup", function (e) { endPress(e, false); });
    root.addEventListener("pointercancel", function (e) { endPress(e, true); });
    root.addEventListener("contextmenu", function (e) { if (e.target.classList.contains("st-tap")) e.preventDefault(); });

    root.addEventListener("click", function (e) {
      if (e.target.closest(".st-arrow.prev")) { go(i - 1, true); return; }
      if (e.target.closest(".st-arrow.next")) { go(i + 1, true); return; }
      if (e.target.closest(".st-pause")) { setPaused(!paused); return; }
      if (e.target.classList.contains("st-tap")) return; // handled on pointerup
      var t = e.target.closest(".st-tab");
      if (t) { go(+t.getAttribute("data-go"), true); }
    });
    root.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); go(i + 1, true); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go(i - 1, true); }
    });

    /* only run while on screen and the tab is visible */
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          var was = inView; inView = en.isIntersecting && en.intersectionRatio > 0.35;
          if (was === inView) return;
          sync();
          if (inView) { if (!paused) { media(true); startClock(); } } else { stopClock(); media(false); }
        });
      }, { threshold: [0, 0.35, 0.6] }).observe(root.querySelector(".st-stage"));
    }
    doc.addEventListener("visibilitychange", function () {
      sync();
      if (doc.hidden) { stopClock(); media(false); } else if (!paused && inView) { media(true); startClock(); }
    });

    go(0);
  }

  /* ---------- templates and gallery: shortest-column masonry, under a screen tall, never a hole ----------
     Every unique card goes in first, each into the shortest column, so the top of the grid has no repeats.
     Then repeats of the set fill whichever column is shortest until every column runs past the clip. */
  var masAll = [].slice.call(doc.querySelectorAll(".mas"));
  masAll.forEach(function (mas) {
    var masWrap = mas.closest(".mas-wrap") || mas.parentNode;
    var masBase = [].slice.call(mas.querySelectorAll(".mc"));
    var masKey = "";
    var masLayout = function () {
      if (!mas.clientWidth) return; /* a hidden tab panel: lay out when it shows */
      var n = parseInt(getComputedStyle(mas).getPropertyValue("--cols"), 10) || 5;
      var key = n + ":" + mas.clientWidth + ":" + window.innerHeight;
      if (key === masKey) return;
      masKey = key;
      var clip = parseFloat(getComputedStyle(masWrap).maxHeight) || window.innerHeight;
      mas.textContent = "";
      mas.classList.add("js");
      var cols = [], h = [];
      for (var c = 0; c < n; c++) { var col = doc.createElement("div"); col.className = "mas-col"; mas.appendChild(col); cols.push(col); h.push(0); }
      var shortest = function () { var k = 0; for (var j = 1; j < n; j++) if (h[j] < h[k]) k = j; return k; };
      var place = function (card) { var k = shortest(); cols[k].appendChild(card); h[k] += card.offsetHeight + 12; };
      masBase.forEach(place);
      var i = 0;
      while (h[shortest()] < clip + 24 && i < masBase.length * 4) {
        var rep = masBase[(i * 7 + 3) % masBase.length].cloneNode(true);
        rep.setAttribute("aria-hidden", "true"); rep.tabIndex = -1;
        place(rep); i++;
      }
      mas.dispatchEvent(new CustomEvent("mas:laid"));
    };
    masLayout();
    var masT = 0;
    window.addEventListener("resize", function () { clearTimeout(masT); masT = setTimeout(masLayout, 150); });
    if (window.ResizeObserver) new ResizeObserver(function () { clearTimeout(masT); masT = setTimeout(masLayout, 60); }).observe(mas);
  });

  /* ---------- gallery videos: play while on screen (muted, looped), pause off screen and in the hidden tab ---------- */
  var galV = doc.querySelector(".mas-v");
  if (galV && "IntersectionObserver" in window) {
    var galRM = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var gio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var c = e.target, v = c.querySelector("video"); if (!v) return;
        if (e.isIntersecting && !galRM) {
          v.setAttribute("data-autoplay", ""); v.muted = true;
          var pr = v.play(); if (pr && pr.then) pr.then(function () { c.setAttribute("data-playing", ""); }).catch(function () {});
        } else { v.pause(); c.removeAttribute("data-playing"); }
      });
    }, { threshold: 0.35 });
    var watch = function () { gio.disconnect(); galV.querySelectorAll(".mc").forEach(function (c) { gio.observe(c); }); };
    galV.addEventListener("mas:laid", watch);
    watch();
  }

  /* ---------- mini prompt: off during the first fold, then sticky at the bottom until .flow ends above the footer ---------- */
  var pd = doc.querySelector("[data-pdock]");
  if (pd) {
    var pdForm = pd.querySelector("form"), pdIn = pd.querySelector("input");
    var hero = doc.getElementById("stories");
    if (hero && "IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        var e = es[0], off = e.isIntersecting && e.intersectionRatio > 0.4;
        if (off && pd.contains(doc.activeElement)) return;
        pd.classList.toggle("off", off);
      }, { threshold: [0, 0.4, 0.6] }).observe(hero);
    } else pd.classList.remove("off");
    pdForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var go = pd.querySelector(".pd-go");
      if (!pdIn.value.trim()) { pdIn.focus(); pd.classList.remove("nudge"); void pd.offsetWidth; pd.classList.add("nudge"); snd("tick"); return; }
      go.setAttribute("data-busy", ""); snd("pop");
      setTimeout(function () { go.removeAttribute("data-busy"); pdIn.value = ""; pdIn.blur(); }, 900);
    });
  }

  /* ---------- cast reel: eight faces from the open series tab ---------- */
  var reel = doc.querySelector("[data-cast-reel]");
  if (reel) {
    var reelSec = reel.closest("section");
    var track = reel.querySelector(".cast-track");
    var reelRM = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var reelShown = null;
    var facesOf = function (t) {
      var p = reelSec.querySelector('[data-panel="' + t + '"]');
      var srcs = p ? [].slice.call(p.querySelectorAll(".mc img")).map(function (i) { return i.getAttribute("src"); }) : [];
      if (!srcs.length) return [];
      var out = [];
      for (var k = 0; k < 8; k++) out.push(srcs[k % srcs.length]);
      return out;
    };
    var face = function (src) {
      var f = doc.createElement("span"); f.className = "cf";
      var im = doc.createElement("img"); im.src = src; im.alt = ""; im.decoding = "async";
      f.appendChild(im); return f;
    };
    /* the eight repeated until one half of the track is wider than the card, then doubled, so the drift loops without a seam
       even when the row runs edge to edge across a full-width card */
    var reelReps = 0, reelSrcs = null;
    var repsFor = function () {
      var w = reel.clientWidth || 300, step = 46; /* 56px bubble, -10px overlap */
      return Math.max(1, Math.ceil((w + step) / (8 * step)));
    };
    var reelBuild = function (srcs) {
      reelSrcs = srcs; reelReps = repsFor();
      track.textContent = "";
      for (var r = 0; r < reelReps * 2; r++) srcs.forEach(function (s) { track.appendChild(face(s)); });
    };
    window.addEventListener("resize", function () { if (reelSrcs && repsFor() > reelReps) reelBuild(reelSrcs); });
    /* the swap: each new face opens from the centre like an iris over the old one, left to right, with a small spring on the bubble */
    var reelSwap = function (srcs) {
      var bubbles = [].slice.call(track.children);
      var left = reel.getBoundingClientRect().left;
      var order = bubbles.map(function (b, i) { return { b: b, i: i, x: b.getBoundingClientRect().left - left }; })
        .sort(function (a, c) { return a.x - c.x; });
      order.forEach(function (o, rank) {
        var b = o.b, src = srcs[o.i % 8], old = b.querySelector("img:last-child");
        var im = doc.createElement("img"); im.src = src; im.alt = ""; im.decoding = "async";
        b.appendChild(im);
        if (reelRM || !im.animate) {
          if (im.animate) im.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: "ease-out" });
          setTimeout(function () { [].slice.call(b.querySelectorAll("img")).slice(0, -1).forEach(function (x) { x.remove(); }); }, 220);
          return;
        }
        var delay = Math.min(rank, 10) * 45;
        im.animate([{ clipPath: "circle(0% at 50% 55%)", transform: "scale(1.25)" }, { clipPath: "circle(75% at 50% 55%)", transform: "scale(1)" }],
          { duration: 420, delay: delay, easing: "cubic-bezier(0.23, 1, 0.32, 1)", fill: "backwards" });
        if (old) old.animate([{ transform: "scale(1)", opacity: 1 }, { transform: "scale(0.82)", opacity: 0.4 }],
          { duration: 420, delay: delay, easing: "cubic-bezier(0.23, 1, 0.32, 1)", fill: "forwards" });
        b.animate([{ transform: "scale(1)" }, { transform: "scale(1.12)", offset: 0.4 }, { transform: "scale(1)" }],
          { duration: 460, delay: delay, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" });
        setTimeout(function () { [].slice.call(b.querySelectorAll("img")).slice(0, -1).forEach(function (x) { x.remove(); }); }, delay + 460);
      });
    };
    var reelSync = function () {
      var on = reelSec.querySelector('[data-tabs="series"] [aria-selected="true"]');
      var t = on ? on.getAttribute("data-tab") : "0";
      if (t === reelShown) return;
      var srcs = facesOf(t); if (!srcs.length) return;
      if (reelShown === null) reelBuild(srcs); else { reelSwap(srcs); reelSrcs = srcs; }
      reelShown = t;
    };
    reelSync();
    var reelTabs = reelSec.querySelector('[data-tabs="series"]');
    if (reelTabs) {
      reelTabs.addEventListener("click", function () { setTimeout(reelSync, 0); });
      reelTabs.addEventListener("keydown", function () { setTimeout(reelSync, 0); });
    }
  }

  /* ---------- tabs ---------- */
  doc.querySelectorAll("[data-tabs]").forEach(function (list) {
    var btns = [].slice.call(list.querySelectorAll("[data-tab]"));
    var sec = list.closest("section");
    var name = list.getAttribute("data-tabs");
    function pick(b, focus) {
      var t = b.getAttribute("data-tab");
      btns.forEach(function (x) {
        var on = x === b;
        x.setAttribute("aria-selected", on ? "true" : "false");
        x.tabIndex = on ? 0 : -1;
        if (x.hasAttribute("aria-pressed")) x.setAttribute("aria-pressed", on ? "true" : "false");
      });
      if (focus) b.focus();
      slide();
      if (name === "agent") {
        sec.querySelectorAll("[data-for]").forEach(function (el) { el.hidden = el.getAttribute("data-for") !== t; });
        var g = sec.querySelector(".ag-g:not([hidden])");
        if (g) { g.classList.remove("in"); void g.offsetWidth; g.classList.add("in"); }
        return;
      }
      sec.querySelectorAll("[data-panel]").forEach(function (p) {
        var on = p.getAttribute("data-panel") === t;
        p.hidden = !on;
        if (on) { p.classList.remove("in"); void p.offsetWidth; p.classList.add("in"); }
      });
    }
    btns.forEach(function (b) { b.tabIndex = b.getAttribute("aria-selected") === "true" ? 0 : -1; });
    /* TextSegmentedSwitch: one shape slides under the picked segment */
    var ind = null;
    function slide() {
      if (!ind) return;
      var b = list.querySelector("[aria-selected=\"true\"]"); if (!b) return;
      ind.style.width = b.offsetWidth + "px";
      ind.style.transform = "translateX(" + b.offsetLeft + "px)";
    }
    if (list.classList.contains("tabs")) {
      ind = doc.createElement("span"); ind.className = "seg-ind"; ind.setAttribute("aria-hidden", "true");
      list.insertBefore(ind, list.firstChild);
      ind.style.transition = "none"; slide(); void ind.offsetWidth; ind.style.transition = "";
      list.classList.add("seg-ready");
      if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(slide);
      window.addEventListener("resize", slide);
    }
    list.addEventListener("click", function (e) { var b = e.target.closest("[data-tab]"); if (b) pick(b); });
    list.addEventListener("keydown", function (e) {
      var k = btns.indexOf(doc.activeElement); if (k < 0) return;
      if (e.key === "ArrowRight") { e.preventDefault(); pick(btns[(k + 1) % btns.length], true); }
      if (e.key === "ArrowLeft") { e.preventDefault(); pick(btns[(k - 1 + btns.length) % btns.length], true); }
    });
  });

  /* ---------- agent graphics: drawn at 600 x 680, scaled to the column; the entrance plays when the band comes into view ---------- */
  var agStage = doc.querySelector("[data-ag-stage]");
  if (agStage) {
    var fit = function () { agStage.style.setProperty("--s", (agStage.clientWidth / 600).toFixed(4)); };
    fit();
    if ("ResizeObserver" in window) new ResizeObserver(fit).observe(agStage); else window.addEventListener("resize", fit);
    if ("IntersectionObserver" in window) {
      var agIO = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        var g = agStage.querySelector(".ag-g:not([hidden])"); if (g) g.classList.add("in");
        agIO.disconnect();
      }, { threshold: 0.35 });
      agIO.observe(agStage);
    } else { var g0 = agStage.querySelector(".ag-g"); if (g0) g0.classList.add("in"); }
  }


  /* ---------- footer ASCII logo (from the boss page): eyes follow the pointer, click ripples, three quick clicks blink ---------- */
  (function () {
    var stage = doc.getElementById("ftStage"), acv = doc.getElementById("ftAscii"), src = doc.getElementById("ftLogo");
    if (!stage || !acv || !src) return;
    var RM = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
    var NS = "http://www.w3.org/2000/svg", logoSvg = src.querySelector("svg");
    var VB = [150, 90, 1300, 590], EYES = [{ x: 652.9, y: 287.4 }, { x: 889.4, y: 287.0 }];
    var ctx = acv.getContext("2d"), grid = null, cols = 0, rows = 0, cw = 0, chh = 0, fontPx = 0, glyph = null;
    var GL = "SLOOSH#%&$@8", GW = "█", ripples = [], blinkUntil = 0, RIP_MS = 1100, looping = false, sleepy = false, look = { x: .95, y: 0, tx: .95, ty: 0 };
    function buildGrid() {
      var Wd = stage.clientWidth || 600, H = Wd * VB[3] / VB[2], dpr = Math.min(2, window.devicePixelRatio || 1);
      cw = Math.max(3.4, Math.min(6.5, Wd / 118)); fontPx = cw / .6; chh = fontPx * 1.02; cols = Math.floor(Wd / cw); rows = Math.floor(H / chh);
      acv.width = Math.round(Wd * dpr); acv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var clone = logoSvg.cloneNode(true);
      clone.querySelectorAll(".lg-pupil, .lg-lid, .lg-streak").forEach(function (n) { n.remove(); });
      clone.querySelectorAll("[clip-path] path[stroke]").forEach(function (n) { n.remove(); });
      clone.setAttribute("xmlns", NS); clone.setAttribute("width", cols * 2); clone.setAttribute("height", rows * 2); clone.setAttribute("preserveAspectRatio", "none"); clone.removeAttribute("class");
      var u = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(clone));
      return new Promise(function (res) {
        var im = new Image();
        im.onload = function () {
          var oc = doc.createElement("canvas"); oc.width = cols * 2; oc.height = rows * 2; var o = oc.getContext("2d"); o.drawImage(im, 0, 0, oc.width, oc.height);
          var d = o.getImageData(0, 0, oc.width, oc.height).data; grid = new Uint8Array(cols * rows); glyph = new Uint8Array(cols * rows);
          for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
            var R = 0, G = 0, B = 0, A = 0;
            for (var sy = 0; sy < 2; sy++) for (var sx = 0; sx < 2; sx++) { var k = ((y * 2 + sy) * oc.width + x * 2 + sx) * 4; R += d[k]; G += d[k + 1]; B += d[k + 2]; A += d[k + 3]; }
            R /= 4; G /= 4; B /= 4; A /= 4; var t = 0; if (A > 90) { if (R > 200 && G > 200 && B > 200) t = 2; else if (R > 150 && G > 100 && B < 140) t = 1; }
            grid[y * cols + x] = t; glyph[y * cols + x] = Math.random() * 255;
          }
          res();
        };
        im.onerror = function () { res(); }; im.src = u;
      });
    }
    function cellOfVb(px, py) { return { x: (px - VB[0]) / VB[2] * cols, y: (py - VB[1]) / VB[3] * rows }; }
    function render(now) {
      if (!grid) return; var Wd = stage.clientWidth, H = Wd * VB[3] / VB[2]; ctx.clearRect(0, 0, Wd, H);
      ctx.font = "700 " + fontPx.toFixed(1) + 'px "JetBrains Mono", ui-monospace, Menlo, monospace'; ctx.textBaseline = "top";
      var pr = 36.4 / VB[2] * cols, prY = 36.4 / VB[3] * rows;
      var pupils = EYES.map(function (e) { return cellOfVb(e.x + look.x * 56, e.y + look.y * 110); }), shines = EYES.map(function (e) { return cellOfVb(e.x + look.x * 56 + 12, e.y + look.y * 110 - 13); });
      var blinking = now < blinkUntil, ar = chh / cw, rings = ripples.map(function (r) { var k = (now - r.t0) / RIP_MS, ek = 1 - Math.pow(1 - k, 2); return { x: r.x, y: r.y, rad: ek * r.max, fade: 1 - k }; });
      for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
        var i = y * cols + x, t = grid[i]; if (!t) continue; var ch, col;
        if (t === 2) {
          var e = x < cols * (771 - VB[0]) / VB[2] ? 0 : 1, p = pupils[e], sh = shines[e], eyeY = cellOfVb(0, EYES[e].y).y, ex = (x + .5 - p.x) / pr, ey = (y + .5 - p.y) / prY;
          if (blinking) { if (Math.abs(y - eyeY) > .6) continue; ch = "▀"; col = "#FFFFFF"; }
          else if (sleepy && y < eyeY - .5) continue;
          else if (sleepy && Math.abs(y - (eyeY - .5)) < .6) { ch = "▄"; col = "#FFFFFF"; }
          else if (Math.abs(x + .5 - sh.x) < .7 && Math.abs(y + .5 - sh.y) < .6) { ch = "o"; col = "#FFFFFF"; }
          else if (ex * ex + ey * ey < 1) continue;
          else { ch = GW; col = "#F5F5F5"; }
          ctx.fillStyle = col; ctx.fillText(ch, x * cw, y * chh);
        } else {
          ch = GL[glyph[i] % GL.length]; ctx.fillStyle = "#FECC15"; ctx.fillText(ch, x * cw, y * chh);
          for (var r = 0; r < rings.length; r++) { var Rr = rings[r], dd = Math.abs(Math.hypot(x - Rr.x, (y - Rr.y) * ar) - Rr.rad); if (dd < 4) { ctx.globalAlpha = (1 - dd / 4) * .3 * (.35 + .65 * Rr.fade); ctx.fillStyle = "#FFFFFF"; ctx.fillText(ch, x * cw, y * chh); ctx.globalAlpha = 1; break; } }
        }
      }
    }
    function settled() { return Math.abs(look.tx - look.x) < .01 && Math.abs(look.ty - look.y) < .01; }
    function loop(now) { ripples = ripples.filter(function (r) { return now - r.t0 < RIP_MS; }); look.x += (look.tx - look.x) * .25; look.y += (look.ty - look.y) * .25; render(now); if (ripples.length || now < blinkUntil || !settled()) requestAnimationFrame(loop); else { looping = false; look.x = look.tx; look.y = look.ty; render(now); } }
    function kick() { if (!looping) { looping = true; requestAnimationFrame(loop); } }
    var idleT = 0;
    window.addEventListener("pointermove", function (ev) {
      var r = acv.getBoundingClientRect(); if (!r.width || r.bottom < -200 || r.top > innerHeight + 200) return;
      var dx = ev.clientX - (r.left + r.width * .5), dy = ev.clientY - (r.top + r.height * .36), d = Math.hypot(dx, dy) || 1, s = Math.min(1, d / 220);
      look.tx = dx / d * s; look.ty = dy / d * s; sleepy = false;
      clearTimeout(idleT); idleT = setTimeout(function () { sleepy = true; look.tx = .2; look.ty = .55; kick(); }, 20000);
      if (!RM) kick(); else { look.x = look.tx; look.y = look.ty; render(performance.now()); }
    }, { passive: true });
    var clicks = [];
    stage.addEventListener("click", function (ev) {
      snd("pop");
      if (RM || !grid) return; var r = acv.getBoundingClientRect(), x = (ev.clientX - r.left) / cw, y = (ev.clientY - r.top) / chh, now = performance.now(), ar = chh / cw;
      var max = Math.max(Math.hypot(x, y * ar), Math.hypot(cols - x, y * ar), Math.hypot(x, (rows - y) * ar), Math.hypot(cols - x, (rows - y) * ar)) + 4;
      ripples.push({ x: x, y: y, t0: now, max: max }); if (ripples.length > 3) ripples.shift();
      clicks = clicks.filter(function (c) { return now - c < 1200; }); clicks.push(now); if (clicks.length >= 3) { blinkUntil = now + 160; clicks = []; } kick();
    });
    function rebuild() { buildGrid().then(function () { render(0); }); }
    var rt = 0; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(rebuild, 150); });
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(rebuild); else rebuild();
  })();


  /* ---------- footer critters in ASCII ----------
     The page's own critters (read from the banners, so they stay identical), rasterised into the same glyph grid
     as the ASCII logo. They hang upside down from the yellow hem in the empty space either side of the logo and
     peek in and out on their own timers. Hovering the dark band brings everyone out, clicking one makes it flinch,
     pupils follow the pointer and they blink now and then. Hidden when there's no room beside the logo. */
  (function () {
    var band = doc.querySelector(".sf-dark"), stage = doc.getElementById("ftStage"), big = doc.querySelector(".sf-big");
    if (!band || !stage || !big) return;
    var RM = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
    var SIZE = { mouse: 0.72, bird: 0.88, cat: 0.9, squirrel: 1, dog: 1 };
    var seen = {}, kinds = [];
    doc.querySelectorAll(".pk .cr svg").forEach(function (svg) {
      var vb = svg.getAttribute("viewBox"); if (!vb || seen[vb]) return; seen[vb] = 1;
      var lb = (svg.closest(".pk").getAttribute("aria-label") || "").toLowerCase(), m = 1;
      Object.keys(SIZE).forEach(function (k) { if (lb.indexOf(k) > -1) m = SIZE[k]; });
      var v = vb.split(/[\s,]+/).map(Number); kinds.push({ svg: svg, w: v[2], h: v[3], m: m });
    });
    if (!kinds.length) return;
    var cv = doc.createElement("canvas"); cv.className = "sf-crit"; cv.setAttribute("aria-hidden", "true"); band.insertBefore(cv, band.firstChild);
    var ctx = cv.getContext("2d"), Y = "#FECC15", GL = "SLOOSH#%&$@8", S = 3;
    var cw = 0, chh = 0, fontPx = 0, W = 0, H = 0, slots = [], cache = {}, live = false, hovering = false, raf = 0, last = 0, ptr = null, gen = 0;

    /* one critter, one orientation: cells of 1 body / 2 eye white / 3 pupil, plus each eye's geometry */
    function raster(k, rows, mirror) {
      var key = kinds.indexOf(k) + "|" + rows + "|" + (mirror ? 1 : 0); if (cache[key]) return Promise.resolve(cache[key]);
      var cols = Math.max(4, Math.round(rows * chh * k.w / k.h / cw));
      var c = k.svg.cloneNode(true);
      c.querySelectorAll(".b").forEach(function (n) { n.setAttribute("fill", Y); });
      c.querySelectorAll(".r").forEach(function (n) { n.setAttribute("fill", Y); n.setAttribute("stroke", Y); });
      c.querySelectorAll(".e").forEach(function (n) { n.setAttribute("fill", "#FFFFFF"); });
      c.querySelectorAll(".p").forEach(function (n) { n.setAttribute("fill", "#0A0A0A"); });
      c.setAttribute("xmlns", "http://www.w3.org/2000/svg"); c.setAttribute("width", cols * S); c.setAttribute("height", rows * S); c.setAttribute("preserveAspectRatio", "none");
      var url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(c));
      return new Promise(function (res) {
        var im = new Image();
        im.onload = function () {
          var oc = doc.createElement("canvas"); oc.width = cols * S; oc.height = rows * S; var o = oc.getContext("2d");
          o.drawImage(im, 0, 0, oc.width, oc.height);
          var d = o.getImageData(0, 0, oc.width, oc.height).data, u = new Uint8Array(cols * rows), t = new Uint8Array(cols * rows), g = new Uint8Array(cols * rows);
          for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
            var R = 0, G = 0, B = 0, A = 0;
            for (var sy = 0; sy < S; sy++) for (var sx = 0; sx < S; sx++) { var q = ((y * S + sy) * oc.width + x * S + sx) * 4; R += d[q]; G += d[q + 1]; B += d[q + 2]; A += d[q + 3]; }
            var n = S * S; R /= n; G /= n; B /= n; A /= n; var v = 0;
            if (A > 110) { if (R > 150 && B < 150 && R - B > 60) v = 1; else if (R > 200 && G > 200 && B > 200) v = 2; else v = 3; }
            u[y * cols + x] = v; g[y * cols + x] = Math.random() * 255;
          }
          /* hang it head first out of the hem: critters drawn upright get turned upside down,
             ones already drawn peeking down (eyes in the lower half) stay as they are */
          var ey0 = 0, en = 0; for (var j = 0; j < u.length; j++) if (u[j] > 1) { ey0 += (j / cols) | 0; en++; }
          var flipY = !en || ey0 / en < rows / 2, flipX = flipY !== !!mirror;
          for (var y2 = 0; y2 < rows; y2++) for (var x2 = 0; x2 < cols; x2++)
            t[y2 * cols + x2] = u[(flipY ? rows - 1 - y2 : y2) * cols + (flipX ? cols - 1 - x2 : x2)];
          /* eyes: connected white + pupil cells; dark bits with no white around them are just holes */
          var seenC = new Uint8Array(cols * rows), eyes = [], top = rows;
          for (var i0 = 0; i0 < t.length; i0++) {
            if (seenC[i0] || (t[i0] !== 2 && t[i0] !== 3)) continue;
            var st = [i0], cells = [], nW = 0, nP = 0, sx2 = 0, sy2 = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1; seenC[i0] = 1;
            while (st.length) {
              var ci = st.pop(), cx = ci % cols, cy = (ci / cols) | 0; cells.push(ci);
              if (t[ci] === 2) nW++; else { nP++; sx2 += cx + .5; sy2 += cy + .5; }
              x0 = Math.min(x0, cx); x1 = Math.max(x1, cx); y0 = Math.min(y0, cy); y1 = Math.max(y1, cy);
              [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (dd) {
                var nx = cx + dd[0], ny = cy + dd[1]; if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) return;
                var ni = ny * cols + nx; if (!seenC[ni] && (t[ni] === 2 || t[ni] === 3)) { seenC[ni] = 1; st.push(ni); }
              });
            }
            if (!nW) { cells.forEach(function (ci) { t[ci] = 0; }); continue; }
            var e = { cells: cells, cx: (x0 + x1 + 1) / 2, cy: (y0 + y1 + 1) / 2, row: Math.floor((y0 + y1 + 1) / 2) };
            e.r = Math.sqrt(Math.max(1, nP) * cw * chh / Math.PI);
            e.tx = Math.max(0, (x1 - x0 + 1) * cw / 2 - e.r - cw * .4); e.ty = Math.max(0, (y1 - y0 + 1) * chh / 2 - e.r - chh * .3);
            e.rx = nP ? Math.max(-1, Math.min(1, (sx2 / nP - e.cx) * cw / (e.tx || 1))) : 0; e.ry = nP ? Math.max(-1, Math.min(1, (sy2 / nP - e.cy) * chh / (e.ty || 1))) : 0;
            cells.forEach(function (ci) { t[ci] = 2; });
            eyes.push(e); top = Math.min(top, y0);
          }
          res(cache[key] = { cols: cols, rows: rows, t: t, g: g, eyes: eyes, eyeTop: top });
        };
        im.onerror = function () { res(null); }; im.src = url;
      });
    }

    function layout() {
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      W = band.clientWidth; H = band.clientHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cw = Math.max(3.4, Math.min(6.5, (stage.clientWidth || 600) / 118)); fontPx = cw / .6; chh = fontPx * 1.02;
      var br = band.getBoundingClientRect(), sr = stage.getBoundingClientRect(), pad = 24;
      var gutL = sr.left - br.left - pad, gutR = br.right - sr.right - pad, room = big.getBoundingClientRect().bottom - br.top - 16;
      var old = slots; old.forEach(function (s) { clearTimeout(s.tm); });
      slots = [];
      [[0, gutL], [sr.right - br.left + pad, gutR]].forEach(function (side) {
        var n = side[1] >= 540 ? 2 : side[1] >= 150 ? 1 : 0, span = side[1] / (n || 1);
        for (var i = 0; i < n; i++) slots.push({ cx: side[0] + (i + .5) * span, maxW: span - 24, maxH: room, c: null, y: -99, v: 0, out: false, lx: 0, ly: 0, ph: Math.random() * 6.3, blink: 0, nextBlink: 0, tm: 0 });
      });
      gen++;
    }

    function pick(s) {
      var used = slots.filter(function (o) { return o !== s && o.c && o.y > -o.c.rows; }).map(function (o) { return o.k; });
      var pool = kinds.filter(function (k) { return used.indexOf(k) < 0; }); if (!pool.length) pool = kinds;
      var k = pool[(Math.random() * pool.length) | 0];
      var hPx = Math.min(250 * k.m, s.maxH, s.maxW * k.h / k.w), rows = Math.max(8, Math.round(hPx / chh)), g0 = gen;
      return raster(k, rows, Math.random() < .5).then(function (c) {
        if (!c || g0 !== gen) return false;
        s.c = c; s.k = k; s.y = -c.rows - 1; s.v = 0;
        /* most of the body comes out; a few rows (feet, tail) stay tucked in the hem, the eyes never do */
        var need = c.rows - c.eyeTop + 3; s.reveal = Math.min(c.rows, Math.max(need, c.rows - 1 - ((Math.random() * c.rows * .22) | 0)));
        var e0 = c.eyes[0]; s.lx = e0 ? e0.rx : 0; s.ly = e0 ? e0.ry : 0;
        return true;
      });
    }
    function show(s) {
      if (s.out) return Promise.resolve();
      return pick(s).then(function (ok) { if (ok) { s.out = true; s.nextBlink = performance.now() + 900 + Math.random() * 3000; kick(); } });
    }
    function hide(s) { s.out = false; kick(); }
    function cycle(s, first) {
      clearTimeout(s.tm);
      s.tm = setTimeout(function () {
        if (!live || hovering) return;
        show(s).then(function () {
          s.tm = setTimeout(function () { if (!live || hovering) return; hide(s); cycle(s, false); }, 2600 + Math.random() * 2400);
        });
      }, first ? 400 + Math.random() * 2200 : 2200 + Math.random() * 4600);
    }
    function start() { slots.forEach(function (s) { cycle(s, true); }); }
    function stopAll() { slots.forEach(function (s) { clearTimeout(s.tm); s.out = false; if (s.c) s.y = -s.c.rows - 1; s.v = 0; }); render(performance.now()); }

    function render(now) {
      ctx.clearRect(0, 0, W, H);
      ctx.font = "700 " + fontPx.toFixed(1) + 'px "JetBrains Mono", ui-monospace, Menlo, monospace'; ctx.textBaseline = "top";
      var br = band.getBoundingClientRect();
      slots.forEach(function (s) {
        var c = s.c; if (!c) return;
        var bob = s.out && !RM ? Math.sin(now / 540 + s.ph) * .55 : 0, ry = Math.round(s.y + bob);
        if (ry + c.rows <= 0) return;
        var x0 = Math.round((s.cx - c.cols * cw / 2) / cw) * cw, y0 = ry * chh;
        s.box = [x0, Math.max(0, y0), x0 + c.cols * cw, y0 + c.rows * chh];
        /* pupils look at the pointer */
        var tx = s.lx, ty = s.ly;
        if (ptr) {
          var dx = ptr.x - (br.left + x0 + c.cols * cw / 2), dy = ptr.y - (br.top + y0 + c.rows * chh * .75), dl = Math.hypot(dx, dy) || 1, k = Math.min(1, dl / 200);
          tx = dx / dl * k; ty = dy / dl * k;
        }
        s.lx += (tx - s.lx) * (RM ? 1 : .22); s.ly += (ty - s.ly) * (RM ? 1 : .22);
        var blinking = now < s.blink, mask = null;
        if (c.eyes.length) {
          mask = {};
          c.eyes.forEach(function (e) {
            var px = e.cx * cw + s.lx * e.tx, py = e.cy * chh + s.ly * e.ty;
            e.cells.forEach(function (ci) {
              var x = ci % c.cols, y = (ci / c.cols) | 0, ex = ((x + .5) * cw - px) / e.r, ey = ((y + .5) * chh - py) / e.r;
              if (blinking) mask[ci] = y === e.row ? 2 : 0;
              else mask[ci] = ex * ex + ey * ey < 1 ? 0 : 1;
            });
          });
        }
        for (var y = Math.max(0, -ry); y < c.rows; y++) {
          var py2 = y0 + y * chh; if (py2 > H) break;
          for (var x = 0; x < c.cols; x++) {
            var i = y * c.cols + x, t = c.t[i]; if (!t) continue;
            if (t === 1) { ctx.fillStyle = Y; ctx.fillText(GL[c.g[i] % GL.length], x0 + x * cw, py2); }
            else if (mask) { var m = mask[i]; if (!m) continue; ctx.fillStyle = "#F5F5F5"; ctx.fillText(m === 2 ? "▀" : "█", x0 + x * cw, py2); }
          }
        }
      });
    }

    function step(now) {
      raf = 0; var dt = Math.min(1 / 30, (now - (last || now)) / 1000); last = now; var busy = false;
      slots.forEach(function (s) {
        if (!s.c) return;
        var target = s.out ? -s.c.rows + s.reveal : -s.c.rows - 1, k = s.out ? 170 : 260, damp = s.out ? 13 : 32;
        s.v += (k * (target - s.y) - damp * s.v) * dt; s.y += s.v * dt;
        if (Math.abs(target - s.y) < .02 && Math.abs(s.v) < .05) { s.y = target; s.v = 0; } else busy = true;
        if (s.out) { busy = true; if (now > s.nextBlink) { s.blink = now + 150; s.nextBlink = now + 2600 + Math.random() * 4200; } }
      });
      render(now);
      if (busy && live) raf = requestAnimationFrame(step); else last = 0;
    }
    function kick() { if (!raf && live && !RM) { last = 0; raf = requestAnimationFrame(step); } else if (RM) render(performance.now()); }

    function hit(ev) {
      var r = band.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top;
      for (var i = 0; i < slots.length; i++) { var s = slots[i], b = s.box; if (s.out && s.c && b && x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3]) return s; }
      return null;
    }
    window.addEventListener("pointermove", function (ev) {
      ptr = { x: ev.clientX, y: ev.clientY };
      if (live && slots.some(function (s) { return s.out; })) kick();
    }, { passive: true });
    band.addEventListener("pointermove", function (ev) { band.style.cursor = !stage.contains(ev.target) && hit(ev) ? "pointer" : ""; });
    band.addEventListener("click", function (ev) {
      if (stage.contains(ev.target) || ev.target.closest("a, button")) return;
      var s = hit(ev); if (!s) return;
      snd("pop"); if (RM) return; s.v = -26; s.blink = performance.now() + 180; kick();
    });
    if (!RM) {
      band.addEventListener("mouseenter", function () { hovering = true; slots.forEach(function (s) { clearTimeout(s.tm); show(s); }); });
      band.addEventListener("mouseleave", function () { hovering = false; slots.forEach(function (s) { hide(s); }); if (live) start(); });
    }

    function boot() {
      layout();
      if (RM) { live = true; Promise.all(slots.map(show)).then(function () { slots.forEach(function (s) { if (s.c) s.y = -s.c.rows + s.reveal; }); render(0); }); return; }
      if (live && !hovering) start(); else if (live) slots.forEach(show);
      render(performance.now());
    }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        var vis = es[0].isIntersecting;
        if (vis && !live) { live = true; if (RM) boot(); else if (!hovering) start(); }
        else if (!vis && live && !RM) { live = false; stopAll(); }
      }, { threshold: 0.15 }).observe(band);
    } else live = true;
    var rt = 0; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { cache = {}; boot(); }, 160); });
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(boot); else boot();
  })();

  /* ---------- the live Spacelab canvas: one scripted loop, only while on screen ---------- */
  (function () {
    var lab = doc.querySelector("[data-lab]"); if (!lab) return;
    var RM = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
    var fit = function () { var s = Math.min(lab.clientWidth / 840, lab.clientHeight / 560); lab.style.setProperty("--s", Math.max(0.3, s).toFixed(4)); };
    fit(); if ("ResizeObserver" in window) new ResizeObserver(fit).observe(lab); else window.addEventListener("resize", fit);
    var note = lab.querySelector(".note p"), ask = lab.querySelector(".lab-ask .txt");
    var STEPS = [[0, 1], [700, 2], [1100, 3], [2500, 4], [2900, 5], [5000, 6], [5600, 7], [6000, 8], [7400, 9], [8400, 10], [9100, 11], [9500, 12], [10200, 13], [11800, 14]];
    var LOOP = 14200, timers = [], running = false;
    function fmt(t) { return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/@(\w+)/g, '<span class="at">@$1</span>'); }
    function typeInto(el, ms) {
      var full = el.getAttribute("data-type"), n = 0, step = Math.max(14, ms / full.length);
      el.classList.add("type-caret");
      (function tick() {
        n++; el.innerHTML = fmt(full.slice(0, n));
        if (n < full.length) timers.push(setTimeout(tick, step)); else timers.push(setTimeout(function () { el.classList.remove("type-caret"); }, 600));
      })();
    }
    function reset() {
      timers.forEach(clearTimeout); timers = [];
      for (var i = 1; i <= 14; i++) lab.classList.remove("s" + i);
      lab.classList.remove("out"); note.innerHTML = ""; ask.innerHTML = "";
    }
    function finalState() { reset(); for (var i = 1; i <= 14; i++) lab.classList.add("s" + i); note.innerHTML = fmt(note.getAttribute("data-type")); ask.innerHTML = fmt(ask.getAttribute("data-type")); }
    function play() {
      reset();
      STEPS.forEach(function (s) {
        timers.push(setTimeout(function () {
          lab.classList.add("s" + s[1]);
          if (s[1] === 2) typeInto(note, 1700);
          if (s[1] === 13) typeInto(ask, 1300);
        }, s[0]));
      });
      timers.push(setTimeout(function () { lab.classList.add("out"); }, LOOP - 600));
      timers.push(setTimeout(function () { if (running) play(); }, LOOP));
    }
    if (RM) { finalState(); return; }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        var vis = es[0].isIntersecting;
        if (vis && !running) { running = true; play(); }
        else if (!vis && running) { running = false; reset(); }
      }, { threshold: 0.3 }).observe(lab);
    } else { running = true; play(); }
    doc.addEventListener("visibilitychange", function () {
      if (doc.hidden && running) { running = false; reset(); }
      else if (!doc.hidden && !running) { var r = lab.getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight) { running = true; play(); } }
    });
  })();


  /* ---------- split banners: peeking critters and hand-drawn marks ----------
     Each critter hides behind an edge and comes out on its own random timer while the banner is on screen.
     Hovering the banner brings everyone out; clicking a critter makes it hop. */
  doc.querySelectorAll("[data-bn]").forEach(function (bn) {
    var RMb = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
    /* critters with data-stay speak a handwritten note: they come out once and stay */
    var stay = [].slice.call(bn.querySelectorAll(".pk[data-stay]"));
    var pks = [].slice.call(bn.querySelectorAll(".pk:not([data-stay])"));
    var timers = [], live = false, hovering = false;
    var settle = function () { stay.forEach(function (pk, i) { setTimeout(function () { pk.classList.add("on"); }, 500 + i * 260); }); };
    function clear() { timers.forEach(clearTimeout); timers = []; }
    function cycle(pk, first) {
      var wait = first ? 500 + Math.random() * 2200 : 2600 + Math.random() * 4200;
      timers.push(setTimeout(function () {
        if (!live || hovering) return;
        pk.classList.add("on");
        timers.push(setTimeout(function () {
          if (!live || hovering) return;
          pk.classList.remove("on"); cycle(pk, false);
        }, 2400 + Math.random() * 2200));
      }, wait));
    }
    function start() { clear(); pks.forEach(function (pk) { cycle(pk, true); }); }
    pks.concat(stay).forEach(function (pk) {
      pk.tabIndex = 0;
      var hop = function () { pk.classList.add("on"); pk.classList.remove("hop"); void pk.offsetWidth; pk.classList.add("hop"); snd("pop"); };
      pk.addEventListener("click", hop);
      pk.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); hop(); } });
      pk.addEventListener("animationend", function () { pk.classList.remove("hop"); });
    });
    if (RMb) { pks.concat(stay).forEach(function (pk) { pk.classList.add("on"); }); bn.classList.add("in"); return; }
    bn.addEventListener("mouseenter", function () { hovering = true; clear(); pks.forEach(function (pk) { pk.classList.add("on"); }); });
    bn.addEventListener("mouseleave", function () { hovering = false; pks.forEach(function (pk) { pk.classList.remove("on"); }); if (live) start(); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        var vis = es[0].isIntersecting;
        if (vis && !bn.classList.contains("in")) settle();
        if (vis) bn.classList.add("in");
        if (vis && !live) { live = true; if (!hovering) start(); }
        else if (!vis && live) { live = false; clear(); }
      }, { threshold: 0.35 }).observe(bn);
    } else { bn.classList.add("in"); settle(); live = true; start(); }
  });

  /* ---------- copy ---------- */
  doc.addEventListener("click", function (e) {
    var b = e.target.closest("[data-copy]"); if (!b) return;
    var txt = b.getAttribute("data-copy"), box = b.closest(".addr") || b;
    var done = function () { box.classList.add("copied"); clearTimeout(box._t); box._t = setTimeout(function () { box.classList.remove("copied"); }, 1500); snd("pop"); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, done); else done();
  });

  /* ---------- click sounds for this page's controls (kit covers keys, nav links, rows) ---------- */
  doc.addEventListener("pointerdown", function (e) {
    var t = e.target;
    if (!t.closest || t.closest("[data-snd], .key, .nl, .chip, .seg button, .mrow, .prow, .st-tap")) return;
    if (t.closest(".tabs button, .ag-tabs button, .ag-copy, .ag-docs, .si, .si-add, .tb, .mr, .tool, .mc, .ep-more, .st-tab, .st-arrow, .ft-cols a")) snd("tap");
  }, true);
})();
