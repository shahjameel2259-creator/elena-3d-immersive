/* ============================================================
   ELENA V4 — Immersive 3D WebGL layer (peachweb.io calibre)
   Three.js r160 (via importmap) · procedural geometry
   ------------------------------------------------------------
   WHAT IT DOES
     - One fixed full-viewport canvas BEHIND all content.
     - PROCEDURAL modern glass residential towers (TWO slender
       curtain-wall towers on a shared podium) built entirely in
       code — NO external GLB, no licensing/auth issues.
     - Instanced window grid that GLOWS ON at night (driven by the
       scroll-scrubbed dayNight uniform) — the day→night morph
       centerpiece.
     - Procedural nature: shader sky-dome, instanced foliage,
       drifting particles, night star field.
     - SCROLL-SCRUBBED DAY→NIGHT morph across the 5 acts
       (dawn → day → golden → dusk → night).
     - Slow auto-rotate + subtle cursor parallax on the tower group.

   PERF (Quadro P620, 2GB, no AI denoise)
     - setPixelRatio(min(dpr, 1.5))
     - instanced towers: ONE InstancedMesh for all glass tiers,
       ONE InstancedMesh for ALL windows (~3.2k instances, 1 draw
       call), instanced foliage (ONE InstancedMesh)
     - lazy init on first rAF after first paint
     - low-poly; no post-processing / no shadows

   FALLBACK (non-negotiable — never a black screen)
     - no WebGL            -> hide canvas, V3 photo-towers hero shows
     - prefers-reduced-motion -> hide canvas, V3 photo hero shows
     - CDN/import fails    -> catch -> same fallback
     - context lost        -> preventDefault, hide canvas, show photo
   ============================================================ */
