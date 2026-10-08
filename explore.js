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
      bars.forEach(function (bar, k) { bar.classList.toggle("done", k < i); bar.classList.remove("cur"); tabs[k].setAttribute("aria-current", k === i ? "true" : "false"); });
      void bars[i].offsetWidth;
      bars[i].classList.add("cur");
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
      if (name === "agent") {
        sec.querySelectorAll("[data-for]").forEach(function (el) { el.hidden = el.getAttribute("data-for") !== t; });
        return;
      }
      sec.querySelectorAll("[data-panel]").forEach(function (p) {
        var on = p.getAttribute("data-panel") === t;
        p.hidden = !on;
        if (on) { p.classList.remove("in"); void p.offsetWidth; p.classList.add("in"); }
      });
    }
    btns.forEach(function (b) { b.tabIndex = b.getAttribute("aria-selected") === "true" ? 0 : -1; });
    list.addEventListener("click", function (e) { var b = e.target.closest("[data-tab]"); if (b) pick(b); });
    list.addEventListener("keydown", function (e) {
      var k = btns.indexOf(doc.activeElement); if (k < 0) return;
      if (e.key === "ArrowRight") { e.preventDefault(); pick(btns[(k + 1) % btns.length], true); }
      if (e.key === "ArrowLeft") { e.preventDefault(); pick(btns[(k - 1 + btns.length) % btns.length], true); }
    });
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
    if (t.closest(".tabs button, .ag-tabs button, .si, .si-add, .tb, .mr, .tool, .mc, .ep-more, .st-tab, .st-arrow, .ft-cols a")) snd("tap");
  }, true);
})();
