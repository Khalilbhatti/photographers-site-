document.addEventListener("DOMContentLoaded", () => {
  if (typeof gsap === "undefined") return;
  gsap.registerPlugin(ScrollTrigger);

  ScrollTrigger.create({
    trigger: ".bio-text",
    start: "top 75%",
    onEnter: () => document.querySelector("[data-reveal]").classList.add("revealed"),
  });

  gsap.utils.toArray(".about-section, .about-links, .about-founder").forEach((el) => {
    gsap.fromTo(
      el,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 90%" },
      }
    );
  });
});
