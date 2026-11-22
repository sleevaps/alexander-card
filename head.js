import { CanvasTexture, Group, MathUtils, Mesh, MeshStandardMaterial, SphereGeometry, SRGBColorSpace } from 'three';

const { smoothstep, lerp } = MathUtils;

// Project the face onto a rounded sculpt rather than onto a flat billboard.
export function createPortraitHead(image) {
  const head = new Group();
  const geometry = new SphereGeometry(1, 64, 44);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    const jaw = lerp(.86, 1, smoothstep(y, -.90, -.10));
    const front = smoothstep(z, .14, .95);
    const nose = Math.exp(-((x / .17) ** 2 + ((y + .23) / .29) ** 2)) * front;
    const chin = Math.exp(-((x / .63) ** 2 + ((y + .65) / .25) ** 2)) * front;
    const crown = smoothstep(y, .33, .98);
    const sweep = Math.sin(x * 6 + z * 3) * .017 * crown;
    positions.setXYZ(i, x * .295 * jaw + crown * .017, y * .408 + sweep, z * .277 + nose * .074 + chin * .026);
  }
  geometry.computeVertexNormals();

  const face = new MeshStandardMaterial({
    map: bakePortrait(image),
    roughness: .83,
    emissive: 0x473023,
    emissiveIntensity: .085
  });
  head.add(new Mesh(geometry, face));

  const skin = new MeshStandardMaterial({ color: 0xc68e72, roughness: .82 });
  for (const side of [-1, 1]) {
    const ear = new Mesh(new SphereGeometry(1, 20, 14), skin);
    ear.position.set(side * .273, -.071, .026);
    ear.scale.set(.046, .087, .053);
    head.add(ear);
  }
  return head;
}

function bakePortrait(image) {
  const size = 512;
  const source = document.createElement('canvas');
  source.width = source.height = size;
  const sample = source.getContext('2d', { willReadFrequently: true });
  sample.drawImage(image, 0, 0, size, size);
  const photo = sample.getImageData(0, 0, size, size).data;
  const atlas = document.createElement('canvas');
  atlas.width = atlas.height = size;
  const ctx = atlas.getContext('2d');
  const bitmap = ctx.createImageData(size, size);

  for (let row = 0; row < size; row++) {
    const theta = ((row + .5) / size) * Math.PI;
    const contour = Math.sin(theta);
    const height = Math.cos(theta);
    const sourceY = Math.min(size - 1, Math.max(0, Math.round((.5 - height * .48) * size)));
    for (let col = 0; col < size; col++) {
      const turn = ((col + .5) / size) * Math.PI * 2;
      const horizontal = -Math.cos(turn) * contour;
      const front = Math.sin(turn);
      const sourceX = Math.min(size - 1, Math.max(0, Math.round((.5 + horizontal * .48) * size)));
      const pixel = (row * size + col) * 4;
      const from = (sourceY * size + sourceX) * 4;
      const saturation = smoothstep(photo[from] - photo[from + 2], 22, 41);
      const amount = smoothstep(front, .20, .80) * smoothstep(height, -.995, -.83) * saturation;
      const hairLine = front < 0 ? -.13 : .49 - Math.abs(horizontal) * .32;
      const hair = smoothstep(height, hairLine - .06, hairLine + .105);
      const strands = Math.sin(turn * 38 + height * 17) * hair * 3.5;
      bitmap.data[pixel] = lerp(lerp(205, 106, hair) + strands, photo[from], amount);
      bitmap.data[pixel + 1] = lerp(lerp(150, 72, hair) + strands, photo[from + 1], amount);
      bitmap.data[pixel + 2] = lerp(lerp(119, 46, hair) + strands, photo[from + 2], amount);
      bitmap.data[pixel + 3] = 255;
    }
  }
  ctx.putImageData(bitmap, 0, 0);
  const texture = new CanvasTexture(atlas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
