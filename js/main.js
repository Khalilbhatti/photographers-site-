// Shared across all pages: intro loader, page-transition reveal/cover, active nav state

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

function runLoader(onDone) {
  const loader = document.querySelector("#loader");
  const numberEl = document.querySelector("#loader-number");
  if (!loader || !numberEl) {
    onDone && onDone();
    return;
  }

  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.floor(Math.random() * 9) + 2;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      gsap.to(loader, {
        opacity: 0,
        duration: 0.5,
        delay: 0.1,
        onComplete: () => {
          loader.style.display = "none";
          onDone && onDone();
        },
      });
    }
    numberEl.textContent = progress + "%";
  }, 70);
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
