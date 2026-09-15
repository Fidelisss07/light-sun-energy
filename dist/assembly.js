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
    const [THREE, { OrbitControls }, { GLTFLoader }, { HDRLoader }] = await Promise.all([
      import('three'), import('./assets/three/OrbitControls.js'), import('./assets/three/GLTFLoader.js'), import('./assets/three/HDRLoader.js')
    ]);
    const canvas = section.querySelector('#assembly-canvas');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#d9ddd9');
    const hdr = await new HDRLoader().loadAsync('./assets/model/daylight.hdr');
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromEquirectangular(hdr).texture;
    scene.environment = environment;
    scene.environmentIntensity = .75;
    hdr.dispose(); pmrem.dispose();
    const camera = new THREE.PerspectiveCamera(40, 1.5, .1, 150);
    const target = new THREE.Vector3(0, 2.0, 0);
    const initialPosition = new THREE.Vector3(-12, 16, -21);
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

    scene.add(new THREE.HemisphereLight('#fff7ed', '#797b79', .4));
    const sun = new THREE.DirectionalLight('#fff2dd', 2.5);
    sun.position.set(-12, 25, -15);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: .5, far: 75 });
    sun.shadow.normalBias = .035;
    sun.shadow.bias = -.00015;
    scene.add(sun);
    const fill = new THREE.DirectionalLight('#e2edff', .25);
    fill.position.set(12, 10, -10);
    scene.add(fill);

    const gltf = await new GLTFLoader().loadAsync('./assets/model/residential.glb');
    scene.add(gltf.scene);
    const panels = [], rails = [], supports = [];
    gltf.scene.traverse(object => {
      if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; }
      if (/^Panel_\d+$/.test(object.name)) {
        const materials = [];
        object.traverse(child => {
          if (!child.isMesh) return;
          const cloned = (Array.isArray(child.material) ? child.material : [child.material]).map(material => {
            const copy = material.clone(); copy.transparent = true; materials.push(copy); return copy;
          });
          child.material = Array.isArray(child.material) ? cloned : cloned[0];
        });
        object.userData = { y: object.position.y, index: Number(object.name.split('_')[1]), materials, baseRotation: object.rotation.x };
        panels.push(object);
      }
      if (/^Rail_/.test(object.name)) { object.userData.baseY = object.position.y; rails.push(object); }
      if (object.name === 'Supports') { object.userData.baseY = object.position.y; supports.push(object); }
    });
    panels.sort((a,b) => a.userData.index - b.userData.index);
    if (panels.length !== 14) throw new Error('Unexpected panel count in Blender model');

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
        support.position.y = support.userData.baseY + (1 - ease(u)) * 1.8;
      });
      rails.forEach((rail, index) => {
        const u = clamp((progress - .14 - index * .025) / .12);
        rail.visible = u > 0;
        rail.position.y = rail.userData.baseY + (1 - ease(u)) * 2.5;
      });
      panels.forEach(panel => {
        const u = clamp((progress - .31 - panel.userData.index * .036) / .16);
        panel.visible = u > 0;
        panel.position.y = panel.userData.y + (1 - ease(u)) * 4;
        panel.rotation.x = panel.userData.baseRotation + (1 - ease(u)) * -.14;
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
      camera.aspect = aspect;
      camera.fov = aspect < 1.15 ? 53 : 40;
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
