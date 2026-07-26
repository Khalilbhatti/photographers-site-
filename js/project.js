document.addEventListener("DOMContentLoaded", () => {
  if (typeof PROJECTS === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  const project = PROJECTS[slug] || PROJECTS[Object.keys(PROJECTS)[0]];

  // --- Populate hero ---
  document.getElementById("projCategory").textContent = project.category;
  document.getElementById("projYear").textContent = project.year;
  document.getElementById("projTitle").textContent = project.title;
  document.getElementById("projDescription").textContent = project.description;
  document.title = `${project.title} — M Khalil Ur Rehman`;

  const heroFrame = document.getElementById("projHeroFrame");
  const heroImg = document.getElementById("projHeroImg");
  const title = document.getElementById("projTitle");

  // Title reveal and the hero's curtain-lift/blur-in both fire off the
  // image's real `load` event rather than a fixed timer.
  function onHeroReady() {
    heroFrame.classList.add("is-revealed");
    title.classList.add("is-revealed");
  }
  heroImg.addEventListener("load", onHeroReady);
  heroImg.alt = `${project.title} project`;
  heroImg.src = project.hero;
  if (heroImg.complete) onHeroReady();

  // --- Populate gallery slides (alternating large / inset framing) ---
  const galleryTrack = document.getElementById("projGallery");
  const galleryImgs = [];
  project.gallery.forEach((src, i) => {
    const slide = document.createElement("div");
    slide.className = "project-gallery-slide" + (i % 2 === 1 ? " is-inset" : "");

    const frame = document.createElement("div");
    frame.className = "gallery-frame";

    const mediaScale = document.createElement("div");
    mediaScale.className = "media-scale";

    const img = document.createElement("img");
    img.alt = `${project.title} gallery image ${i + 1}`;

    const curtain = document.createElement("span");
    curtain.className = "reveal-curtain";

    mediaScale.appendChild(img);
    frame.appendChild(mediaScale);
    frame.appendChild(curtain);
    slide.appendChild(frame);
    galleryTrack.appendChild(slide);
    galleryImgs.push(img);

    img.addEventListener("load", () => frame.classList.add("is-revealed"));
    img.src = src;
    if (img.complete) frame.classList.add("is-revealed");
  });

  if (typeof gsap === "undefined") return;
  gsap.registerPlugin(ScrollTrigger);

  const track = document.getElementById("projectTrack");
  const layout = document.querySelector(".project-layout");
  const heroImage = document.querySelector(".project-hero-image img");
  const allParallaxImgs = [heroImage, ...galleryImgs];

  function getScrollDistance() {
    return Math.max(track.scrollWidth - window.innerWidth + 200, 0);
  }

  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Frame geometry is measured once per layout (and again on every
  // ScrollTrigger refresh) instead of per scroll tick — reading each
  // frame's box while also writing a transform to its image forced a
  // synchronous reflow on every scrubbed frame of the pinned scroll.
  // The frame (not the inner .media-scale) is measured because .media-scale
  // carries the reveal's own scale transform; both share a center, but the
  // frame's box is the stable one. `mid` is stored in track space — screen
  // position minus the track's current translate — so a single measurement
  // stays valid for every value of trackX.
  let frameMetrics = [];
  function measureFrames() {
    const currentX = gsap.getProperty(track, "x") || 0;
    frameMetrics = [];
    allParallaxImgs.forEach((img) => {
      const frame = img && img.closest(".gallery-frame, .project-hero-image");
      if (!frame) return;
      const rect = frame.getBoundingClientRect();
      frameMetrics.push({ img, mid: rect.left - currentX + rect.width / 2 });
    });
  }

  // Same per-image parallax technique as works.js: each image drifts
  // slightly within its own frame based on distance from viewport
  // center, so the horizontal scroll reads as layered rather than a
  // single flat strip translating in lockstep.
  function applyParallax(trackX) {
    if (REDUCED_MOTION) return;
    const viewportCenter = window.innerWidth / 2;
    for (const m of frameMetrics) {
      const distFromCenter = (viewportCenter - (m.mid + trackX)) / window.innerWidth;
      gsap.set(m.img, { xPercent: distFromCenter * 10 });
    }
  }

  gsap.set(track, { x: 0 });
  measureFrames();
  ScrollTrigger.create({
    trigger: layout,
    start: "top top",
    end: () => "+=" + getScrollDistance(),
    pin: true,
    scrub: 0.6,
    onUpdate: (self) => {
      const trackX = -self.progress * getScrollDistance();
      gsap.set(track, { x: trackX });
      applyParallax(trackX);
    },
  });

  // Re-measure whenever ScrollTrigger recalculates layout (resize, late
  // image loads), so the cached frame geometry can't drift out of date.
  ScrollTrigger.addEventListener("refresh", measureFrames);

  window.addEventListener("resize", () => ScrollTrigger.refresh());
});
