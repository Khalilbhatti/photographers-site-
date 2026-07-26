document.addEventListener("DOMContentLoaded", () => {
  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // --- Featured work: a handful of projects on the landing page, each
  // linking through to its full case study. No screenshots exist for this
  // data (see js/project-data.js), so each card is a category-tinted glyph
  // rather than a photo — same treatment as works.html's cards. ---
  const featuredSection = document.getElementById("homeFeatured");
  const hoverPrompt = document.getElementById("cardHoverPrompt");
  if (featuredSection && typeof PROJECTS !== "undefined") {
    const CATEGORY_LABELS = {
      dashboards: "Dashboard",
      websites: "Website",
      mobile: "Mobile",
    };
    const featuredSlugs = ["noloco", "hello-uptown-web", "financia", "premium-motors-app"];

    featuredSlugs.forEach((slug) => {
      const project = PROJECTS[slug];
      if (!project) return;

      const card = document.createElement("a");
      card.className = "featured-card";
      card.dataset.cat = project.category;
      card.href = `project.html?slug=${slug}`;
      card.innerHTML = `
        <span class="featured-card__glyph" aria-hidden="true">${CATEGORY_LABELS[project.category] || project.category}</span>
        <div class="featured-card-meta">
          <span class="featured-card-company">${project.company}</span>
          <h2>${project.title}</h2>
        </div>
      `;
      featuredSection.appendChild(card);

      if (!hoverPrompt) return;
      card.addEventListener("mouseenter", () => hoverPrompt.classList.add("is-visible"));
      card.addEventListener("mouseleave", () => hoverPrompt.classList.remove("is-visible"));
      card.addEventListener("mousemove", (e) => {
        hoverPrompt.style.left = `${e.clientX}px`;
        hoverPrompt.style.top = `${e.clientY}px`;
      });
    });
  }

  if (typeof gsap === "undefined") return;
  gsap.registerPlugin(ScrollTrigger);

  // --- Nav logo: opens hero-sized (see the 8.5vw override in home.css)
  // and shrinks to its normal fixed-nav size as the user scrolls the
  // first stretch of the page, then stays put. ---
  if (REDUCED_MOTION) {
    // Skip the scrub and settle straight to the normal fixed-nav size.
    gsap.set(".nav-logo", { fontSize: "1.1vw" });
  } else {
    gsap.fromTo(
      ".nav-logo",
      { fontSize: "8.5vw" },
      {
        fontSize: "1.1vw",
        ease: "none",
        scrollTrigger: {
          trigger: "#main",
          start: "top top",
          end: "+=600",
          scrub: true,
        },
      }
    );
  }
});
