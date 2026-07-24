/**
 * Scroll-linked image sequence — the technique Apple uses on the AirPods
 * page. 240 JPEG frames are preloaded, then scroll position is mapped
 * straight onto the frame index while the canvas is pinned, so the clip
 * scrubs frame-by-frame under the user's thumb instead of playing on its
 * own clock.
 *
 * Deliberate choices worth knowing before editing:
 *
 * - Frames are drawn into a <canvas> rather than swapped through an
 *   <img src>. Swapping src re-enters layout and decode on every frame,
 *   which is exactly where this effect normally stutters.
 * - The bulk preload waits for window `load`. runLoader() in main.js now
 *   gates the site's intro loader on that same event, so kicking off 5MB
 *   of frames any earlier would hold the whole site behind this section.
 *   Frame 1 alone is fetched immediately so there's a poster right away.
 * - The ScrollTrigger is built up front and never waits for the preload.
 *   Creating it later would add ~2400px of pin spacing to the document
 *   after the fact and shove everything below it down mid-scroll.
 * - While frames are still arriving, render() falls back to the nearest
 *   frame that has actually decoded, so scrubbing degrades smoothly
 *   instead of showing a blank canvas.
 * - prefers-reduced-motion fetches exactly one frame and shows it as a
 *   still — no pin, no scrub, and no 5MB download for motion the user
 *   has asked not to see.
 */
