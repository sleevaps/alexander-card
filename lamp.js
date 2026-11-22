import {
  AdditiveBlending, CanvasTexture, CatmullRomCurve3, CylinderGeometry, Group, IcosahedronGeometry,
  LatheGeometry, Mesh, MeshBasicMaterial, MeshStandardMaterial, SphereGeometry, Sprite,
  SpriteMaterial, SRGBColorSpace, TorusGeometry, TubeGeometry, Vector2, Vector3
} from 'three';

export function createLamp() {
  const head = new Group();
  const enamel = new MeshStandardMaterial({ color: 0xc47734, roughness: .32, metalness: .46 });
  const edge = new MeshStandardMaterial({ color: 0xebaa59, roughness: .25, metalness: .62 });
  const dark = new MeshStandardMaterial({ color: 0x243937, roughness: .42, metalness: .56 });
  const lampGlass = new MeshStandardMaterial({
    color: 0xffd081, emissive: 0xffab46, emissiveIntensity: .85, roughness: .28
  });
  const lightCore = new MeshBasicMaterial({ color: 0xffefb2, toneMapped: false });

  function shell(profile, material) {
    const shape = new LatheGeometry(profile.map(([radius, depth]) => new Vector2(radius, depth)), 64);
    const mesh = new Mesh(shape, material);
    mesh.rotation.x = Math.PI / 2;
    head.add(mesh);
  }
  shell([
    [0, -.46], [.18, -.46], [.22, -.42], [.24, -.35], [.29, -.21],
    [.33, -.03], [.445, .18], [.482, .31], [.468, .37], [.415, .37],
    [.405, .27], [0, .27]
  ], enamel);
  shell([[.223, -.437], [.251, -.427], [.264, -.392], [.259, -.354], [.241, -.348]], dark);
  shell([[.418, .172], [.45, .171], [.477, .272], [.461, .287], [.445, .277]], dark);

  const seal = new Mesh(new TorusGeometry(.434, .024, 12, 60), edge);
  seal.position.z = .365;
  head.add(seal);
  const inset = new Mesh(new TorusGeometry(.375, .022, 12, 60), dark);
  inset.position.z = .296;
  head.add(inset);
  const lens = new Mesh(new SphereGeometry(1, 44, 28), lampGlass);
  lens.scale.set(.366, .366, .093);
  lens.position.z = .274;
  head.add(lens);
  const center = new Mesh(new SphereGeometry(1, 28, 18), lightCore);
  center.scale.set(.145, .145, .037);
  center.position.z = .358;
  head.add(center);

  const ring = new Mesh(new TorusGeometry(.235, .007, 8, 60), lightCore);
  ring.position.z = .348;
  head.add(ring);
  const innerRing = new Mesh(new TorusGeometry(.193, .004, 8, 60), dark);
  innerRing.position.z = .357;
  head.add(innerRing);

  for (const turn of [0, 1, 2, 3, 4, 5]) {
    const angle = turn * Math.PI / 3 + .18;
    const rivet = new Mesh(new IcosahedronGeometry(.026, 1), dark);
    rivet.position.set(Math.cos(angle) * .435, Math.sin(angle) * .435, .378);
    head.add(rivet);
  }

  const handlePath = new CatmullRomCurve3([
    new Vector3(-.215, .31, -.125), new Vector3(-.195, .59, -.125), new Vector3(0, .677, -.125),
    new Vector3(.195, .59, -.125), new Vector3(.215, .31, -.125)
  ]);
  head.add(new Mesh(new TubeGeometry(handlePath, 32, .038, 9, false), dark));
  const joint = new Mesh(new CylinderGeometry(.113, .143, .135, 24), dark);
  joint.position.y = -.449;
  head.add(joint);

  const corona = new Sprite(new SpriteMaterial({
    map: makeGlow(), color: 0xffa756, blending: AdditiveBlending, transparent: true,
    depthWrite: false, opacity: .47, toneMapped: false
  }));
  corona.position.set(0, 0, .445);
  corona.scale.setScalar(1.41);
  head.add(corona);

  function setPower(power) {
    lampGlass.emissiveIntensity = .29 + power * .88;
    corona.material.opacity = power * .65;
    lightCore.color.setHex(power > .2 ? 0xffefb2 : 0xd6954f);
  }
  return { head, setPower };
}

export function makeGlow() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const falloff = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  falloff.addColorStop(0, 'rgba(255,255,255,.95)');
  falloff.addColorStop(.2, 'rgba(255,255,255,.39)');
  falloff.addColorStop(.52, 'rgba(255,255,255,.09)');
  falloff.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = falloff;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
