const section = document.querySelector('#montagem');
const view = section.querySelector('.assembly-view');
const playButton = section.querySelector('#assembly-play');
const slider = section.querySelector('#assembly-progress');
const restartButton = section.querySelector('#assembly-restart');
const stageLabel = section.querySelector('#assembly-stage-label');
const timeLabel = section.querySelector('#assembly-time');
const resetViewButton = section.querySelector('#assembly-reset-view');
const zoomIn = section.querySelector('#assembly-zoom-in');
const zoomOut = section.querySelector('#assembly-zoom-out');
const controlsUI = [playButton, slider, restartButton, resetViewButton, zoomIn, zoomOut];
const duration = 16;
let initialized = false;
let stopPlayback = () => {};

function showFallback() {
  stopPlayback();
  view.classList.add('assembly-unavailable');
  view.setAttribute('aria-busy', 'false');
  view.querySelector('.assembly-loading').hidden = true;
  view.querySelector('.assembly-fallback').hidden = false;
  controlsUI.forEach(control => { control.disabled = true; });
  stageLabel.textContent = 'Visualização 3D indisponível';
}

async function initialize() {
  if (initialized) return;
  initialized = true;
  try {
    const [THREE, { OrbitControls }] = await Promise.all([
      import('three'), import('./assets/three/OrbitControls.js')
    ]);
    const canvas = section.querySelector('#assembly-canvas');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edece8');
    const camera = new THREE.OrthographicCamera(-15, 15, 12, -12, .1, 130);
    const target = new THREE.Vector3(0, 1.5, 0);
    const initialPosition = new THREE.Vector3(14, 22, 22);
    camera.position.copy(initialPosition);
    camera.lookAt(target);
    const orbit = new OrbitControls(camera, canvas);
    orbit.target.copy(target);
    orbit.enablePan = false;
    orbit.enableZoom = false;
    orbit.enableDamping = false;
    orbit.minPolarAngle = .28;
    orbit.maxPolarAngle = Math.PI * .44;
    orbit.rotateSpeed = .6;
    orbit.update();

    scene.add(new THREE.HemisphereLight('#fff7ed', '#929188', 2.5));
    const sun = new THREE.DirectionalLight('#fff3dc', 3.7);
    sun.position.set(-12, 25, 15);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: .5, far: 75 });
    sun.shadow.normalBias = .035;
    sun.shadow.bias = -.00015;
    scene.add(sun);
    const fill = new THREE.DirectionalLight('#e2edff', .9);
    fill.position.set(12, 10, -10);
    scene.add(fill);

    const materials = {
      plaster: new THREE.MeshStandardMaterial({ color: '#e1dfd7', roughness: .85 }),
      roof: new THREE.MeshStandardMaterial({ color: '#d9d9d3', roughness: .65, metalness: .15 }),
      ridge: new THREE.MeshStandardMaterial({ color: '#e9e9e3', roughness: .64, metalness: .15 }),
      trim: new THREE.MeshStandardMaterial({ color: '#505652', roughness: .63, metalness: .18 }),
      base: new THREE.MeshStandardMaterial({ color: '#c6bfb3', roughness: .93 }),
      path: new THREE.MeshStandardMaterial({ color: '#c9c6bc', roughness: .95 }),
      ground: new THREE.MeshStandardMaterial({ color: '#edece8', roughness: 1 }),
      window: new THREE.MeshStandardMaterial({ color: '#28332f', roughness: .3, metalness: .2 }),
      aluminum: new THREE.MeshStandardMaterial({ color: '#a0a6a2', metalness: .75, roughness: .4 }),
      cable: new THREE.MeshStandardMaterial({ color: '#272b2c', roughness: .65 })
    };
    const unitBox = new THREE.BoxGeometry(1, 1, 1);
    function box(w, h, d, x, y, z, material, parent = scene) {
      const object = new THREE.Mesh(unitBox, material);
      object.scale.set(w, h, d);
      object.position.set(x, y, z);
      object.castShadow = true;
      object.receiveShadow = true;
      parent.add(object);
      return object;
    }
    box(200, .15, 200, 0, -.5, 0, materials.ground);
    box(18.6, .42, 12.8, 0, -.2, 0, materials.base);
    box(17, .09, 11.4, 0, .055, 0, materials.path);
    box(15.8, 2.8, 9.8, 0, 1.5, 0, materials.plaster);
    box(15.6, .17, 9.6, 0, 2.99, 0, materials.roof);

    function corrugatedRoof(width, depth, x, y, z) {
      const count = Math.ceil(width / .17);
      const ridges = new THREE.InstancedMesh(unitBox, materials.ridge, count);
      const matrix = new THREE.Matrix4();
      const scale = new THREE.Vector3(.045, .035, depth);
      const quaternion = new THREE.Quaternion();
      for (let i = 0; i < count; i++) {
        matrix.compose(new THREE.Vector3(x - width / 2 + (i + .5) * width / count, y, z), quaternion, scale);
        ridges.setMatrixAt(i, matrix);
      }
      ridges.receiveShadow = true;
      scene.add(ridges);
    }
    corrugatedRoof(15.55, 9.55, 0, 3.095, 0);

    function parapet(w, d, x, y, z, height) {
      [[w + .2, .2, x, z - d / 2], [w + .2, .2, x, z + d / 2], [.2, d, x - w / 2, z], [.2, d, x + w / 2, z]].forEach(([a, b, px, pz]) => {
        box(a, height, b, px, y, pz, materials.plaster);
        box(a + .06, .08, b + .06, px, y + height / 2 + .025, pz, materials.trim);
      });
    }
    parapet(15.8, 9.8, 0, 3.13, 0, .45);
    box(4.65, 1.13, 5.05, 3.7, 3.58, -1.2, materials.plaster);
    box(4.45, .1, 4.85, 3.7, 4.17, -1.2, materials.roof);
    corrugatedRoof(4.4, 4.8, 3.7, 4.24, -1.2);
    parapet(4.65, 5.05, 3.7, 4.34, -1.2, .36);
    // Simplified openings visible on the photographed facade.
    box(.85, 1.85, .035, -2.8, 1.22, 4.915, materials.window);
    box(1.18, 1.95, .035, 3.55, 1.19, 4.915, materials.window);
    box(.65, .95, .035, 5.55, 1.9, 4.915, materials.window);
    box(.06, 1.95, .06, 3.55, 1.19, 4.95, materials.trim);
    box(1.5, .13, .65, 3.55, .15, 5.2, materials.path);
    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(.1, .13, .55, 16), materials.trim);
    chimney.position.set(7.05, 3.42, -2.45); chimney.castShadow = true; scene.add(chimney);

    function solarTexture() {
      const textureCanvas = document.createElement('canvas');
      textureCanvas.width = 256; textureCanvas.height = 512;
      const ctx = textureCanvas.getContext('2d');
      ctx.fillStyle = '#101e31'; ctx.fillRect(0, 0, 256, 512);
      const gap = 2;
      for (let row = 0; row < 12; row++) {
        for (let col = 0; col < 6; col++) {
          const cw = 256 / 6, ch = 512 / 12;
          const tone = (row * 7 + col * 3) % 5;
          ctx.fillStyle = ['#1c3350', '#203956', '#1d3452', '#213957', '#1c324e'][tone];
          ctx.fillRect(col * cw + gap, row * ch + gap, cw - gap * 2, ch - gap * 2);
          ctx.strokeStyle = '#63788d'; ctx.lineWidth = .7;
          for (let wire = 1; wire <= 3; wire++) {
            const wx = col * cw + cw * wire / 4;
            ctx.beginPath(); ctx.moveTo(wx, row * ch + gap); ctx.lineTo(wx, (row + 1) * ch - gap); ctx.stroke();
          }
          ctx.strokeStyle = '#405c77'; ctx.lineWidth = .45;
          for (let line = 1; line < 6; line++) {
            const ly = row * ch + ch * line / 6;
            ctx.beginPath(); ctx.moveTo(col * cw + gap, ly); ctx.lineTo((col + 1) * cw - gap, ly); ctx.stroke();
          }
        }
      }
      const texture = new THREE.CanvasTexture(textureCanvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
      return texture;
    }
    const pvTexture = solarTexture();
    const rails = [];
    const supports = [];
    const panels = [];
    const panelWidth = 1.0, panelDepth = 1.94;
    const panelXs = Array.from({ length: 7 }, (_, i) => -6.93 + i * 1.06);
    const panelZs = [.85, 2.87];
    panelZs.forEach(z => {
      [-.62, .62].forEach(offset => {
        const rail = box(7.45, .09, .085, -3.75, 3.19, z + offset, materials.aluminum.clone());
        rails.push(rail);
        [-6.7, -4.75, -2.8, -.85].forEach(x => {
          supports.push(box(.14, .13, .17, x, 3.145, z + offset, materials.trim.clone()));
        });
      });
    });
    panelZs.forEach((z, row) => panelXs.forEach((x, col) => {
      const panel = new THREE.Group();
      const frameMaterial = new THREE.MeshStandardMaterial({ color: '#aab2b5', metalness: .82, roughness: .32, transparent: true });
      const pvMaterial = new THREE.MeshStandardMaterial({ map: pvTexture, color: '#dce8fa', metalness: .22, roughness: .28, transparent: true });
      box(panelWidth, .065, panelDepth, 0, 0, 0, frameMaterial, panel);
      const surface = new THREE.Mesh(new THREE.PlaneGeometry(panelWidth - .037, panelDepth - .037), pvMaterial);
      surface.rotation.x = -Math.PI / 2; surface.position.y = .034;
      surface.receiveShadow = true; panel.add(surface);
      panel.position.set(x, 3.29, z);
      panel.userData = { x, y: 3.29, z, index: row * 7 + col, materials: [frameMaterial, pvMaterial] };
      scene.add(panel); panels.push(panel);
    }));

    let progress = 0;
    let playing = false;
    let requestId = null;
    let lastTime = null;
    let lastStage = -1;
    const clamp = value => Math.min(1, Math.max(0, value));
    const ease = value => 1 - Math.pow(1 - clamp(value), 3);
    const labels = ['Telhado sem painéis', 'Posicionando a estrutura', 'Montando os painéis', 'Instalação completa'];
    function render() { renderer.render(scene, camera); }

    function setProgress(value) {
      progress = clamp(value);
      let installedPanels = 0;
      supports.forEach((support, index) => {
        const u = clamp((progress - .08 - index * .003) / .10);
        support.visible = u > 0;
        support.position.y = 3.145 + (1 - ease(u)) * 1.8;
      });
      rails.forEach((rail, index) => {
        const u = clamp((progress - .14 - index * .025) / .12);
        rail.visible = u > 0;
        rail.position.y = 3.19 + (1 - ease(u)) * 2.5;
      });
      panels.forEach(panel => {
        const u = clamp((progress - .31 - panel.userData.index * .036) / .16);
        panel.visible = u > 0;
        panel.position.y = panel.userData.y + (1 - ease(u)) * 4;
        panel.rotation.x = (1 - ease(u)) * -.22;
        panel.userData.materials.forEach(material => { material.opacity = Math.min(1, u * 4); });
        if (u === 1) installedPanels++;
      });
      const stage = progress < .08 ? 0 : progress < .31 ? 1 : progress < .965 ? 2 : 3;
      if (stage !== lastStage) {
        stageLabel.textContent = labels[stage];
        section.querySelectorAll('.assembly-step').forEach((step, index) => {
          if (index === stage) step.setAttribute('aria-current', 'step');
          else step.removeAttribute('aria-current');
          step.classList.toggle('is-complete', index < stage);
        });
        lastStage = stage;
      }
      slider.value = String(Math.round(progress * 1000));
      slider.style.setProperty('--progress', `${progress * 100}%`);
      slider.setAttribute('aria-valuetext', `${Math.round(progress * 100)}% — ${labels[stage]}`);
      timeLabel.textContent = `00:${String(Math.floor(progress * duration)).padStart(2, '0')} / 00:16`;
      canvas.dataset.progress = progress.toFixed(4);
      canvas.dataset.installedPanels = String(installedPanels);
      canvas.dataset.visiblePanels = String(panels.filter(panel => panel.visible).length);
      canvas.setAttribute('aria-label', `Modelo 3D residencial: ${labels[stage]}. ${installedPanels} de 14 painéis posicionados. Arraste para girar.`);
      if (!playing) {
        playButton.setAttribute('aria-label', progress >= 1 ? 'Reproduzir novamente' : 'Reproduzir montagem');
        playButton.querySelector('.assembly-play-text').textContent = progress >= 1 ? 'Repetir' : 'Reproduzir';
      }
      render();
    }

    function setPlaying(value) {
      playing = value;
      playButton.setAttribute('aria-label', value ? 'Pausar montagem' : progress >= 1 ? 'Reproduzir novamente' : 'Reproduzir montagem');
      playButton.querySelector('span').textContent = value ? 'Ⅱ' : '▶';
      playButton.querySelector('.assembly-play-text').textContent = value ? 'Pausar' : progress >= 1 ? 'Repetir' : 'Reproduzir';
      canvas.dataset.playing = String(value);
      if (requestId !== null) cancelAnimationFrame(requestId);
      requestId = null; lastTime = null;
      if (playing) requestId = requestAnimationFrame(tick);
    }
    stopPlayback = () => setPlaying(false);
    function tick(now) {
      requestId = null;
      if (!playing) return;
      const delta = lastTime === null ? 0 : Math.min((now - lastTime) / 1000, .08);
      lastTime = now;
      setProgress(progress + delta / duration);
      if (progress >= 1) { setPlaying(false); return; }
      requestId = requestAnimationFrame(tick);
    }
    playButton.addEventListener('click', () => {
      if (progress >= 1) setProgress(0);
      setPlaying(!playing);
    });
    slider.addEventListener('input', () => { const next = Number(slider.value) / 1000; setPlaying(false); setProgress(next); });
    slider.addEventListener('pointerdown', () => setPlaying(false));
    restartButton.addEventListener('click', () => { setPlaying(false); setProgress(0); });
    resetViewButton.addEventListener('click', () => {
      camera.position.copy(initialPosition); camera.zoom = 1;
      camera.updateProjectionMatrix(); orbit.target.copy(target); orbit.update(); render();
    });
    function zoom(multiplier) { camera.zoom = THREE.MathUtils.clamp(camera.zoom * multiplier, .75, 1.8); camera.updateProjectionMatrix(); render(); }
    zoomIn.addEventListener('click', () => zoom(1.15));
    zoomOut.addEventListener('click', () => zoom(1 / 1.15));
    orbit.addEventListener('change', render);
    canvas.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      const relative = camera.position.clone().sub(orbit.target);
      const spherical = new THREE.Spherical().setFromVector3(relative);
      if (event.key === 'ArrowLeft') spherical.theta -= .12;
      if (event.key === 'ArrowRight') spherical.theta += .12;
      if (event.key === 'ArrowUp') spherical.phi = Math.max(orbit.minPolarAngle, spherical.phi - .10);
      if (event.key === 'ArrowDown') spherical.phi = Math.min(orbit.maxPolarAngle, spherical.phi + .10);
      camera.position.copy(orbit.target).add(new THREE.Vector3().setFromSpherical(spherical)); orbit.update(); render();
    });
    new ResizeObserver(() => {
      const { width, height } = view.getBoundingClientRect();
      if (width < 1 || height < 1) return;
      const aspect = width / height;
      const halfHeight = aspect < 1.15 ? 13.2 : 10.6;
      camera.left = -halfHeight * aspect; camera.right = halfHeight * aspect;
      camera.top = halfHeight; camera.bottom = -halfHeight;
      camera.updateProjectionMatrix(); renderer.setSize(width, height, false); render();
    }).observe(view);
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); showFallback(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) setPlaying(false); });
    new IntersectionObserver(entries => { if (!entries[0].isIntersecting) setPlaying(false); }, { threshold: 0 }).observe(section);
    view.querySelector('.assembly-loading').hidden = true;
    view.setAttribute('aria-busy', 'false');
    view.dataset.ready = 'true';
    controlsUI.forEach(control => { control.disabled = false; });
    setProgress(0);
  } catch (error) {
    console.error('Não foi possível iniciar a visualização 3D:', error);
    showFallback();
  }
}
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); initialize(); }
  }, { rootMargin: '300px' });
  observer.observe(section);
} else initialize();
