/* ===================== Icon motion =====================
   Finds every Hugeicons icon, names it, splits it into parts, and plays its motion
   when you hover or press the thing it sits in. When a click swaps one icon for another
   (play/pause, sun/moon, copy/tick), the new one blurs in and plays its own motion.
   The motions themselves live in icon-motion.css. */
(function () {
  var doc = document;
  // name: [first path starts with, (optional) another path starts with, duration ms]
  var ICONS = {
    "chev-r":   ["M9.00005 6C9", null, 460],
    "chev-l":   ["M15 6C15 6 9", null, 460],
    "arrow-up": ["M12 5.5V19", null, 460],
    plus:       ["M12 4V20M20 12H4", null, 480],
    add:        ["M12.001 5.00003V19", null, 480],
    minus:      ["M20 12L4 12", null, 420],
    sun:        ["M17 12C17 14.7614", null, 560],
    moon:       ["M21.5 14.0784", null, 600],
    play:       ["M18.8906 12.846", null, 460],
    pause:      ["M4 7C4 5.58579", null, 420],
    video:      ["M2 11C2 7.70017", null, 560],
    image2:     ["M3 16L7.46967", "M15.5 8C", 500],
    imgadd:     ["M3 16L7.46967", "M12 2.5C", 480],
    image1:     ["M2.5 12C2.5 7.52", null, 500],
    folderadd:  ["M13 21H12C7.28", null, 500],
    folder:     ["M8 7H16.75C18.85", null, 500],
    tick:       ["M5 14L8.5 17.5L19", null, 420],
    copy:       ["M7.5 14.5C7.5 11.2", null, 480],
    link:       ["M9.14339 10.691", null, 520],
    sparkles:   ["M15 2L15.5387", null, 650],
    plug:       ["M15.5 2V6M8.5 6V2", null, 540],
    flask:      ["M3 9L11 9M20 9", null, 620],
    workflow:   ["M3 4C3 2.34533", null, 680],
    aichat:     ["M14.1706 20.8905", null, 600],
    aivideo:    ["M14.4531 12.8948", null, 620],
    userstar:   ["M11.995 13.5663", null, 660],
    home:       ["M3 11.9896V14.5", null, 540],
    book:       ["M7.99978 3.5H6.6", null, 560],
    crown:      ["M5 21H19", null, 540],
    reload:     ["M20.5 5.5H9.5C5.78", null, 560],
    repeat:     ["M16.3884 3L17.3913", null, 560],
    share:      ["M21 6.5C21 8.15685", null, 580],
    grid:       ["M3.88884 9.66294", null, 500],
    mouse:      ["M13.5 2L13.5 6", null, 520],
    expand:     ["M8.00001 3.09779", null, 480],
    clock:      ["M12 8V12L14 14", null, 640],
    diamond:    ["M5.92089 5.92089", null, 480],
    wand:       ["M13.9258 12.7775", null, 700],
    info:       ["M12 16V12", null, 460],
    lock:       ["M12 14.5V17.5", null, 500],
    card:       ["M2 12C2 8.46252", null, 480]
  };
  var NAMES = Object.keys(ICONS);
  // what counts as "the thing the icon sits in": anything you can hover or press, plus tags and small labelled lines
  var HOST = "a,button,[role=button],[role=tab],[role=radio],[role=switch],[role=checkbox],label,summary,.pd-chip,.eyebrow,.dr-fine > span,[data-im-host]";
  // icons inside the scripted motion scenes follow the scene, not the pointer
  var SKIP = ".mm,.ma,.mm-in,.sl-cur,[data-im-off]";
  var SHAPES = "path,circle,rect,line,polyline,polygon,ellipse";

  function nameOf(svg) {
    var ds = [].map.call(svg.querySelectorAll("path"), function (p) { return (p.getAttribute("d") || "").trim(); });
    if (!ds.length) return null;
    for (var i = 0; i < NAMES.length; i++) {
      var r = ICONS[NAMES[i]];
      if (ds.some(function (d) { return d.indexOf(r[0]) === 0; }) && (!r[1] || ds.some(function (d) { return d.indexOf(r[1]) === 0; }))) return NAMES[i];
    }
    return null;
  }
  function tag(svg) {
    if (svg.hasAttribute("data-im") || svg.hasAttribute("data-im-x")) return;
    if (svg.closest(SKIP)) { svg.setAttribute("data-im-x", ""); return; }
    var n = nameOf(svg);
    if (!n) { svg.setAttribute("data-im-x", ""); return; }
    var parts = [].slice.call(svg.children).filter(function (c) { return c.matches(SHAPES); });
    if (!parts.length) { svg.setAttribute("data-im-x", ""); return; }
    var g = doc.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "im-a");
    parts.forEach(function (p, i) { p.setAttribute("data-p", i); p.setAttribute("pathLength", "1"); g.appendChild(p); });
    svg.appendChild(g);
    svg.setAttribute("data-im", n);
  }
  function scan() { doc.querySelectorAll('svg[viewBox="0 0 24 24"]:not([data-im]):not([data-im-x])').forEach(tag); }

  /* play one icon's motion; a motion already running finishes first (no stutter on quick re-hovers) */
  function play(svg) {
    if (svg._im) return;
    var r = ICONS[svg.getAttribute("data-im")]; if (!r) return;
    svg.classList.remove("im-on"); void svg.getBoundingClientRect(); svg.classList.add("im-on");
    svg._im = setTimeout(function () { svg.classList.remove("im-on"); svg._im = 0; }, r[2] + 40);
  }
  function shown(el) { return el.getClientRects().length > 0; }
  function iconsOf(host) {
    return [].filter.call(host.querySelectorAll("svg[data-im]"), function (s) { return s.closest(HOST) === host && shown(s); });
  }
  function fire(host) { iconsOf(host).forEach(play); }

  /* hover (mouse/pen only), press (any pointer), keyboard focus */
  doc.addEventListener("pointerover", function (e) {
    if (e.pointerType === "touch") return;
    var h = e.target.closest && e.target.closest(HOST); if (!h) return;
    if (e.relatedTarget && h.contains(e.relatedTarget)) return;
    fire(h);
  }, true);
  doc.addEventListener("pointerdown", function (e) { var h = e.target.closest && e.target.closest(HOST); if (h) fire(h); }, true);
  doc.addEventListener("focusin", function (e) {
    var h = e.target.closest && e.target.closest(HOST);
    if (h && h === e.target && h.matches(":focus-visible")) fire(h);
  });

  /* E. swap: a control holding two icons (one hidden). When the visible one changes, the new one blurs in and plays. */
  var groups = [], watch = typeof MutationObserver !== "undefined" ? new MutationObserver(function () { schedule(); }) : null, queued = false;
  function schedule() { if (queued) return; queued = true; requestAnimationFrame(function () { queued = false; check(); }); }
  function check() {
    groups.forEach(function (g) {
      var vis = g.icons.filter(shown)[0] || null;
      if (vis && vis !== g.vis && g.vis !== undefined) {
        clearTimeout(vis._sw); vis.classList.remove("im-sw"); void vis.getBoundingClientRect(); vis.classList.add("im-sw");
        vis._sw = setTimeout(function () { vis.classList.remove("im-sw"); }, 320);
        clearTimeout(vis._im); vis._im = 0; play(vis);
      }
      g.vis = vis;
    });
  }
  function findGroups() {
    doc.querySelectorAll(HOST).forEach(function (h) {
      if (h._imG) return;
      var all = [].filter.call(h.querySelectorAll("svg[data-im]"), function (s) { return s.closest(HOST) === h; });
      if (all.length < 2) return;
      h._imG = true;
      var g = { host: h, icons: all, vis: undefined }; groups.push(g);
      if (watch) for (var el = h; el && el.nodeType === 1; el = el.parentElement) {
        if (!el._imW) { el._imW = true; watch.observe(el, { attributes: true, attributeFilter: ["class", "data-theme", "hidden", "style"] }); }
      }
      // icons can also be shown/hidden by a class on themselves or their wrappers
      all.forEach(function (s) { for (var el = s; el && el !== h; el = el.parentElement) if (!el._imW && watch) { el._imW = true; watch.observe(el, { attributes: true, attributeFilter: ["class", "hidden", "style"] }); } });
    });
    check();
  }

  /* G. idle: only the Sparkle on "Try Gemini Omni", every ~5.5s while it's on screen and not being hovered */
  function idle() {
    var btn = [].filter.call(doc.querySelectorAll("a.key, button.key"), function (b) { return /Try Gemini Omni/.test(b.textContent); })[0];
    var svg = btn && btn.querySelector('svg[data-im="sparkles"]'); if (!svg || svg._idle) return;
    svg._idle = true; var on = false, over = false;
    btn.addEventListener("pointerenter", function () { over = true; });
    btn.addEventListener("pointerleave", function () { over = false; });
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { on = es[0].isIntersecting; }, { threshold: 0.6 }).observe(btn);
    else on = true;
    setInterval(function () { if (on && !over && !doc.hidden) play(svg); }, 5500);
  }

  function init() {
    scan(); findGroups(); idle();
    // icons added later (prompt chips, menus) get picked up too
    if (typeof MutationObserver !== "undefined") {
      var q = false;
      new MutationObserver(function (ms) {
        if (q) return;
        if (!ms.some(function (m) { return m.addedNodes.length; })) return;
        q = true; requestAnimationFrame(function () { q = false; scan(); findGroups(); });
      }).observe(doc.body, { childList: true, subtree: true });
    }
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init); else init();
  window.slIconMotion = { play: play, tag: tag, names: NAMES, icons: ICONS };
})();
