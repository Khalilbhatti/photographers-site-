// Shared project data for project.html — one entry per work card in
// works.html (slugs match each card's data-id). Sourced from the resume:
// titles, companies and categories are real; descriptions expand the
// resume's one-line bullets into fuller case-study copy.
const PROJECTS = {
  // ---- HexaTech Solution — Dashboards & Admin Panels ----
  noloco: {
    title: "Noloco Dashboard",
    company: "HexaTech Solution",
    category: "dashboards",
    year: "2025",
    description:
      "An admin dashboard UI built around Noloco's no-code data layer — designed for fast scanning of records and status at a glance, with a component system that stays consistent as new data views get added.",
  },
  mca: {
    title: "MCA Dashboard",
    company: "HexaTech Solution",
    category: "dashboards",
    year: "2025",
    description:
      "A management/compliance-style dashboard focused on clear data hierarchy: the pages that matter most surface first, with drill-down views kept out of the way until they're needed.",
  },
  "hello-uptown-admin": {
    title: "Hello Uptown Admin Dashboard",
    company: "HexaTech Solution",
    category: "dashboards",
    year: "2025",
    description:
      "The internal admin panel behind the Hello Uptown product — built for the operations team running the platform day to day, prioritising speed of common tasks over visual flourish.",
  },
  "hello-uptown-business": {
    title: "Hello Uptown Business Dashboard",
    company: "HexaTech Solution",
    category: "dashboards",
    year: "2025",
    description:
      "A separate business-facing dashboard for Hello Uptown's partners/clients, sharing the product's visual language with the admin panel while scoping what each audience actually needs to see.",
  },
  "finance-management": {
    title: "Finance Management Dashboard",
    company: "HexaTech Solution",
    category: "dashboards",
    year: "2025",
    description:
      "A finance-tracking dashboard emphasising clear numeric hierarchy — totals, trends, and line items each get their own visual weight so the page reads correctly at a glance, not just on close inspection.",
  },
  "crypto-management": {
    title: "Crypto Management Dashboard",
    company: "HexaTech Solution",
    category: "dashboards",
    year: "2025",
    description:
      "A portfolio/asset-tracking dashboard for crypto holdings, designed around real-time-feeling data density without tipping into visual noise.",
  },
  "company-organogram": {
    title: "Company Organogram",
    company: "HexaTech Solution — Figma AI-Based Project",
    category: "dashboards",
    year: "2025",
    description:
      "An AI-assisted Figma project generating a clean, navigable organizational chart — structuring reporting lines and team hierarchy as an interactive rather than static document.",
  },
  "ab-price-guard": {
    title: "AB Price Guard Pro",
    company: "HexaTech Solution — Figma AI-Based Project",
    category: "dashboards",
    year: "2025",
    description:
      "An AI-assisted Figma project for a pricing/monitoring tool, focused on surfacing price changes and alerts in a scannable, dashboard-style layout.",
  },

  // ---- HexaTech Solution — Web & Website Projects ----
  "premium-motors-web": {
    title: "Premium Motors Website",
    company: "HexaTech Solution",
    category: "websites",
    year: "2025",
    description:
      "A dealership website UI balancing inventory browsing with brand presentation — built to make a large vehicle catalogue feel curated rather than overwhelming.",
  },
  "hello-uptown-web": {
    title: "Hello Uptown Website",
    company: "HexaTech Solution",
    category: "websites",
    year: "2025",
    description:
      "The public-facing marketing site for Hello Uptown, sharing design language with its admin and business dashboards so the whole product feels like one system rather than three separate builds.",
  },
  petcare: {
    title: "PetCare Website",
    company: "HexaTech Solution",
    category: "websites",
    year: "2025",
    description:
      "A pet-services website UI designed to feel warm and approachable while still handling the practical job of booking and service information clearly.",
  },
  marketdeals: {
    title: "Marketdeals.pk",
    company: "Flying Cement Co. LTD",
    category: "websites",
    year: "2021–2023",
    description:
      "Designed, built, and managed end to end — UI design, website build, and SEO — for Marketdeals.pk, alongside UI work on its companion Android app.",
  },
  zarea: {
    title: "Zarea.pk",
    company: "Vision 2A",
    category: "websites",
    year: "2020–2021",
    description:
      "Front-end design and UI for Zarea.pk, alongside backend contribution — an early full-stack-adjacent role that kept design decisions grounded in what was actually feasible to ship.",
  },

  // ---- HexaTech Solution — Mobile Applications ----
  "premium-motors-app": {
    title: "Premium Motors Mobile App",
    company: "HexaTech Solution",
    category: "mobile",
    year: "2025",
    description:
      "The mobile counterpart to the Premium Motors website — vehicle browsing and inquiry flows adapted for a smaller screen without losing the catalogue's sense of scale.",
  },
  "hello-uptown-app": {
    title: "Hello Uptown Mobile App",
    company: "HexaTech Solution",
    category: "mobile",
    year: "2025",
    description:
      "The consumer-facing mobile app in the Hello Uptown product family, extending the same design system used across its web dashboards into a native mobile context.",
  },
  "music-ilu": {
    title: "Music-Ilu Mobile App",
    company: "HexaTech Solution",
    category: "mobile",
    year: "2025",
    description:
      "A music app UI where the core design problem was browsing/discovery — keeping large catalogues navigable through clear hierarchy rather than relying on decoration.",
  },
  parko: {
    title: "Parko Mobile App",
    company: "HexaTech Solution",
    category: "mobile",
    year: "2025",
    description:
      "A parking-focused app UI built around quick in-the-moment decisions — find, book, pay — so the interface stays out of the way of a task usually done one-handed, in a hurry.",
  },
  financia: {
    title: "Financia Mobile App",
    company: "HexaTech Solution",
    category: "mobile",
    year: "2025",
    description:
      "A personal-finance app UI applying the same clear-numeric-hierarchy approach as the Finance Management Dashboard, adapted for mobile-first, glanceable use.",
  },
  "patient-care": {
    title: "Patient Care",
    company: "Flying Cement Co. LTD",
    category: "mobile",
    year: "2021–2023",
    description:
      "UI design for an Android healthcare application — designed for a user base that skews less tech-comfortable, prioritising clarity and large, unambiguous touch targets over density.",
  },
};

// Every project's hero + gallery cycles through the photographer's real
// portfolio photos (see images/), offset per project (stride 5 = 1 hero
// + 4 gallery slots) so consecutive projects don't show an identical set.
const REAL_PHOTOS = [
  "images/3g0a9005.webp",
  "images/AVE20231220_18444255_0090.webp",
  "images/ELECTRICK-1.webp",
  "images/LARELEVE-1.webp",
  "images/LARELEVE-5.webp",
  "images/come-up-img1.webp",
  "images/come-up-img2.webp",
  "images/denzelcurry14822.webp",
  "images/peugeot_153.webp",
  "images/portraits-11_benoitmagimel.webp",
  "images/portraits-5_danibumba.webp",
  "images/summer-cover-selected.webp",
];
const PROJECT_SLUGS = Object.keys(PROJECTS);

PROJECT_SLUGS.forEach((slug, i) => {
  const gallery = [];
  for (let g = 0; g < 4; g++) {
    gallery.push(REAL_PHOTOS[(i * 5 + g) % REAL_PHOTOS.length]);
  }
  PROJECTS[slug].hero = REAL_PHOTOS[(i * 5 + 4) % REAL_PHOTOS.length];
  PROJECTS[slug].gallery = gallery;
});
