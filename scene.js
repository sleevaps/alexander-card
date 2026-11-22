import {
  ACESFilmicToneMapping, AmbientLight, BoxGeometry, BufferGeometry, DirectionalLight,
  Group, HemisphereLight, Line, LineBasicMaterial, MathUtils, Mesh, MeshBasicMaterial,
  PerspectiveCamera, Scene, SRGBColorSpace, Vector3, WebGLRenderer
} from 'three';
import { createWalker } from './walker.js';
import { createLamp } from './lamp.js';
import { createShadow, createTrack, tileLength } from './track.js';

const journey = document.querySelector('.journey');
const stage = journey.querySelector('.stage');
const host = stage.querySelector('.render');
const opening = stage.querySelector('.opening');
const preference = matchMedia('(prefers-reduced-motion: reduce)');
const lerp = MathUtils.lerp;
const between = (value, start, end) => MathUtils.smoothstep(value, start, end);
const pathStart = -5.75;
const unitsPerScreen = 7.65;

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
  const coverLamp = createLamp();
  scene.add(coverLamp.head);
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
  let scrollOrigin = 0;
  let screens = 4.5;
  let entered = performance.now();

  function draw(now) {
    const viewport = Math.max(1, stage.offsetHeight);
    const offset = Math.max(0, -journey.getBoundingClientRect().top);
    const localScreens = offset / viewport;
    const progress = motionEnabled() ? (scrollOrigin + localScreens) / 2.45 : 0;
    const elapsed = motionEnabled() ? (now - entered) / 1000 : 0;
    const unfold = between(progress, .045, .30);
    const distance = Math.max(0, progress - .245) * 2.45 * unitsPerScreen;
    const amount = between(distance, 0, .85);
    const tileIndex = Math.floor(distance / tileLength);
    const x = pathStart + distance - tileIndex * tileLength;
    const hip = walker.pose({ distance, amount, unfolding: unfold });

    const restingYaw = .28 + Math.sin(elapsed * .63) * .48;
    const arrivalYaw = restingYaw - unfold * 6.05;
    const yaw = lerp(arrivalYaw, .39, unfold);
    const stillX = mobile ? 0 : 2.42;
    const stillY = mobile ? 2.78 : 2.16;
    introPosition.set(stillX, stillY + .14 * Math.sin(elapsed * 1.15), -1.30);
    bodyPosition.set(x + .05, (hip + 1.045) * unfold, .035);
    const lampScale = lerp(mobile ? 2.25 : 2.72, 1, unfold);
    const shrink = between(unfold, .48, .69);
    const grow = between(unfold, .57, .88);
    const faceHeight = lampScale * (1 - shrink) + grow;
    walker.head.position.copy(introPosition).lerp(bodyPosition, unfold);
    walker.head.scale.setScalar(Math.max(.001, grow));
    walker.head.visible = grow > .01;
    coverLamp.head.position.copy(walker.head.position);
    coverLamp.head.scale.setScalar(Math.max(.001, lampScale * (1 - shrink)));
    coverLamp.head.visible = shrink < .995;
    coverLamp.setPower(.36 + .64 * (motionEnabled() ? between(elapsed, 0, 1.15) : 1));
    walker.root.position.copy(walker.head.position);
    walker.root.position.x -= .05 * unfold;
    walker.root.position.y -= (hip + 1.045) * unfold + .47 * (faceHeight - unfold);
    walker.root.position.z -= .035 * unfold;
    coverLamp.head.rotation.set(.08 + Math.sin(elapsed * .82) * .12, yaw - .39, -.13);
    walker.head.rotation.set(-.035, .32 + Math.sin(distance * .83) * .25, -.045 + Math.sin(distance * 7.6) * .042 * amount);

    track.update(tileIndex);
    track.group.position.y = lerp(-4.3, 0, unfold);
    track.group.visible = unfold > .025;
    shadow.visible = unfold > .67;
    shadow.position.x = x;
    shadow.position.y = track.group.position.y + .021;
    shadow.material.opacity = between(unfold, .67, 1);
    skyline.position.set(x - (distance % 2.5), 0, -5.7);
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
      const away = fade > .85;
      if (opening.inert !== away) opening.inert = away;
      stage.toggleAttribute('data-walking', away);
      lastProgress = progress;
    }
    if (!motionEnabled()) return;
    if (localScreens > 1800) {
      const shift = Math.round(viewport * 1200);
      scrollOrigin += shift / viewport;
      window.scrollTo({ top: offset - shift, behavior: 'instant' });
      screens -= shift / viewport;
      journey.style.setProperty('--journey-height', screens * 100 + 'svh');
    } else if (localScreens > screens - 2.20) {
      screens += 4;
      journey.style.setProperty('--journey-height', screens * 100 + 'svh');
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
  stage.querySelector('.route a').addEventListener('click', event => {
    event.preventDefault();
    history.replaceState(history.state, '', '#top');
    scrollOrigin = 0;
    window.scrollTo({ top: 0, behavior: 'instant' });
    screens = 4.5;
    journey.style.removeProperty('--journey-height');
    opening.inert = false;
    opening.querySelector('.follow').focus({ preventScroll: true });
  });
  preference.addEventListener('change', () => {
    optedIn = false;
    scrollOrigin = 0;
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
