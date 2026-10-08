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

  /* ---------- mini prompt: off during the first fold, then sticky at the bottom until .flow ends above the footer.
     Hover (mouse) or a tap / focus on the pill opens the studio composer above it, with Image / Video tabs.
     It closes when the pointer leaves (unless you're typing or there's a prompt), on Escape, or on a click outside. Text carries both ways. */
  var pd = doc.querySelector("[data-pdock]");
  if (pd) {
    var pdMini = pd.querySelector(".pd-box"), pdIn = pd.querySelector("#pd-in");
    var pdBig = pd.querySelector(".pd-big"), pdCard = pd.querySelector(".pd-card"), pdTa = pd.querySelector("#pd-big-in");
    var pdStage = pd.querySelector(".pd-stage");
    var PD = {}; try { PD = JSON.parse(doc.getElementById("pd-data").textContent); } catch (e) {}
    var hoverable = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var isOpen = false, overT = 0, hovering = false, openedAt = 0;

    var setOpen = function (on, focusTa) {
      if (on && pd.classList.contains("off")) return;
      if (on === isOpen) { if (on && focusTa) pdTa.focus(); return; }
      isOpen = on; if (on) openedAt = Date.now();
      pd.classList.toggle("open", on);
      pdBig.inert = !on;
      pdIn.setAttribute("aria-expanded", on ? "true" : "false");
      if (on) {
        if (pdIn.value && !pdTa.value) pdTa.value = pdIn.value;
        if (focusTa) { pdTa.focus(); var L = pdTa.value.length; try { pdTa.setSelectionRange(L, L); } catch (e) {} }
        snd("tap");
      } else {
        pdIn.value = pdTa.value; statusBtn.hidden = true; hideTip();
        if (pd.contains(doc.activeElement)) doc.activeElement.blur();
      }
    };
    var maybeClose = function () {
      clearTimeout(overT);
      overT = setTimeout(function () { if (!hovering && doc.activeElement !== pdTa && !pdTa.value.trim()) setOpen(false); }, 280);
    };

    /* mouse: open on hover, close shortly after leaving (unless typing inside) */
    if (hoverable) {
      pdStage.addEventListener("pointerenter", function () { hovering = true; clearTimeout(overT); setOpen(true, false); });
      pdStage.addEventListener("pointerleave", function () { hovering = false; maybeClose(); });
    }
    /* tap or keyboard: focusing the pill opens and moves the caret into the composer */
    pdIn.addEventListener("focus", function () { setOpen(true, true); });
    pdMini.addEventListener("click", function (e) { if (e.target.closest(".pd-go")) return; setOpen(true, true); });
    pdBig.addEventListener("focusout", function () { setTimeout(function () { if (!pdBig.contains(doc.activeElement) && !hovering) setOpen(false); }, 0); });
    doc.addEventListener("pointerdown", function (e) { if (isOpen && !pdStage.contains(e.target)) setOpen(false); });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape" && isOpen) { setOpen(false); } });

    /* hidden during the first fold */
    var hero = doc.querySelector("#drop:not([hidden])") || doc.getElementById("stories");
    if (hero && "IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        var e = es[0], off = e.isIntersecting && e.intersectionRatio > 0.4;
        if (off && pd.contains(doc.activeElement)) return;
        pd.classList.toggle("off", off);
        if (off) setOpen(false);
      }, { threshold: [0, 0.4, 0.6] }).observe(hero);
    } else pd.classList.remove("off");

    /* Image / Video: each mode keeps its own model and settings. The chips come from the model's fields, in the
       order of shopos-ui's config-chips.tsx: Add, Model, Enhance, the fields (a duration is a +/- stepper), Sound and
       Camera (video), then the count ("1 image" on images, "1/4" on video). Hugeicons, as Sloosh draws them. */
    var SW = function (p) { return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' + p + '</svg>'; };
    var LN = ' stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"';
    var IC = {
      plus: '<path d="M12.001 5.00003V19.002"' + LN + '/><path d="M19.002 12.002L4.99998 12.002"' + LN + '/>',
      minus: '<path d="M20 12L4 12"' + LN + '/>',
      wand: '<path d="M13.9258 12.7775L11.7775 10.6292C11.4847 10.3364 11.3383 10.19 11.1803 10.1117C10.8798 9.96277 10.527 9.96277 10.2264 10.1117C10.0685 10.19 9.92207 10.3364 9.62923 10.6292C9.33638 10.9221 9.18996 11.0685 9.11169 11.2264C8.96277 11.527 8.96277 11.8798 9.11169 12.1803C9.18996 12.3383 9.33638 12.4847 9.62923 12.7775L11.7775 14.9258M13.9258 12.7775L20.3708 19.2225C20.6636 19.5153 20.81 19.6617 20.8883 19.8197C21.0372 20.1202 21.0372 20.473 20.8883 20.7736C20.81 20.9315 20.6636 21.0779 20.3708 21.3708C20.0779 21.6636 19.9315 21.81 19.7736 21.8883C19.473 22.0372 19.1202 22.0372 18.8197 21.8883C18.6617 21.81 18.5153 21.6636 18.2225 21.3708L11.7775 14.9258M13.9258 12.7775L11.7775 14.9258"' + LN + '/><path d="M17 2L17.2948 2.7966C17.6813 3.84117 17.8746 4.36345 18.2556 4.74445C18.6366 5.12545 19.1588 5.31871 20.2034 5.70523L21 6L20.2034 6.29477C19.1588 6.68129 18.6366 6.87456 18.2556 7.25555C17.8746 7.63655 17.6813 8.15883 17.2948 9.2034L17 10L16.7052 9.2034C16.3187 8.15884 16.1254 7.63655 15.7444 7.25555C15.3634 6.87455 14.8412 6.68129 13.7966 6.29477L13 6L13.7966 5.70523C14.8412 5.31871 15.3634 5.12545 15.7444 4.74445C16.1254 4.36345 16.3187 3.84117 16.7052 2.7966L17 2Z" stroke="currentColor" stroke-linejoin="round" stroke-width="1.5"/><path d="M6 4L6.22108 4.59745C6.51097 5.38087 6.65592 5.77259 6.94167 6.05834C7.22741 6.34408 7.61913 6.48903 8.40255 6.77892L9 7L8.40255 7.22108C7.61913 7.51097 7.22741 7.65592 6.94166 7.94167C6.65592 8.22741 6.51097 8.61913 6.22108 9.40255L6 10L5.77892 9.40255C5.48903 8.61913 5.34408 8.22741 5.05833 7.94167C4.77259 7.65592 4.38087 7.51097 3.59745 7.22108L3 7L3.59745 6.77892C4.38087 6.48903 4.77259 6.34408 5.05833 6.05833C5.34408 5.77259 5.48903 5.38087 5.77892 4.59745L6 4Z" stroke="currentColor" stroke-linejoin="round" stroke-width="1.5"/>',
      gem: '<path d="M5.92089 5.92089C8.15836 3.68342 9.2771 2.56468 10.5857 2.19562C11.5105 1.93479 12.4895 1.93479 13.4143 2.19562C14.7229 2.56468 15.8416 3.68342 18.0791 5.92089C20.3166 8.15836 21.4353 9.2771 21.8044 10.5857C22.0652 11.5105 22.0652 12.4895 21.8044 13.4143C21.4353 14.7229 20.3166 15.8416 18.0791 18.0791C15.8416 20.3166 14.7229 21.4353 13.4143 21.8044C12.4895 22.0652 11.5105 22.0652 10.5857 21.8044C9.2771 21.4353 8.15836 20.3166 5.92089 18.0791C3.68342 15.8416 2.56468 14.7229 2.19562 13.4143C1.93479 12.4895 1.93479 11.5105 2.19562 10.5857C2.56468 9.2771 3.68342 8.15836 5.92089 5.92089Z" stroke="currentColor" stroke-linejoin="round" stroke-width="1.5"/>',
      rect: '<path d="M1.99219 12C1.99219 9.19974 1.99219 7.79961 2.53715 6.73005C3.01652 5.78924 3.78142 5.02433 4.72223 4.54497C5.79179 4 7.19192 4 9.99219 4H13.9922C16.7924 4 18.1926 4 19.2621 4.54497C20.203 5.02433 20.9679 5.78924 21.4472 6.73005C21.9922 7.79961 21.9922 9.19974 21.9922 12C21.9922 14.8003 21.9922 16.2004 21.4472 17.27C20.9679 18.2108 20.203 18.9757 19.2621 19.455C18.1926 20 16.7925 20 13.9922 20H9.99219C7.19192 20 5.79179 20 4.72223 19.455C3.78142 18.9757 3.01652 18.2108 2.53715 17.27C1.99219 16.2004 1.99219 14.8003 1.99219 12Z" stroke="currentColor" stroke-linejoin="round" stroke-width="1.5"/>',
      volOn: '<path d="M14 14.8135V9.18646C14 6.04126 14 4.46866 13.0747 4.0773C12.1494 3.68593 11.0603 4.79793 8.88232 7.02192C7.75439 8.17365 7.11085 8.42869 5.50604 8.42869C4.10257 8.42869 3.40084 8.42869 2.89675 8.77262C1.85035 9.48655 2.00852 10.882 2.00852 12C2.00852 13.118 1.85035 14.5134 2.89675 15.2274C3.40084 15.5713 4.10257 15.5713 5.50604 15.5713C7.11085 15.5713 7.75439 15.8264 8.88232 16.9781C11.0603 19.2021 12.1494 20.3141 13.0747 19.9227C14 19.5313 14 17.9587 14 14.8135Z"' + LN + '/><path d="M17 9C17.6254 9.81968 18 10.8634 18 12C18 13.1366 17.6254 14.1803 17 15"' + LN + '/><path d="M20 7C21.2508 8.36613 22 10.1057 22 12C22 13.8943 21.2508 15.6339 20 17"' + LN + '/>',
      volOff: '<path d="M22 22L2 2"' + LN + '/><path d="M17 10C17.6296 10.7667 18 11.7054 18 12.7195C18 13.1635 17.929 13.593 17.7963 14"' + LN + '/><path d="M20 8C21.2508 9.22951 22 10.7952 22 12.5C22 13.9164 21.4829 15.2367 20.5906 16.348"' + LN + '/><path d="M14 14C14 17.1452 14 19.5313 13.074 19.9227C12.1481 20.3141 11.0583 19.2021 8.8787 16.9781C7.7499 15.8264 7.106 15.5713 5.5 15.5713C4.3879 15.5713 3.02749 15.7187 2.33706 14.6643C2 14.1496 2 13.4331 2 12C2 10.5669 2 9.85038 2.33706 9.33566C3.02749 8.28131 4.3879 8.42869 5.5 8.42869C6.60725 8.42869 7.3569 8.43869 7.96 7.96M14 9.5C14 6.3548 14.026 4.46866 13.1 4.0773C12.3292 3.75147 11.5323 4.46765 10 6"' + LN + '/>',
      cam: '<path d="M12.6974 3.5H11.303C10.5884 3.5 10.2311 3.5 9.91067 3.612C9.71499 3.68039 9.53113 3.77879 9.36568 3.90367C9.09474 4.10816 8.89655 4.40544 8.50018 5L8.50017 5.00001C8.29717 5.30453 7.99794 5.75337 7.87867 5.87871C7.58314 6.18927 7.19563 6.39666 6.77329 6.47029C6.60284 6.5 6.41985 6.5 6.05387 6.5C5.07379 6.5 4.58376 6.5 4.18307 6.61342C3.18074 6.89716 2.39734 7.68055 2.1136 8.68289C2.00018 9.08357 2.00018 9.57361 2.00018 10.5537V14.5C2.00018 17.3284 2.00018 18.7426 2.87886 19.6213C3.75754 20.5 5.17176 20.5 8.00018 20.5H16.0002C18.8286 20.5 20.2428 20.5 21.1215 19.6213C22.0002 18.7426 22.0002 17.3284 22.0002 14.5V10.5537C22.0002 9.57361 22.0002 9.08357 21.8868 8.68289C21.603 7.68055 20.8196 6.89716 19.8173 6.61342C19.4166 6.5 18.9266 6.5 17.9465 6.5C17.5805 6.5 17.3975 6.5 17.2271 6.47029C16.8047 6.39666 16.4172 6.18927 16.1217 5.87871C16.0024 5.75336 15.7032 5.30451 15.5002 5C15.1038 4.40544 14.9056 4.10816 14.6347 3.90367C14.4692 3.77879 14.2854 3.68039 14.0897 3.612C13.7693 3.5 13.412 3.5 12.6974 3.5Z"' + LN + '/><path d="M16.0002 13C16.0002 15.2091 14.2093 17 12.0002 17C9.79104 17 8.00018 15.2091 8.00018 13C8.00018 10.7909 9.79104 9 12.0002 9C14.2093 9 16.0002 10.7909 16.0002 13Z"' + LN + '/><path d="M19.1252 9.5H19.0002M19.2502 9.5C19.2502 9.63807 19.1383 9.75 19.0002 9.75C18.8621 9.75 18.7502 9.63807 18.7502 9.5C18.7502 9.36193 18.8621 9.25 19.0002 9.25C19.1383 9.25 19.2502 9.36193 19.2502 9.5Z" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"/>'
    };
    var ENHANCE_HINT = "Rewrites your prompt for the selected model", MAX_GENERATIONS = 4;
    var chipsEl = pd.querySelector("[data-pd-chips]"), rail = pd.querySelector(".pd-rail"), tipEl = pd.querySelector("#pd-tip");
    var statusBtn = pd.querySelector("[data-pd-status]"), genBtn = pd.querySelector(".pd-gen");
    var esc = function (t) { return String(t).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;"); };
    var secondsOf = function (f) { var a = []; for (var s = f.seconds[0]; s <= f.seconds[1]; s += f.seconds[2]) a.push(s); return a; };
    var mode = "image", st = {};
    Object.keys(PD).forEach(function (k) {
      st[k] = { m: 0, enhance: true, sound: true, cam: false, n: 1,
        vals: PD[k].map(function (mo) { var o = {}; mo.fields.forEach(function (f) { o[f.key] = f.default; }); return o; }) };
    });
    var ratioTile = function (v) {
      var r = /(\d+)\s*:\s*(\d+)/.exec(v); if (!r) return SW(IC.rect);
      var w = +r[1], h = +r[2], k = 8 / Math.max(w, h);
      return '<span class="pd-ar" style="width:' + Math.max(2, Math.round(w * k)) + 'px;height:' + Math.max(2, Math.round(h * k)) + 'px"></span>';
    };
    var switchChip = function (key, label, hint, icon, on, locked) {
      return '<span class="pd-chip pd-sw-chip" data-tip="' + esc(label) + '"' + (hint ? ' data-hint="' + esc(hint) + '"' : "") + '><span class="pd-tile">' + SW(icon) + '</span>' +
        '<button type="button" class="pd-sw" role="switch" data-k="' + key + '" aria-checked="' + on + '" aria-label="' + esc(label) + '"' + (locked ? ' aria-disabled="true"' : "") + ' data-snd="tick"><span></span></button></span>';
    };
    var stepper = function (key, name, display, canDec, canInc, decLabel, incLabel) {
      return '<div class="pd-step" role="group" aria-label="' + esc(name + ", " + display) + '" data-tip="' + esc(name) + '">' +
        '<button type="button" data-k="' + key + '-" aria-label="' + decLabel + '" aria-disabled="' + !canDec + '" data-snd="tick">' + SW(IC.minus) + '</button>' +
        '<span class="pd-n">' + esc(display) + '</span>' +
        '<button type="button" data-k="' + key + '+" aria-label="' + incLabel + '" aria-disabled="' + !canInc + '" data-snd="tick">' + SW(IC.plus) + '</button></div>';
    };
    var measureRow = function () {
      var end = chipsEl.scrollWidth - chipsEl.clientWidth - chipsEl.scrollLeft > 1, start = chipsEl.scrollLeft > 1;
      chipsEl.classList.toggle("clip-end", end); chipsEl.classList.toggle("clip-start", start);
    };
    var render = function () {
      var list = PD[mode]; if (!list) return;
      var s = st[mode], mo = list[s.m], vals = s.vals[s.m], video = mode === "video";
      var focusK = doc.activeElement && chipsEl.contains(doc.activeElement) ? doc.activeElement.getAttribute("data-k") : null;
      var h = '<button type="button" class="pd-plus" data-k="add" aria-label="Add media" data-tip="Add media" data-snd="tap">' + SW(IC.plus) + '</button>';
      h += '<button type="button" class="pd-chip" data-k="model" aria-label="Model: ' + esc(mo.name) + '" data-tip="Model" data-snd="tap"><span class="pd-tile"><img alt="" src="' + esc(mo.logo) + '"' + (mo.mono ? ' class="mono"' : "") + '></span><span>' + esc(mo.name) + '</span></button>';
      h += switchChip("enhance", "Enhance prompt", ENHANCE_HINT, IC.wand, s.enhance, false);
      mo.fields.forEach(function (f) {
        var v = vals[f.key];
        if (f.seconds) {
          var L = secondsOf(f), i = L.indexOf(v);
          h += stepper("d", "Length", v + "s", i > 0, i < L.length - 1, "Shorter duration", "Longer duration");
          return;
        }
        var aspect = /aspect|ratio/i.test(f.key + " " + f.label);
        h += '<button type="button" class="pd-chip" data-k="f:' + f.key + '" aria-label="' + esc(f.label + ": " + v) + '" data-tip="' + (aspect ? "Aspect ratio" : "Quality") + '" data-snd="tap">' +
          '<span class="pd-tile">' + (aspect ? ratioTile(v) : SW(IC.gem)) + '</span><span>' + esc(v) + '</span></button>';
      });
      if (video && mo.sound) {
        var on = mo.sound === "always" ? true : mo.sound === "never" ? false : s.sound;
        h += switchChip("sound", "Sound", mo.sound === "always" ? "This model always makes sound" : mo.sound === "never" ? "This model makes silent videos" : "", on ? IC.volOn : IC.volOff, on, mo.sound !== "optional");
      }
      if (video) h += '<button type="button" class="pd-cam" data-k="cam" aria-pressed="' + s.cam + '" aria-label="Camera: Auto" data-tip="Camera: Auto" data-snd="tap">' + SW(IC.cam) + '</button>';
      h += stepper("n", "Number of " + mode + "s", video ? s.n + "/" + MAX_GENERATIONS : s.n + " image" + (s.n === 1 ? "" : "s"), s.n > 1, s.n < MAX_GENERATIONS, "Fewer generations", "More generations");
      chipsEl.innerHTML = h;
      if (focusK) { var back = chipsEl.querySelector('[data-k="' + focusK + '"]'); if (back) back.focus(); }
      rail.setAttribute("data-mode", mode);
      rail.querySelectorAll("[data-pd-mode]").forEach(function (b) { var sel = b.getAttribute("data-pd-mode") === mode; b.setAttribute("aria-selected", sel ? "true" : "false"); b.tabIndex = sel ? 0 : -1; });
      requestAnimationFrame(measureRow);
    };
    chipsEl.addEventListener("scroll", measureRow, { passive: true });
    window.addEventListener("resize", measureRow);
    chipsEl.addEventListener("click", function (e) {
      var b = e.target.closest("[data-k]"); if (!b || b.getAttribute("aria-disabled") === "true") return;
      var k = b.getAttribute("data-k"), s = st[mode], list = PD[mode], mo = list[s.m], vals = s.vals[s.m];
      if (k === "add") return; /* the uploader lives in Studio; nothing to attach on the homepage */
      if (k === "model") s.m = (s.m + 1) % list.length;
      else if (k === "enhance") s.enhance = !s.enhance;
      else if (k === "sound") s.sound = !s.sound;
      else if (k === "cam") s.cam = !s.cam;
      else if (k === "n-" || k === "n+") s.n = Math.max(1, Math.min(MAX_GENERATIONS, s.n + (k === "n+" ? 1 : -1)));
      else if (k === "d-" || k === "d+") {
        mo.fields.forEach(function (f) { if (!f.seconds) return; var L = secondsOf(f), i = L.indexOf(vals[f.key]) + (k === "d+" ? 1 : -1); if (L[i] != null) vals[f.key] = L[i]; });
      } else if (k.indexOf("f:") === 0) {
        var key = k.slice(2);
        mo.fields.forEach(function (f) { if (f.key === key) vals[key] = f.options[(f.options.indexOf(vals[key]) + 1) % f.options.length]; });
      }
      hideTip(); render();
    });

    /* hover names: one tip above the chip, after a short rest (or at once on keyboard focus) */
    var tipT = 0, tipFor = null;
    var hideTip = function () { clearTimeout(tipT); tipFor = null; tipEl.classList.remove("on"); };
    var showTip = function (el) {
      var name = el.getAttribute("data-tip"), hint = el.getAttribute("data-hint");
      tipEl.innerHTML = esc(name) + (hint ? "<small>" + esc(hint) + "</small>" : "");
      var big = pdBig.getBoundingClientRect(), r = el.getBoundingClientRect();
      tipEl.style.left = "0px"; var w = tipEl.offsetWidth;
      var x = Math.max(0, Math.min(big.width - w, r.left - big.left + r.width / 2 - w / 2));
      tipEl.style.left = x + "px"; tipEl.style.bottom = (big.bottom - r.top + 8) + "px";
      tipEl.classList.add("on");
    };
    chipsEl.addEventListener("pointerover", function (e) {
      var el = e.target.closest("[data-tip]"); if (!el || el === tipFor) return;
      hideTip(); tipFor = el; tipT = setTimeout(function () { if (tipFor === el && isOpen && Date.now() - openedAt > 500) showTip(el); }, 400);
    });
    chipsEl.addEventListener("pointerleave", hideTip);
    chipsEl.addEventListener("focusin", function (e) { var el = e.target.closest("[data-tip]"); if (el && e.target.matches(":focus-visible")) { hideTip(); tipFor = el; showTip(el); } });
    chipsEl.addEventListener("focusout", hideTip);

    /* the rail: Image over Video; arrows move between them */
    rail.querySelectorAll("[data-pd-mode]").forEach(function (b) {
      b.addEventListener("click", function () { var m = b.getAttribute("data-pd-mode"); if (m === mode) return; mode = m; render(); });
      b.addEventListener("keydown", function (e) {
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.key) < 0) return;
        e.preventDefault(); mode = mode === "image" ? "video" : "image"; render(); rail.querySelector('[data-pd-mode="' + mode + '"]').focus();
      });
    });
    render();

    /* the status pill: what a held Generate waits for; it glows again on each held click */
    var showStatus = function (msg) {
      statusBtn.querySelector("span").textContent = msg; statusBtn.hidden = false;
      statusBtn.style.animation = "none"; void statusBtn.offsetWidth; statusBtn.style.animation = "";
    };
    statusBtn.addEventListener("click", function () { pdTa.focus(); });

    /* the textarea grows with the prompt, up to 120px */
    pdTa.addEventListener("input", function () { pdTa.style.height = "auto"; pdTa.style.height = Math.min(pdTa.scrollHeight, 120) + "px"; pdIn.value = pdTa.value; if (pdTa.value.trim()) statusBtn.hidden = true; });
    pdTa.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); pdCard.requestSubmit ? pdCard.requestSubmit() : pdCard.dispatchEvent(new Event("submit")); } });

    pdMini.addEventListener("submit", function (e) { e.preventDefault(); setOpen(true, true); });
    /* Generate is never greyed out: held, a click says what it waits for (the status pill) */
    pdCard.addEventListener("submit", function (e) {
      e.preventDefault();
      if (genBtn.hasAttribute("data-busy")) return;
      if (!pdTa.value.trim()) { showStatus("Write a prompt to generate"); snd("tick"); pdTa.focus(); return; }
      statusBtn.hidden = true;
      genBtn.setAttribute("data-busy", ""); genBtn.setAttribute("aria-busy", "true"); genBtn.innerHTML = '<span class="pd-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="pd-busy">Generating</span>'; snd("pop");
      setTimeout(function () { genBtn.removeAttribute("data-busy"); genBtn.removeAttribute("aria-busy"); genBtn.textContent = "Generate"; pdTa.value = ""; pdIn.value = ""; pdTa.style.height = ""; }, 1400);
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

/* ---------- 0. drop hero: drop / choose / sample a photo, read it, pick three looks, draw them (stand-ins for Meta Muse) ----------
   Ported from the boss artifact. 3 free a day (sessionStorage). The sample rail scrolls edge to edge, drags with a mouse, arrows on hover. */
(function () {
  var doc = document, host = doc.querySelector("[data-drop]");
  if (!host || host.hidden) return;
  var $ = function (s, r) { return (r || host).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || host).querySelectorAll(s)); };
  var snd = function (k) { if (window.slSound) window.slSound(k); };
  var RM = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  var toastEl = $(".dr-toast"), toastT = 0;
  function toast(t) { toastEl.textContent = t; toastEl.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove("on"); }, 2600); snd("pop"); }

  var LOOKS = {
    billboard: ["Billboard at night", "On a giant billboard in Shibuya, wet street reflections"],
    magazine: ["Magazine cover", "Glossy cover, studio flash, bold masthead"],
    studio: ["Pastel studio", "Floating over a ceramic plinth, soft shadow"],
    polaroid: ["Polaroid on cork", "Taped polaroid, warm afternoon light"],
    popart: ["Pop art print", "Four panels, halftone, loud colours"],
    neon: ["Neon portrait", "Magenta and cyan rim light, glowing sign"]
  };
  var KIND = {
    person: { name: "a person", order: ["magazine", "neon", "polaroid", "popart", "billboard", "studio"] },
    product: { name: "a product", order: ["billboard", "studio", "magazine", "popart", "neon", "polaroid"] },
    thing: { name: "a thing", order: ["studio", "popart", "polaroid", "billboard", "neon", "magazine"] }
  };
  var FREE = 3;
  function used() { var n = 0; try { n = +sessionStorage.getItem("sl-surprise") || 0; } catch (e) {} return n; }
  function use() { try { sessionStorage.setItem("sl-surprise", used() + 1); } catch (e) {} }

  var box = $(".dr-box"), inp = $(".dr-zone input"), run = $(".dr-run"), ph = $(".dr-ph img"), tags = $(".dr-tags"), stat = $(".dr-stat p"), bar = $(".dr-bar i"), cards = $$(".dr-card");
  var cur = null, round = 0, timers = [];
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function clear() { timers.forEach(clearTimeout); timers = []; }
  function say(t, s) { stat.innerHTML = t + (s ? "<small>" + s + "</small>" : ""); }
  function grow(to, ms) { bar.style.setProperty("--grow", (RM ? 0 : ms) + "ms"); bar.style.width = to + "%"; }
  function left() { var n = Math.max(0, FREE - used()); $(".dr-left").textContent = n ? n + " of " + FREE + " free surprises left today" : ""; }
  function guess(img) { var r = img.naturalHeight / img.naturalWidth; return r > 1.15 ? "person" : r < 0.9 ? "product" : "thing"; }

  function start(src, preset) {
    clear(); var img = new Image();
    img.onload = function () {
      var kind = preset ? preset.kind : guess(img);
      cur = { img: img, kind: kind, tags: preset ? preset.tags : [kind === "person" ? "Person" : kind === "product" ? "Product" : "Object", img.naturalWidth >= img.naturalHeight ? "Landscape" : "Portrait", "Good light"] };
      round = 0; ph.src = src; host.classList.add("res"); go();
    };
    img.src = src;
  }
  function go() {
    clear();
    if (used() >= FREE) { run.dataset.s = "limit"; say("You’ve used today’s free surprises.", "They come back tomorrow."); left(); return; }
    var looks = KIND[cur.kind].order.slice((round % 2) * 3, (round % 2) * 3 + 3);
    run.dataset.s = "read"; tags.innerHTML = ""; grow(0, 0);
    cards.forEach(function (c) { c.classList.remove("on"); $(".dr-cv", c).innerHTML = ""; $(".dr-cap", c).innerHTML = ""; });
    var fast = RM ? 0.2 : 1;
    say("Looking at your photo…", "Is it a person, a product or a thing?"); requestAnimationFrame(function () { grow(22, 1200 * fast); });
    later(function () {
      cur.tags.forEach(function (t, i) { later(function () { tags.insertAdjacentHTML("beforeend", "<span>" + t + "</span>"); snd("tick"); }, i * 140); });
      say("Looks like " + KIND[cur.kind].name + ".", "Picking three looks from 1,200 prompts made for it."); run.dataset.s = "pick"; grow(40, 700 * fast);
    }, 1300 * fast);
    later(function () { run.dataset.s = "make"; say("Making your surprises…", "Meta Muse, three takes at once."); grow(92, 2200 * fast); }, 2200 * fast);
    looks.forEach(function (lk, i) {
      later(function () {
        var c = cards[i], cv = draw(lk, cur.img);
        $(".dr-cv", c).appendChild(cv); $(".dr-cap", c).innerHTML = "<b>" + LOOKS[lk][0] + "</b>" + LOOKS[lk][1];
        requestAnimationFrame(function () { c.classList.add("on"); });
        if (i === 2) { use(); round++; grow(100, 200); later(function () { run.dataset.s = used() >= FREE ? "limit" : "done"; say(cur.kind === "person" ? "Here you go. Three of you." : "Here you go. Three looks.", "Keep the ones you like, or turn one into a video."); left(); snd("pop"); }, 300); }
      }, (3600 + i * 380) * fast);
    });
  }

  // drop, choose, or try a sample
  inp.addEventListener("change", function () { var f = inp.files && inp.files[0]; if (f) read(f); inp.value = ""; });
  function read(f) { if (!/^image\//.test(f.type)) return toast("That one isn’t a picture. Try a JPG or PNG."); var r = new FileReader(); r.onload = function () { start(r.result); }; r.readAsDataURL(f); }
  ["dragenter", "dragover"].forEach(function (ev) { host.addEventListener(ev, function (e) { e.preventDefault(); box.classList.add("over"); }); });
  ["dragleave", "drop"].forEach(function (ev) { host.addEventListener(ev, function (e) { e.preventDefault(); if (ev === "dragleave" && host.contains(e.relatedTarget)) return; box.classList.remove("over"); }); });
  host.addEventListener("drop", function (e) { var f = e.dataTransfer && e.dataTransfer.files[0]; if (f) read(f); });
  $(".dr-rail").addEventListener("click", function (e) {
    var b = e.target.closest(".dr-pill"); if (!b || moved) return;
    start(b.getAttribute("data-src"), { kind: b.getAttribute("data-kind"), tags: (b.getAttribute("data-tags") || "").split("|") });
  });
  $(".dr-again").addEventListener("click", go);
  $(".dr-reset").addEventListener("click", function () { clear(); host.classList.remove("res"); run.dataset.s = "idle"; });
  $(".dr-keep").addEventListener("click", function () { toast("Sign up to keep them. They’re saved to your Assets."); });
  $(".dr-limit").addEventListener("click", function () { toast("Sign up opens here. 50 free credits."); });

  // the sample rail: scroll, drag with a mouse, arrows when there is more to see
  var rail = $(".dr-rail"), prev = $(".dr-arr.prev"), next = $(".dr-arr.next"), moved = false, dragX = null, dragS = 0;
  function edges() { prev.classList.toggle("can", rail.scrollLeft > 4); next.classList.toggle("can", rail.scrollLeft < rail.scrollWidth - rail.clientWidth - 4); }
  rail.addEventListener("scroll", edges, { passive: true }); window.addEventListener("resize", edges); edges();
  prev.addEventListener("click", function () { rail.scrollBy({ left: -rail.clientWidth * 0.7, behavior: RM ? "auto" : "smooth" }); });
  next.addEventListener("click", function () { rail.scrollBy({ left: rail.clientWidth * 0.7, behavior: RM ? "auto" : "smooth" }); });
  rail.addEventListener("pointerdown", function (e) { if (e.pointerType !== "mouse" || e.button !== 0) return; dragX = e.clientX; dragS = rail.scrollLeft; moved = false; });
  window.addEventListener("pointermove", function (e) { if (dragX === null) return; var d = e.clientX - dragX; if (!moved && Math.abs(d) > 5) { moved = true; rail.classList.add("drag"); } if (moved) rail.scrollLeft = dragS - d; });
  window.addEventListener("pointerup", function () { if (dragX === null) return; dragX = null; rail.classList.remove("drag"); setTimeout(function () { moved = false; }, 0); });

  /* ---------- the looks, drawn from the photo (stand-ins for the model's output) ---------- */
  var W = 640, H = 800;
  function rnd(seed) { return function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }; }
  function cover(x, img, dx, dy, dw, dh, fy) {
    var r = Math.max(dw / img.naturalWidth, dh / img.naturalHeight), sw = dw / r, sh = dh / r;
    x.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) * (fy == null ? .4 : fy), sw, sh, dx, dy, dw, dh);
  }
  function rr(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
  var FD = '"Bowlby One", Inter, sans-serif', FH = 'Caveat, cursive', FS = 'Inter, sans-serif';
  function draw(look, img) {
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H; var x = cv.getContext('2d'), R = rnd(7 + look.length);
    LOOK[look](x, img, R); return cv;
  }
  var LOOK = {
    billboard: function (x, img, R) {
      var g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#07081c'); g.addColorStop(.6, '#1d0b33'); g.addColorStop(1, '#05040c'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      for (var i = 0; i < 14; i++) { var bw = 40 + R() * 90, bh = 220 + R() * 360, bx = i * 48 - 20; x.fillStyle = '#0a0a16'; x.fillRect(bx, H * .72 - bh, bw, bh);
        for (var wy = H * .72 - bh + 12; wy < H * .72 - 10; wy += 16) for (var wx = bx + 6; wx < bx + bw - 6; wx += 12) if (R() > .72) { x.fillStyle = R() > .5 ? '#ffcf6b55' : '#7fd4ff44'; x.fillRect(wx, wy, 5, 7); } }
      var bx2 = 92, by = 150, bw2 = 456, bh2 = 330;
      x.save(); x.shadowColor = '#ff4fd8'; x.shadowBlur = 70; x.fillStyle = '#000'; x.fillRect(bx2 - 10, by - 10, bw2 + 20, bh2 + 20); x.restore();
      x.fillStyle = '#16161c'; x.fillRect(bx2 - 10, by - 10, bw2 + 20, bh2 + 20); cover(x, img, bx2, by, bw2, bh2);
      var sh = x.createLinearGradient(0, by, 0, by + bh2); sh.addColorStop(0, '#ffffff22'); sh.addColorStop(.5, '#ffffff00'); x.fillStyle = sh; x.fillRect(bx2, by, bw2, bh2);
      x.fillStyle = '#fecc15'; x.fillRect(bx2, by + bh2 - 44, 150, 44); x.fillStyle = '#0a0a0a'; x.font = '22px ' + FD; x.fillText('NEW DROP', bx2 + 14, by + bh2 - 14);
      x.fillStyle = '#111'; x.fillRect(W / 2 - 8, by + bh2 + 10, 16, H * .72 - by - bh2 - 10);
      var fl = x.createLinearGradient(0, H * .72, 0, H); fl.addColorStop(0, '#1a0f2a'); fl.addColorStop(1, '#040308'); x.fillStyle = fl; x.fillRect(0, H * .72, W, H * .28);
      var gl = x.createRadialGradient(W / 2, H * .74, 10, W / 2, H * .74, 300); gl.addColorStop(0, 'rgba(255,79,216,.35)'); gl.addColorStop(1, 'rgba(255,79,216,0)'); x.fillStyle = gl; x.fillRect(0, H * .72, W, H * .28);
      for (var k = 0; k < 9; k++) { x.fillStyle = 'rgba(255,207,107,' + (.05 + R() * .12) + ')'; x.fillRect(60 + R() * 520, H * .74 + R() * 180, 30 + R() * 90, 2); }
      x.fillStyle = '#ff4fd822'; x.fillRect(0, H * .72, W, 3);
    },
    magazine: function (x, img) {
      cover(x, img, 0, 0, W, H, .3);
      var t = x.createLinearGradient(0, 0, 0, 260); t.addColorStop(0, 'rgba(0,0,0,.55)'); t.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = t; x.fillRect(0, 0, W, 260);
      var b = x.createLinearGradient(0, H - 320, 0, H); b.addColorStop(0, 'rgba(0,0,0,0)'); b.addColorStop(1, 'rgba(0,0,0,.7)'); x.fillStyle = b; x.fillRect(0, H - 320, W, 320);
      x.fillStyle = '#fecc15'; x.font = '128px ' + FD; x.textBaseline = 'top'; x.fillText('SLOOSH', 28, 26);
      x.fillStyle = '#fff'; x.font = '600 18px ' + FS; x.fillText('ISSUE 01  ·  THE ONE PHOTO ISSUE', 32, 172);
      x.textBaseline = 'alphabetic'; x.font = '44px ' + FD; var L2 = cur.kind === 'person' ? ['MAIN', 'CHARACTER'] : ['THE NEW', 'DROP']; x.fillText(L2[0], 32, H - 150); x.fillText(L2[1], 32, H - 104);
      x.font = '600 20px ' + FS; x.fillStyle = '#fecc15'; x.fillText('Made in 9 seconds. 40 more looks inside.', 32, H - 64);
      x.fillStyle = '#fff'; x.fillRect(W - 112, H - 92, 84, 56); x.fillStyle = '#000'; for (var i = 0; i < 26; i++) x.fillRect(W - 106 + i * 3, H - 86, i % 3 ? 1 : 2, 40);
    },
    studio: function (x, img, R) {
      var g = x.createRadialGradient(W * .3, H * .2, 40, W / 2, H / 2, H * .8); g.addColorStop(0, '#ffe3ef'); g.addColorStop(.55, '#d8dcff'); g.addColorStop(1, '#b9c8f6'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.fillStyle = '#ffffffaa'; [[90, 140, 34], [540, 210, 22], [500, 640, 40], [120, 590, 18]].forEach(function (s) { x.beginPath(); x.arc(s[0], s[1], s[2], 0, 7); x.fill(); });
      x.fillStyle = '#eef0ff'; x.beginPath(); x.ellipse(W / 2, H * .8, 220, 46, 0, 0, 7); x.fill(); x.fillStyle = '#dfe3fb'; x.fillRect(W / 2 - 220, H * .8, 440, 80); x.beginPath(); x.ellipse(W / 2, H * .8 + 80, 220, 46, 0, 0, 7); x.fill();
      x.fillStyle = '#f6f7ff'; x.beginPath(); x.ellipse(W / 2, H * .8, 220, 46, 0, 0, 7); x.fill();
      x.save(); x.translate(W / 2, H * .44); x.rotate(-.06); x.shadowColor = 'rgba(60,50,120,.35)'; x.shadowBlur = 50; x.shadowOffsetY = 30; rr(x, -170, -210, 340, 425, 28); x.fillStyle = '#fff'; x.fill(); x.shadowColor = 'transparent'; x.clip(); cover(x, img, -170, -210, 340, 425); x.restore();
    },
    polaroid: function (x, img, R) {
      x.fillStyle = '#b8875a'; x.fillRect(0, 0, W, H); for (var i = 0; i < 1600; i++) { x.fillStyle = R() > .5 ? '#a47447' : '#c99b6e'; x.fillRect(R() * W, R() * H, 2 + R() * 3, 2 + R() * 3); }
      var lg = x.createLinearGradient(0, 0, W, H); lg.addColorStop(0, 'rgba(255,220,150,.35)'); lg.addColorStop(1, 'rgba(0,0,0,.25)'); x.fillStyle = lg; x.fillRect(0, 0, W, H);
      x.save(); x.translate(W / 2, H / 2 - 10); x.rotate(.05); x.shadowColor = 'rgba(0,0,0,.4)'; x.shadowBlur = 30; x.shadowOffsetY = 14; x.fillStyle = '#fbfaf6'; x.fillRect(-230, -300, 460, 590); x.shadowColor = 'transparent';
      cover(x, img, -206, -276, 412, 440); x.fillStyle = 'rgba(255,200,120,.12)'; x.fillRect(-206, -276, 412, 440);
      x.fillStyle = '#2b2b2b'; x.font = '700 46px ' + FH; x.textAlign = 'center'; x.fillText(cur.kind === 'person' ? 'best day, honestly' : 'my favourite thing', 0, 232);
      x.rotate(-.12); x.fillStyle = 'rgba(255,248,220,.75)'; x.fillRect(-70, -322, 140, 40); x.restore();
    },
    popart: function (x, img) {
      var P = [['#fecc15', '#ff2e88'], ['#25d0ff', '#ff3b30'], ['#7dff6b', '#7a2cff'], ['#ff8a00', '#2f5bff']], w = W / 2, h = H / 2;
      P.forEach(function (c, i) {
        var X = (i % 2) * w, Y = Math.floor(i / 2) * h; x.save(); x.beginPath(); x.rect(X, Y, w, h); x.clip();
        x.fillStyle = c[0]; x.fillRect(X, Y, w, h);
        x.filter = 'grayscale(1) contrast(1.9) brightness(1.05)'; x.globalCompositeOperation = 'multiply'; cover(x, img, X, Y, w, h); x.filter = 'none';
        x.globalCompositeOperation = 'screen'; x.fillStyle = c[1] + '66'; x.fillRect(X, Y, w, h); x.globalCompositeOperation = 'source-over';
        x.fillStyle = 'rgba(0,0,0,.18)'; for (var dy = Y + 4; dy < Y + h; dy += 9) for (var dx = X + ((dy / 9) % 2 ? 4 : 0); dx < X + w; dx += 9) { x.beginPath(); x.arc(dx, dy, 1.4, 0, 7); x.fill(); }
        x.restore();
      });
      x.strokeStyle = '#0a0a0a'; x.lineWidth = 8; x.strokeRect(4, 4, W - 8, H - 8); x.beginPath(); x.moveTo(W / 2, 0); x.lineTo(W / 2, H); x.moveTo(0, H / 2); x.lineTo(W, H / 2); x.stroke();
    },
    neon: function (x, img) {
      x.fillStyle = '#07040f'; x.fillRect(0, 0, W, H);
      x.save(); x.filter = 'grayscale(1) contrast(1.35) brightness(.9)'; cover(x, img, 40, 60, W - 80, H - 200, .35); x.filter = 'none';
      x.globalCompositeOperation = 'color'; var g = x.createLinearGradient(40, 0, W - 40, 0); g.addColorStop(0, '#ff2bd6'); g.addColorStop(1, '#16e0ff'); x.fillStyle = g; x.fillRect(40, 60, W - 80, H - 200); x.restore();
      x.save(); x.shadowColor = '#ff2bd6'; x.shadowBlur = 30; x.strokeStyle = '#ff7deb'; x.lineWidth = 6; rr(x, 40, 60, W - 80, H - 200, 24); x.stroke(); x.restore();
      x.save(); x.shadowColor = '#16e0ff'; x.shadowBlur = 26; x.fillStyle = '#c9f7ff'; x.font = '700 76px ' + FH; x.textAlign = 'center'; x.fillText(cur.kind === 'person' ? 'main character' : cur.kind === 'product' ? 'new drop' : 'look at me', W / 2, H - 52); x.restore();
    }
  };
})();
