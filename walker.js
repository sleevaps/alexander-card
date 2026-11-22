import {
  Group, Mesh, MeshStandardMaterial, SphereGeometry, TorusGeometry,
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
  const front = await loader.loadAsync('sanya-face.webp');
  const ivory = material(0xffedbb, .42);
  const jacket = material(0x34434d, .74);
  const seams = material(0x1b2733, .73);
  const skin = material(0xc58f73, .74);
  const laces = material(0xffe5be, .66);
  const pants = material(0x364158, .72);
  const soles = material(0x1c2750, .62);
  const root = new Group();
  const head = createPortraitHead(front.image);

  const coat = box(.46, .73, .65, .172, jacket);
  const waist = box(.38, .22, .51, .081, pants);
  const seam = box(.023, .55, .025, .009, seams);
  const hood = new Mesh(new TorusGeometry(.208, .060, 12, 36, Math.PI * 1.77), seams);
  hood.rotation.set(Math.PI / 2, 0, -.22);
  const hem = box(.438, .10, .618, .045, seams);
  const neck = box(.23, .18, .25, .08, skin);
  const pocket = box(.062, .186, .39, .029, seams);
  const cordGeometry = new SphereGeometry(1, 14, 8);
  const cords = [-1, 1].map(() => new Mesh(cordGeometry, laces));
  root.add(coat, waist, seam, hood, hem, neck, pocket, ...cords);

  function makeLimb(side) {
    const thigh = box(.215, 1, .205, .087, pants);
    const shin = box(.176, 1, .172, .073, pants);
    const boot = box(.423, .168, .235, .076, ivory);
    const sole = box(.437, .048, .249, .022, soles);
    const upperArm = box(.187, 1, .19, .085, jacket);
    const sleeve = box(.168, 1, .166, .069, jacket);
    const palm = box(.127, .154, .122, .057, skin);
    const thumb = new Mesh(cordGeometry, skin);
    thumb.scale.set(.027, .047, .028);
    const stitching = [-1, 0, 1].map(() => box(.025, .012, .121, .005, laces));
    root.add(thigh, shin, boot, sole, upperArm, sleeve, palm, thumb, ...stitching);
    return { side, thigh, shin, boot, sole, upperArm, sleeve, palm, thumb, stitching };
  }
  const limbs = [makeLimb(-1), makeLimb(1)];
  scene.add(root, head);

  function pose({ distance, amount, size, greet, time }) {
    const gait = distance / stride;
    const hipHeight = 1.36 - amount * (.11 + .022 * Math.cos(gait * Math.PI * 4));
    root.scale.setScalar(size);
    coat.position.set(.053, hipHeight + .36, 0);
    coat.rotation.z = -.09 * amount;
    waist.position.set(0, hipHeight - .03, 0);
    seam.position.set(.075, hipHeight + .34, .30);
    seam.rotation.z = coat.rotation.z;
    hem.position.set(.053, hipHeight + .04, 0);
    neck.position.set(.016, hipHeight + .731, 0);
    hood.position.set(-.06, hipHeight + .666, 0);
    pocket.position.set(.269, hipHeight + .235, 0);
    for (const [index, cord] of cords.entries()) {
      cord.position.set(.291, hipHeight + .52 - index * .035, index ? -.063 : .069);
      cord.scale.set(.013, .072 + index * .020, .012);
      cord.rotation.x = index ? .13 : -.11;
    }

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
      const ankle = new Vector3(reach * amount + side * .055 * (1 - amount), .187 + lift * amount, z);
      const knee = bendKnee(hip, ankle);
      segment(limb.thigh, hip, knee);
      segment(limb.shin, knee, ankle);

      const pitch = -.24 * Math.sin(swing * Math.PI * 2) * amount;
      limb.boot.position.copy(ankle).add(new Vector3(.10, -.085, 0));
      limb.boot.rotation.z = pitch;
      limb.sole.position.copy(limb.boot.position).add(new Vector3(0, -.072, 0));
      limb.sole.rotation.z = pitch;
      for (const [index, lace] of limb.stitching.entries()) {
        lace.position.copy(limb.boot.position).add(new Vector3(.039 + index * .034, .075, 0));
        lace.rotation.z = pitch - .19;
      }

      const shoulder = new Vector3(.055, hipHeight + .55, side * .354);
      const armSwing = Math.cos(phase * Math.PI * 2) * .42 * amount;
      const elbow = shoulder.clone().add(new Vector3(Math.sin(-armSwing) * .34, -Math.cos(armSwing) * .34, side * .028));
      const hand = elbow.clone().add(new Vector3(Math.sin(.33 - armSwing) * .30, -Math.cos(.33 - armSwing) * .30, -side * .015));
      if (side > 0 && greet > 0) {
        const wave = .045 * Math.sin(time * 6.3);
        elbow.lerp(shoulder.clone().add(new Vector3(.04, -.095, .29)), greet);
        hand.lerp(elbow.clone().add(new Vector3(.070, .277, .09 + wave)), greet);
      }
      segment(limb.upperArm, shoulder, elbow);
      segment(limb.sleeve, elbow, hand);
      limb.palm.position.copy(hand);
      limb.palm.quaternion.copy(limb.sleeve.quaternion);
      limb.thumb.position.copy(hand).add(new Vector3(.051, -.03, 0));
      limb.thumb.quaternion.copy(limb.palm.quaternion);
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
