/**
 * FlowFieldBackground — vanilla JS port of a React canvas component.
 *
 * Ported because this project has no React/TypeScript/Tailwind/shadcn
 * toolchain — it's plain HTML/CSS/JS loaded via <script> tags, same as
 * js/gallery.js. The original component didn't actually need React: it was
 * a Canvas 2D animation loop wrapped in a useEffect, with props just
 * feeding config into that loop. This does the same thing with a
 * constructor + options.
 *
 * Usage — declarative (what index/works/about.html use). Any element
 * carrying data-flow-field is initialised automatically on DOMContentLoaded,
 * which keeps the pages free of inline <script> so they can defer every
 * script and run under a CSP that forbids inline script:
 *
 *   <div id="ambientBg" data-flow-field
 *        data-color="#111111" data-background="#ffffff"
 *        data-trail-opacity="0.25" data-particle-count="380"
 *        data-speed="0.5" data-size="2.6"></div>
 *
 * Usage — imperative:
 *   const field = createFlowFieldBackground(document.querySelector('#hero-bg'), {
 *     color: '#818cf8',
 *     background: '#000000', // extended beyond the original: the source
 *                             // component hardcoded a black trail fill,
 *                             // which only works on dark hosting pages.
 *     trailOpacity: 0.1,
 *     particleCount: 600,
 *     speed: 0.8,
 *   });
 *   // later, if the container is removed from the DOM:
 *   field.destroy();
 */