(function () {
  "use strict";

  var canvas = document.getElementById("scene3d");
  if (!canvas) { console.warn("[elena3d] no canvas – skip"); return; }

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- WebGL capability probe (do NOT crash if missing) ----
  function webglOK() {
    try {
      var c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext &&
        (c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch (e) { return false; }
  }

  function fallback(reason) {
    // Reveal the V3 photo hero; never a black screen.
    document.documentElement.classList.remove("webgl-on");
    canvas.style.display = "none";
    window.__elena3d = { status: "fallback", reason: reason || "unknown" };
    if (reason) console.info("[elena3d] fallback:", reason);
  }

  if (reduceMotion) { fallback("prefers-reduced-motion"); return; }
  if (!webglOK()) { fallback("no-webgl"); return; }

  // Lazy init: wait for first paint so the photo hero is already up.
  function start() { requestAnimationFrame(init); }
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
  // safety: if load is slow, start anyway after a tick
  setTimeout(start, 1200);

  var booted = false;
  function init() {
    if (booted) return; booted = true;

    var THREE, mergeGeometries;
    try {
      // dynamic import so a CDN failure is catchable -> fallback
      Promise.all([
        import("three"),
        import("three/addons/utils/BufferGeometryUtils.js")
      ]).then(function (mods) {
        THREE = mods[0];
        mergeGeometries = mods[1].mergeGeometries;
        build(THREE, mergeGeometries);
      }).catch(function (err) {
        console.error("[elena3d] import failed", err);
        fallback("import-failed");
      });
    } catch (e) {
      fallback("import-throw");
    }
  }

  function build(THREE, mergeGeometries) {
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: "high-performance" });
    } catch (e) {
      fallback("renderer-create-failed");
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 7, 30);
    camera.lookAt(0, 7, 0);

    // ---- DAY→NIGHT colour stops (5 acts) ----
    function C(hex) { return new THREE.Color(hex); }
    var STOPS = [
      { // 0.00 DAWN — arrival, peach/pink
        top: C("#f4c9a0"), bottom: C("#f7e3cf"), horizon: C("#f0b98a"),
        sun: C("#ffd9a8"), sunInt: 1.1, light: 0.9, fog: C("#ecd2bd"), part: 0.25, star: 0.0, fol: C("#7fa06a")
      },
      { // 0.30 DAY — bright blue
        top: C("#8fc4e8"), bottom: C("#dff0f2"), horizon: C("#cfeaf0"),
        sun: C("#fff6e0"), sunInt: 1.5, light: 1.25, fog: C("#dceaf0"), part: 0.12, star: 0.0, fol: C("#5f8f52")
      },
      { // 0.55 GOLDEN — warm club hour
        top: C("#f0b46a"), bottom: C("#fbe7c4"), horizon: C("#f3a85c"),
        sun: C("#ffcaa0"), sunInt: 1.4, light: 1.05, fog: C("#f2cda0"), part: 0.35, star: 0.0, fol: C("#6f9350")
      },
      { // 0.80 DUSK — deep blue/violet
        top: C("#3a4a86"), bottom: C("#7a6f9e"), horizon: C("#b06a8e"),
        sun: C("#ff9d7a"), sunInt: 0.8, light: 0.55, fog: C("#5a5380"), part: 0.7, star: 0.5, fol: C("#3f5a3c")
      },
      { // 1.00 NIGHT — navy, stars
        top: C("#0a1430"), bottom: C("#13203f"), horizon: C("#22324f"),
        sun: C("#9fb6ff"), sunInt: 0.35, light: 0.28, fog: C("#0c1730"), part: 1.0, star: 1.0, fol: C("#22331f")
      }
    ];
    var STOP_P = [0.0, 0.30, 0.55, 0.80, 1.0];

    function sample(p) {
      p = Math.max(0, Math.min(1, p));
      var i = 0;
      while (i < STOP_P.length - 1 && p > STOP_P[i + 1]) i++;
      var a = STOPS[i], b = STOPS[Math.min(i + 1, STOPS.length - 1)];
      var span = (STOP_P[Math.min(i + 1, STOP_P.length - 1)] - STOP_P[i]) || 1;
      var t = Math.max(0, Math.min(1, (p - STOP_P[i]) / span));
      function mix(x, y) { return x.clone().lerp(y, t); }
      return {
        top: mix(a.top, b.top), bottom: mix(a.bottom, b.bottom), horizon: mix(a.horizon, b.horizon),
        sun: mix(a.sun, b.sun), sunInt: a.sunInt + (b.sunInt - a.sunInt) * t,
        light: a.light + (b.light - a.light) * t, fog: mix(a.fog, b.fog),
        part: a.part + (b.part - a.part) * t, star: a.star + (b.star - a.star) * t,
        fol: mix(a.fol, b.fol)
      };
    }

    // ---- SKY DOME (shader) ----
    var skyUniforms = {
      uTop: { value: STOPS[0].top.clone() },
      uBottom: { value: STOPS[0].bottom.clone() },
      uHorizon: { value: STOPS[0].horizon.clone() },
      uSunDir: { value: new THREE.Vector3(0, 0.25, 1).normalize() },
      uSunCol: { value: STOPS[0].sun.clone() },
      uStar: { value: 0.0 }
    };
    var skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, uniforms: skyUniforms,
      vertexShader: [
        "varying vec3 vDir;",
        "void main(){ vDir = normalize(position);",
        " gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }"
      ].join("\n"),
      fragmentShader: [
        "varying vec3 vDir;",
        "uniform vec3 uTop; uniform vec3 uBottom; uniform vec3 uHorizon;",
        "uniform vec3 uSunDir; uniform vec3 uSunCol; uniform float uStar;",
        "float hash(vec3 p){ p=fract(p*0.3183099+vec3(0.1,0.2,0.3)); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }",
        "void main(){",
        " float h = clamp(vDir.y*0.5+0.5, 0.0, 1.0);",
        " vec3 col = mix(uHorizon, uTop, smoothstep(0.35,1.0,h));",
        " col = mix(uBottom, col, smoothstep(0.0,0.35,h));",
        " float s = max(dot(normalize(vDir), normalize(uSunDir)), 0.0);",
        " col += uSunCol * pow(s, 18.0) * 0.9;",          // sun disc glow
        " col += uSunCol * pow(s, 4.0) * 0.18;",          // warm haze near sun
        " if(uStar > 0.01){",
        "   vec3 g = floor(vDir*220.0); float n = hash(g);",
        "   float st = step(0.992, n) * uStar * smoothstep(0.05,0.5,h);",
        "   col += vec3(st);",
        " }",
        " gl_FragColor = vec4(col, 1.0);",
        "}"
      ].join("\n")
    });
    var sky = new THREE.Mesh(new THREE.SphereGeometry(420, 32, 16), skyMat);
    scene.add(sky);

    // ---- FOG (blends towers into nature) ----
    scene.fog = new THREE.FogExp2(STOPS[0].fog.clone().getHex(), 0.012);

    // ---- LIGHTS ----
    var hemi = new THREE.HemisphereLight(0xffffff, 0x4a5a40, 0.9);
    scene.add(hemi);
    var sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(12, 18, 16);
    scene.add(sun);
    var fill = new THREE.AmbientLight(0xffffff, 0.25);
    scene.add(fill);

    // ---- GROUND (nature plane) ----
    var groundMat = new THREE.MeshStandardMaterial({ color: 0x4f6b3f, roughness: 1.0, metalness: 0.0 });
    var ground = new THREE.Mesh(new THREE.CircleGeometry(160, 48), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.2;
    scene.add(ground);

    // ---- DISTANT LAKE/Towers backdrop (reuse photo-towers.jpg softly) ----
    var backdrop = null;
    var texLoader = new THREE.TextureLoader();
    texLoader.load("elena-assets/original/photo-towers.jpg", function (tx) {
      tx.colorSpace = THREE.SRGBColorSpace;
      var bm = new THREE.MeshBasicMaterial({ map: tx, transparent: true, opacity: 0.0, depthWrite: false, fog: false });
      backdrop = new THREE.Mesh(new THREE.PlaneGeometry(150, 84), bm);
      backdrop.position.set(0, 26, -120);
      scene.add(backdrop);
    });

    // ============================================================
    //  TOWERS — procedural slender curtain-wall residential towers
    // ============================================================
    var PODIUM_TOP = 2.3;             // towers sit on the podium slab
    var towers = new THREE.Group();   // fixed group (holds static podium + spinner)
    scene.add(towers);
    var towerSpin = new THREE.Group(); // slowly rotates the towers only (not the podium)
    towers.add(towerSpin);

    // --- shared podium / base slab (stays put) ---
    var podiumMat = new THREE.MeshStandardMaterial({ color: 0x2b313d, roughness: 0.82, metalness: 0.25 });
    var podium = new THREE.Mesh(new THREE.BoxGeometry(30, 2.5, 26), podiumMat);
    podium.position.set(0, PODIUM_TOP - 1.25, -1);
    towers.add(podium);
    // thin lit rim around the podium crown (subtle luxury accent)
    var rimMat = new THREE.MeshStandardMaterial({ color: 0x101620, emissive: 0xffce8a, emissiveIntensity: 0.0, roughness: 0.5, metalness: 0.3 });
    var rim = new THREE.Mesh(new THREE.BoxGeometry(30.4, 0.18, 26.4), rimMat);
    rim.position.set(0, PODIUM_TOP, -1);
    towers.add(rim);

    // --- tower materials ---
    var glassMat = new THREE.MeshStandardMaterial({
      color: 0x9fc4e8, metalness: 0.6, roughness: 0.2, envMapIntensity: 1.0
    });
    // windows: light glass-blue by day, warm interior glow by night
    var windowMat = new THREE.MeshStandardMaterial({
      color: 0xbfe0f5, emissive: 0xffd9a0, emissiveIntensity: 0.0,
      roughness: 0.35, metalness: 0.0, side: THREE.DoubleSide
    });
    var spireMat = new THREE.MeshStandardMaterial({ color: 0xdfe7ef, metalness: 0.9, roughness: 0.25 });

    // geometry bases (unit-sized, scaled per instance)
    var glassGeo = new THREE.BoxGeometry(1, 1, 1);
    var windowGeo = new THREE.PlaneGeometry(1, 1);

    // instance matrix collectors
    var glassMats = [];   // Matrix4 per glass tier
    var winMats = [];     // Matrix4 per window (orientation + size baked in)
    var spires = [];      // {geo, mat, pos} meshes (few, not instanced)

    var _m4 = new THREE.Matrix4();
    var _q = new THREE.Quaternion();
    var _v = new THREE.Vector3();
    var _s = new THREE.Vector3();
    var _up = new THREE.Vector3(0, 1, 0);

    // faces: normal + in-plane "right" (horizontal) axis
    var FACES = [
      { n: new THREE.Vector3(1, 0, 0), r: new THREE.Vector3(0, 0, -1) },
      { n: new THREE.Vector3(-1, 0, 0), r: new THREE.Vector3(0, 0, 1) },
      { n: new THREE.Vector3(0, 0, 1), r: new THREE.Vector3(1, 0, 0) },
      { n: new THREE.Vector3(0, 0, -1), r: new THREE.Vector3(-1, 0, 0) }
    ];
    // precompute orientation quaternion per face (plane local +Z -> normal)
    FACES.forEach(function (f) {
      var basis = new THREE.Matrix4().makeBasis(f.r, _up, f.n);
      f.q = new THREE.Quaternion().setFromRotationMatrix(basis);
    });

    function buildTower(cx, cz, fp, H, cols, rows, tiers) {
      var hw = fp / 2;
      var tierH = H / tiers;
      var maxShrink = fp * 0.30;

      for (var r = 0; r < rows; r++) {
        var y = PODIUM_TOP + (r + 0.5) * (H / rows);
        // taper: which tier are we in -> current half-width
        var kT = Math.min(tiers - 1, Math.floor((y - PODIUM_TOP) / tierH));
        var hhw = hw - (kT / (tiers - 1)) * maxShrink;
        var colStep = (2 * hhw) / cols;
        var winW = colStep * 0.64;
        var winH = (H / rows) * 0.66;
        for (var c = 0; c < cols; c++) {
          var colOff = -hhw + (c + 0.5) * colStep;
          for (var fi = 0; fi < FACES.length; fi++) {
            var f = FACES[fi];
            // position = tower origin + normal offset + right*colOff + up*y
            var px = cx + f.n.x * (hhw + 0.05) + f.r.x * colOff;
            var py = y;
            var pz = cz + f.n.z * (hhw + 0.05) + f.r.z * colOff;
            _v.set(px, py, pz);
            _s.set(winW, winH, 1);
            _m4.compose(_v, f.q, _s);
            winMats.push(_m4.clone());
          }
        }
      }

      // glass tiers (slightly inset boxes so the curtain-wall reads as solid mass)
      for (var k = 0; k < tiers; k++) {
        var y0 = PODIUM_TOP + k * tierH;
        var y1 = y0 + tierH;
        var hhw2 = hw - (k / (tiers - 1)) * maxShrink;
        _v.set(cx, (y0 + y1) / 2, cz);
        _s.set(hhw2 * 2 * 0.98, tierH * 0.99, hhw2 * 2 * 0.98);
        _m4.compose(_v, _q.identity(), _s);
        glassMats.push(_m4.clone());
      }

      // crown: slim setback cap + thin metallic spire
      var topY = PODIUM_TOP + H;
      var capHW = (hw - maxShrink) * 0.72;
      _v.set(cx, topY + 1.0, cz);
      _s.set(capHW * 2, 2.0, capHW * 2);
      _m4.compose(_v, _q.identity(), _s);
      glassMats.push(_m4.clone());

      spires.push({
        geo: new THREE.CylinderGeometry(0.05, 0.16, 6.5, 8),
        mat: spireMat,
        pos: [cx, topY + 2.0 + 3.25, cz]
      });
      // small crown light band (emissive at night, like an aviation beacon)
      spires.push({
        geo: new THREE.CylinderGeometry(capHW * 0.74, capHW * 0.74, 0.4, 10),
        mat: new THREE.MeshStandardMaterial({ color: 0x0c1320, emissive: 0xff7a4d, emissiveIntensity: 0.0, roughness: 0.4, metalness: 0.4 }),
        pos: [cx, topY + 0.2, cz]
      });
    }

    // Tower A — tall hero (stage-left), Tower B — slightly shorter (stage-right)
    buildTower(-8.5, -1, 6.4, 36, 12, 40, 6);
    buildTower(8.5, -1, 5.4, 28, 10, 32, 5);

    // instanced glass mass (1 draw call)
    var glassMesh = new THREE.InstancedMesh(glassGeo, glassMat, glassMats.length);
    for (var gi = 0; gi < glassMats.length; gi++) glassMesh.setMatrixAt(gi, glassMats[gi]);
    glassMesh.instanceMatrix.needsUpdate = true;
    glassMesh.frustumCulled = false;
    towerSpin.add(glassMesh);

    // instanced windows (1 draw call, ~3.2k instances)
    var windowMesh = new THREE.InstancedMesh(windowGeo, windowMat, winMats.length);
    for (var wi = 0; wi < winMats.length; wi++) windowMesh.setMatrixAt(wi, winMats[wi]);
    windowMesh.instanceMatrix.needsUpdate = true;
    windowMesh.frustumCulled = false;
    towerSpin.add(windowMesh);

    // spires + crown bands (a handful of cheap meshes)
    spires.forEach(function (sp) {
      var mesh = new THREE.Mesh(sp.geo, sp.mat);
      mesh.position.set(sp.pos[0], sp.pos[1], sp.pos[2]);
      towerSpin.add(mesh);
      sp.mesh = mesh;
    });

    towers.userData.spireMats = spires.map(function (s) { return s.mat; });
    towers.userData.rimMat = rimMat;

    // ---- INSTANCED FOLIAGE (one InstancedMesh, low-poly tree) ----
    var treeGeo = null;
    try {
      var trunk = new THREE.CylinderGeometry(0.12, 0.18, 1.1, 5);
      trunk.translate(0, 0.55, 0);
      var leaf = new THREE.ConeGeometry(0.95, 2.4, 7);
      leaf.translate(0, 2.1, 0);
      treeGeo = mergeGeometries([trunk, leaf]);
    } catch (e) { treeGeo = new THREE.ConeGeometry(0.9, 3.0, 7); }
    var foliageMat = new THREE.MeshStandardMaterial({ color: STOPS[0].fol.clone(), roughness: 0.95, metalness: 0.0 });
    var TREES = 140;
    var trees = new THREE.InstancedMesh(treeGeo, foliageMat, TREES);
    trees.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    var _m = new THREE.Matrix4(), _q2 = new THREE.Quaternion(), _p = new THREE.Vector3(), _sc = new THREE.Vector3();
    var _e = new THREE.Euler();
    var treeData = [];
    for (var i = 0; i < TREES; i++) {
      var ang = Math.random() * Math.PI * 2;
      var rad = 10 + Math.random() * 95;
      var x = Math.cos(ang) * rad, z = Math.sin(ang) * rad - 8;
      var y = -0.2;
      var sc = 0.7 + Math.random() * 1.6;
      _e.set(0, Math.random() * Math.PI * 2, 0);
      _q2.setFromEuler(_e);
      _p.set(x, y, z); _sc.set(sc, sc, sc);
      _m.compose(_p, _q2, _sc);
      trees.setMatrixAt(i, _m);
      treeData.push({ sway: Math.random() * Math.PI * 2, base: _p.clone(), scale: sc });
    }
    trees.instanceMatrix.needsUpdate = true;
    scene.add(trees);

    // ---- DRIFTING PARTICLES (fireflies / pollen; brighter at night) ----
    var P = 700;
    var pPos = new Float32Array(P * 3);
    var pSpd = new Float32Array(P);
    for (var k = 0; k < P; k++) {
      pPos[k * 3] = (Math.random() - 0.5) * 180;
      pPos[k * 3 + 1] = Math.random() * 60;
      pPos[k * 3 + 2] = (Math.random() - 0.5) * 180 - 10;
      pSpd[k] = 0.4 + Math.random() * 1.2;
    }
    var pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    var pMat = new THREE.PointsMaterial({
      color: 0xfff0c4, size: 0.5, transparent: true, opacity: 0.25,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
    });
    var particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // ---- NIGHT STAR FIELD (separate, on dome) ----
    var S = 1200;
    var sPos = new Float32Array(S * 3);
    for (var s = 0; s < S; s++) {
      var u = Math.random(), v = Math.random();
      var th = u * Math.PI * 2, ph = Math.acos(2 * v - 1);
      var r = 380;
      sPos[s * 3] = r * Math.sin(ph) * Math.cos(th);
      sPos[s * 3 + 1] = Math.abs(r * Math.cos(ph)) * 0.9 + 6;
      sPos[s * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    var sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
    var sMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.1, transparent: true, opacity: 0, depthWrite: false, fog: false });
    var stars = new THREE.Points(sGeo, sMat);
    scene.add(stars);

    // ---- SCROLL → day/night progress ----
    var dayNight = 0; // current applied
    function scrollProgress() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return 0;
      return Math.max(0, Math.min(1, window.scrollY / max));
    }

    // ---- CURSOR PARALLAX ----
    var px = 0, py = 0, cpx = 0, cpy = 0;
    if (window.matchMedia("(pointer: fine)").matches) {
      window.addEventListener("mousemove", function (e) {
        px = (e.clientX / window.innerWidth - 0.5) * 2;
        py = (e.clientY / window.innerHeight - 0.5) * 2;
      }, { passive: true });
    }

    // ---- RESIZE ----
    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener("resize", onResize);

    // ---- CONTEXT LOSS → fallback (never black) ----
    canvas.addEventListener("webglcontextlost", function (e) {
      e.preventDefault();
      fallback("context-lost");
    }, false);

    // ---- confirm render path; reveal canvas, hide photo hero ----
    document.documentElement.classList.add("webgl-on");
    canvas.style.opacity = "1";

    window.__elena3d = { status: "active" };

    // ---- RENDER LOOP ----
    var clock = new THREE.Clock();
    var windowEmissive = 0;
    function frame() {
      requestAnimationFrame(frame);
      var dt = Math.min(clock.getDelta(), 0.05);
      var t = clock.elapsedTime;

      var target = scrollProgress();
      dayNight += (target - dayNight) * 0.06; // smooth scrub
      var s = sample(dayNight);

      // sky + sun
      skyUniforms.uTop.value.copy(s.top);
      skyUniforms.uBottom.value.copy(s.bottom);
      skyUniforms.uHorizon.value.copy(s.horizon);
      skyUniforms.uSunCol.value.copy(s.sun);
      skyUniforms.uStar.value = s.star;
      var sunAng = dayNight * Math.PI * 0.9 - 0.2;
      var sunDir = new THREE.Vector3(Math.cos(sunAng) * 0.6, 0.15 + Math.sin(sunAng) * 0.9, 0.7).normalize();
      skyUniforms.uSunDir.value.copy(sunDir);
      sun.position.copy(sunDir.clone().multiplyScalar(60));
      sun.color.copy(s.sun);
      sun.intensity = s.sunInt;
      hemi.intensity = 0.35 + s.light * 0.5;
      fill.intensity = 0.12 + (1.0 - dayNight) * 0.18;

      // fog + ground tint
      scene.fog.color.copy(s.fog);
      groundMat.color.copy(s.fog).lerp(C(0x4f6b3f), 0.4);

      // foliage tint + gentle sway
      foliageMat.color.copy(s.fol);
      for (var i = 0; i < TREES; i++) {
        var td = treeData[i];
        td.sway += dt * 0.6;
        var swayX = Math.sin(td.sway) * 0.04 * td.scale;
        _q2.setFromEuler(_e.set(swayX, 0, 0));
        _p.copy(td.base);
        _sc.set(td.scale, td.scale * (1 + Math.sin(td.sway) * 0.02), td.scale);
        _m.compose(_p, _q2, _sc);
        trees.setMatrixAt(i, _m);
      }
      trees.instanceMatrix.needsUpdate = true;

      // WINDOWS: emissive glow ramps ON as night falls (dayNight -> 1)
      var winTarget = Math.max(0, (dayNight - 0.5) / 0.5) * 1.35; // 0 day → ~1.35 night
      windowEmissive += (winTarget - windowEmissive) * 0.05;
      windowMat.emissiveIntensity = windowEmissive;
      // podium rim + crown beacons also light up at night
      rimMat.emissiveIntensity = windowEmissive * 0.8;
      towers.userData.spireMats.forEach(function (m) {
        m.emissiveIntensity = windowEmissive * 1.1;
      });

      // slow auto-rotate of the towers (podium stays fixed)
      towerSpin.rotation.y += dt * 0.04;

      // particles drift + night opacity
      var arr = pGeo.attributes.position.array;
      for (var kk = 0; kk < P; kk++) {
        arr[kk * 3 + 1] += pSpd[kk] * dt * (0.4 + dayNight * 0.8);
        if (arr[kk * 3 + 1] > 60) arr[kk * 3 + 1] = 0;
      }
      pGeo.attributes.position.needsUpdate = true;
      pMat.opacity = 0.12 + s.part * 0.5;

      // stars
      sMat.opacity = s.star * 0.9;

      // backdrop photo fade-in as night falls (subtle)
      if (backdrop) backdrop.material.opacity = 0.08 + dayNight * 0.18;

      // cursor parallax on camera
      cpx += (px - cpx) * 0.04; cpy += (py - cpy) * 0.04;
      camera.position.x = cpx * 2.2;
      camera.position.y = 7 - cpy * 1.4;
      camera.lookAt(0, 7, 0);

      renderer.render(scene, camera);
    }
    frame();

    // expose a tiny debug hook
    window.__elena3d.sample = function () { return sample(dayNight); };
    window.__elena3dGet = function () { return { dayNight: dayNight, webglOn: document.documentElement.classList.contains("webgl-on"), scroll: scrollProgress(), windows: winMats.length, winEmissive: windowEmissive }; };
  }
})();
