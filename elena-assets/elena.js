/* ============================================================
   ELENA - interactions
   - day-night journey (data-time from scroll)
   - disclaimer gate + re-entry (localStorage)
   - fast path (nav anchors), facts drawer
   - Elena Engine: choice tracking + gentle personalization
   - Choose your view / Save my Elena
   - Create My Elena modal (3 steps + private visit)
   - brochure forms with validation
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var LS_JOURNEY = "elena-journey-v1";
  var LS_VIEWED = "elena-disclaimed-v1";

  /* ---------- helpers ---------- */
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function store(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
  function load(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  }

  var journey = load(LS_JOURNEY) || { choices: [], views: [], rooms: [], saved: false };

  /* ---------- re-entry greeting ---------- */
  function maybeReentry() {
    if (!load(LS_JOURNEY)) return;
    if (load("elena-greeted-v1")) return;
    store("elena-greeted-v1", true);
    var toast = $("#reentryToast");
    if (!toast) return;
    toast.classList.add("show");
    $("#reentryContinue").onclick = function () {
      toast.classList.remove("show");
      var last = journey.views[journey.views.length - 1];
      var el = last ? $("#viewPanel") : $("#arrival");
      if (el) el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    };
    $("#reentryRestart").onclick = function () {
      toast.classList.remove("show");
      try { localStorage.removeItem(LS_JOURNEY); } catch (e) {}
      journey = { choices: [], views: [], rooms: [], saved: false };
      resetMyElena();
    };
  }

  /* ---------- disclaimer gate ---------- */
  var disclaimer = $("#disclaimer");
  if (disclaimer) {
    if (load(LS_VIEWED)) {
      disclaimer.classList.add("hidden");
      document.body.classList.remove("locked");
    } else {
      document.body.classList.add("locked");
      $("#disclaimerAccept").onclick = function () {
        store(LS_VIEWED, true);
        disclaimer.classList.add("hidden");
        document.body.classList.remove("locked");
      };
    }
  }

  /* ---------- day-night journey ---------- */
  var TIMES = ["dawn", "day", "gold", "night"];
  var timeAnchors = [];
  function measureAnchors() {
    timeAnchors = $$(".act").map(function (el) {
      return { top: el.offsetTop, time: el.getAttribute("data-time") || "dawn" };
    });
    var ending = $(".ending");
    if (ending) timeAnchors.push({ top: ending.offsetTop, time: "night" });
  }
  function updateTime() {
    var y = window.scrollY + window.innerHeight * 0.45;
    var t = "dawn";
    for (var i = 0; i < timeAnchors.length; i++) {
      if (y >= timeAnchors[i].top) t = timeAnchors[i].time;
    }
    document.body.setAttribute("data-time", t);
    document.body.classList.toggle("scrolled", window.scrollY > 24);
  }
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () { updateTime(); ticking = false; });
  }

  /* ---------- nav / mobile sheet ---------- */
  var sheet = $("#navSheet");
  function closeSheet() { if (sheet) sheet.classList.remove("open"); }
  $("#navBurger").addEventListener("click", function () { sheet.classList.toggle("open"); });
  $$(".nav-sheet a").forEach(function (a) { a.addEventListener("click", closeSheet); });

  /* ---------- reveals ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  $$(".rv").forEach(function (el) { io.observe(el); });

  /* ---------- facts drawer ---------- */
  var drawer = $("#factsDrawer");
  var scrim = $("#factsScrim");
  function openFacts() { drawer.classList.add("open"); scrim.classList.add("show"); document.body.classList.add("locked"); }
  function closeFacts() { drawer.classList.remove("open"); scrim.classList.remove("show"); document.body.classList.remove("locked"); }
  $$("[data-open-facts]").forEach(function (b) { b.addEventListener("click", openFacts); });
  $$("[data-close-facts]").forEach(function (b) { b.addEventListener("click", closeFacts); });
  scrim.addEventListener("click", closeFacts);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeFacts(); closeModal(); closeSheet(); }
  });

  /* ---------- Elena Engine: how would you spend your day ---------- */
  var dayTargets = { slow: "pauseAct", alive: "lifeAct", together: "clubAct", home: "homeAct" };
  $$(".day-card").forEach(function (card) {
    card.addEventListener("click", function () {
      var k = card.getAttribute("data-day");
      if (k && journey.choices.indexOf(k) === -1) journey.choices.push(k);
      store(LS_JOURNEY, journey);
      var target = $("#" + (dayTargets[k] || "pauseAct"));
      if (target) target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      showToast("Your day at Elena begins", pickHint(k));
    });
  });

  function pickHint(k) {
    var hints = {
      slow: "A little more quiet. The meditation garden, the reading nook, the lotus pond.",
      alive: "Energy first. The pool, the courts, the fitness decks.",
      together: "Company counts. The clubhouse, the amphitheatre, the picnic lawns.",
      home: "Space to be yourself. The interiors, the balcony, the morning light."
    };
    return hints[k] || "";
  }

  /* ---------- room tabs ---------- */
  var roomData = {
    living: { img: "original/room-living.avif", label: "Living room" },
    drawing: { img: "original/room-drawing.avif", label: "Drawing room" },
    dining: { img: "original/room-dining.avif", label: "Dining room" },
    bedroom: { img: "original/room-bedroom.avif", label: "Bedroom" },
    kitchen: { img: "original/room-kitchen.avif", label: "Kitchen" },
    sitout: { img: "original/room-sitout.avif", label: "Sit out" }
  };
  $$(".room-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      var k = tab.getAttribute("data-room");
      if (!roomData[k]) return;
      $$(".room-tab").forEach(function (t) { t.classList.remove("active"); });
      tab.classList.add("active");
      var img = $("#stageImg");
      var cap = $("#roomCap");
      if (img) { img.src = "elena-assets/" + roomData[k].img; img.classList.add("active"); }
      if (cap) cap.textContent = roomData[k].label;
      if (journey.rooms.indexOf(k) === -1) { journey.rooms.push(k); store(LS_JOURNEY, journey); }
    });
  });

  /* ---------- choose your view ---------- */
  var viewData = {
    lake: { img: "original/photo-pond.jpg", name: "The Lake", note: "Kokapet Lake, golden hours" },
    city: { img: "original/cine-stargaze.jpg", name: "The Sky", note: "Towers and sky at dusk" },
    garden: { img: "original/photo-nature.jpg", name: "The Garden", note: "Tropical groves and lotus ponds" }
  };
  var chosenView = null;
  $$(".view-opt").forEach(function (opt) {
    opt.addEventListener("click", function () {
      var k = opt.getAttribute("data-view");
      if (!viewData[k]) return;
      chosenView = k;
      $$(".view-opt").forEach(function (o) { o.classList.remove("active"); });
      opt.classList.add("active");
      var img = $("#stageImg");
      if (img) { img.src = "elena-assets/" + viewData[k].img; img.classList.add("active"); }
      if (journey.views.indexOf(k) === -1) { journey.views.push(k); store(LS_JOURNEY, journey); }
      var cap = $("#viewCap");
      if (cap) cap.textContent = viewData[k].name;
    });
  });

  /* ---------- save my elena ---------- */
  $("#saveElena").addEventListener("click", function () {
    if (!chosenView) { showToast("Choose your view first", "Lake, sky or garden. Your morning begins there."); return; }
    journey.saved = true;
    journey.residence = cfg.size;
    store(LS_JOURNEY, journey);
    renderMyElena();
    showToast("Saved to My Elena", "Your residence, your view, your morning. Ready when you are.");
  });

  function renderMyElena() {
    var box = $("#myElena");
    if (!box) return;
    box.classList.add("show");
    var list = $("#myElenaList");
    list.innerHTML = "";
    var items = [];
    if (journey.choices.length) items.push(["Lifestyle", journey.choices.map(function (c) { return c.charAt(0).toUpperCase() + c.slice(1); }).join(", ")]);
    if (chosenView && viewData[chosenView]) items.push(["Your view", viewData[chosenView].name]);
    items.push(["Residence", journey.residence || "3 BHK"]);
    items.push(["Clubhouse", "50,000 sq ft, yours to explore"]);
    items.forEach(function (it) {
      var li = document.createElement("li");
      li.innerHTML = "<span>" + esc(it[0]) + "</span><b>" + esc(it[1]) + "</b>";
      list.appendChild(li);
    });
  }
  function resetMyElena() {
    var box = $("#myElena");
    if (box) box.classList.remove("show");
    chosenView = null;
    $$(".view-opt").forEach(function (o) { o.classList.remove("active"); });
    var img = $("#stageImg");
    if (img) img.src = "elena-assets/original/room-living.avif";
  }

  /* ---------- create my elena modal ---------- */
  var modal = $("#createModal");
  var step = 0;
  var cfg = { size: "3 BHK", floor: "Mid floor", lifestyle: null, visit: null, company: null };

  function openModal() { showStep(0); modal.classList.add("open"); document.body.classList.add("locked"); }
  function closeModal() { modal.classList.remove("open"); document.body.classList.remove("locked"); }
  $("#createModalBtn").addEventListener("click", openModal);
  $("#createModalClose").addEventListener("click", closeModal);
  $("#doneClose").addEventListener("click", closeModal);
  $("#factsToCreate").addEventListener("click", function () { closeFacts(); openModal(); });
  modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });

  function showStep(n) {
    step = n;
    $$(".step-pane").forEach(function (p, i) { p.classList.toggle("active", i === n); });
    $$(".step-dot").forEach(function (d, i) { d.classList.toggle("on", i <= n); });
    if (n === 2) renderSummary();
    var navRow = $(".modal__nav:not(.step-pane .modal__nav)");
    var back = $("#stepBack");
    var next = $("#stepNext");
    if (n >= 3) {
      if (navRow) navRow.style.display = "none";
    } else {
      if (navRow) navRow.style.display = "flex";
      if (back) back.style.visibility = n === 0 ? "hidden" : "visible";
      if (next) {
        next.style.display = "inline-flex";
        next.textContent = n === 2 ? "Review my Elena" : n === 1 ? "Continue" : "Begin";
      }
    }
  }

  $$(".opt-card[data-opt]").forEach(function (card) {
    card.addEventListener("click", function () {
      var key = card.getAttribute("data-key");
      var val = card.getAttribute("data-opt");
      $$(".opt-card[data-key='" + key + "']").forEach(function (c) { c.classList.remove("active"); });
      card.classList.add("active");
      cfg[key] = val;
    });
  });

  $("#stepNext").addEventListener("click", function () {
    if (step === 0) {
      var size = $(".opt-card[data-key='size'].active");
      if (size) cfg.size = size.getAttribute("data-opt");
      var floor = $(".opt-card[data-key='floor'].active");
      if (floor) cfg.floor = floor.getAttribute("data-opt");
    }
    if (step === 1) {
      var life = $(".opt-card[data-key='lifestyle'].active");
      if (life) { cfg.lifestyle = life.getAttribute("data-opt"); if (journey.choices.indexOf(cfg.lifestyle) === -1) { journey.choices.push(cfg.lifestyle); store(LS_JOURNEY, journey); } }
    }
    if (step < 3) showStep(step + 1);
  });
  $("#stepBack").addEventListener("click", function () { if (step > 0) showStep(step - 1); });

  function renderSummary() {
    var lives = { slow: "Slow mornings", alive: "Active days", together: "Time together", home: "Quiet home evenings" };
    $("#sumSize").textContent = cfg.size;
    $("#sumFloor").textContent = cfg.floor;
    $("#sumLife").textContent = lives[cfg.lifestyle] || "Your rhythm";
    $("#sumView").textContent = (chosenView && viewData[chosenView]) ? viewData[chosenView].name : "To be chosen";
  }

  $("#stepVisit").addEventListener("click", function () {
    var v = $(".opt-card[data-key='visit'].active");
    var c = $(".opt-card[data-key='company'].active");
    if (v) cfg.visit = v.getAttribute("data-opt");
    if (c) cfg.company = c.getAttribute("data-opt");
    if (!cfg.visit) { showToast("When would you like to visit?", "Pick a time frame so the team can prepare."); return; }
    store(LS_JOURNEY, journey);
    $("#doneResidence").textContent = cfg.size + " · " + cfg.floor;
    showStep(4);
  });

  /* ---------- brochure forms ---------- */
  $$(".plan-form").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = form.querySelector('[name="name"]');
      var phone = form.querySelector('[name="phone"]');
      var ok = true;
      [name, phone].forEach(function (inp) {
        var f = inp.closest(".field");
        var valid = inp.value.trim().length >= (inp.name === "name" ? 2 : 10);
        if (inp.name === "phone") valid = /^[0-9+\-\s]{10,15}$/.test(inp.value.trim());
        f.classList.toggle("invalid", !valid);
        if (!valid) ok = false;
      });
      if (!ok) return;
      var okBox = form.parentElement.querySelector(".form-ok");
      if (okBox) okBox.classList.add("show");
      store("elena-brochure-" + form.getAttribute("data-plan"), { name: name.value.trim(), phone: phone.value.trim(), at: Date.now() });
      form.querySelectorAll("input").forEach(function (i) { i.value = ""; });
    });
  });
  $$("[data-open-brochure]").forEach(function (b) {
    b.addEventListener("click", function () {
      var target = $(b.getAttribute("data-open-brochure"));
      if (!target) return;
      var wasOpen = target.classList.contains("open");
      $$(".plan-form").forEach(function (f) { f.classList.remove("open"); });
      if (!wasOpen) target.classList.add("open");
      b.textContent = wasOpen ? "Download brochure" : "Close form";
    });
  });

  /* ---------- toast ---------- */
  var toastEl = $("#toast");
  var toastTimer = null;
  function showToast(title, body) {
    if (!toastEl) return;
    $("#toastTitle").textContent = title;
    $("#toastBody").textContent = body || "";
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 4200);
  }

  /* ---------- init ---------- */
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", measureAnchors);
  window.addEventListener("load", measureAnchors);
  measureAnchors();
  updateTime();
  maybeReentry();
  if (journey.saved) renderMyElena();

  /* ============================================================
     V4 — STICKY ENQUIRY CTA + prefilled mailto
     ============================================================ */
  (function enquiryCta() {
    var cta = $("#enquiryCta");
    var mail = $("#enquiryMail");
    if (!cta) return;

    // Reveal after the hero, hide near the footer (footer has full contacts)
    function syncCta() {
      var nearBottom = (window.innerHeight + window.scrollY) >= (document.body.scrollHeight - 360);
      var pastHero = window.scrollY > window.innerHeight * 0.7;
      cta.classList.toggle("show", pastHero && !nearBottom);
    }
    window.addEventListener("scroll", syncCta, { passive: true });
    window.addEventListener("resize", syncCta);
    syncCta();

    // Prefilled mailto: contactus@elenaresidences.com
    if (mail) {
      function buildMail() {
        var subj = encodeURIComponent("Enquiry — Lansum Elena Residences (Kokapet)");
        var body = encodeURIComponent(
          "Hello Elena team,\n\n" +
          "I'd like to know more about Lansum Elena Residences, Kokapet, Hyderabad.\n" +
          "Please share the floor plans, pricing and a private visit slot.\n\n" +
          "Name: \nPhone: \nPreferred configuration: 3 / 3.5 / 4 BHK\n"
        );
        return "mailto:contactus@elenaresidences.com?subject=" + subj + "&body=" + body;
      }
      mail.setAttribute("href", buildMail());
      mail.addEventListener("click", function () { mail.setAttribute("href", buildMail()); });
    }
  })();

  /* expose for debugging */
  window.__elena = { journey: journey, cfg: cfg };
})();

