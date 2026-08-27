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
     Mark instruments — BrandFounder, Goalsreach and Cognitif are
     drawn by the same machine. A scattered cloud settles onto an exact
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

    /* Closed silhouette contours, then any open runs. An open run is
       a strand passing under another: it has to stop dead on the line
       in front of it rather than close up into a shape of its own. */
    var paths = [];
    contours.forEach(function (pts) { paths.push({ pts: pts, closed: true }); });
    (cfg.strokes || []).forEach(function (pts) { paths.push({ pts: pts, closed: false }); });

    /* An optional app-icon plate: a rounded square carrying the mark on its
       face, turned a little left and lifted a little, so the right and lower
       flanks of the body show. It is built in mark space and pushed through
       the same paths list, so the dust and the resolve front treat it as
       part of the drawing rather than as a separate prop. */
    var m11 = 1, m12 = 0, m21 = 0, m22 = 1;
    var ic = cfg.icon;
    if (ic) {
      /* face basis under yaw then pitch, projected flat */
      var cy0 = Math.cos(ic.yaw), sy0 = Math.sin(ic.yaw);
      var cp = Math.cos(ic.pitch), sp = Math.sin(ic.pitch);
      var t11 = cy0, t12 = 0, t21 = sy0 * sp, t22 = cp;
      var cr = Math.cos(ic.roll), sr = Math.sin(ic.roll);
      m11 = cr * t11 - sr * t21; m12 = cr * t12 - sr * t22;
      m21 = sr * t11 + cr * t21; m22 = sr * t12 + cr * t22;

      /* how far the mark reaches, so the plate can be sized around it */
      var mr = 0;
      contours.forEach(function (pts) {
        for (var i = 0; i < pts.length; i += 2) {
          var dx = pts[i] - ax, dy = pts[i + 1] - ay;
          var r = Math.sqrt(dx * dx + dy * dy);
          if (r > mr) mr = r;
        }
      });
      var half = mr * ic.pad, rad = half * ic.radius, arc = 9;
      var face = [];
      var corner = [
        [half - rad, -(half - rad), -1.5708, 0],
        [half - rad, half - rad, 0, 1.5708],
        [-(half - rad), half - rad, 1.5708, 3.1416],
        [-(half - rad), -(half - rad), 3.1416, 4.7124]
      ];
      corner.forEach(function (c) {
        for (var i = 0; i <= arc; i++) {
          var a = c[2] + (c[3] - c[2]) * (i / arc);
          face.push(ax + c[0] + Math.cos(a) * rad, ay + c[1] + Math.sin(a) * rad);
        }
      });

      /* the body offset: the back face sits one depth along the face
         normal, expressed back in mark space so it tilts with everything */
      var depth = half * ic.depth;
      var ex = -depth * sy0, ey = depth * cy0 * sp;          /* on screen */
      var det = t11 * t22 - t12 * t21;
      var mx = (t22 * ex - t12 * ey) / det;                  /* back in mark space */
      var my = (-t21 * ex + t11 * ey) / det;

      /* the flanks you can actually see: the run of the outline facing
         the way the body is extruded */
      var n = face.length / 2, vis = [], i2;
      for (i2 = 0; i2 < n; i2++) {
        var j2 = (i2 + 1) % n;
        var px = face[i2 * 2], py = face[i2 * 2 + 1];
        var qx = face[j2 * 2], qy = face[j2 * 2 + 1];
        var oxn = -(qy - py), oyn = qx - px;
        if (oxn * ((px + qx) / 2 - ax) + oyn * ((py + qy) / 2 - ay) < 0) { oxn = -oxn; oyn = -oyn; }
        vis.push(oxn * mx + oyn * my > 0);
      }
      var start = -1;
      for (i2 = 0; i2 < n; i2++) if (vis[i2] && !vis[(i2 - 1 + n) % n]) start = i2;
      if (start >= 0) {
        var run = [];
        for (i2 = 0; i2 < n && vis[(start + i2) % n]; i2++) run.push((start + i2) % n);
        run.push((start + run.length) % n);
        var body = [face[run[run.length - 1] * 2], face[run[run.length - 1] * 2 + 1]];
        for (i2 = run.length - 1; i2 >= 0; i2--) {
          body.push(face[run[i2] * 2] + mx, face[run[i2] * 2 + 1] + my);
        }
        body.push(face[run[0] * 2], face[run[0] * 2 + 1]);
        paths.push({ pts: body, closed: false });
      }
      paths.push({ pts: face, closed: true });
    }

    /* Even samples along the exact outline. Each one also records
       where it sits along the sweep axis, which is what later ties
       its arrival and the line that replaces it together. */
    var cloud = [], reach = 0, uMin = 1e9, uMax = -1e9;
    paths.forEach(function (path, ci) {
      var pts = path.pts;
      var spacing = cfg.spacing[Math.min(ci, cfg.spacing.length - 1)];
      var count = pts.length / 2, travelled = 0, target = ci * 3.1;
      var segs = path.closed ? count : count - 1;
      for (var i = 0; i < segs; i++) {
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
          /* measured after the projection, so the sweep axis still spans the
             whole figure once it is tilted */
          var u = (rx * m11 + ry * m12) * ux + (rx * m21 + ry * m22) * uy;
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

    /* every mark-space point goes through the same flat projection, so an
       untilted mark simply runs through an identity matrix */
    function projX(cx, x, y, scale) { return cx + ((x - ax) * m11 + (y - ay) * m12) * scale; }
    function projY(cy, x, y, scale) { return cy + ((x - ax) * m21 + (y - ay) * m22) * scale; }

    function traceMark(ctx, cx, cy, scale) {
      for (var c = 0; c < paths.length; c++) {
        var pts = paths[c].pts;
        ctx.moveTo(projX(cx, pts[0], pts[1], scale), projY(cy, pts[0], pts[1], scale));
        for (var i = 2; i < pts.length; i += 2) {
          ctx.lineTo(projX(cx, pts[i], pts[i + 1], scale), projY(cy, pts[i], pts[i + 1], scale));
        }
        if (paths[c].closed) ctx.closePath();
      }
    }

    var render = function (ctx, W, H, te) {
      var R = Math.min(H * 0.425, W * 0.28);
      var scale = R * cfg.fit / reach;
      var cx = W > 460 ? W * 0.56 : W * 0.5;
      var cy = H * 0.5;

      /* the one moving part: a front that crosses the whole figure */
      var swept = clamp((te - 1.46) / 1.54, 0, 1);
      var front = -0.13 + (0.34 * swept + 0.66 * smooth(swept)) * 1.38;
      var lap = clamp(front, 0, 1);
      var live = Math.sin(Math.PI * lap);
      var lead = -1.5708 + lap * Math.PI, trail = -1.5708 - lap * Math.PI;

      var i, n, dot, p, ang, rad, hot, d1, d2, alpha;
      var lightIcon = ic && doc.getAttribute("data-theme") !== "dark";
      var iconTone = lightIcon ? 0.74 : 1;
      var lineAlpha = lightIcon ? 0.38 : 0.52;

      /* main race — the two runners meet at the bottom as the
         front finishes its crossing of the mark */
      for (i = 0, n = ic ? 0 : ringA.length; i < n; i++) {
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
      for (i = 0, n = ic ? 0 : ringB.length; i < n; i++) {
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
          (dot.accent ? 0.66 : 0.62) * (1 - spent) * iconTone;
        var mxp = lerp(dot.sx, dot.tx, p) + dot.bx * bow;
        var myp = lerp(dot.sy, dot.ty, p) + dot.by * bow;
        (dot.accent ? batchAcc : batchLine).add(
          projX(cx, mxp, myp, scale), projY(cy, mxp, myp, scale),
          dot.accent ? 0.95 : 0.88, alpha
        );
      }

      batchLine.flush(ctx, PAL.line);
      batchAcc.flush(ctx, PAL.accent);

      ctx.save();

      /* tick bezel — each tick grows out of the race in turn */
      var bezel = ic ? 0 : smooth(clamp((te - 0.62) / 0.7, 0, 1));
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
      var hair = ic ? 0 : smooth(clamp((te - 0.84) / 0.86, 0, 1));
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
        var g0x = cx + ux * uMin * scale, g0y = cy + uy * uMin * scale;
        var g1x = cx + ux * uMax * scale, g1y = cy + uy * uMax * scale;
        var s1 = clamp(front - 0.09, 0, 1), s2 = clamp(front + 0.04, 0, 1);
        var body = ctx.createLinearGradient(g0x, g0y, g1x, g1y);
        body.addColorStop(0, rgba(PAL.line, lineAlpha));
        body.addColorStop(s1, rgba(PAL.line, lineAlpha));
        body.addColorStop(s2, rgba(PAL.line, 0));
        body.addColorStop(1, rgba(PAL.line, 0));

        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        ctx.strokeStyle = body;
        ctx.lineWidth = 1.15;
        ctx.beginPath();
        traceMark(ctx, cx, cy, scale);
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
      fit: 1.32,
      /* the plate: turned left, lifted, and rolled a touch */
      icon: { yaw: -0.42, pitch: 0.32, roll: 0, pad: 1.20, radius: 0.34, depth: 0.42 },
      sweep: -0.42,
      seed: 0x6bf23a91,
      ringA: 112,
      ringB: 76
    },
    /* Goalsreach: five closed silhouettes traced directly from the
       2048 px production vector. The four-pixel raster fleck near the
       upper flourish was discarded; every intentional component is
       retained with a maximum three-source-pixel simplification error.
       It uses the same dimensional app-icon plate and reveal timings as
       BrandFounder so the two founder products read as a matched pair. */
    goalsreach: {
      contours: [
        [624,808,626,812,598,860,574,924,550,1046,548,1106,552,1160,560,1206,578,1266,606,1328,642,1386,712,1466,758,1504,814,1540,876,1570,928,1588,1024,1606,1086,1608,1140,1604,1232,1586,1336,1542,1424,1482,1760,1136,1656,1710,1650,1706,1568,1566,1514,1616,1462,1656,1348,1720,1220,1762,1094,1778,1044,1778,962,1770,888,1754,826,1734,732,1690,678,1656,626,1616,538,1526,468,1422,452,1384,428,1302,416,1196,418,1150,428,1088,444,1036,466,988,532,894,580,844],
        [848,732,928,732,992,742,1068,766,1134,800,1094,796,1022,800,976,812,918,840,882,866,838,912,814,948,786,1016,778,1058,776,1110,782,1158,800,1214,822,1256,856,1300,902,1340,950,1368,994,1384,1048,1394,1132,1390,1182,1376,1228,1354,1270,1324,1294,1300,1288,1292,1146,1212,1122,1194,1736,1110,1738,1114,1404,1454,1342,1500,1274,1536,1218,1556,1158,1570,1106,1576,1046,1576,962,1564,868,1532,812,1502,766,1470,704,1412,672,1372,644,1328,610,1254,592,1192,582,1128,582,1044,600,948,630,870,672,800,694,772,718,762,784,742],
        [1024,420,1112,422,1212,438,1302,466,1386,506,1462,558,1522,616,1568,676,1588,712,1602,726,1630,736,1652,734,1680,720,1702,698,1696,736,1672,794,1624,856,1566,898,1496,924,1418,930,1368,922,1310,900,1272,876,1220,824,1152,774,1080,736,1032,718,942,698,846,694,784,704,736,722,760,664,772,602,772,542,760,484,816,460,898,436],
        [348,164,376,164,392,174,376,176,356,186,344,202,338,220,342,264,370,300,392,314,430,324,536,316,572,322,606,334,650,362,678,390,700,420,714,452,688,432,646,418,582,426,490,464,426,476,344,470,314,462,278,444,270,434,312,444,334,438,346,424,316,426,292,420,256,392,236,350,238,302,248,280,256,308,270,332,288,348,322,358,298,340,278,308,270,278,270,252,278,222,294,196,320,174],
        [726,498,730,498,738,542,738,604,728,656,698,726,688,742,626,770,586,796,512,864,478,908,444,964,394,1080,392,1008,404,930,428,852,470,762,508,702,564,632,646,554]
      ],
      anchor: [998, 971],
      spacing: [22, 18],
      fit: 1.32,
      icon: { yaw: -0.42, pitch: 0.32, roll: 0, pad: 1.14, radius: 0.34, depth: 0.42 },
      sweep: -0.42,
      seed: 0x47a1d9e3,
      ringA: 112,
      ringB: 76
    },
    /* Cognitif: the woven six-point star, traced from the mark and
       then folded onto its own sixfold symmetry, so every arm is
       the same arm. Both edges of the strand are outlined, which is
       what makes it read as a drawing rather than a silhouette. */
    cognitif: {
      contours: [
        [535,840,529,837,515,825,465,779,427,740,410,717,416,714,442,711,449,714,492,758,526,789,529,790,565,740,604,677,641,575,636,566,580,549,539,541,535,543,550,588,558,625,563,660,565,722,562,732,534,772,531,770,530,767,532,703,531,694,528,690,520,690,442,705,397,708,305,703,241,697,239,694,246,655,259,598,272,553,283,526,289,529,305,551,306,558,289,618,279,662,280,666,339,672,412,674,455,668,522,655,525,653,527,644,520,609,505,560,498,547,492,551,459,589,430,615,407,632,357,663,347,665,298,661,298,657,300,655,356,624,364,619,366,615,362,608,311,549,288,515,260,464,217,370,218,367,222,364,295,340,353,325,385,321,385,328,374,352,369,357,309,372,265,385,263,388,288,444,324,509,393,592,404,593,446,553,473,521,473,516,427,507,391,495,359,482,304,453,297,445,276,401,279,399,282,400,337,433,345,437,350,437,354,431,380,355,398,318,431,266,489,184,495,187,509,199,559,245,597,284,614,307,608,310,582,313,575,310,532,266,498,235,495,234,459,284,420,347,383,449,388,458,444,475,485,483,489,481,474,436,466,399,461,364,459,302,462,292,490,252,493,254,494,257,492,321,493,330,496,334,504,334,582,319,627,316,719,321,783,327,785,330,778,369,765,426,752,471,741,498,735,495,719,473,718,466,735,406,745,362,744,358,685,352,612,350,569,356,502,369,499,371,497,380,504,415,519,464,526,477,532,473,565,435,594,409,617,392,667,361,677,359,726,363,726,367,724,369,668,400,660,405,658,409,662,416,713,475,736,509,764,560,807,654,806,657,802,660,729,684,671,699,639,703,639,696,650,672,655,667,715,652,759,639,761,636,736,580,700,515,631,432,620,431,578,471,551,503,551,508,597,517,633,529,665,542,720,571,727,579,748,623,745,625,742,624,687,591,679,587,674,587,670,593,644,669,626,706,593,758]
      ],
      /* Where a strand passes under another the artwork breaks it, leaving
         a sliver cut off at both ends. Each break is drawn as that strand's
         two rails only — the runs between the cuts, straightened, set a
         full stroke width apart and run into the strand in front. The
         sliver itself is narrower than that: it gets pinched by whatever
         crosses it, so tracing it leaves the rails too close together to
         read as the same strand. The cut ends are never drawn — they run
         across the strand, not along it. */
      strokes: [
        [312,490,336,470],
        [367,485,332,519],
        [431,329,460,338],
        [462,373,415,360],
        [631,350,637,380],
        [608,399,596,352],
        [712,534,688,554],
        [657,539,692,505],
        [593,695,564,686],
        [562,651,609,664],
        [393,674,387,644],
        [416,625,428,672]
      ],
      anchor: [512, 512],
      spacing: [19, 11],
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
    band: { r: 0.46, cx: 0.92, cy: 0.5, dots: 150, ticks: 76, alpha: 0.12, seed: 0x1c73d2af }
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
