import {
  ACESFilmicToneMapping, Color, DirectionalLight, Group, HemisphereLight,
  IcosahedronGeometry, MathUtils, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  PerspectiveCamera, PlaneGeometry, PMREMGenerator, Scene, SRGBColorSpace,
  TextureLoader, TorusGeometry, TorusKnotGeometry, WebGLRenderer
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import './wishes.js';

const stage = document.querySelector('#scene');
const host = stage.querySelector('.render');
const exposure = stage.querySelector('.exposure');
const snapshot = document.querySelector('#snapshot');
const shutter = document.querySelector('#shutter');
const caption = document.querySelector('#frame-label');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const stillFrames = [
  { src: 'alexander-photo.png', alt: 'Александр во дворе, кадр со вспышкой', label: 'Кадр со вспышкой' },
  { src: 'alexander-night.png', alt: 'Ночной портрет Александра в зелёном свете', label: 'Зелёный свет' }
];

let selected = 0;
let rig;
let flash;

function showFrame() {
  const frame = stillFrames[selected];
  snapshot.src = frame.src;
  snapshot.alt = frame.alt;
  caption.lastChild.textContent = ' ' + frame.label;
  shutter.setAttribute('aria-pressed', String(selected === 1));
}

shutter.hidden = false;
shutter.addEventListener('click', () => {
  selected = 1 - selected;
  showFrame();
  rig?.turn();
  if (motion.matches) return;
  flash?.cancel();
  flash = exposure.animate(
    [{ opacity: 0 }, { opacity: .54, offset: .22 }, { opacity: 0 }],
    { duration: 510, easing: 'ease-out' }
  );
});

async function setupScene() {
  if (!window.WebGL2RenderingContext) return;
  const renderer = new WebGLRenderer({ alpha: true, antialias: true });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.23;
  host.append(renderer.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(43, 1, .1, 45);
  camera.position.z = 7.9;

  const environment = new RoomEnvironment();
  const pmrem = new PMREMGenerator(renderer);
  const ambient = pmrem.fromScene(environment, .05);
  scene.environment = ambient.texture;
  environment.dispose();
  pmrem.dispose();

  scene.add(new HemisphereLight(0xffead6, 0x784135, 2));
  const key = new DirectionalLight(0xffd7b4, 3.7);
  key.position.set(-4, 5, 6);
  scene.add(key);
  const edge = new DirectionalLight(0xff794c, 3.2);
  edge.position.set(4, -2, 1);
  scene.add(edge);

  const metal = new MeshStandardMaterial({ color: 0x8b5d42, roughness: .23, metalness: .89 });
  const enamel = new MeshStandardMaterial({ color: 0x392923, roughness: .32, metalness: .58 });
  const copper = new MeshStandardMaterial({ color: 0xf08e59, roughness: .22, metalness: .86 });
  const bulb = new MeshStandardMaterial({ color: 0xffb773, emissive: new Color(0xb1340d), emissiveIntensity: .34, roughness: .25, metalness: .58 });

  const cassette = new Group();
  const chassis = new Mesh(new RoundedBoxGeometry(3.12, 3.30, .24, 4, .12), metal);
  cassette.add(chassis);
  const inset = new Mesh(new RoundedBoxGeometry(2.98, 3.16, .261, 4, .09), enamel);
  cassette.add(inset);

  const loader = new TextureLoader();
  const plateGeometry = new PlaneGeometry(2.77, 2.77);
  const textures = await Promise.all(stillFrames.map(frame => loader.loadAsync(frame.src)));

  for (const [index, texture] of textures.entries()) {
    const side = index === 0 ? 1 : -1;
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const plate = new Mesh(plateGeometry, new MeshBasicMaterial({ map: texture, toneMapped: false }));
    plate.position.set(0, .08, side * .136);
    if (side < 0) plate.rotation.y = Math.PI;
    cassette.add(plate);

    const trim = new Mesh(new RoundedBoxGeometry(1.08, .06, .022, 2, .02), copper);
    trim.position.set(.78 * side, -1.43, side * .144);
    cassette.add(trim);
    const stud = new Mesh(new IcosahedronGeometry(.058, 1), bulb);
    stud.position.set(-1.22 * side, -1.43, side * .147);
    cassette.add(stud);
  }
  scene.add(cassette);

  const orbit = new Group();
  const rail = new Mesh(new TorusGeometry(2.81, .018, 10, 120), copper);
  const track = new Mesh(new TorusGeometry(2.53, .007, 8, 120), metal);
  orbit.add(rail, track);
  orbit.rotation.set(.96, -.32, -.39);
  orbit.position.z = -.68;
  scene.add(orbit);

  const knot = new Mesh(new TorusKnotGeometry(.35, .106, 112, 12), copper);
  const prism = new Mesh(new IcosahedronGeometry(.34, 0), metal);
  const jewel = new Mesh(new IcosahedronGeometry(.16, 0), bulb);
  const satellite = new Mesh(new IcosahedronGeometry(.10, 1), copper);
  scene.add(knot, prism, jewel);
  orbit.add(satellite);

  let targetTurn = selected * Math.PI;
  let currentTurn = targetTurn;
  let tweenStart = performance.now();
  let previous = tweenStart;
  let activeTime = 0;
  let pointerX = 0;
  let pointerY = 0;
  let tiltX = 0;
  let tiltY = 0;
  let frameId = 0;
  let inView = true;
  let lost = false;

  function draw(now) {
    const elapsed = Math.min(.05, (now - previous) / 1000);
    previous = now;
    const animated = !motion.matches;
    activeTime += animated ? elapsed : 0;
    const t = activeTime;
    const ease = 1 - Math.exp(-5.6 * elapsed);
    const settling = animated ? Math.exp(-t * 2.4) : 0;
    currentTurn = animated ? MathUtils.lerp(currentTurn, targetTurn, ease) : targetTurn;
    tiltX = animated ? MathUtils.lerp(tiltX, pointerX, ease) : 0;
    tiltY = animated ? MathUtils.lerp(tiltY, pointerY, ease) : 0;
    const impact = animated ? Math.sin(Math.min(Math.PI, (now - tweenStart) / 805 * Math.PI)) : 0;

    cassette.rotation.set(-.13 + tiltY * .19, -.34 + currentTurn + tiltX * .34 - settling * .95, -.12);
    cassette.position.set(0, Math.sin(t * 1.27) * .095 - settling * .45, impact * .45);
    orbit.rotation.z = -.39 + Math.sin(t * .7) * .17 + impact * .21;
    satellite.position.set(Math.cos(t * .84) * 2.81, Math.sin(t * .84) * 2.81, 0);
    knot.position.set(2.16 + tiltX * .27, 1.22 + .16 * Math.sin(t * 1.5), .37 + impact * .7);
    knot.rotation.set(t * .51, -.6 + t * .64, -.4);
    prism.position.set(-2.13, -.95 + .20 * Math.cos(t * 1.3), .6 + tiltX * .4);
    prism.rotation.set(.35 + t * .46, .40 + t * .39, .4);
    jewel.position.set(1.93, -1.73 + .18 * Math.sin(t * 1.7), -.1 + impact);
    jewel.rotation.y = t * .93;
    renderer.render(scene, camera);
  }

  function loop(now) {
    frameId = 0;
    draw(now);
    sync();
  }

  function sync() {
    if (lost || !inView || document.hidden || motion.matches) {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = 0;
      return;
    }
    if (!frameId) frameId = requestAnimationFrame(loop);
  }

  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.z = camera.aspect < .94 ? 8.55 : 7.9;
    camera.updateProjectionMatrix();
    if (!lost) draw(performance.now());
  }

  new ResizeObserver(resize).observe(host);
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    sync();
  }).observe(stage);
  document.addEventListener('visibilitychange', sync);
  motion.addEventListener('change', () => {
    if (!lost) draw(performance.now());
    sync();
  });
  stage.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    const rect = stage.getBoundingClientRect();
    pointerX = (event.clientX - rect.left) / rect.width * 2 - 1;
    pointerY = (event.clientY - rect.top) / rect.height * 2 - 1;
  });
  stage.addEventListener('pointerleave', () => { pointerX = 0; pointerY = 0; });

  renderer.domElement.addEventListener('webglcontextlost', () => {
    lost = true;
    delete stage.dataset.webgl;
    sync();
  });
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    lost = false;
    resize();
    stage.dataset.webgl = 'ready';
    sync();
  });

  resize();
  stage.dataset.webgl = 'ready';
  sync();
  return {
    turn() {
      targetTurn += Math.PI;
      tweenStart = performance.now();
      if (!lost && motion.matches) draw(tweenStart);
    }
  };
}

setupScene().then(instance => { rig = instance; }).catch(() => {
  host.replaceChildren();
});
