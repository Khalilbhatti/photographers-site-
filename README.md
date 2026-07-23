# M Khalil Ur Rehman — Photography Portfolio

A static portfolio site for portrait photographer M Khalil Ur Rehman, built with plain HTML/CSS/JS — no build tooling, no framework, no bundler.

## Pages

- **Home** (`index.html`) — staggered editorial image grid with scroll-scrubbed parallax, plus a pinned "Selected Projects" section revealed through a growing SVG-mask shape.
- **Works** (`works.html`) — horizontal scroll-jacked project index with category filtering.
- **Project detail** (`project.html?slug=...`) — data-driven template (see `js/project-data.js`) covering every project from a single page, with per-image parallax and a curtain-style reveal.
- **Gallery** (`gallery.html`) — a draggable WebGL "playground" of images, gated behind a draw-to-trace interaction: fully trace the dashed diamond mark with your cursor to unlock it.
- **About** (`about.html`) — full-bleed hero portrait with a cursor-driven depth-map parallax effect (a flat photo + a generated depth map, offset per-pixel in a WebGL shader based on pointer position).

## Stack

- Vanilla HTML/CSS/JS, served as static files (e.g. `python -m http.server`)
- [GSAP](https://gsap.com/) + ScrollTrigger for scroll-driven animation
- [Three.js](https://threejs.org/) for the About page's depth-parallax hero and the Gallery playground
- A small custom canvas-based ambient particle background (`js/flow-field-background.js`), reacting to the cursor

## Running locally

No install step required — just serve the directory:

```
python -m http.server 8000
```

Then open `http://localhost:8000`.
