document.addEventListener("DOMContentLoaded", () => {
  if (typeof gsap === "undefined") return;
  gsap.registerPlugin(ScrollTrigger);

  // --- Nav logo: opens hero-sized (see the 8.5vw override in home.css)
  // and shrinks to its normal fixed-nav size as the user scrolls the
  // first stretch of the page, then stays put. ---
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

  // --- Grid images: each frame gets a wrapper (parallax drift + hover
  // zoom, both GSAP-owned) around the <img> (GSAP-owned entrance scale,
  // 1.25 -> 1.05, scroll-scrubbed as the frame enters view, settling
  // permanently at 1.05 so the wrapper's drift never exposes empty
  // edges). Two separate elements own the two transforms so neither
  // silently overwrites the other. ---
  document.querySelectorAll(".g-img").forEach((frame) => {
    const img = frame.querySelector("img");
    if (!img) return;
    const target = document.createElement("div");
    target.className = "g-img-target";
    frame.insertBefore(target, img);
    target.appendChild(img);

    gsap.fromTo(
      img,
      { scale: 1.25 },
      {
        scale: 1.05,
        ease: "none",
        scrollTrigger: {
          trigger: frame,
          start: "top bottom",
          end: "top 55%",
          scrub: true,
        },
      }
    );

    gsap.fromTo(
      target,
      { yPercent: -8 },
      {
        yPercent: 8,
        ease: "none",
        scrollTrigger: {
          trigger: frame,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      }
    );

    frame.addEventListener("mouseenter", () =>
      gsap.to(target, { scale: 1.06, duration: 0.6, ease: "power3.out" })
    );
    frame.addEventListener("mouseleave", () =>
      gsap.to(target, { scale: 1, duration: 0.6, ease: "power3.out" })
    );
  });

  // --- Selected projects: ONE pinned container shared by every project
  // (matches the live site: a single pin-spacer, with each project after
  // the first stacked via position:absolute directly on top of the
  // first's box -- see .selected-project:not(:first-child) in home.css).
  // A single combined scroll range is split into equal sub-ranges, one
  // per project, so the whole sequence is one continuous pin with no
  // unpin/repin moment (and therefore no gap or flash) between projects.
  // Each project's mask-size is remapped through an ease-in curve rather
  // than driven linearly by scroll progress, matching the live site's
  // actual pacing: it stays near-invisible for the first stretch of its
  // own sub-range, then opens quickly. ---
  const selectedSection = document.getElementById("selectedProjects");
  const hoverPrompt = document.getElementById("cardHoverPrompt");
  if (selectedSection && hoverPrompt && typeof PROJECTS !== "undefined") {
    const slugs = ["road-trip", "visionnaire"];
    const blocks = [];

    slugs.forEach((slug) => {
      const project = PROJECTS[slug];
      if (!project) return;

      const block = document.createElement("a");
      block.className = "selected-project";
      block.href = `project.html?slug=${slug}`;

      block.innerHTML = `
        <div class="selected-project__scrim"></div>
        <div class="selected-project__image"><img src="${project.hero}" alt="${project.title} project" /></div>
        <div class="selected-project__content">
          <div class="selected-project__badges">
            <span class="tag-pill">${project.category}</span>
            <span class="tag-pill">${project.year}</span>
          </div>
          <h2 class="selected-project__title">${project.title}</h2>
        </div>
      `;
      selectedSection.appendChild(block);
      blocks.push(block);

      block.addEventListener("mouseenter", () => {
        hoverPrompt.classList.add("is-visible");
      });
      block.addEventListener("mouseleave", () => {
        hoverPrompt.classList.remove("is-visible");
      });
      block.addEventListener("mousemove", (e) => {
        hoverPrompt.style.left = `${e.clientX}px`;
        hoverPrompt.style.top = `${e.clientY}px`;
      });
    });

    if (blocks.length) {
      const revealEase = gsap.parseEase("power2.in");

      ScrollTrigger.create({
        trigger: selectedSection,
        start: "top top",
        end: () => "+=" + window.innerHeight * blocks.length,
        pin: true,
        pinSpacing: true,
        scrub: 0.4,
        onUpdate: (self) => {
          const step = 1 / blocks.length;
          // Only the currently-active project's content may show. Without
          // this, a project that already finished its own sub-range stays
          // "is-appear" forever (its local progress is clamped at 1, so
          // `local > 0.4` never goes false again) -- its title text then
          // sits at the same fixed spot as the next project's, and the two
          // render on top of each other.
          const activeIndex = Math.min(Math.floor(self.progress / step), blocks.length - 1);
          blocks.forEach((block, i) => {
            const local = Math.min(Math.max((self.progress - i * step) / step, 0), 1);
            const eased = revealEase(local);
            gsap.set(block, { "--reveal": Math.min(eased * 240, 240) + "%" });
            block.classList.toggle("is-appear", i === activeIndex && local > 0.4);
          });
        },
      });
    }
  }
});
