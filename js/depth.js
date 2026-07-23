// About page: 2.5D depth-map parallax on the hero portrait.
// A flat image + a grayscale "depth map" (white = near, black = far) are
// passed into a shader. Pointer position offsets the UV lookup by an
// amount proportional to the depth value at that pixel, producing a
// fake sense of three-dimensionality from two flat images.
document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector(".about-hero");
  const canvas = document.getElementById("depthCanvas");
  const fallback = document.querySelector(".about-hero-fallback");
  if (!container || !canvas || typeof THREE === "undefined") return;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 1;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const VERTEX_SHADER = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `;

  const FRAGMENT_SHADER = `
    uniform sampler2D uImageTexture;
    uniform sampler2D uDepthTexture;
    uniform vec2 uMouse;
    uniform float uIntensity;
    uniform vec2 uUvScale;
    uniform vec2 uUvOffset;
    varying vec2 vUv;

    void main() {
      // "cover" crop, anchored to the top (matches CSS object-position:
      // top center on the fallback <img>): uUvScale/uUvOffset pick out
      // the sub-region of the texture that fills the container edge to
      // edge, cropping whatever doesn't fit rather than letterboxing.
      vec2 uv = vUv * uUvScale + uUvOffset;
      float depth = texture2D(uDepthTexture, uv).r;
      vec2 offset = uMouse * (depth - 0.5) * uIntensity;
      vec4 image = texture2D(uImageTexture, uv + offset);
      gl_FragColor = image;
    }
  `;

  const loader = new THREE.TextureLoader();
  const imageTex = loader.load("images/about-hero-photo.png", onLoaded);
  const depthTex = loader.load("images/about-hero-depth.png");
  imageTex.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    uniforms: {
      uImageTexture: { value: imageTex },
      uDepthTexture: { value: depthTex },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uIntensity: { value: 0.06 },
      uUvScale: { value: new THREE.Vector2(1, 1) },
      uUvOffset: { value: new THREE.Vector2(0, 0) },
    },
  });

  const geometry = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const IMAGE_ASPECT = 1545 / 1999;

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);

    // "object-fit: cover" UV crop, anchored to the top (matches the CSS
    // fallback's object-position: top center) instead of centered, so
    // cropping trims from the bottom rather than splitting top and
    // bottom evenly.
    const containerAspect = w / h;
    const scale = new THREE.Vector2(1, 1);
    const offset = new THREE.Vector2(0, 0);
    if (containerAspect > IMAGE_ASPECT) {
      scale.y = IMAGE_ASPECT / containerAspect;
      offset.y = 1 - scale.y;
    } else {
      scale.x = containerAspect / IMAGE_ASPECT;
      offset.x = (1 - scale.x) / 2;
    }
    material.uniforms.uUvScale.value.copy(scale);
    material.uniforms.uUvOffset.value.copy(offset);
  }

  function onLoaded() {
    resize();
    canvas.classList.add("is-ready");
    if (fallback) fallback.style.opacity = "0";
  }

  window.addEventListener("resize", resize);

  // Pointer-driven target, smoothed toward each frame, with a gentle
  // idle drift when the pointer hasn't moved (keeps the effect alive).
  const targetMouse = new THREE.Vector2(0, 0);
  let idleTime = 0;

  container.addEventListener("pointermove", (e) => {
    const rect = container.getBoundingClientRect();
    targetMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    targetMouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    idleTime = 0;
  });

  container.addEventListener("pointerleave", () => {
    targetMouse.set(0, 0);
  });

  function animate() {
    requestAnimationFrame(animate);
    idleTime += 0.006;

    const idleX = Math.sin(idleTime) * 0.08;
    const idleY = Math.cos(idleTime * 0.8) * 0.05;
    const goalX = targetMouse.x !== 0 ? targetMouse.x : idleX;
    const goalY = targetMouse.y !== 0 ? targetMouse.y : idleY;

    const current = material.uniforms.uMouse.value;
    current.x += (goalX - current.x) * 0.06;
    current.y += (goalY - current.y) * 0.06;

    renderer.render(scene, camera);
  }
  animate();
});
