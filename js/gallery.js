document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("galleryCanvas");
  const rulerTrack = document.getElementById("rulerTrack");
  if (!canvas || typeof THREE === "undefined") return;

  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- Scene setup ----
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.z = 12;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const world = new THREE.Group();
  scene.add(world);

  // ---- Shader: velocity-driven UV displacement ----
  // Bends each plane's texture along a sine wave whose amplitude is
  // proportional to how fast the user is currently dragging the canvas.
  const VERTEX_SHADER = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const FRAGMENT_SHADER = `
    uniform sampler2D uTexture;
    uniform vec2 uVelocity;
    uniform float uOpacity;
    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;
      uv.x += sin(uv.y * 3.14159265) * uVelocity.x * 0.4;
      uv.y += sin(uv.x * 3.14159265) * uVelocity.y * 0.4;
      vec4 color = texture2D(uTexture, uv);
      gl_FragColor = vec4(color.rgb, color.a * uOpacity);
    }
  `;

  const texLoader = new THREE.TextureLoader();
  // The photographer's real portfolio photos, with their actual aspect
  // ratios (width/height) so each plane matches its source image instead
  // of stretching everything to the placeholder pool's uniform 4:5.
  const GALLERY_PHOTOS = [
    { src: "images/3g0a9005.webp", aspect: 1280 / 1600 },
    { src: "images/AVE20231220_18444255_0090.webp", aspect: 1142 / 1600 },
    { src: "images/ELECTRICK-1.webp", aspect: 1280 / 1600 },
    { src: "images/LARELEVE-1.webp", aspect: 1280 / 1600 },
    { src: "images/LARELEVE-5.webp", aspect: 1280 / 1600 },
    { src: "images/come-up-img1.webp", aspect: 2000 / 1333 },
    { src: "images/come-up-img2.webp", aspect: 1600 / 920 },
    { src: "images/denzelcurry14822.webp", aspect: 640 / 800 },
    { src: "images/peugeot_153.webp", aspect: 1333 / 2000 },
    { src: "images/portraits-11_benoitmagimel.webp", aspect: 1280 / 1600 },
  ];
  const IMAGE_COUNT = GALLERY_PHOTOS.length;
  const items = [];
  const RANGE_X = 30; // matches ruler -30..30

  for (let i = 1; i <= IMAGE_COUNT; i++) {
    const photo = GALLERY_PHOTOS[i - 1];
    // Each texture arrives after the first paint, so trigger a redraw in
    // case the loop has already parked itself.
    const tex = texLoader.load(photo.src, () => wake());
    tex.colorSpace = THREE.SRGBColorSpace;
    const h = 3.2;
    const w = h * photo.aspect;
    const geo = new THREE.PlaneGeometry(w, h, 24, 24);
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      uniforms: {
        uTexture: { value: tex },
        uVelocity: { value: new THREE.Vector2(0, 0) },
        uOpacity: { value: 0.92 },
      },
    });
    const mesh = new THREE.Mesh(geo, mat);

    // Arranged, not scattered: one slot per image evenly spaced across
    // the full ruler range (-RANGE_X..RANGE_X), alternating between two
    // rows so neighbouring frames don't touch. No rotation/depth jitter,
    // so panning reads as browsing an orderly timeline rather than a
    // random pile of photos.
    const slot = i - 1;
    const spacing = (RANGE_X * 2) / IMAGE_COUNT;
    const x = -RANGE_X + spacing * (slot + 0.5);
    const y = slot % 2 === 0 ? 1.9 : -1.9;
    mesh.position.set(x, y, 0);

    world.add(mesh);
    items.push(mesh);
  }

  // ---- Drag interaction w/ inertia ----
  let isDragging = false;
  let lastX = 0,
    lastY = 0;
  let velX = 0,
    velY = 0;
  let targetX = 0,
    targetY = 0;
  let dragVelocity = new THREE.Vector2(0, 0); // smoothed, feeds the shader

  function toWorldDelta(dx, dy) {
    return { x: dx * 0.012, y: -dy * 0.012 };
  }

  canvas.addEventListener("pointerdown", (e) => {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    wake();
  });

  window.addEventListener("pointermove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    const d = toWorldDelta(dx, dy);
    velX = d.x;
    velY = d.y;
    targetX = THREE.MathUtils.clamp(targetX + d.x, -RANGE_X * 0.5, RANGE_X * 0.5);
    targetY = THREE.MathUtils.clamp(targetY + d.y, -6, 6);
    wake();
  });

  window.addEventListener("pointerup", () => {
    isDragging = false;
  });

  // ---- Ruler build ----
  for (let v = -RANGE_X; v <= RANGE_X; v += 1) {
    const tick = document.createElement("div");
    tick.className = "ruler-tick" + (v % 5 === 0 ? " major" : "");
    if (v % 5 === 0) {
      const span = document.createElement("span");
      span.textContent = v;
      tick.appendChild(span);
    }
    rulerTrack.appendChild(tick);
  }
  const cursor = document.createElement("div");
  cursor.className = "ruler-cursor";
  rulerTrack.appendChild(cursor);

  function updateRulerCursor() {
    const progress = (targetX + RANGE_X * 0.5) / RANGE_X; // 0..1
    cursor.style.left = `${THREE.MathUtils.clamp(progress, 0, 1) * 100}%`;
  }

  // ---- Draw-to-open gate ----
  // Sample points along the same diamond-mark path used elsewhere on the
  // site (see images/svg-star.svg) and light each one up as the cursor
  // passes near it, so the dashed outline visually "fills in" as it's
  // traced. Once most of it has been covered, open the playground.
  function setupDrawGate(onComplete) {
    const overlay = document.getElementById("galleryOverlay");
    const scrim = document.getElementById("galleryScrim");
    const svg = document.getElementById("drawSvg");
    const track = document.getElementById("drawPathTrack");
    const dotsGroup = document.getElementById("drawDots");
    if (!overlay || !svg || !track || !dotsGroup) return;

    const SAMPLE_COUNT = 140;
    const HIT_RADIUS_PX = 30;
    const COMPLETE_THRESHOLD = 1;

    const pathLength = track.getTotalLength();
    const dots = [];
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      const pt = track.getPointAtLength((i / SAMPLE_COUNT) * pathLength);
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("cx", pt.x);
      dot.setAttribute("cy", pt.y);
      dot.setAttribute("r", 0.6);
      dot.setAttribute("class", "draw-dot");
      dotsGroup.appendChild(dot);
      dots.push({ el: dot, x: pt.x, y: pt.y, touched: false });
    }

    let touchedCount = 0;
    let completed = false;

    function handleMove(e) {
      if (completed) return;
      const rect = svg.getBoundingClientRect();
      const viewBox = svg.viewBox.baseVal;
      const px = ((e.clientX - rect.left) / rect.width) * viewBox.width;
      const py = ((e.clientY - rect.top) / rect.height) * viewBox.height;
      const hitRadiusUnits = (HIT_RADIUS_PX / rect.width) * viewBox.width;

      dots.forEach((d) => {
        if (d.touched) return;
        if (Math.hypot(px - d.x, py - d.y) < hitRadiusUnits) {
          d.touched = true;
          d.el.classList.add("is-touched");
          touchedCount++;
        }
      });

      if (touchedCount / SAMPLE_COUNT >= COMPLETE_THRESHOLD) {
        completed = true;
        window.removeEventListener("pointermove", handleMove);
        gsap.to(overlay, {
          opacity: 0,
          duration: 0.7,
          ease: "power2.out",
          onComplete: () => {
            overlay.style.display = "none";
          },
        });
        gsap.to(scrim, { opacity: 0, duration: 0.9, ease: "power2.out" });
        onComplete();
      }
    }

    window.addEventListener("pointermove", handleMove);
  }

  setupDrawGate(() => {
    if (REDUCED_MOTION) {
      items.forEach((m) => {
        m.material.uniforms.uOpacity.value = 1;
      });
      camera.position.z = 9;
      wake();
      return;
    }
    items.forEach((m) => {
      gsap.to(m.material.uniforms.uOpacity, { value: 1, duration: 0.6, onUpdate: wake });
    });
    gsap.to(camera.position, { z: 9, duration: 0.9, ease: "power3.out", onUpdate: wake });
  });

  // ---- Resize ----
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    wake();
  });

  // ---- Animation loop ----
  // The loop parks itself once the scene has come to rest rather than
  // rendering at 60fps forever — WebGL is the most expensive thing on this
  // page and a still gallery has nothing new to draw. Every input, every
  // resize and every GSAP tween that touches the scene calls wake(), so
  // anything that changes a pixel restarts it.
  //
  // The planes used to accumulate a per-frame rotation drift here, which
  // was what made rest unreachable. It was well below the threshold of
  // visibility, so it's been dropped in favour of being able to idle.
  const REST_EPSILON = 0.0001;
  const IDLE_FRAMES_BEFORE_PARK = 30; // ~0.5s of stillness
  let idleFrames = 0;
  let running = false;

  function wake() {
    idleFrames = 0;
    if (running || document.hidden) return;
    running = true;
    requestAnimationFrame(animate);
  }

  function isAtRest() {
    return (
      !isDragging &&
      Math.abs(velX) < REST_EPSILON &&
      Math.abs(velY) < REST_EPSILON &&
      Math.abs(dragVelocity.x) < REST_EPSILON &&
      Math.abs(dragVelocity.y) < REST_EPSILON &&
      Math.abs(targetX - world.position.x) < REST_EPSILON &&
      Math.abs(targetY - world.position.y) < REST_EPSILON
    );
  }

  function animate() {
    if (!running) return;

    if (!isDragging) {
      velX *= 0.94;
      velY *= 0.94;
      targetX = THREE.MathUtils.clamp(targetX + velX, -RANGE_X * 0.5, RANGE_X * 0.5);
      targetY = THREE.MathUtils.clamp(targetY + velY, -6, 6);
    }

    world.position.x += (targetX - world.position.x) * 0.12;
    world.position.y += (targetY - world.position.y) * 0.12;

    // smooth the raw drag velocity, then feed it to every plane's shader
    dragVelocity.x += (velX - dragVelocity.x) * 0.15;
    dragVelocity.y += (velY - dragVelocity.y) * 0.15;

    items.forEach((m) => {
      m.material.uniforms.uVelocity.value.set(dragVelocity.x, dragVelocity.y);
    });

    updateRulerCursor();
    renderer.render(scene, camera);

    idleFrames = isAtRest() ? idleFrames + 1 : 0;
    if (idleFrames >= IDLE_FRAMES_BEFORE_PARK) {
      running = false;
      return;
    }
    requestAnimationFrame(animate);
  }

  // A backgrounded tab shouldn't hold a WebGL loop open.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) running = false;
    else wake();
  });

  wake();
});
