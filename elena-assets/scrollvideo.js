/*!
 * scroll-video.js — scroll-scrubbed <video> hero. Vanilla, no deps, ~2 KB.
 *
 * USAGE
 * -----
 * 1. Re-encode your clip to an all-keyframe MP4 so seeking is instant:
 *      ffmpeg -i INPUT -an -vf "scale=1280:-2,fps=30" -c:v libx264 -preset slow \
 *        -crf 20 -x264-params "keyint=1:min-keyint=1:scenecut=0" -movflags +faststart scrub.mp4
 *
 * 2. Drop one element into your page and load this script (defer or at end of body):
 *
 *      <div class="scrub" data-src="scrub.mp4" data-spacer="500">
 *        <div class="scrub__overlay">
 *          <h1>Your headline</h1>
 *          <a href="#next">Call to action</a>
 *        </div>
 *      </div>
 *      <script src="scroll-video.js" defer></script>
 *
 *    data-src     (required) path/URL to the all-keyframe mp4
 *    data-spacer  (optional) scroll distance in vh, default 500. Bigger = slower scrub.
 *    data-ease    (optional) lerp factor 0..1, default 0.12. Lower = smoother/laggier.
 *
 *    The .scrub__overlay child is optional; if present it fades out as the scrub begins.
 *
 * 3. Style .scrub__overlay yourself (position is handled). Everything else is automatic.
 *
 * prefers-reduced-motion: skips scrubbing, plays the video quietly on a loop.
 */
(function () {
  'use strict';

  var CSS =
    '.scrub{position:relative;display:block}' +
    '.scrub__pin{position:sticky;top:0;height:100svh;height:100dvh;overflow:hidden;background:#000}' +
    '.scrub__pin>video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center}' +
    '.scrub__overlay{position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;justify-content:center;' +
      'padding:0 max(6vw,env(safe-area-inset-left));padding-right:max(6vw,env(safe-area-inset-right));' +
      'will-change:opacity,transform;pointer-events:none}' +
    '.scrub__overlay a,.scrub__overlay button{pointer-events:auto}' +
    '@media (prefers-reduced-motion:reduce){.scrub{height:auto!important}.scrub__pin{position:relative}}';

  function injectCss() {
    if (document.getElementById('scrub-video-css')) return;
    var s = document.createElement('style');
    s.id = 'scrub-video-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function clamp01(n) { return n < 0 ? 0 : n > 1 ? 1 : n; }

  function init(root) {
    if (root.__scrubInit) return;
    root.__scrubInit = true;

    var src = root.getAttribute('data-src');
    if (!src) { console.warn('scroll-video: missing data-src', root); return; }
    var spacer = parseFloat(root.getAttribute('data-spacer')) || 500;   // vh
    var ease = parseFloat(root.getAttribute('data-ease')) || 0.12;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var overlay = root.querySelector('.scrub__overlay');

    var pin = document.createElement('div');
    pin.className = 'scrub__pin';
    var video = document.createElement('video');
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('preload', 'auto');
    video.setAttribute('disablepictureinpicture', '');
    video.src = src;
    pin.appendChild(video);
    if (overlay) pin.appendChild(overlay);
    root.insertBefore(pin, root.firstChild);

    if (reduce) {
      video.loop = true;
      video.autoplay = true;
      video.play().catch(function () {});
      return;
    }

    root.style.height = spacer + 'vh';

    var duration = 0, ready = false, target = 0, current = 0;

    function onReady() { duration = video.duration || 0; current = video.currentTime; ready = true; }
    if (video.readyState >= 1) onReady();
    video.addEventListener('loadedmetadata', onReady);

    // iOS/Safari: one muted play->pause "kick" before currentTime seeks are honoured
    var kicked = false;
    function kick() {
      if (kicked) return;
      kicked = true;
      var p = video.play();
      if (p && p.then) p.then(function () { video.pause(); }).catch(function () {});
      else video.pause();
    }
    video.addEventListener('loadedmetadata', kick, { once: true });
    window.addEventListener('touchstart', kick, { once: true, passive: true });
    window.addEventListener('pointerdown', kick, { once: true });

    function progress() {
      var r = root.getBoundingClientRect();
      var scrollable = r.height - window.innerHeight;
      if (scrollable <= 0) return 0;
      return clamp01(-r.top / scrollable);
    }

    window.addEventListener('scroll', function () { if (ready) target = progress() * duration; }, { passive: true });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && ready) current = video.currentTime;
    });

    function tick() {
      if (ready) {
        var p = progress();
        target = p * duration;

        if (overlay) {
          var o = 1 - Math.min(p / 0.16, 1);
          overlay.style.opacity = o;
          overlay.style.transform = 'translateY(' + (-24 * (1 - o)) + 'px)';
        }

        current += (target - current) * ease;
        if (Math.abs(target - current) < 0.006) current = target;
        if (Math.abs(current - video.currentTime) > 0.01) {
          try { video.currentTime = current; } catch (e) {}
        }
        if (!video.paused) video.pause();
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function boot() {
    injectCss();
    var list = document.querySelectorAll('.scrub[data-src]');
    for (var i = 0; i < list.length; i++) init(list[i]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.ScrollVideo = { init: init };   // manual init for dynamically added elements
})();
