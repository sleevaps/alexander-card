import {
  ACESFilmicToneMapping, AmbientLight, BoxGeometry, BufferGeometry, DirectionalLight,
  Group, HemisphereLight, Line, LineBasicMaterial, MathUtils, Mesh, MeshBasicMaterial,
  PerspectiveCamera, Scene, SRGBColorSpace, Vector3, WebGLRenderer
} from 'three';
import { createWalker } from './walker.js';
import { createShadow, createTrack } from './track.js';
import './wishes.js';

const journey = document.querySelector('.journey');
const stage = journey.querySelector('.stage');
const host = stage.querySelector('.render');
const opening = stage.querySelector('.opening');
const route = stage.querySelector('.route span');
const preference = matchMedia('(prefers-reduced-motion: reduce)');
const lerp = MathUtils.lerp;
const between = (value, start, end) => MathUtils.smoothstep(value, start, end);
const pathStart = -5.75;
const pathLength = 12.75;

async function start() {
  if (!window.WebGL2RenderingContext) return;
  const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.34;
  host.append(renderer.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(42, 1, .1, 75);
  scene.add(new AmbientLight(0xb2baff, .64));
  scene.add(new HemisphereLight(0xfaf3e5, 0x293975, 2.45));
  const light = new DirectionalLight(0xffdfad, 3.1);
  light.position.set(-2, 5, 5);
  scene.add(light);
  const rim = new DirectionalLight(0x8499ff, 3.4);
  rim.position.set(5, 2, -5);
  scene.add(rim);

  const walker = await createWalker(scene);
  await document.fonts.load('900 36px "Golos Text"', 'УДАЧИ').catch(() => {});
  const track = createTrack(scene);
  const shadow = createShadow(scene);
  const skyline = createSkyline(scene);
  const rays = createRays(scene);
  const introPosition = new Vector3();
  const bodyPosition = new Vector3();

  let mobile = false;
  let near = true;
  let frame = 0;
  let contextLost = false;
  let optedIn = false;
  const motionEnabled = () => optedIn || !preference.matches;
  let lastProgress = -1;
  let lastChapter = '';
  let entered = performance.now();

  function draw(now) {
    const travel = Math.max(1, journey.offsetHeight - stage.offsetHeight);
    const progress = !motionEnabled() ? 0 : MathUtils.clamp(-journey.getBoundingClientRect().top / travel, 0, 1);
    const elapsed = !motionEnabled() ? 0 : (now - entered) / 1000;
    const unfold = between(progress, .045, .30);
    const walk = MathUtils.clamp((progress - .245) / .68, 0, 1);
    const amount = between(walk, 0, .09) * (1 - between(walk, .90, 1));
    const x = pathStart + pathLength * walk;
    const distance = x - pathStart;
    const hip = walker.pose({ distance, amount, unfolding: unfold });

    const restingYaw = .28 + Math.sin(elapsed * .63) * .48;
    const arrivalYaw = restingYaw - unfold * 6.05;
    const yaw = lerp(arrivalYaw, .39, unfold);
    const stillX = mobile ? 0 : 2.42;
    const stillY = mobile ? 2.78 : 2.16;
    introPosition.set(stillX, stillY + .14 * Math.sin(elapsed * 1.15), -1.30);
    bodyPosition.set(x + .05, (hip + 1.045) * unfold, .035);
    const headScale = lerp(mobile ? 2.45 : 2.88, 1, unfold);
    walker.head.position.copy(introPosition).lerp(bodyPosition, unfold);
    walker.root.position.copy(walker.head.position);
    walker.root.position.x -= .05 * unfold;
    walker.root.position.y -= (hip + 1.045) * unfold + .51 * (headScale - unfold);
    walker.root.position.z -= .035 * unfold;
    walker.head.scale.setScalar(headScale);
    walker.head.rotation.set(
      lerp(-.09 + Math.sin(elapsed * .82) * .09, -.035, unfold),
      yaw,
      lerp(-.13 + Math.sin(elapsed * .57) * .065, -.045 + Math.sin(distance * 7.6) * .026 * amount, unfold)
    );

    track.position.y = lerp(-4.3, 0, unfold);
    track.visible = unfold > .025;
    shadow.visible = unfold > .67;
    shadow.position.x = x;
    shadow.position.y = track.position.y + .021;
    shadow.material.opacity = between(unfold, .67, 1);
    skyline.position.set(.6, 0, -5.7);
    skyline.visible = unfold > .27;
    skyline.scale.y = lerp(.34, 1, unfold);
    rays.position.copy(introPosition);
    rays.rotation.set(.07 + Math.sin(elapsed * .5) * .10, .18, elapsed * -.035);
    rays.visible = unfold < .68;
    rays.scale.setScalar(1 - unfold * .44);
    rays.children.forEach(line => { line.material.opacity = (1 - between(unfold, .1, .67)) * .57; });

    const viewX = lerp(mobile ? 0 : .1, x + (mobile ? .08 : .8), unfold);
    const viewY = lerp(mobile ? 1.01 : 2.08, .96, unfold);
    const viewDepth = lerp(mobile ? 8.55 : 7.45, mobile ? 8.55 : 6.95, unfold);
    camera.position.set(viewX + unfold * (mobile ? .82 : 2.75), lerp(mobile ? 1.19 : 2.45, 3.36, unfold), viewDepth);
    camera.lookAt(viewX, viewY, 0);
    renderer.render(scene, camera);

    if (progress !== lastProgress) {
      const fade = between(progress, .017, .129);
      stage.style.setProperty('--intro-offset', (-34 * fade) + 'px');
      stage.style.setProperty('--intro-opacity', String(1 - fade));
      stage.style.setProperty('--route-progress', String(progress));
      const away = fade > .85;
      if (opening.inert !== away) opening.inert = away;
      const chapter = progress < .235 ? 'Ночная прогулка' : progress < .92 ? 'Иду к пожеланиям' : 'Пришли';
      if (chapter !== lastChapter) route.textContent = lastChapter = chapter;
      lastProgress = progress;
    }
  }

  function loop(now) {
    frame = 0;
    draw(now);
    sync();
  }

  function sync() {
    if (!near || document.hidden || contextLost || !motionEnabled()) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      return;
    }
    if (!frame) frame = requestAnimationFrame(loop);
  }

  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height || contextLost) return;
    mobile = width <= 700;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.36 : 1.55));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = mobile ? 46 : 42;
    camera.updateProjectionMatrix();
    draw(performance.now());
  }

  function setMode() {
    journey.dataset.scene = motionEnabled() ? 'moving' : 'still';
    entered = performance.now();
    resize();
    sync();
  }

  new ResizeObserver(resize).observe(host);
  new IntersectionObserver(([entry]) => {
    near = entry.isIntersecting;
    sync();
  }).observe(stage);
  document.addEventListener('visibilitychange', sync);
  opening.querySelector('.follow').addEventListener('click', () => {
    if (motionEnabled() || contextLost) return;
    optedIn = true;
    setMode();
  });
  preference.addEventListener('change', () => {
    optedIn = false;
    setMode();
  });
  renderer.domElement.addEventListener('webglcontextlost', () => {
    contextLost = true;
    delete journey.dataset.scene;
    opening.inert = false;
    stage.style.removeProperty('--intro-offset');
    stage.style.removeProperty('--intro-opacity');
    lastProgress = -1;
    sync();
  });
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    contextLost = false;
    setMode();
  });
  setMode();
}

