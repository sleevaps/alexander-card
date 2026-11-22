import {
  Group, Mesh, MeshStandardMaterial, TorusGeometry,
  TextureLoader, Vector3
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

import { createPortraitHead } from './head.js';

const up = new Vector3(0, 1, 0);
const axis = new Vector3();
const stride = 1.65;
const stance = .62;

export async function createWalker(scene) {
  const loader = new TextureLoader();
  const front = await loader.loadAsync('alexander-photo.png');
  const ivory = material(0xffedbb, .42);
  const jacket = material(0x4c5e83, .64);
  const seams = material(0x334661, .68);
  const cuffs = material(0xf78354, .56);
  const pants = material(0x393a59, .74);
  const soles = material(0x1c2750, .62);
  const root = new Group();
  const head = createPortraitHead(front.image);

  const coat = box(.43, .66, .60, .15, jacket);
  const waist = box(.38, .22, .51, .081, pants);
  const seam = box(.035, .43, .022, .008, seams);
  const hood = new Mesh(new TorusGeometry(.208, .060, 12, 36, Math.PI * 1.77), seams);
  hood.rotation.set(Math.PI / 2, 0, -.22);
  root.add(coat, waist, seam, hood);

  function makeLimb(side) {
    const thigh = box(.215, 1, .205, .087, pants);
    const shin = box(.176, 1, .172, .073, pants);
    const boot = box(.39, .18, .23, .07, ivory);
    const sole = box(.405, .059, .244, .025, soles);
    const upperArm = box(.187, 1, .19, .085, jacket);
    const sleeve = box(.168, 1, .166, .069, jacket);
    const glove = box(.14, .16, .14, .063, cuffs);
    root.add(thigh, shin, boot, sole, upperArm, sleeve, glove);
    return { side, thigh, shin, boot, sole, upperArm, sleeve, glove };
  }
  const limbs = [makeLimb(-1), makeLimb(1)];
  scene.add(root, head);

  function pose({ distance, amount, unfolding }) {
    const gait = distance / stride;
    const hipHeight = 1.36 - amount * (.11 + .022 * Math.cos(gait * Math.PI * 4));
    root.visible = unfolding > .01;
    root.scale.setScalar(unfolding);
    coat.position.set(.053, hipHeight + .35, 0);
    coat.rotation.z = -.09 * amount;
    waist.position.set(0, hipHeight - .03, 0);
    seam.position.set(.075, hipHeight + .34, .30);
    seam.rotation.z = coat.rotation.z;
    hood.position.set(-.015, hipHeight + .646, 0);

    for (const limb of limbs) {
      const { side } = limb;
      const phase = gait + (side > 0 ? .5 : 0);
      const cycle = phase - Math.floor(phase);
      const swing = Math.max(0, (cycle - stance) / (1 - stance));
      const movement = swing * swing * (3 - 2 * swing);
      const reach = (stance * .5 + movement - cycle) * stride;
      const lift = Math.sin(swing * Math.PI) * .35;
      const z = side * .184;
      const hip = new Vector3(0, hipHeight, z);
      const ankle = new Vector3(reach * amount, .187 + lift * amount, z);
      const knee = bendKnee(hip, ankle);
      segment(limb.thigh, hip, knee);
      segment(limb.shin, knee, ankle);

      const pitch = -.24 * Math.sin(swing * Math.PI * 2) * amount;
      limb.boot.position.copy(ankle).add(new Vector3(.10, -.085, 0));
      limb.boot.rotation.z = pitch;
      limb.sole.position.copy(limb.boot.position).add(new Vector3(0, -.072, 0));
      limb.sole.rotation.z = pitch;

      const shoulder = new Vector3(.055, hipHeight + .55, side * .354);
      const armSwing = Math.cos(phase * Math.PI * 2) * .42 * amount;
      const elbow = shoulder.clone().add(new Vector3(Math.sin(-armSwing) * .34, -Math.cos(armSwing) * .34, side * .028));
      const hand = elbow.clone().add(new Vector3(Math.sin(.33 - armSwing) * .30, -Math.cos(.33 - armSwing) * .30, -side * .015));
      segment(limb.upperArm, shoulder, elbow);
      segment(limb.sleeve, elbow, hand);
      limb.glove.position.copy(hand);
    }
    return hipHeight;
  }

  return { root, head, pose };
}

function material(color, roughness) {
  return new MeshStandardMaterial({ color, roughness, metalness: .08 });
}

function box(width, height, depth, radius, surface) {
  return new Mesh(new RoundedBoxGeometry(width, height, depth, 3, radius), surface);
}

function segment(mesh, a, b) {
  mesh.position.copy(a).lerp(b, .5);
  axis.subVectors(b, a);
  mesh.scale.y = axis.length() + .052;
  mesh.quaternion.setFromUnitVectors(up, axis.normalize());
}

function bendKnee(hip, ankle) {
  const dx = ankle.x - hip.x;
  const dy = ankle.y - hip.y;
  const distance = Math.hypot(dx, dy);
  const upper = .59;
  const lower = .60;
  const along = Math.min(upper, (distance * distance + upper * upper - lower * lower) / (2 * distance));
  const bend = Math.sqrt(Math.max(0, upper * upper - along * along));
  return new Vector3(
    hip.x + (dx * along - dy * bend) / distance,
    hip.y + (dy * along + dx * bend) / distance,
    hip.z
  );
}
