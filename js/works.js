document.addEventListener("DOMContentLoaded", () => {
  const track = document.getElementById("worksTrack");
  const wrap = document.querySelector(".works-scroll-wrap");
  if (!track || !wrap || typeof gsap === "undefined") return;

  gsap.registerPlugin(ScrollTrigger);

  function getScrollDistance() {
    return Math.max(track.scrollWidth - window.innerWidth + 200, 0);
  }

  const layout = document.querySelector(".works-layout");
  const allCards = Array.from(document.querySelectorAll(".work-card"));

  // Each card links to its own project detail page, driven by its data-id
  // rather than 17 hardcoded hrefs in the markup.
  allCards.forEach((card) => {
    card.href = `project.html?slug=${card.dataset.id}`;
  });

  // Each card's image drifts slightly slower/faster than its container as
  // the horizontal track moves, so the whole gallery reads as layered
  // rather than a single flat strip translating in lockstep.
  const viewportCenter = () => window.innerWidth / 2;

  function applyCardParallax() {
    allCards.forEach((card) => {
      const img = card.querySelector("img");
      if (!img) return;
      const rect = card.getBoundingClientRect();
      const cardCenter = rect.left + rect.width / 2;
      const distFromCenter = (viewportCenter() - cardCenter) / window.innerWidth;
      gsap.set(img, { xPercent: distFromCenter * 14 });
    });
  }

  // Category tab state: highlights whichever category is currently centered
  // in the viewport as the track scrolls (not just on click), matching the
  // reference site's behavior of the active tab tracking scroll position.
  // Declared before buildScrollTrigger() runs: ScrollTrigger.create() below
  // fires onUpdate once immediately to establish initial pinned state, and
  // that would hit these `let`/`const` bindings while still in the
  // temporal dead zone if they were declared any later in this scope.
  const tabs = document.querySelectorAll(".cat-tab");
  const cards = document.querySelectorAll(".work-card");
  let currentCat = null;

  // Each tab has two states: "locked" in its permanent left-anchored flex
  // slot, or "queued" — waiting, staggered near the right edge, still
  // fully visible rather than pushed off-screen. A tab is locked whenever
  // its category is at or before the current one in scroll order, and
  // returns to its queued spot the moment you scroll back past it — this
  // tracks scroll position live in both directions, not a one-way reveal.
  const CATEGORY_ORDER = ["editorial", "portrait", "commercial"];
  const RIGHT_MARGIN = window.innerWidth * 0.019; // matches the 1.9vw page gutter
  const SLOT_SPACING = 70; // px between staggered queue positions

  const tabShown = new Map(); // cat -> boolean, so we only tween on change
  const naturalLeft = new Map(); // each tab's un-transformed screen x

  tabs.forEach((tab) => {
    naturalLeft.set(tab.dataset.cat, tab.getBoundingClientRect().left);
  });

  function queuedOffset(cat) {
    const index = CATEGORY_ORDER.indexOf(cat);
    const fromRight = CATEGORY_ORDER.length - 1 - index;
    const desiredScreenX = window.innerWidth - RIGHT_MARGIN - fromRight * SLOT_SPACING;
    return desiredScreenX - naturalLeft.get(cat);
  }

  tabs.forEach((tab) => {
    const cat = tab.dataset.cat;
    const startsLocked = cat === CATEGORY_ORDER[0]; // editorial is active by default
    gsap.set(tab, { x: startsLocked ? 0 : queuedOffset(cat) });
    tabShown.set(cat, startsLocked);
  });

  function updateTabPositions(activeCat) {
    const activeIndex = CATEGORY_ORDER.indexOf(activeCat);
    tabs.forEach((tab) => {
      const cat = tab.dataset.cat;
      const shouldShow = CATEGORY_ORDER.indexOf(cat) <= activeIndex;
      if (shouldShow === tabShown.get(cat)) return;
      tabShown.set(cat, shouldShow);
      gsap.to(tab, {
        x: shouldShow ? 0 : queuedOffset(cat),
        duration: 0.7,
        ease: "power3.out",
      });
    });
  }

  function setActiveCategory(cat) {
    updateTabPositions(cat);
    if (cat === currentCat) return;
    currentCat = cat;
    tabs.forEach((t) => t.classList.toggle("active", t.dataset.cat === cat));
    cards.forEach((c) => {
      c.style.opacity = c.dataset.cat === cat ? "1" : "0.35";
    });
  }

  function updateActiveCategoryFromScroll() {
    const trackX = -gsap.getProperty(track, "x");
    const viewportMidInTrack = trackX + window.innerWidth / 2;

    let closest = null;
    let closestDist = Infinity;
    allCards.forEach((card) => {
      const cardMid = card.offsetLeft + card.offsetWidth / 2;
      const dist = Math.abs(cardMid - viewportMidInTrack);
      if (dist < closestDist) {
        closestDist = dist;
        closest = card;
      }
    });
    if (closest) setActiveCategory(closest.dataset.cat);
  }

  let st;
  function buildScrollTrigger() {
    if (st) st.kill();
    gsap.set(track, { x: 0 });
    st = ScrollTrigger.create({
      trigger: layout,
      start: "top top",
      end: () => "+=" + getScrollDistance(),
      pin: true,
      scrub: 0.6,
      onUpdate: (self) => {
        gsap.set(track, { x: -self.progress * getScrollDistance() });
        applyCardParallax();
        updateActiveCategoryFromScroll();
      },
    });
  }

  setActiveCategory("editorial");
  buildScrollTrigger();

  window.addEventListener("resize", () => {
    ScrollTrigger.refresh();
  });

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const cat = tab.dataset.cat;
      setActiveCategory(cat);
      const firstMatch = document.querySelector(`.work-card[data-cat="${cat}"]`);
      if (firstMatch) scrollToCard(firstMatch);
    });
  });

  // Cursor-follow "OPEN THE PROJECT" prompt: shown while hovering a card,
  // tracks the pointer, hidden otherwise.
  const hoverPrompt = document.getElementById("cardHoverPrompt");
  if (hoverPrompt) {
    allCards.forEach((card) => {
      card.addEventListener("mouseenter", () => {
        hoverPrompt.classList.add("is-visible");
      });
      card.addEventListener("mouseleave", () => {
        hoverPrompt.classList.remove("is-visible");
      });
      card.addEventListener("mousemove", (e) => {
        hoverPrompt.style.left = `${e.clientX}px`;
        hoverPrompt.style.top = `${e.clientY}px`;
      });
    });
  }

  // Sidebar list click -> scroll track to matching card
  document.querySelectorAll(".works-list-col li").forEach((li) => {
    li.addEventListener("click", () => {
      document
        .querySelectorAll(".works-list-col li")
        .forEach((el) => el.classList.remove("active"));
      li.classList.add("active");
      const card = document.querySelector(`.work-card[data-id="${li.dataset.target}"]`);
      if (card) scrollToCard(card);
    });
  });

  function scrollToCard(card) {
    const dist = getScrollDistance();
    if (dist <= 0 || !st) return;
    const cardCenter = card.offsetLeft - window.innerWidth / 2 + card.offsetWidth / 2;
    const progress = Math.min(Math.max(cardCenter / dist, 0), 1);
    const targetY = st.start + progress * (st.end - st.start);
    window.scrollTo({ top: targetY, behavior: "smooth" });
  }
});
