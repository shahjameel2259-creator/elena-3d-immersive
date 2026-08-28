/* ============================================================
   ELENA — scroll motion layer
   Lenis smooth scroll + GSAP ScrollTrigger
   Patterns (research-grounded, archviz-immersive):
     - Apple-style pinned scene beats
     - RADGA horizontal pinned reel w/ opposing parallax
     - Codrops clip-path image wipes
   TUNING NOTES (perf, CPU-only rig):
     - Lenis uses ONE easing mode: lerp only (no duration) -> consistent feel.
     - scrub: true everywhere (Lenis already smooths input; scrub:1 = double-lag).
     - clip-path wipe kept only on 4 pillars; amenity thumbs use cheap y/opacity.
     - will-change limited to a few parallax layers, not 20 thumbnails.
   Respects prefers-reduced-motion. No build step.
   ============================================================ */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var hasGSAP = typeof window.gsap !== "undefined";
  var hasST = hasGSAP && typeof window.ScrollTrigger !== "undefined";

  function boot() {
    if (!hasGSAP || !hasST) { window.__elenaMotion = "disabled:libs-missing"; return; }

    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    // ---- Lenis smooth scroll: SINGLE easing mode (lerp). No duration. ----
    var lenis = null;
    if (typeof window.Lenis !== "undefined" && !reduce) {
      lenis = new window.Lenis({
        lerp: 0.1,            // one consistent easing mode
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 1.5
      });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      // NOTE: deliberately NOT calling lagSmoothing(0) — keep GSAP's
      // frame-drop compensation so heavy paints recover instead of jump.
    }

    // ---------- 1. HERO: content lift + fade (scrub:true) ----------
    // (Hero IMAGE transform is owned by §8 pointer parallax — do NOT animate
    // heroBg here, or the two inline transforms fight.)
    var hero = document.querySelector(".hero");
    var heroContent = document.querySelector(".hero__content");
    if (hero && !reduce) {
      gsap.to(heroContent, {
        yPercent: -12, opacity: 0, ease: "none",
        scrollTrigger: { trigger: hero, start: "top top", end: "70% top", scrub: true }
      });
    }

    // ---------- 2. PARALLAX on act-divider backgrounds (scrub:true) ----------
    gsap.utils.toArray(".act-divider__bg img").forEach(function (img) {
      gsap.fromTo(img,
        { yPercent: -10 },
        { yPercent: 10, ease: "none",
          scrollTrigger: { trigger: img.closest(".act-divider"), start: "top bottom", end: "bottom top", scrub: true }
        });
    });

    // ---------- 3. CLIP-PATH WIPE on PILLARS only (4 imgs, cheap count) ----------
    gsap.utils.toArray(".pillar__thumb").forEach(function (img) {
      gsap.fromTo(img,
        { clipPath: "inset(0% 0% 100% 0%)" },
        { clipPath: "inset(0% 0% 0% 0%)", duration: 1.0, ease: "power3.out",
          scrollTrigger: { trigger: img, start: "top 85%" } });
    });

    // ---------- 4. AMENITY rows: cheap y-reveal on the GALLERY (not .rv) ----------
    // elena.js owns .rv opacity; we only nudge the inner thumbs with transform,
    // never opacity, so they can't get stuck invisible.
    gsap.utils.toArray(".amenity-row__gallery").forEach(function (g) {
      var thumbs = g.querySelectorAll(".amenity-row__thumb");
      gsap.fromTo(thumbs,
        { yPercent: 8 },
        { yPercent: 0, duration: 0.6, stagger: 0.1, ease: "power2.out",
          scrollTrigger: { trigger: g.closest(".amenity-row"), start: "top 82%" } });
    });

    // ---------- 5. AMENITY rows: cheap y-reveal on the GALLERY (not .rv) ----------
    // (Pinned horizontal reel removed: it caused the leftward drift you reported
    // on the Celebrating & Community row, and was fragile on CPU-only machines.
    // Rows now flow full-width, which is the layout you wanted.)
    gsap.utils.toArray(".amenity-row__gallery").forEach(function (g) {
      var thumbs = g.querySelectorAll(".amenity-row__thumb");
      gsap.fromTo(thumbs,
        { yPercent: 8 },
        { yPercent: 0, duration: 0.6, stagger: 0.1, ease: "power2.out",
          scrollTrigger: { trigger: g.closest(".amenity-row"), start: "top 82%" } });
    });
    // Intentionally NO GSAP animation on #homeAct .rv elements: elena.js
    // already fades them in via the .in class. Animating them again is what
    // caused images to fade out and never return. (Left as a no-op anchor.)

    // ---------- 7. Custom cursor (desktop only) ----------
    if (window.matchMedia("(pointer: fine)").matches && !reduce) {
      var dot = document.createElement("div");
      dot.className = "cur-dot";
      document.body.appendChild(dot);
      var x = 0, y = 0, cx = 0, cy = 0;
      window.addEventListener("mousemove", function (e) { x = e.clientX; y = e.clientY; });
      (function ring() {
        cx += (x - cx) * 0.18; cy += (y - cy) * 0.18;
        dot.style.transform = "translate(" + cx + "px," + cy + "px)";
        requestAnimationFrame(ring);
      })();
    }

    // ---------- 8. HERO POINTER PARALLAX + GLOW (pushed "whoa" moment) ----------
    var heroBgWrap = document.querySelector(".hero__bg");
    var heroGlow = document.querySelector(".hero__glow");
    var heroImgEl = document.querySelector(".hero__bg img");
    if (heroBgWrap && !reduce && window.matchMedia("(pointer: fine)").matches) {
      var hx = 0, hy = 0, chx = 0, chy = 0;
      window.addEventListener("mousemove", function (e) {
        var r = heroBgWrap.getBoundingClientRect();
        hx = ((e.clientX - r.left) / r.width - 0.5) * 2;    // -1..1
        hy = ((e.clientY - r.top) / r.height - 0.5) * 2;
        if (heroGlow) {
          heroGlow.style.setProperty("--mx", (((e.clientX - r.left) / r.width) * 100).toFixed(1) + "%");
          heroGlow.style.setProperty("--my", (((e.clientY - r.top) / r.height) * 100).toFixed(1) + "%");
        }
      });
      (function tilt() {
        chx += (hx - chx) * 0.06; chy += (hy - chy) * 0.06;
        // deeper tilt
        heroBgWrap.style.setProperty("--tiltY", (chx * 7).toFixed(2) + "deg");
        heroBgWrap.style.setProperty("--tiltX", (-chy * 5).toFixed(2) + "deg");
        // image depth parallax (opposite direction) for real 3D
        if (heroImgEl) {
          heroImgEl.style.transform = "scale(1.12) translate(" + (-chx * 18).toFixed(1) + "px," + (-chy * 14).toFixed(1) + "px)";
        }
        requestAnimationFrame(tilt);
      })();
    }

    // ---------- 9. COUNT-UP STATS (anchors scale & prestige) ----------
    gsap.utils.toArray(".stat__num[data-count]").forEach(function (el) {
      var end = parseFloat(el.getAttribute("data-count"));
      var dec = parseInt(el.getAttribute("data-decimals") || "0", 10);
      var suffix = el.getAttribute("data-suffix") || "";
      var obj = { v: 0 };
      gsap.to(obj, {
        v: end, duration: 1.6, ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 90%" },
        onUpdate: function () {
          el.textContent = obj.v.toFixed(dec) + suffix;
        }
      });
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });

    window.__elenaMotion = "active";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else { boot(); }
})();
