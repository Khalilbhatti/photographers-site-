document.addEventListener("DOMContentLoaded", () => {
  if (typeof PROJECTS === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  const project = PROJECTS[slug] || PROJECTS[Object.keys(PROJECTS)[0]];

  const CATEGORY_LABELS = {
    dashboards: "Dashboard",
    websites: "Website",
    mobile: "Mobile App",
  };

  document.getElementById("projCategory").textContent =
    CATEGORY_LABELS[project.category] || project.category;
  document.getElementById("projYear").textContent = project.year;
  document.getElementById("projTitle").textContent = project.title;
  document.getElementById("projCompany").textContent = project.company;
  document.getElementById("projDescription").textContent = project.description;
  document.title = `${project.title} — M Khalil Ur Rehman`;

  const hero = document.querySelector(".project-hero");
  if (typeof gsap === "undefined") {
    hero.classList.add("is-revealed");
    return;
  }
  gsap.set(hero, { opacity: 0, y: 24 });
  gsap.to(hero, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", delay: 0.1 });
});
