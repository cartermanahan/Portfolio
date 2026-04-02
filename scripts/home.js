(function () {
  'use strict';

  /* -------------------------------------------------- */
  /*  Three.js Particle Background                       */
  /* -------------------------------------------------- */
  function initParticles() {
    if (typeof THREE === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const hero = document.querySelector('.hero-section');
    if (!hero) return;

    const canvas = document.createElement('canvas');
    canvas.id = 'hero-canvas';
    hero.prepend(canvas);

    const getSize = () => ({ w: hero.offsetWidth, h: hero.offsetHeight });
    let { w, h } = getSize();

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(w, h);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, w / h, 0.1, 100);
    camera.position.z = 6;

    const COUNT = window.innerWidth < 768 ? 320 : 720;
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);

    const palette = [
      [0.388, 0.400, 0.945],
      [0.647, 0.706, 0.988],
      [0.753, 0.518, 0.988],
      [0.980, 0.980, 1.000],
      [0.388, 0.400, 0.945],
      [0.388, 0.400, 0.945],
    ];

    for (let i = 0; i < COUNT; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 18;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 13;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;

      const c = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3]     = c[0];
      col[i * 3 + 1] = c[1];
      col[i * 3 + 2] = c[2];
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));

    const sprite = new THREE.TextureLoader().load(
      'https://cdn.jsdelivr.net/gh/mrdoob/three.js/examples/textures/sprites/disc.png'
    );

    const mat = new THREE.PointsMaterial({
      size: 0.055,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true,
      map: sprite,
      alphaTest: 0.5,
    });

    const points = new THREE.Points(geo, mat);
    scene.add(points);

    let mx = 0, my = 0, tx = 0, ty = 0;

    window.addEventListener('mousemove', (e) => {
      mx = (e.clientX / window.innerWidth  - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    window.addEventListener('resize', () => {
      const s = getSize();
      camera.aspect = s.w / s.h;
      camera.updateProjectionMatrix();
      renderer.setSize(s.w, s.h);
    });

    (function tick() {
      requestAnimationFrame(tick);
      tx += (mx - tx) * 0.032;
      ty += (my - ty) * 0.032;
      points.rotation.y  =  tx * 0.2;
      points.rotation.x  =  ty * 0.13;
      points.rotation.z += 0.0004;
      renderer.render(scene, camera);
    })();
  }

  /* -------------------------------------------------- */
  /*  Typewriter Effect                                  */
  /* -------------------------------------------------- */
  function initTypewriter() {
    const el = document.getElementById('typewriter');
    if (!el) return;

    const words = ['iOS Developer', 'Product Designer', 'Founder'];
    let wordIndex = 0;
    let charIndex = 0;
    let deleting = false;

    function tick() {
      const current = words[wordIndex];

      if (deleting) {
        charIndex--;
        el.textContent = current.substring(0, charIndex);
      } else {
        charIndex++;
        el.textContent = current.substring(0, charIndex);
      }

      let delay = deleting ? 55 : 95;

      if (!deleting && charIndex === current.length) {
        delay = 2200;
        deleting = true;
      } else if (deleting && charIndex === 0) {
        deleting = false;
        wordIndex = (wordIndex + 1) % words.length;
        delay = 350;
      }

      setTimeout(tick, delay);
    }

    setTimeout(tick, 700);
  }

  /* -------------------------------------------------- */
  /*  Init                                               */
  /* -------------------------------------------------- */
  function init() {
    initParticles();
    initTypewriter();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
