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

  // alpha: true — the stage has no backdrop fill of its own any more (see
  // resize()/render() below and .camera-seq in about.css), so the canvas
  // has to actually support transparency rather than compositing onto an
  // opaque black buffer, or the page's ambient background behind it would
  // never show through.
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const FRAME_COUNT = 240;
  const FRAME_W = 1280;
  const FRAME_H = 720;
  // Any leftover horizontal space (stage wider than the contain-fitted frame)
  // is split 15/85 instead of 50/50, so the frame sits toward the right of
  // the full-bleed stage and out from under the copy column on the left.
  const HORIZONTAL_BIAS = 0.85;
  const PIXEL_PERFECT = section.dataset.pixelPerfect !== "false";
  const framePath = (i) => `camera/ezgif-frame-${String(i + 1).padStart(3, "0")}.jpg`;

  // ---- Background removal ----
  // Frames are shot on a studio backdrop. CSS mix-blend-mode was tried
  // first and rejected — against this near-black page it crushes the whole
  // frame toward black, not just the backdrop (multiply darkens relative to
  // whatever's behind it; a dark "behind" darkens everything).
  //
  // A pure per-pixel brightness cutoff was tried second and mostly worked,
  // but the camera casts a soft drop shadow, and that shadow's brightness
  // varies by frame (rotation/lighting) enough to sometimes dip into the
  // same range as the camera body's own dark tones — no single global
  // threshold separates "shadow" from "object" in every frame.
  //
  // What actually distinguishes them isn't brightness, it's topology: the
  // shadow is out in the open, connected to the surrounding backdrop and
  // reachable from the frame's edge through other light pixels. Enclosed
  // object detail (buttons, dials, grip texture) never is — it's walled in
  // by the camera's own solid-dark silhouette, no matter how light the
  // detail itself is. So this floods inward from the four edges through any
  // pixel lighter than FLOOD_FLOOR, marking only what that flood actually
  // reaches as "background"; CHROMA_MIN/FEATHER then just shape the soft
  // alpha edge within that reached region, same as before.
  //
  // Values are measured, not eyeballed: sampling frames 1 and 120 (24x14
  // grid, min(r,g,b) per point) put the backdrop consistently at ~176-217
  // and the camera body's solid-dark areas under ~130, with a ~140-165 band
  // that's edge antialiasing / small detail highlights rather than backdrop.
  // FLOOD_FLOOR sits below that band so the flood can still tunnel through
  // a shadow that dips there, without being so low it breaches the camera's
  // own solid body.
  const FLOOD_FLOOR = 140;
  const CHROMA_MIN = 172;
  // A narrow feather (originally 10) turned out to amplify the source
  // JPEGs' own compression blocking into a visibly blocky alpha pattern:
  // any 8x8 DCT block noise inside a ~10-value ramp swings alpha almost
  // all the way from 0 to opaque, block by block, which reads as
  // "pixelated" — this was the actual cause of that artifact, not a
  // scaling/smoothing bug. Now that the flood fill (above) is what
  // protects enclosed object detail from being faded, the feather no
  // longer has to stay narrow to do that job too — widening it just
  // spreads the same brightness noise over a much gentler ramp, which is
  // what actually smooths the JPEG blocking away.
  const CHROMA_FEATHER = 70;

  function chromaKey(img) {
    const off = document.createElement("canvas");
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    off.width = w;
    off.height = h;
    const octx = off.getContext("2d", { willReadFrequently: true });
    if (!octx) return null; // no 2D context available — caller falls back to opaque
    octx.drawImage(img, 0, 0);
    const shot = octx.getImageData(0, 0, w, h);
    const d = shot.data;
    const n = w * h;

    // Flood fill from the four edges, iterative (a recursive version would
    // blow the call stack at 1280x720). isBg[i] = 1 once pixel i is
    // confirmed reachable background.
    const isBg = new Uint8Array(n);
    const stack = new Int32Array(n);
    let sp = 0;

    const tryPush = (idx) => {
      if (isBg[idx]) return;
      const p = idx * 4;
      if (Math.min(d[p], d[p + 1], d[p + 2]) <= FLOOD_FLOOR) return;
      isBg[idx] = 1;
      stack[sp++] = idx;
    };

    for (let x = 0; x < w; x++) {
      tryPush(x);
      tryPush((h - 1) * w + x);
    }
    for (let y = 0; y < h; y++) {
      tryPush(y * w);
      tryPush(y * w + (w - 1));
    }

    while (sp > 0) {
      const idx = stack[--sp];
      const x = idx % w;
      if (x > 0) tryPush(idx - 1);
      if (x < w - 1) tryPush(idx + 1);
      if (idx >= w) tryPush(idx - w);
      if (idx < n - w) tryPush(idx + w);
    }

    for (let idx = 0; idx < n; idx++) {
      if (!isBg[idx]) continue;
      const p = idx * 4;
      const min = Math.min(d[p], d[p + 1], d[p + 2]);
      if (min >= CHROMA_MIN) {
        d[p + 3] = 0;
      } else if (min > CHROMA_MIN - CHROMA_FEATHER) {
        d[p + 3] = Math.round((255 * (CHROMA_MIN - min)) / CHROMA_FEATHER);
      } else {
        // Reached by the flood (lighter than FLOOD_FLOOR, topologically
        // open to the backdrop) but below the feather band — this is the
        // shadow-dips-darker case the flood exists for; still
        // background, just not inside the brightness-based feather curve.
        d[p + 3] = 0;
      }
    }
    octx.putImageData(shot, 0, 0);
    return off;
  }

  // Keyed (alpha-punched) frames, drawn instead of the raw JPEGs. Keying
  // happens once per frame on arrival, not on every render() call, so
  // scrubbing never re-touches pixel data on the hot path.
  const keyed = new Array(FRAME_COUNT);
  // Readiness no longer piggybacks on an <img>'s .complete — the decoded
  // JPEG bitmap is discarded right after keying (see loadFrame) to avoid
  // holding both the raw decode and the keyed canvas in memory at once for
  // all 240 frames simultaneously.
  const ready = new Array(FRAME_COUNT).fill(false);
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
    // snap tracks whether we actually took the pixel-perfect branch, as
    // opposed to just landing on an integer scale by coincidence — the
    // smoothing toggle below needs that distinction, not just the final
    // scale value. (This file previously kept smoothing off for ANY
    // enlargement regardless of PIXEL_PERFECT, which defeated the
    // data-pixel-perfect="false" escape hatch entirely — it never actually
    // re-enabled interpolation like the standalone demo's copy of this
    // logic does.)
    const snap = PIXEL_PERFECT && raw >= 1;
    const scale = snap ? Math.floor(raw) : raw;
    const enlarging = scale > 1;

    dstW = Math.round(FRAME_W * scale);
    dstH = Math.round(FRAME_H * scale);
    dstX = Math.round((bufW - dstW) * HORIZONTAL_BIAS);
    dstY = Math.round((bufH - dstH) / 2);

    // Off only for whole-number pixel-perfect enlargement (exact block
    // replication); on otherwise — including fractional enlargement with
    // pixel-perfect turned off — where filtering is what keeps it clean.
    ctx.imageSmoothingEnabled = !(snap && enlarging);
    ctx.imageSmoothingQuality = "high";

    // No backdrop fill — the stage is transparent (see render()) so the
    // page's own ambient background shows through the letterbox area
    // instead of a flat rect. Still needs a clear on geometry change,
    // otherwise the previous size's pixels linger outside the new rect.
    ctx.clearRect(0, 0, bufW, bufH);

    drawnIndex = -1; // geometry changed, so the current frame must be redrawn
    render();
  }

  // Nearest frame that has actually decoded and been keyed, searching
  // outward from `i`. Only does real work while the preload is in flight.
  function nearestLoaded(i) {
    if (ready[i]) return i;
    for (let d = 1; d < FRAME_COUNT; d++) {
      if (ready[i - d]) return i - d;
      if (ready[i + d]) return i + d;
    }
    return -1;
  }

  // Contain-fit and centred: the whole frame stays visible at every viewport
  // ratio, which matters most on portrait phones where a cover-fit would
  // crop the camera out of its own shot. Geometry comes from resize(); this
  // is only the blit. The destination rect is cleared before every draw
  // (not just on resize) because the keyed frames carry real alpha — without
  // it, each new frame's transparent edges would let the previous frame's
  // pixels show through instead of the page behind the canvas.
  function render() {
    const wanted = Math.min(FRAME_COUNT - 1, Math.max(0, Math.round(targetIndex)));
    const i = nearestLoaded(wanted);
    if (i === -1 || i === drawnIndex || !keyed[i]) return;
    drawnIndex = i;
    ctx.clearRect(dstX, dstY, dstW, dstH);
    ctx.drawImage(keyed[i], dstX, dstY, dstW, dstH);
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
      if (img.naturalWidth > 0) {
        keyed[i] = chromaKey(img);
        ready[i] = !!keyed[i];
      }
      // The keyed canvas is the only copy kept around; drop the decoded
      // JPEG immediately so 240 frames don't mean 240 decodes AND 240
      // keyed canvases alive at once.
      img.onload = null;
      img.onerror = null;
      img.src = "";
      settled++;
      onSettled && onSettled();
    };
    // An individual frame failing must not stall the run — the sequence
    // just holds the previous frame through the gap.
    img.onload = done;
    img.onerror = done;
    img.src = framePath(i);
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

  // Poster frame immediately; the remaining 239 wait for window `load`. The
  // stage reveals as soon as this one frame is in — no reason to hold the
  // whole section behind a 240-frame bar when frame 0 already renders.
  loadFrame(0, () => {
    setProgress(settled, FRAME_COUNT);
    requestRender();
    markReady();
  });

  const startPreload = () => preloadAll();
  if (document.readyState === "complete") startPreload();
  else window.addEventListener("load", startPreload, { once: true });

  // Without GSAP the section still shows the poster frame; it just doesn't
  // scrub. Same graceful path as the rest of the site's CDN guards.
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;

  gsap.registerPlugin(ScrollTrigger);

  // Scroll distance is derived from the frame count so every frame gets
  // roughly the same amount of travel, with a floor of ~3.5 viewports so the
  // sequence never feels rushed on a short screen. (Bumped from 2.2/9 to
  // slow the scrub down, matching the desktop min-height increase.)
  const scrollLength = () =>
    Math.round(Math.max(window.innerHeight * 3.5, FRAME_COUNT * 14));

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