document.addEventListener("DOMContentLoaded", () => {
  const section = document.querySelector("[data-camera-sequence]");
  if (!section) return;

  const canvas = section.querySelector(".camera-seq__canvas");
  const fallback = section.querySelector(".camera-seq__fallback");
  const pctEl = section.querySelector(".camera-seq__pct");
  const barEl = section.querySelector(".camera-seq__bar span");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return;

  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const FRAME_COUNT = 240;
  const FRAME_W = 1280;
  const FRAME_H = 720;
  const BACKDROP = "#0d0d0d"; // matches --near-black so the letterbox disappears
  const PIXEL_PERFECT = section.dataset.pixelPerfect !== "false";
  const framePath = (i) => `camera/ezgif-frame-${String(i + 1).padStart(3, "0")}.jpg`;

  const frames = new Array(FRAME_COUNT);
  let settled = 0;
  // Destination rect in device pixels, recomputed only on resize.
  let bufW = 0;
  let bufH = 0;
  let dstX = 0;
  let dstY = 0;
  let dstW = 0;
  let dstH = 0;
  let drawnIndex = -1;
  let targetIndex = 0;
  let rafId = null;

  const isReady = (img) => !!img && img.complete && img.naturalWidth > 0;

  /* ---- Sizing and pixel-perfect geometry ----
   *
   * All drawing happens in device pixels under an identity transform, not
   * in CSS pixels under a dpr transform. That's what makes it possible to
   * land the destination rect on exact pixel boundaries.
   *
   * The frames are 1280x720. A plain contain-fit enlarges them — 1.25x at
   * 1600x900, 1.5x at 1920x1080, 2.36x on a retina laptop — and every one
   * of those is a fractional resample, which is exactly the softness you
   * see. So when the frame would be enlarged, the factor is snapped DOWN
   * to a whole number: each source pixel then covers an exact NxN block of
   * device pixels, with smoothing off, so nothing is interpolated at all.
   *
   * Reduction is left fractional and smoothed — downscaling through a good
   * filter is already crisp, and snapping it would throw away most of the
   * stage for no gain.
   *
   * Trade-off: at 1x, a 1600-wide stage now shows the frame at its native
   * 1280 rather than stretched to 1600. Sharper, and smaller. Set
   * data-pixel-perfect="false" on the section to go back to filling.
   */
  function resize() {
    // 3, not 2: on a 3x phone the frame still lands under 1:1 (0.91x), so
    // the extra density is real detail rather than wasted fill.
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const rect = canvas.getBoundingClientRect();
    bufW = Math.max(1, Math.round(rect.width * dpr));
    bufH = Math.max(1, Math.round(rect.height * dpr));
    canvas.width = bufW;
    canvas.height = bufH;
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const raw = Math.min(bufW / FRAME_W, bufH / FRAME_H);
    const scale = PIXEL_PERFECT && raw >= 1 ? Math.floor(raw) : raw;
    const enlarging = scale > 1;

    dstW = Math.round(FRAME_W * scale);
    dstH = Math.round(FRAME_H * scale);
    dstX = Math.round((bufW - dstW) / 2);
    dstY = Math.round((bufH - dstH) / 2);

    // Off for whole-number enlargement (exact block replication); on for
    // reduction, where filtering is what keeps the result clean.
    ctx.imageSmoothingEnabled = !enlarging;
    ctx.imageSmoothingQuality = "high";

    // The backdrop only needs painting when the geometry changes: the
    // destination rect is constant between resizes and the frames are
    // opaque JPEGs, so each redraw can be a bare drawImage over the same
    // rect instead of a full-canvas clear every scroll tick.
    ctx.fillStyle = BACKDROP;
    ctx.fillRect(0, 0, bufW, bufH);

    drawnIndex = -1; // geometry changed, so the current frame must be redrawn
    render();
  }

  // Nearest frame that has actually decoded, searching outward from `i`.
  // Only does real work while the preload is still in flight.
  function nearestLoaded(i) {
    if (isReady(frames[i])) return i;
    for (let d = 1; d < FRAME_COUNT; d++) {
      if (isReady(frames[i - d])) return i - d;
      if (isReady(frames[i + d])) return i + d;
    }
    return -1;
  }

  // Contain-fit and centred: the whole frame stays visible at every viewport
  // ratio, which matters most on portrait phones where a cover-fit would
  // crop the camera out of its own shot. Geometry comes from resize(); this
  // is only the blit.
  function render() {
    const wanted = Math.min(FRAME_COUNT - 1, Math.max(0, Math.round(targetIndex)));
    const i = nearestLoaded(wanted);
    if (i === -1 || i === drawnIndex) return;
    drawnIndex = i;
    ctx.drawImage(frames[i], dstX, dstY, dstW, dstH);
  }

  // Coalesce every render request into at most one draw per frame.
  function requestRender() {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      render();
    });
  }

  function setProgress(done, total) {
    const pct = total ? Math.round((done / total) * 100) : 100;
    if (pctEl) pctEl.textContent = pct + "%";
    if (barEl) barEl.style.transform = `scaleX(${pct / 100})`;
  }

  function markReady() {
    section.classList.add("is-ready");
    if (fallback) fallback.setAttribute("aria-hidden", "true");
  }

  function loadFrame(i, onSettled) {
    const img = new Image();
    img.decoding = "async";
    const done = () => {
      settled++;
      onSettled && onSettled();
    };
    // An individual frame failing must not stall the run — the sequence
    // just holds the previous frame through the gap.
    img.onload = done;
    img.onerror = done;
    img.src = framePath(i);
    frames[i] = img;
    return img;
  }

  // ---- Preload: a fixed number of requests in flight. Firing all 240 at
  // once buries the connection and makes the early frames — the ones
  // needed first — arrive last. ----
  function preloadAll() {
    const CONCURRENCY = 8;
    let next = 0;

    function pump() {
      if (next >= FRAME_COUNT) {
        if (settled >= FRAME_COUNT) markReady();
        return;
      }
      const i = next++;
      loadFrame(i, () => {
        setProgress(settled, FRAME_COUNT);
        requestRender();
        pump();
      });
    }

    setProgress(0, FRAME_COUNT);
    for (let k = 0; k < Math.min(CONCURRENCY, FRAME_COUNT); k++) pump();
  }

  // ---- Reduced motion: one still frame, no pin, no scrub. ----
  if (REDUCED_MOTION) {
    section.classList.add("is-static");
    resize();
    loadFrame(0, () => {
      setProgress(1, 1);
      markReady();
      requestRender();
    });
    window.addEventListener("resize", resize);
    return;
  }

  resize();
  window.addEventListener("resize", resize);

  // Poster frame immediately; the remaining 239 wait for window `load`.
  loadFrame(0, () => {
    setProgress(settled, FRAME_COUNT);
    requestRender();
  });

  const startPreload = () => preloadAll();
  if (document.readyState === "complete") startPreload();
  else window.addEventListener("load", startPreload, { once: true });

  // Without GSAP the section still shows the poster frame; it just doesn't
  // scrub. Same graceful path as the rest of the site's CDN guards.
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;

  gsap.registerPlugin(ScrollTrigger);

  // Scroll distance is derived from the frame count so every frame gets
  // roughly the same amount of travel, with a floor of ~2 viewports so the
  // sequence never feels rushed on a short screen.
  const scrollLength = () =>
    Math.round(Math.max(window.innerHeight * 2.2, FRAME_COUNT * 9));

  const playhead = { frame: 0 };
  const base = {
    frame: FRAME_COUNT - 1,
    ease: "none",
    snap: "frame", // integral frame indices; no half-frames to round off
    onUpdate: () => {
      targetIndex = playhead.frame;
      requestRender();
    },
  };

  // Pins the stage itself over its own stretch of scroll, then releases.
  const pinnedConfig = () => ({
    ...base,
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: () => "+=" + scrollLength(),
      pin: true,
      pinSpacing: true,
      anticipatePin: 1,
      scrub: 0.6, // smooths the mapping so fast flicks don't judder
      invalidateOnRefresh: true,
    },
  });

  // data-scrub-trigger opts into sticky mode: something else (CSS
  // position:sticky) already holds the canvas in view, so there's no pin
  // here at all — the frame index just maps onto progress through the named
  // container. That's what lets the sequence run the length of a whole page
  // instead of owning its own scroll budget.
  const scrubTrigger = section.dataset.scrubTrigger
    ? document.querySelector(section.dataset.scrubTrigger)
    : null;

  if (!scrubTrigger) {
    gsap.to(playhead, pinnedConfig());
    return;
  }

  // Two layouts either side of the same 768px edge about.css uses.
  // gsap.matchMedia reverts everything a branch created when its query stops
  // matching, so crossing the breakpoint can't strand a pin or a stale
  // scrub — which hand-rolled resize handling gets wrong almost every time.
  const mm = gsap.matchMedia();

  mm.add("(min-width: 769px)", () => {
    gsap.to(playhead, {
      ...base,
      scrollTrigger: {
        trigger: scrubTrigger,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.6,
        invalidateOnRefresh: true,
      },
    });
  });

  mm.add("(max-width: 768px)", () => {
    gsap.to(playhead, pinnedConfig());
  });
});
