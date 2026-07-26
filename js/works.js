document.addEventListener("DOMContentLoaded", () => {
  const allCards = Array.from(document.querySelectorAll(".work-card"));

  // Each card links to its own project detail page, driven by its data-id
  // rather than 17 hardcoded hrefs in the markup. Assigned before any of
  // the guards below, because navigation has to survive GSAP failing to
  // load — otherwise every card silently stays href="#".
  allCards.forEach((card) => {
    card.href = `project.html?slug=${card.dataset.id}`;
  });

  const track = document.getElementById("worksTrack");
  const wrap = document.querySelector(".works-scroll-wrap");
  if (!track || !wrap || typeof gsap === "undefined") return;

  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  gsap.registerPlugin(ScrollTrigger);

  function getScrollDistance() {
    return Math.max(track.scrollWidth - window.innerWidth + 200, 0);
  }

  const layout = document.querySelector(".works-layout");

  // Card geometry is measured once per layout (and again on every
  // ScrollTrigger refresh) instead of per scroll tick. Reading each card's
  // box while also writing transforms to it forced a synchronous reflow on
  // every scrubbed frame of the pinned horizontal scroll — 17 cards, ~60
  // times a second. offsetLeft/offsetWidth are relative to .works-layout
  // and unaffected by the track's transform, so a single measurement stays
  // valid for every value of trackX.
  let cardMetrics = [];
  function measureCards() {
    cardMetrics = allCards.map((card) => ({
      img: card.querySelector("img"),
      cat: card.dataset.cat,
      mid: card.offsetLeft + card.offsetWidth / 2,
    }));
  }

  // Each card's image drifts slightly slower/faster than its container as
  // the horizontal track moves, so the whole gallery reads as layered
  // rather than a single flat strip translating in lockstep.
  function applyCardParallax(trackX) {
    if (REDUCED_MOTION) return;
    const viewportCenter = window.innerWidth / 2;
    for (const m of cardMetrics) {
      if (!m.img) continue;
      const distFromCenter = (viewportCenter - (m.mid + trackX)) / window.innerWidth;
      gsap.set(m.img, { xPercent: distFromCenter * 14 });
    }
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
  const CATEGORY_ORDER = ["dashboards", "websites", "mobile"];
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
    const startsLocked = cat === CATEGORY_ORDER[0]; // dashboards is active by default
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

  function updateActiveCategoryFromScroll(trackX) {
    const viewportMidInTrack = -trackX + window.innerWidth / 2;

    let closestCat = null;
    let closestDist = Infinity;
    for (const m of cardMetrics) {
      const dist = Math.abs(m.mid - viewportMidInTrack);
      if (dist < closestDist) {
        closestDist = dist;
        closestCat = m.cat;
      }
    }
    if (closestCat) setActiveCategory(closestCat);
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
        const trackX = -self.progress * getScrollDistance();
        gsap.set(track, { x: trackX });
        applyCardParallax(trackX);
        updateActiveCategoryFromScroll(trackX);
      },
    });
  }

  measureCards();
  setActiveCategory("dashboards");
  buildScrollTrigger();

  // Re-measure whenever ScrollTrigger recalculates layout (resize, late
  // image loads), so the cached card geometry can't drift out of date.
  ScrollTrigger.addEventListener("refresh", measureCards);

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

  // Index list activation -> scroll track to matching card. These are
  // <button>s, so this fires for Enter/Space as well as clicks.
  const indexButtons = document.querySelectorAll(".works-list-col button");
  indexButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      indexButtons.forEach((el) => el.classList.remove("active"));
      btn.classList.add("active");
      const card = document.querySelector(`.work-card[data-id="${btn.dataset.target}"]`);
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