function createRays(scene) {
  const rays = new Group();
  for (const [radius, shift] of [[1.9, -.32], [2.16, .12]]) {
    const points = [];
    for (let i = 0; i <= 86; i++) {
      const angle = (i / 86) * Math.PI * 1.65 + shift;
      points.push(new Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius * .46, -.15 + Math.sin(angle) * .65));
    }
    const ring = new Line(
      new BufferGeometry().setFromPoints(points),
      new LineBasicMaterial({ color: 0xe6bd6b, transparent: true, opacity: .57 })
    );
    ring.rotation.z = -.39 + shift;
    rays.add(ring);
  }
  scene.add(rays);
  return rays;
}

function createSkyline(scene) {
  const group = new Group();
  const body = new MeshBasicMaterial({ color: 0x252e61 });
  const beam = new MeshBasicMaterial({ color: 0x8999cf });
  const column = new BoxGeometry(.10, 2.1, .12);
  const head = new BoxGeometry(.29, .056, .14);
  const retainingWall = new Mesh(new BoxGeometry(36, 1.16, .65), new MeshBasicMaterial({ color: 0x141b3d }));
  retainingWall.position.set(0, -1.65, 0);
  group.add(retainingWall);

  const rail = new Mesh(new BoxGeometry(36, .044, .044), body);
  rail.position.set(0, -.39, .034);
  group.add(rail);
  const lowerRail = rail.clone();
  lowerRail.position.y = -.76;
  group.add(lowerRail);

  for (let i = -5; i <= 5; i++) {
    const post = new Mesh(column, body);
    const lamp = new Mesh(head, beam);
    post.position.set(i * 2.5, -.2, 0);
    lamp.position.set(post.position.x, .83, 0);
    group.add(post, lamp);
  }
  scene.add(group);
  return group;
}

start().catch(() => {
  host.replaceChildren();
  delete journey.dataset.scene;
  opening.inert = false;
});
