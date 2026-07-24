// Shared across all pages: intro loader, page-transition reveal/cover, active nav state

// Skips the loader fade and Lenis' inertial scrolling. Each of the other
// page scripts re-reads this query in its own function scope rather than
// sharing this binding, so no file depends on another having loaded. The
// matching CSS half lives in css/base.css.
const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function createTransitionOverlay() {
  let overlay = document.getElementById("page-transition");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "page-transition";
    overlay.style.setProperty("--tx", "50%");
    overlay.style.setProperty("--ty", "50%");
    document.body.appendChild(overlay);
  }
  return overlay;
}

function revealPage(overlay) {
  overlay.style.setProperty("--tx", "50%");
  overlay.style.setProperty("--ty", "50%");
  // force reflow so the transition runs
  overlay.getBoundingClientRect();
  overlay.classList.add("revealed");
  overlay.classList.remove("covering");
}

function navigateWithCover(overlay, url, originXPercent, originYPercent) {
  overlay.style.setProperty("--tx", originXPercent + "%");
  overlay.style.setProperty("--ty", originYPercent + "%");
  overlay.classList.add("covering");
  overlay.classList.remove("revealed");

  const onEnd = (e) => {
    if (e.propertyName !== "clip-path") return;
    overlay.removeEventListener("transitionend", onEnd);
    window.location.href = url;
  };
  overlay.addEventListener("transitionend", onEnd);
}

function wireNavTransitions(overlay) {
  const current = location.pathname.split("/").pop() || "index.html";
  document
    .querySelectorAll('.nav-logo, .nav-links a[data-route]')
    .forEach((link) => {
      link.addEventListener("click", (e) => {
        const url = link.getAttribute("href");
        if (!url || url.startsWith("http") || url.startsWith("mailto")) return;
        const target = url.split("/").pop();
        if (target === current) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        const rect = link.getBoundingClientRect();
        const originX = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
        const originY = ((rect.top + rect.height / 2) / window.innerHeight) * 100;
        navigateWithCover(overlay, url, originX, originY);
      });
    });
}

// The counter tracks real asset readiness (how many of the page's images
// have settled) and dismisses on the window `load` event, so the loader
// costs only as long as the page actually needs. It used to tick on a
// random timer, which added a fixed 1-3.5s to time-to-content no matter
// how fast everything had really loaded.
function runLoader(onDone) {
  const loader = document.querySelector("#loader");
  const numberEl = document.querySelector("#loader-number");
  const done = () => onDone && onDone();
  if (!loader || !numberEl) {
    done();
    return;
  }

  const imgs = Array.from(document.images);
  let settled = imgs.filter((img) => img.complete).length;

  function render() {
    const pct = imgs.length ? Math.round((settled / imgs.length) * 100) : 100;
    numberEl.textContent = pct + "%";
  }
  render();

  imgs.forEach((img) => {
    if (img.complete) return;
    const bump = () => {
      settled++;
      render();
    };
    img.addEventListener("load", bump, { once: true });
    img.addEventListener("error", bump, { once: true });
  });

  let finished = false;
  function finish() {
    if (finished) return;
    finished = true;
    numberEl.textContent = "100%";

    const hide = () => {
      loader.style.display = "none";
      done();
    };
    if (typeof gsap === "undefined" || REDUCED_MOTION) {
      hide();
      return;
    }
    gsap.to(loader, { opacity: 0, duration: 0.5, delay: 0.1, onComplete: hide });
  }

  if (document.readyState === "complete") finish();
  else window.addEventListener("load", finish, { once: true });

  // Safety net: a single stalled image (or a dead CDN) must never strand a
  // visitor behind the loader.
  setTimeout(finish, 6000);
}

function setActiveNav() {
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a[data-route]").forEach((a) => {
    if (a.dataset.route === path) a.classList.add("active");
  });
}

// Smooth (inertial) scrolling site-wide, matching the reference site's own
// Lenis setup -- without this, every scroll-linked GSAP animation snaps
// straight to the raw wheel delta, which reads as abrupt/fast no matter how
// the individual animations themselves are tuned.
function initSmoothScroll() {
  if (typeof Lenis === "undefined" || typeof gsap === "undefined") return;
  // Inertial scrolling is exactly the kind of motion reduced-motion users
  // ask to avoid; fall back to the browser's native scrolling.
  if (REDUCED_MOTION) return;

  const lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });
  window.lenis = lenis;

  if (typeof ScrollTrigger !== "undefined") {
    lenis.on("scroll", ScrollTrigger.update);
  }
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

document.addEventListener("DOMContentLoaded", () => {
  const overlay = createTransitionOverlay();
  overlay.classList.add("covering");
  setActiveNav();
  wireNavTransitions(overlay);
  runLoader(() => revealPage(overlay));
  initSmoothScroll();
});
