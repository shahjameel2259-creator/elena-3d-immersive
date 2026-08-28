/* ============================================================
   V4 — Looping background video after the hero scrub completes
   ------------------------------------------------------------
   The scroll-scrubbed `.scrub` hero (scrollvideo.js) plays first.
   Once the visitor scrolls past it, this script fades in a
   continuous low-opacity background video behind the content
   sections, and fades it back out before the footer.

   - The video lives at z-index:0; all page content sits above it
     (main / footer are position:relative; z-index:2), so copy is
     never covered and scrolling is never blocked.
   - Cheap: passive scroll listener + rAF throttle, no layout thrash
     (reads are batched inside the rAF callback).
   - prefers-reduced-motion: the video fades in but stays PAUSED
     (first frame only, no motion). Scrolling is never broken.
   ============================================================ */
(function () {
  'use strict';

  var scrubEl = document.querySelector('.scrub');
  var video = document.querySelector('.hero-bg-loop');
  var footer = document.querySelector('footer');

  // Nothing to do if the required hooks are missing.
  if (!scrubEl || !video) return;

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var active = false;      // is the background video currently shown?
  var ticking = false;     // rAF throttle guard

  function update() {
    ticking = false;

    var scrubBottom = scrubEl.offsetTop + scrubEl.offsetHeight;
    var activateLine = window.scrollY + window.innerHeight * 0.5;

    // Past the hero scrub?
    var pastHero = activateLine > scrubBottom;

    // Approaching the footer? (#enquiryCta is a sticky top bar, so it
    // can't be the deactivate trigger — the footer is the real anchor.)
    var nearFooter = false;
    if (footer) {
      var footerTop = footer.offsetTop;
      // Footer top has risen to (or above) the vertical middle of the viewport.
      nearFooter = (footerTop - window.scrollY) < window.innerHeight * 0.5;
    }

    if (pastHero && !nearFooter) {
      if (!active) {
        active = true;
        video.style.opacity = '0.35';
        // Reduced motion: show first frame only, never play.
        if (!reduceMotion) {
          if (video.paused) {
            var p = video.play();
            if (p && typeof p.catch === 'function') p.catch(function () {});
          }
        }
      }
    } else if (active) {
      active = false;
      video.style.opacity = '0';
      if (!video.paused) video.pause();
    }
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  // Set initial state once layout is ready.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', update);
  } else {
    update();
  }
})();