function createFlowFieldBackground(container, options = {}) {
  const config = {
    color: options.color || "#6366f1",
    background: options.background || "#000000",
    trailOpacity: options.trailOpacity ?? 0.15,
    particleCount: options.particleCount ?? 600,
    speed: options.speed ?? 1,
    size: options.size ?? 1.5,
  };

  if (!container) {
    throw new Error("createFlowFieldBackground: container element is required");
  }

  function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m
      ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
      : { r: 0, g: 0, b: 0 };
  }
  const bgRgb = hexToRgb(config.background);

  // Match the original's container styling: relative, fills parent, clips.
  container.classList.add("flow-field-bg");
  // `container.style.position` only reflects an *inline* style, which is
  // always empty here — checking it (as opposed to the computed style)
  // would unconditionally write an inline `position: relative`, which
  // beats any CSS class asking for e.g. `position: fixed` (as the
  // `.flow-field-bg--ambient` modifier does). Check the computed value
  // instead, and only fall back to relative if nothing positioned it.
  if (getComputedStyle(container).position === "static") {
    container.style.position = "relative";
  }
  container.style.background = config.background;

  const canvas = document.createElement("canvas");
  canvas.className = "flow-field-bg__canvas";
  canvas.setAttribute("aria-hidden", "true");
  container.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("createFlowFieldBackground: 2D canvas context unavailable");
  }

  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let width = container.clientWidth;
  let height = container.clientHeight;
  let particles = [];
  let animationFrameId = null;
  let destroyed = false;
  let running = false;
  // Refreshed once per animation frame rather than on every mousemove:
  // getBoundingClientRect() is a layout read, and mousemove can fire many
  // times between two paints.
  let canvasRect = { left: 0, top: 0 };
  const mouse = { x: -1000, y: -1000 };

  class Particle {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.vx = 0;
      this.vy = 0;
      this.age = 0;
      // Random lifespan so particles recycle at staggered times, not all at once.
      this.life = Math.random() * 200 + 100;
    }

    update() {
      // Flow-field angle derived from position (cheap pseudo-noise).
      const angle =
        (Math.cos(this.x * 0.005) + Math.sin(this.y * 0.005)) * Math.PI;

      this.vx += Math.cos(angle) * 0.2 * config.speed;
      this.vy += Math.sin(angle) * 0.2 * config.speed;

      // Mouse repulsion within a fixed radius.
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const interactionRadius = 150;

      if (distance < interactionRadius) {
        const force = (interactionRadius - distance) / interactionRadius;
        this.vx -= dx * force * 0.05;
        this.vy -= dy * force * 0.05;
      }

      this.x += this.vx;
      this.y += this.vy;
      this.vx *= 0.95; // friction
      this.vy *= 0.95;

      this.age++;
      if (this.age > this.life) this.reset();

      if (this.x < 0) this.x = width;
      if (this.x > width) this.x = 0;
      if (this.y < 0) this.y = height;
      if (this.y > height) this.y = 0;
    }

    draw(context) {
      context.fillStyle = config.color;
      // Fade in/out over the particle's lifespan (triangular envelope).
      const alpha = 1 - Math.abs(this.age / this.life - 0.5) * 2;
      context.globalAlpha = alpha;
      context.fillRect(this.x, this.y, config.size, config.size);
    }
  }

  function init() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset before rescaling on resize
    ctx.scale(dpr, dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    particles = [];
    for (let i = 0; i < config.particleCount; i++) {
      particles.push(new Particle());
    }
  }

  // One opaque pass with no motion, for prefers-reduced-motion: the field
  // still provides its texture, it just never animates.
  function renderStatic() {
    ctx.fillStyle = config.background;
    ctx.fillRect(0, 0, width, height);
    particles.forEach((p) => p.draw(ctx));
    ctx.globalAlpha = 1;
  }

  function animate() {
    if (destroyed || !running) return;

    canvasRect = canvas.getBoundingClientRect();

    // Semi-transparent fill (instead of clearing) creates the trail look.
    ctx.fillStyle = `rgba(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}, ${config.trailOpacity})`;
    ctx.fillRect(0, 0, width, height);

    particles.forEach((p) => {
      p.update();
      p.draw(ctx);
    });

    animationFrameId = requestAnimationFrame(animate);
  }

  function start() {
    if (destroyed || running || REDUCED_MOTION || document.hidden) return;
    running = true;
    animationFrameId = requestAnimationFrame(animate);
  }

  function stop() {
    running = false;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  function handleResize() {
    width = container.clientWidth;
    height = container.clientHeight;
    init();
    if (REDUCED_MOTION) renderStatic();
  }

  function handleMouseMove(e) {
    mouse.x = e.clientX - canvasRect.left;
    mouse.y = e.clientY - canvasRect.top;
  }

  function handleMouseLeave() {
    mouse.x = -1000;
    mouse.y = -1000;
  }

  // A backgrounded tab still burns a full rAF loop's worth of CPU (and
  // battery) on an animation nobody can see.
  function handleVisibility() {
    if (document.hidden) stop();
    else start();
  }

  init();
  canvasRect = canvas.getBoundingClientRect();
  if (REDUCED_MOTION) renderStatic();
  else start();

  // Tracked on window/document rather than the container: when this is
  // used as a full-page ambient background (see `.flow-field-bg--ambient`
  // in flow-field-background.css) the container has pointer-events:none
  // so real page content above it stays clickable — but that also means
  // the container itself never receives mouse events, so listening there
  // would leave the cursor permanently disconnected from the particles.
  window.addEventListener("resize", handleResize);
  window.addEventListener("mousemove", handleMouseMove, { passive: true });
  document.addEventListener("mouseleave", handleMouseLeave);
  document.addEventListener("visibilitychange", handleVisibility);

  return {
    /** Update color/trailOpacity/particleCount/speed; re-inits particles. */
    update(nextOptions = {}) {
      Object.assign(config, nextOptions);
      init();
      if (REDUCED_MOTION) renderStatic();
    },
    /** Stop the animation loop, remove listeners, and remove the canvas. */
    destroy() {
      destroyed = true;
      stop();
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("visibilitychange", handleVisibility);
      canvas.remove();
    },
  };
}

// Declarative init: every [data-flow-field] element is wired up from its
// own data-* attributes. Keeps the host pages free of inline <script>, so
// they can defer every script and run under a CSP with no 'unsafe-inline'.
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-flow-field]").forEach((el) => {
    const d = el.dataset;
    const num = (v) => (v === undefined ? undefined : parseFloat(v));
    createFlowFieldBackground(el, {
      color: d.color,
      background: d.background,
      trailOpacity: num(d.trailOpacity),
      particleCount: num(d.particleCount),
      speed: num(d.speed),
      size: num(d.size),
    });
  });
});
