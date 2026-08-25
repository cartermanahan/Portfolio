/* ============================================================
   CARTER MANAHAN — portfolio behaviour
   theme · nav · reveals · bearing rings · mark instruments
   ============================================================ */
(function () {
  "use strict";

  var doc = document.documentElement;
  var motionOK = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (motionOK) doc.classList.add("motion-ok");
  var finePointer = window.matchMedia("(pointer: fine)").matches;

  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var smooth = function (t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

  /* ----------------------------------------------------------
     Theme — the canvases read their palette from CSS, so every
     instrument on the page repaints with the toggle
  ---------------------------------------------------------- */
  var PAL = { line: "24,32,64", accent: "160,95,60", bg: "247,242,229" };
  function readPalette() {
    var cs = getComputedStyle(doc);
    PAL.line = (cs.getPropertyValue("--fx-line") || "24,32,64").trim();
    PAL.accent = (cs.getPropertyValue("--fx-accent") || "160,95,60").trim();
    PAL.bg = (cs.getPropertyValue("--fx-bg") || "247,242,229").trim();
  }
  function rgba(triplet, a) { return "rgba(" + triplet + "," + (+a).toFixed(3) + ")"; }
  readPalette();

  var themeBtn = document.querySelector(".theme-toggle");
  function applyTheme(t, remember) {
    doc.setAttribute("data-theme", t);
    if (themeBtn) {
      themeBtn.setAttribute("aria-pressed", String(t === "dark"));
      themeBtn.setAttribute("aria-label", t === "dark" ? "Switch to light theme" : "Switch to dark theme");
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t === "dark" ? "#0e1428" : "#f7f2e5");
    /* let the CSS custom properties land before the canvases re-read them */
    requestAnimationFrame(function () { readPalette(); repaintAll(); });
    if (remember) { try { localStorage.setItem("cm-theme", t); } catch (e) {} }
  }
  applyTheme(doc.getAttribute("data-theme") || "light", false);
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      applyTheme(doc.getAttribute("data-theme") === "dark" ? "light" : "dark", true);
    });
  }

  /* every canvas registers a repaint hook so a theme change is instant
     even when its animation loop is paused off-screen */
  var repaints = [];
  function repaintAll() { repaints.forEach(function (fn) { fn(); }); }

  /* ----------------------------------------------------------
     Fixed header — scrolled state
  ---------------------------------------------------------- */
  var header = document.querySelector(".site-header");
  function onHeaderScroll() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 24);
  }
  window.addEventListener("scroll", onHeaderScroll, { passive: true });
  onHeaderScroll();

  /* ----------------------------------------------------------
     Mobile menu
  ---------------------------------------------------------- */
  var toggle = document.querySelector(".nav-toggle");
  var menu = document.getElementById("mobile-menu");
  if (toggle && menu) {
    menu.querySelectorAll(".mm-link").forEach(function (a, i) { a.style.setProperty("--i", i); });
    var setMenu = function (open) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      menu.classList.toggle("is-open", open);
      document.body.classList.toggle("menu-open", open);
      if (open) {
        var first = menu.querySelector("a");
        if (first) first.focus({ preventScroll: true });
      }
    };
    toggle.addEventListener("click", function () {
      setMenu(toggle.getAttribute("aria-expanded") !== "true");
    });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("is-open")) { setMenu(false); toggle.focus(); }
    });
  }

  /* ----------------------------------------------------------
     Reveal on scroll
  ---------------------------------------------------------- */
  var revealEls = document.querySelectorAll(".rv");
  if (revealEls.length && "IntersectionObserver" in window && motionOK) {
    var reveal = function (el) { el.classList.add("in"); ro.unobserve(el); };
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) reveal(en.target); });
    }, { threshold: 0.12, rootMargin: "0px 0px -7% 0px" });
    revealEls.forEach(function (el) { ro.observe(el); });

    /* safety net — a zero-height element never trips the threshold above */
    var sweep = function () {
      var vh = window.innerHeight;
      document.querySelectorAll(".rv:not(.in)").forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < vh * 0.92 && r.bottom > 0) reveal(el);
      });
    };
    window.addEventListener("scroll", sweep, { passive: true });
    window.addEventListener("load", sweep);
    setTimeout(sweep, 1200);
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ----------------------------------------------------------
     Scrollspy
  ---------------------------------------------------------- */
  var spyTargets = Array.prototype.slice
    .call(document.querySelectorAll(".nav-links a[href^='#']"))
    .map(function (a) {
      var sec = document.getElementById(a.getAttribute("href").slice(1));
      return sec ? { link: a, sec: sec } : null;
    })
    .filter(Boolean);
  if (spyTargets.length) {
    var spyRun = false;
    var spy = function () {
      spyRun = false;
      var line = window.scrollY + window.innerHeight * 0.32;
      var current = null;
      spyTargets.forEach(function (t) { if (t.sec.offsetTop <= line) current = t; });
      spyTargets.forEach(function (t) { t.link.classList.toggle("is-active", t === current); });
    };
    window.addEventListener("scroll", function () {
      if (!spyRun) { spyRun = true; requestAnimationFrame(spy); }
    }, { passive: true });
    spy();
  }

  /* ----------------------------------------------------------
     Image slots — fall back to a marked placeholder if the file
     is not there, rather than showing a broken image
  ---------------------------------------------------------- */
  document.querySelectorAll("[data-slot]").forEach(function (slot) {
    var img = slot.querySelector("img");
    if (!img) return;
    var markEmpty = function () { slot.classList.add("is-empty"); };
    if (img.complete) {
      if (!img.naturalWidth) markEmpty();
    } else {
      img.addEventListener("error", markEmpty);
      img.addEventListener("load", function () { if (!img.naturalWidth) markEmpty(); });
    }
  });

  /* ----------------------------------------------------------
     Canvas scaffold for the page instruments
  ---------------------------------------------------------- */
  function canvasFX(canvas, render) {
    var host = canvas.parentElement;
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    var W = 0, H = 0;
    function resize() {
      W = canvas.clientWidth || host.clientWidth;
      H = canvas.clientHeight || host.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    }
    resize();
    window.addEventListener("resize", function () { resize(); kick(); });
    window.addEventListener("load", function () { resize(); kick(); });
    requestAnimationFrame(function () { resize(); kick(); });

    var visT = null, visible = false, running = false;
    function paint(now) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      var elapsed = (now - (visT === null ? now : visT)) / 1000;
      if (render.duration) elapsed = Math.min(elapsed, render.duration);
      render(ctx, W, H, elapsed, canvas);
    }
    function loop(now) {
      if (!visible) { running = false; return; }
      paint(now);
      if (render.static) { running = false; return; }
      if (render.duration && visT !== null && (now - visT) / 1000 >= render.duration) { running = false; return; }
      requestAnimationFrame(loop);
    }
    function kick() {
      if (!motionOK) { visT = performance.now() - 9000; paint(performance.now()); return; }
      if (visible && !running) { running = true; requestAnimationFrame(loop); }
    }
    if (motionOK && "IntersectionObserver" in window) {
      var iofx = new IntersectionObserver(function (en) {
        visible = en[0].isIntersecting;
        if (visible && visT === null) visT = performance.now();
        kick();
      }, { threshold: 0.04 });
      iofx.observe(host);
    } else {
      kick();
    }
    repaints.push(function () { if (!running) paint(performance.now()); });
  }

  /* ----------------------------------------------------------
     Mark instruments — BrandFounder and Cognitif are drawn by
     the same machine. A scattered cloud settles onto an exact
     trace of the logo while a ring assembly spirals into place
     around it, then one light front crosses the whole figure,
     turning dust into line as it passes: the mark materialises
     and catches the light in a single movement, not in two.
  ---------------------------------------------------------- */
  var TAU = 6.283185307;
  var DOT_LEVELS = 12;

  /* Particles are grouped into a dozen alpha buckets, so several
     hundred of them cost a handful of fills rather than a fill
     and a freshly built colour string each. */
  function dotBatch(cap) {
    var xs = [], ys = [], rs = [], n = [];
    for (var i = 0; i < DOT_LEVELS; i++) {
      xs.push(new Float32Array(cap));
      ys.push(new Float32Array(cap));
      rs.push(new Float32Array(cap));
      n.push(0);
    }
    return {
      add: function (x, y, r, a) {
        if (a <= 0.016 || r <= 0.06) return;
        var b = a >= 1 ? DOT_LEVELS - 1 : (a * DOT_LEVELS) | 0;
        var k = n[b];
        if (k < cap) { xs[b][k] = x; ys[b][k] = y; rs[b][k] = r; n[b] = k + 1; }
      },
      flush: function (ctx, colour) {
        ctx.fillStyle = "rgb(" + colour + ")";
        for (var b = 0; b < DOT_LEVELS; b++) {
          var k = n[b];
          if (!k) continue;
          n[b] = 0;
          ctx.globalAlpha = (b + 1) / DOT_LEVELS;
          ctx.beginPath();
          var X = xs[b], Y = ys[b], R = rs[b];
          for (var i = 0; i < k; i++) {
            ctx.moveTo(X[i] + R[i], Y[i]);
            ctx.arc(X[i], Y[i], R[i], 0, TAU);
          }
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    };
  }

  /* both instruments paint into the same pair of buckets */
  var batchLine = null, batchAcc = null, batchCap = 0;
  function ensureBatch(cap) {
    if (cap <= batchCap) return;
    batchCap = cap;
    batchLine = dotBatch(cap);
    batchAcc = dotBatch(cap);
  }

  function makeMark(cfg) {
    var contours = cfg.contours;
    var ax = cfg.anchor[0], ay = cfg.anchor[1];
    var ux = Math.cos(cfg.sweep), uy = Math.sin(cfg.sweep);
    var seed = cfg.seed >>> 0;

    function random() {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    }
    function easeOut(t) {
      t = clamp(t, 0, 1);
      return 1 - Math.pow(1 - t, 3);
    }

    /* Even samples along the exact outline. Each one also records
       where it sits along the sweep axis, which is what later ties
       its arrival and the line that replaces it together. */
    var cloud = [], reach = 0, uMin = 1e9, uMax = -1e9;
    contours.forEach(function (pts, ci) {
      var spacing = cfg.spacing[Math.min(ci, cfg.spacing.length - 1)];
      var count = pts.length / 2, travelled = 0, target = ci * 3.1;
      for (var i = 0; i < count; i++) {
        var j = (i + 1) % count;
        var px = pts[i * 2], py = pts[i * 2 + 1];
        var dx = pts[j * 2] - px, dy = pts[j * 2 + 1] - py;
        var len = Math.sqrt(dx * dx + dy * dy);
        while (target <= travelled + len) {
          var t = len ? (target - travelled) / len : 0;
          var tx = px + dx * t, ty = py + dy * t;
          var rx = tx - ax, ry = ty - ay;
          var rad = Math.sqrt(rx * rx + ry * ry);
          if (rad > reach) reach = rad;
          var u = rx * ux + ry * uy;
          if (u < uMin) uMin = u;
          if (u > uMax) uMax = u;
          cloud.push({ tx: tx, ty: ty, u: u, accent: cloud.length % 16 === 0 });
          target += spacing;
        }
        travelled += len;
      }
    });

    var uSpan = (uMax - uMin) || 1;
    cloud.forEach(function (dot) {
      dot.u = (dot.u - uMin) / uSpan;
      dot.sx = ax + (random() - 0.5) * reach * 3.2;
      dot.sy = ay + (random() - 0.5) * reach * 2.3;
      dot.bx = (random() - 0.5) * reach * 0.38;
      dot.by = (random() - 0.5) * reach * 0.3;
      dot.delay = random() * 0.34 + dot.u * 0.2;
    });

    /* The ring assembly: a main race of dots, a finer one counter-
       spun just inside it, and a tick bezel with a gauge hairline
       outside. Each race closes from the opposite radial side. */
    var NA = cfg.ringA, NB = cfg.ringB, ringA = [], ringB = [], k, a0;
    for (k = 0; k < NA; k++) {
      a0 = -1.5708 + k / NA * TAU;
      ringA.push({
        a: a0, from: a0 + (0.34 + random() * 0.52) * 6.2,
        r0: 0.3 + random() * 1.2, d: random() * 0.3, major: k % 8 === 0
      });
    }
    for (k = 0; k < NB; k++) {
      a0 = -1.5708 + k / NB * TAU;
      ringB.push({
        a: a0, from: a0 - (0.34 + random() * 0.52) * 6.2,
        r0: 1.24 + random() * 0.46, d: random() * 0.34
      });
    }
    ensureBatch(cloud.length + NA + NB + 8);

    function traceMark(ctx, ox, oy, scale) {
      for (var c = 0; c < contours.length; c++) {
        var pts = contours[c];
        ctx.moveTo(ox + pts[0] * scale, oy + pts[1] * scale);
        for (var i = 2; i < pts.length; i += 2) {
          ctx.lineTo(ox + pts[i] * scale, oy + pts[i + 1] * scale);
        }
        ctx.closePath();
      }
    }

    var render = function (ctx, W, H, te) {
      var R = Math.min(H * 0.425, W * 0.28);
      var scale = R * cfg.fit / reach;
      var cx = W > 460 ? W * 0.56 : W * 0.5;
      var cy = H * 0.5;
      var ox = cx - ax * scale, oy = cy - ay * scale;

      /* the one moving part: a front that crosses the whole figure */
      var swept = clamp((te - 1.46) / 1.54, 0, 1);
      var front = -0.13 + (0.34 * swept + 0.66 * smooth(swept)) * 1.38;
      var lap = clamp(front, 0, 1);
      var live = Math.sin(Math.PI * lap);
      var lead = -1.5708 + lap * Math.PI, trail = -1.5708 - lap * Math.PI;

      var i, n, dot, p, ang, rad, hot, d1, d2, alpha;

      /* main race — the two runners meet at the bottom as the
         front finishes its crossing of the mark */
      for (i = 0, n = ringA.length; i < n; i++) {
        dot = ringA[i];
        p = easeOut((te - 0.3 - dot.d) / 1.2);
        ang = lerp(dot.from, dot.a, p) + Math.sin(Math.PI * p) * (1 - p) * 0.6;
        rad = lerp(dot.r0 * R, R, p);
        d1 = Math.atan2(Math.sin(dot.a - lead), Math.cos(dot.a - lead));
        d2 = Math.atan2(Math.sin(dot.a - trail), Math.cos(dot.a - trail));
        hot = (Math.exp(-d1 * d1 * 44) + Math.exp(-d2 * d2 * 44)) * live;
        alpha = smooth(clamp((te - 0.14 - dot.d * 0.4) / 0.4, 0, 1)) * (0.22 + hot * 0.62);
        (hot > 0.1 ? batchAcc : batchLine).add(
          cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad,
          (dot.major ? 1.16 : 0.84) + hot * 0.95, alpha
        );
      }

      /* the finer inner race, closing in from outside */
      for (i = 0, n = ringB.length; i < n; i++) {
        dot = ringB[i];
        p = easeOut((te - 0.36 - dot.d) / 1.26);
        ang = lerp(dot.from, dot.a, p);
        rad = lerp(dot.r0 * R, R * 0.945, p);
        batchLine.add(
          cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad, 0.66,
          smooth(clamp((te - 0.2 - dot.d * 0.4) / 0.44, 0, 1)) * 0.17
        );
      }

      /* Dust ahead of the front, spent behind it. No dot brightens
         or swells on the way past: the only thing that changes is
         whether this stretch of the outline is dots or line. */
      for (i = 0, n = cloud.length; i < n; i++) {
        dot = cloud[i];
        p = easeOut((te - 0.04 - dot.delay) / 1.06);
        var bow = Math.sin(Math.PI * p) * (1 - p);
        var spent = smooth(clamp((front - dot.u) / 0.16, 0, 1));
        alpha = smooth(clamp((te - dot.delay * 0.3) / 0.3, 0, 1)) *
          (dot.accent ? 0.66 : 0.62) * (1 - spent);
        (dot.accent ? batchAcc : batchLine).add(
          ox + (lerp(dot.sx, dot.tx, p) + dot.bx * bow) * scale,
          oy + (lerp(dot.sy, dot.ty, p) + dot.by * bow) * scale,
          dot.accent ? 0.95 : 0.88, alpha
        );
      }

      batchLine.flush(ctx, PAL.line);
      batchAcc.flush(ctx, PAL.accent);

      ctx.save();

      /* tick bezel — each tick grows out of the race in turn */
      var bezel = smooth(clamp((te - 0.62) / 0.7, 0, 1));
      if (bezel > 0.01) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = rgba(PAL.line, 0.19 * bezel);
        ctx.beginPath();
        for (i = 0; i < 60; i++) {
          var ta = -1.5708 + i / 60 * TAU;
          var g = smooth(clamp((te - 0.6 - i / 60 * 0.3) / 0.46, 0, 1));
          if (g < 0.03) continue;
          var r1 = R * 1.03, r2 = R * (i % 5 === 0 ? 1.086 : 1.058);
          var ca = Math.cos(ta), sa = Math.sin(ta);
          ctx.moveTo(cx + ca * r1, cy + sa * r1);
          ctx.lineTo(cx + ca * lerp(r1, r2, g), cy + sa * lerp(r1, r2, g));
        }
        ctx.stroke();
      }

      /* the gauge hairline, and the two arcs that ride on it */
      var hair = smooth(clamp((te - 0.84) / 0.86, 0, 1));
      if (hair > 0.01) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = rgba(PAL.line, 0.1 * hair);
        ctx.beginPath();
        ctx.arc(cx, cy, R * 1.102, 0, TAU);
        ctx.stroke();
        var span = smooth(clamp((te - 1.02) / 1.0, 0, 1)) * 0.46;
        if (span > 0.004) {
          ctx.lineWidth = 1.4;
          ctx.lineCap = "round";
          ctx.strokeStyle = rgba(PAL.line, 0.3 * hair);
          ctx.beginPath();
          ctx.arc(cx, cy, R * 1.102, -1.5708 - span, -1.5708 + span);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(cx, cy, R * 1.102, 1.5708 - span, 1.5708 + span);
          ctx.stroke();
        }
      }

      /* The trace arrives at its settled weight and stays there.
         The line never overshoots, so nothing travels across the
         mark: the dots simply hand over to it as the front goes by. */
      if (front > -0.09) {
        var g0x = ox + (ax + ux * uMin) * scale, g0y = oy + (ay + uy * uMin) * scale;
        var g1x = ox + (ax + ux * uMax) * scale, g1y = oy + (ay + uy * uMax) * scale;
        var s1 = clamp(front - 0.09, 0, 1), s2 = clamp(front + 0.04, 0, 1);
        var body = ctx.createLinearGradient(g0x, g0y, g1x, g1y);
        body.addColorStop(0, rgba(PAL.line, 0.52));
        body.addColorStop(s1, rgba(PAL.line, 0.52));
        body.addColorStop(s2, rgba(PAL.line, 0));
        body.addColorStop(1, rgba(PAL.line, 0));

        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        ctx.strokeStyle = body;
        ctx.lineWidth = 1.15;
        ctx.beginPath();
        traceMark(ctx, ox, oy, scale);
        ctx.stroke();
      }

      ctx.restore();
    };
    render.duration = 3.35;
    return render;
  }

  var MARKS = {
    /* BrandFounder: a 1.5 px RDP trace of the 1024 px production
       icon. The anchor is the centre of the glass bulb, fitted to
       its outer arc, rather than the centre of the artwork — so the
       bulb sits true inside the rings and the arrow reads as
       leaving it, instead of dragging the whole mark off centre. */
    brandfounder: {
      contours: [
        [715,60,722,66,837,217,794,215,779,215,778,217,774,247,763,294,748,341,732,378,741,411,747,451,747,494,743,521,733,555,719,585,695,623,656,676,644,699,638,721,638,785,636,792,630,798,623,800,388,799,378,789,377,720,371,699,356,671,321,624,299,590,282,554,273,524,268,488,269,444,275,408,287,371,311,328,344,292,375,270,408,254,461,240,489,237,526,237,579,245,613,257,601,306,539,305,530,309,522,318,520,324,520,471,506,489,496,499,496,448,492,439,486,433,476,429,418,429,408,433,401,440,398,448,398,576,366,589,335,595,334,597,358,602,369,602,385,598,412,588,457,562,482,542,509,515,542,473,576,416,608,342,629,271,640,208,578,206,578,204],
        [402,825,613,825,624,829,631,835,636,843,638,857,632,873,624,880,613,884,402,884,391,880,384,874,380,868,377,856,378,847,384,835,391,829],
        [618,542,601,557,569,579,540,594,520,601,520,649,528,663,538,668,600,668,613,660,618,650],
        [431,909,584,909,584,912,576,932,556,949,527,958,495,959,468,953,451,944,437,929],
        [495,608,461,614,427,614,398,610,399,653,406,663,416,668,481,667,491,660,496,649]
      ],
      anchor: [507, 473],
      spacing: [11, 9],
      fit: 0.9,
      sweep: -0.42,
      seed: 0x6bf23a91,
      ringA: 112,
      ringB: 76
    },
    /* Cognitif: the woven six-point star, traced from the mark and
       then folded onto its own sixfold symmetry, so every arm is
       the same arm. Both edges of the strand are outlined, which is
       what makes it read as a drawing rather than a silhouette. */
    cognitif: {
      contours: [
        [535,840,529,837,515,825,465,779,427,740,410,717,416,714,442,711,449,714,492,758,526,789,529,790,565,740,604,677,641,575,636,566,580,549,539,541,535,543,550,588,558,625,563,660,565,722,562,732,534,772,531,770,530,767,532,703,531,694,528,690,520,690,442,705,397,708,305,703,241,697,239,694,246,655,259,598,272,553,283,526,289,529,305,551,306,558,289,618,279,662,280,666,339,672,412,674,455,668,522,655,525,653,527,644,520,609,505,560,498,547,492,551,459,589,430,615,407,632,357,663,347,665,298,661,298,657,300,655,356,624,364,619,366,615,362,608,311,549,288,515,260,464,217,370,218,367,222,364,295,340,353,325,385,321,385,328,374,352,369,357,309,372,265,385,263,388,288,444,324,509,393,592,404,593,446,553,473,521,473,516,427,507,391,495,359,482,304,453,297,445,276,401,279,399,282,400,337,433,345,437,350,437,354,431,380,355,398,318,431,266,489,184,495,187,509,199,559,245,597,284,614,307,608,310,582,313,575,310,532,266,498,235,495,234,459,284,420,347,383,449,388,458,444,475,485,483,489,481,474,436,466,399,461,364,459,302,462,292,490,252,493,254,494,257,492,321,493,330,496,334,504,334,582,319,627,316,719,321,783,327,785,330,778,369,765,426,752,471,741,498,735,495,719,473,718,466,735,406,745,362,744,358,685,352,612,350,569,356,502,369,499,371,497,380,504,415,519,464,526,477,532,473,565,435,594,409,617,392,667,361,677,359,726,363,726,367,724,369,668,400,660,405,658,409,662,416,713,475,736,509,764,560,807,654,806,657,802,660,729,684,671,699,639,703,639,696,650,672,655,667,715,652,759,639,761,636,736,580,700,515,631,432,620,431,578,471,551,503,551,508,597,517,633,529,665,542,720,571,727,579,748,623,745,625,742,624,687,591,679,587,674,587,670,593,644,669,626,706,593,758],
        [338,511,335,511,333,510,320,491,321,481,325,477,335,478,356,488,358,490,358,493,356,496,340,510],
        [426,360,424,358,424,356,434,336,443,331,449,333,453,342,455,365,454,368,452,369,448,368,428,362],
        [600,362,601,359,603,358,626,356,634,362,636,368,630,375,611,389,608,390,606,388,604,385,600,364],
        [686,513,689,513,691,514,704,533,703,543,699,547,689,546,668,536,666,534,666,531,668,528,684,514],
        [598,664,600,666,600,668,590,688,581,693,575,691,571,682,569,659,570,656,572,655,576,656,596,662],
        [424,662,423,665,421,666,398,668,390,662,388,656,394,649,413,635,416,634,418,636,420,639,424,660]      ],
      anchor: [512, 512],
      spacing: [19, 13],
      fit: 0.82,
      sweep: -0.42,
      seed: 0x2d9a17c5,
      ringA: 104,
      ringB: 72
    }
  };

  /* ----------------------------------------------------------
     Bearing rings — the instrument frame with nothing inside it:
     a race of dots that closes into a circle, a tick bezel and a
     gauge hairline. The hero figure stands in one. The contact
     band carries a large one running off the edge of the page.
  ---------------------------------------------------------- */
  function makeBearing(cfg) {
    var seed = cfg.seed >>> 0, dots = [], k, a0;
    function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
    for (k = 0; k < cfg.dots; k++) {
      a0 = -1.5708 + k / cfg.dots * TAU;
      dots.push({
        a: a0, from: a0 + (0.3 + random() * 0.5) * 6.2,
        r0: 1.12 + random() * 0.46, d: random() * 0.36, major: k % 8 === 0
      });
    }
    ensureBatch(cfg.dots + 4);

    var render = function (ctx, W, H, te) {
      var R = Math.min(W, H) * cfg.r;
      var cx = W * cfg.cx, cy = H * cfg.cy;
      var i, p, ang, rad, dot, ca, sa, r1, r2, ta;

      for (i = 0; i < dots.length; i++) {
        dot = dots[i];
        p = 1 - Math.pow(1 - clamp((te - 0.24 - dot.d) / 1.3, 0, 1), 3);
        ang = lerp(dot.from, dot.a, p);
        rad = lerp(dot.r0 * R, R, p);
        batchLine.add(
          cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad,
          dot.major ? 1.14 : 0.82,
          smooth(clamp((te - 0.14 - dot.d * 0.4) / 0.42, 0, 1)) * cfg.alpha
        );
      }
      batchLine.flush(ctx, PAL.line);

      var bez = smooth(clamp((te - 0.66) / 1.1, 0, 1));
      if (bez <= 0.01) return;

      ctx.save();
      ctx.lineWidth = 1;
      ctx.strokeStyle = rgba(PAL.line, cfg.alpha * 0.6 * bez);
      ctx.beginPath();
      for (i = 0; i < cfg.ticks; i++) {
        ta = -1.5708 + i / cfg.ticks * TAU;
        ca = Math.cos(ta); sa = Math.sin(ta);
        r1 = R * 1.045;
        r2 = R * (i % 4 === 0 ? 1.098 : 1.076);
        ctx.moveTo(cx + ca * r1, cy + sa * r1);
        ctx.lineTo(cx + ca * lerp(r1, r2, bez), cy + sa * lerp(r1, r2, bez));
      }
      ctx.stroke();

      ctx.strokeStyle = rgba(PAL.line, cfg.alpha * 0.38 * bez);
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.118, 0, TAU);
      ctx.stroke();

      var span = smooth(clamp((te - 0.98) / 1.0, 0, 1)) * 0.42;
      if (span > 0.004) {
        ctx.lineWidth = 1.4;
        ctx.lineCap = "round";
        ctx.strokeStyle = rgba(PAL.line, cfg.alpha * 1.05 * bez);
        ctx.beginPath(); ctx.arc(cx, cy, R * 1.118, -1.5708 - span, -1.5708 + span); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, R * 1.118, 1.5708 - span, 1.5708 + span); ctx.stroke();
      }
      ctx.restore();
    };
    render.duration = 2.55;
    return render;
  }

  var BEARINGS = {
    portrait: { r: 0.42, cx: 0.5, cy: 0.5, dots: 120, ticks: 60, alpha: 0.34, seed: 0x51f3a7c9 },
    band: { r: 0.46, cx: 0.92, cy: 0.5, dots: 150, ticks: 76, alpha: 0.12, seed: 0x1c73d2af },
    award: { r: 0.42, cx: 0.5, cy: 0.5, dots: 132, ticks: 64, alpha: 0.4, seed: 0x9ad41e73 }
  };

  document.querySelectorAll("[data-bearing]").forEach(function (cv) {
    var cfg = BEARINGS[cv.getAttribute("data-bearing")];
    if (cfg) canvasFX(cv, makeBearing(cfg));
  });

  document.querySelectorAll("[data-hero-fx]").forEach(function (cv) {
    var cfg = MARKS[cv.getAttribute("data-hero-fx")];
    if (cfg) canvasFX(cv, makeMark(cfg));
  });

  /* ----------------------------------------------------------
     Hero parallax — the copy recedes as the next section arrives
  ---------------------------------------------------------- */
  var heroSec = document.querySelector(".hero");
  if (heroSec && motionOK) {
    var heroInner = heroSec.querySelector(".hero-inner");
    var hRun = false;
    var hFrame = function () {
      hRun = false;
      var p = clamp(window.scrollY / (heroSec.offsetHeight || 1), 0, 1);
      if (heroInner) {
        heroInner.style.transform = "translate3d(0," + (p * -26).toFixed(1) + "px,0)";
        heroInner.style.opacity = (1 - p * 1.15).toFixed(3);
      }
    };
    window.addEventListener("scroll", function () {
      if (!hRun) { hRun = true; requestAnimationFrame(hFrame); }
    }, { passive: true });
    hFrame();
  }

  /* ----------------------------------------------------------
     Case stage imagery — a slow drift against the scroll
  ---------------------------------------------------------- */
  var stageImgs = document.querySelectorAll(".case-stage--image img");
  if (stageImgs.length && motionOK) {
    var cRun = false;
    var cFrame = function () {
      cRun = false;
      var vh = window.innerHeight;
      stageImgs.forEach(function (img) {
        var r = img.getBoundingClientRect();
        if (r.bottom < -80 || r.top > vh + 80) return;
        var p = (r.top + r.height / 2 - vh / 2) / vh;
        img.style.translate = "0 " + (p * -16).toFixed(1) + "px";
      });
    };
    window.addEventListener("scroll", function () {
      if (!cRun) { cRun = true; requestAnimationFrame(cFrame); }
    }, { passive: true });
    window.addEventListener("load", cFrame);
    cFrame();
  }
})();