/* ============================================================
   360° WALKTHROUGH — lightweight drag panorama (no deps)
   Uses elena-assets/pano-placeholder.png; swap for a real
   V-Ray equirectangular render to make it production-ready.
   ============================================================ */
(function () {
  "use strict";
  var stage = document.getElementById("pano");
  if (!stage) return;
  var IMG = "elena-assets/pano-placeholder.png";
  stage.style.backgroundImage = "url('" + IMG + "')";
  var offset = 0, dragging = false, startX = 0, startOff = 0, vel = 0, lastX = 0;
  var bgW = 0;

  function setup() {
    var img = new Image();
    img.onload = function () {
      // wrap so the pano repeats horizontally
      bgW = Math.max(stage.clientWidth * 2, img.width);
      stage.style.backgroundSize = bgW + "px 100%";
      stage.style.backgroundRepeat = "repeat";
      loop();
    };
    img.src = IMG;
  }

  function loop() {
    if (!dragging) {
      vel *= 0.94;
      offset += vel;
    }
    // wrap into range
    if (bgW) {
      offset = ((offset % bgW) + bgW) % bgW;
      stage.style.backgroundPosition = (-offset) + "px center";
    }
    requestAnimationFrame(loop);
  }

  function down(x) { dragging = true; startX = x; startOff = offset; lastX = x; vel = 0; }
  function move(x) {
    if (!dragging) return;
    offset = startOff - (x - startX);
    vel = lastX - x;
    lastX = x;
  }
  function up() { dragging = false; if (Math.abs(vel) < 0.4) vel = 0.12; }

  stage.addEventListener("mousedown", function (e) { down(e.clientX); e.preventDefault(); });
  window.addEventListener("mousemove", function (e) { move(e.clientX); });
  window.addEventListener("mouseup", up);
  stage.addEventListener("touchstart", function (e) { down(e.touches[0].clientX); }, { passive: true });
  stage.addEventListener("touchmove", function (e) { move(e.touches[0].clientX); }, { passive: true });
  stage.addEventListener("touchend", up);

  // pause auto-spin until user interacts, then gentle inertia
  stage.addEventListener("mouseenter", function () { if (!dragging) vel = 0.12; });

  setup();
})();
