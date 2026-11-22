import {
  BoxGeometry, CanvasTexture, Color, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  PlaneGeometry, SRGBColorSpace
} from 'three';

const stops = [
  { x: -4.9, text: 'УДАЧИ', color: '#ffcf64', ink: '#251c31' },
  { x: -.95, text: 'СИЛ', color: '#99aaff', ink: '#151b38' },
  { x: 3, text: 'СВОИХ РЯДОМ', color: '#ff9575', ink: '#261930' },
  { x: 6.95, text: 'СВОБОДЫ', color: '#ded7ff', ink: '#232340' }
];

export function createTrack(scene) {
  const track = new Group();
  const deck = new MeshStandardMaterial({ color: 0x27345e, roughness: .61, metalness: .25 });
  const side = new MeshStandardMaterial({ color: 0x1c2449, roughness: .63, metalness: .32 });
  const ballast = new MeshStandardMaterial({ color: 0x12192f, roughness: .82 });
  const base = new Mesh(new BoxGeometry(18.5, .38, 2.1), ballast);
  base.position.set(1, -.95, -.12);
  track.add(base);

  for (const stop of stops) {
    const width = 3.92;
    const platform = new Mesh(new BoxGeometry(width, .75, 2.28), [side, side, deck, side, side, side]);
    platform.position.set(stop.x, -.375, 0);
    track.add(platform);
    const face = new Mesh(
      new PlaneGeometry(width - .10, .67),
      new MeshBasicMaterial({ map: makeWord(stop), toneMapped: false })
    );
    face.position.set(stop.x, -.385, 1.146);
    track.add(face);
    const stripe = new Mesh(new BoxGeometry(width - .08, .012, .035), new MeshBasicMaterial({ color: new Color(stop.color), toneMapped: false }));
    stripe.position.set(stop.x, .007, 1);
    track.add(stripe);
  }
  scene.add(track);
  return track;
}

export function createShadow(scene) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 96;
  const ctx = canvas.getContext('2d');
  const fade = ctx.createRadialGradient(48, 48, 3, 48, 48, 46);
  fade.addColorStop(0, 'rgba(5,8,19,.75)');
  fade.addColorStop(.5, 'rgba(5,8,19,.35)');
  fade.addColorStop(1, 'rgba(5,8,19,0)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, 96, 96);
  const shadow = new Mesh(
    new PlaneGeometry(1.85, 1.3),
    new MeshBasicMaterial({ map: new CanvasTexture(canvas), transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = .02;
  scene.add(shadow);
  return shadow;
}

function makeWord({ text, color, ink }) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 176;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = ink;
  ctx.fillRect(0, 0, canvas.width, 4);
  ctx.fillRect(0, canvas.height - 4, canvas.width, 4);
  ctx.font = '900 139px "Golos Text", Arial, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(text, 512, 96, 936);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
