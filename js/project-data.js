// Shared project data for project.html — one entry per work card in
// works.html (slugs match each card's data-id). Descriptions are original
// placeholder copy, not sourced from any real project.
const PROJECTS = {
  "road-trip": {
    title: "Road Trip",
    category: "editorial",
    year: "2023",
    description:
      "A loose, unscripted series shot across a week on the road — motion, light, and the in-between moments that don't usually make the cut.",
  },
  visionnaire: {
    title: "Visionnaire",
    category: "editorial",
    year: "2024",
    description:
      "A study in texture and restraint: minimal sets, natural light, and wardrobe pared back until only the silhouette remains.",
  },
  santacruz: {
    title: "Santacruz",
    category: "editorial",
    year: "2023",
    description:
      "Shot over two days on location, leaning into harsh midday light rather than fighting it — contrast as the whole point.",
  },
  "summer-market": {
    title: "Summer Market",
    category: "editorial",
    year: "2023",
    description:
      "A candid documentary-style set built around a single location, favouring found moments over posed ones.",
  },
  "color-mvdior": {
    title: "Color Mvdior",
    category: "editorial",
    year: "2024",
    description:
      "Saturated gels and a single hard key light — an exercise in pushing colour as far as it can go without losing the subject.",
  },
  cloud: {
    title: "Cloud",
    category: "portrait",
    year: "2024",
    description:
      "A quiet studio portrait series, stripped of everything but the subject and a single soft source.",
  },
  "dj-dre-tala": {
    title: "DJ Dre Tala",
    category: "portrait",
    year: "2023",
    description:
      "Backstage and on-stage portraits shot across a single night, chasing available light rather than adding to it.",
  },
  hoshi: {
    title: "Hoshi",
    category: "portrait",
    year: "2024",
    description:
      "A close, intimate set built entirely around expression — minimal retouching, maximal presence.",
  },
  "le-motif": {
    title: "Le Motif",
    category: "portrait",
    year: "2023",
    description:
      "Portraits built around repetition and pattern in the wardrobe, echoed in the framing of each shot.",
  },
  "13block": {
    title: "13 Block",
    category: "portrait",
    year: "2024",
    description:
      "A gritty, high-contrast series shot on location — raw locations standing in for a studio backdrop.",
  },
  "earvinho-kawazaki": {
    title: "Earvinho Kawazaki",
    category: "portrait",
    year: "2023",
    description:
      "A collaborative portrait sitting, built around long exposures and slow, deliberate direction.",
  },
  malo: {
    title: "Malo",
    category: "portrait",
    year: "2024",
    description:
      "Natural light portraits shot at golden hour, letting the falloff do most of the work.",
  },
  oppo: {
    title: "Oppo",
    category: "commercial",
    year: "2024",
    description:
      "A product-led campaign balancing clean studio work with lifestyle shots on location.",
  },
  adidas: {
    title: "Adidas",
    category: "commercial",
    year: "2023",
    description:
      "Athletic movement captured at high shutter speed, paired with static hero shots for the campaign key art.",
  },
  asics: {
    title: "Asics",
    category: "commercial",
    year: "2023",
    description:
      "A performance-driven set shot in-studio, prioritising clarity and precision over mood.",
  },
  braave: {
    title: "Braave",
    category: "commercial",
    year: "2024",
    description:
      "A brand campaign shot across three locations in a single day, unified by a consistent, muted palette.",
  },
  mobilize: {
    title: "Mobilize",
    category: "commercial",
    year: "2024",
    description:
      "Automotive and lifestyle imagery shot side by side, built to work as both editorial and ad key art.",
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
