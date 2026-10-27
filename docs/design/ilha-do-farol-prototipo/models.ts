import type { GameAPI, Object3D, World3D } from './world'

// Art references: farol-assets.ts (original layout and palette), jardim-sprites.generated.ts (pedras).
// All model parts are created by Jogo 3D. Dimensions and silhouettes are authored here for this approval file.
export function islandModels(g: GameAPI, w: World3D) {
  const model = () => g.createModel(w)
  const put = (parent: Object3D, part: Object3D, x: number, y: number, z: number) => {
    g.setPosition(part, x, y, z)
    g.addToModel(parent, part)
    return part
  }
  const box = (
    p: Object3D,
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    depth: number,
    color: string,
  ) => put(p, g.createBlock(w, { width, height, depth, color }), x, y, z)
  const sphere = (
    p: Object3D,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    color: string,
  ) => {
    const o = put(p, g.createSphere(w, { radius: 1, color }), x, y, z)
    o.scale.x = sx
    o.scale.y = sy
    o.scale.z = sz
    return o
  }
  const cyl = (
    p: Object3D,
    x: number,
    y: number,
    z: number,
    radius: number,
    height: number,
    color: string,
  ) => put(p, g.createCylinder(w, { radius, height, color }), x, y, z)
  const ellipse = (
    p: Object3D,
    x: number,
    y: number,
    z: number,
    rx: number,
    rz: number,
    height: number,
    color: string,
  ) => {
    const o = cyl(p, x, y, z, 1, height, color)
    o.scale.x = rx
    o.scale.z = rz
    return o
  }
  const ground = model(),
    scenery = model(),
    lighthouse = model(),
    boat = model(),
    rock = model()
  box(ground, 0, -0.4, 0, 80, 0.2, 80, '#6896ef')
  // Broad coast to the left, lighthouse islet to the right, as in the 2D course.
  ellipse(ground, -5, -0.27, 0, 9, 9, 0.08, '#94d5f5')
  ellipse(ground, -5.1, -0.2, 0, 8.1, 8.2, 0.08, '#fff9e8')
  ellipse(ground, -5.5, -0.13, 0, 7.9, 8, 0.12, '#fae2aa')
  ellipse(ground, -6, -0.07, 0, 7.3, 7.8, 0.1, '#dfc382')
  ellipse(ground, -6.6, -0.015, -0.2, 6.7, 7.6, 0.12, '#508f82')
  // Palm clearings stay inside the grass outline, leaving the sandy coastline visible.
  ellipse(ground, -7, 0.06, -4.2, 4.2, 2.1, 0.04, '#107c57')
  ellipse(ground, -6.6, 0.06, 4.5, 4.1, 1.8, 0.04, '#107c57')
  box(ground, -3.9, 0.065, 0.75, 12.7, 0.045, 1.3, '#dfc382')
  ellipse(ground, 5.2, -0.17, 0.4, 2.5, 2.1, 0.12, '#fff9e8')
  ellipse(ground, 5.2, -0.09, 0.4, 2.3, 1.9, 0.1, '#fae2aa')
  ellipse(ground, 5.2, -0.02, 0.4, 1.9, 1.5, 0.08, '#dfc382')
  // Wooden bridge: individual boards and posts remain readable from above and from the side.
  for (let i = 0; i < 9; i++)
    box(scenery, 1.65 + i * 0.23, 0.13, 0.75, 0.21, 0.16, 1.05, i % 2 ? '#b5895d' : '#a47850')
  for (const x of [1.55, 3.6])
    for (const z of [0.15, 1.35]) cyl(scenery, x, 0.35, z, 0.075, 0.7, '#987049')
  for (const z of [0.15, 1.35]) box(scenery, 2.57, 0.5, z, 2.1, 0.08, 0.07, '#c2976c')
  const palm = (x: number, z: number, size: number) => {
    const p = model()
    g.addToModel(scenery, p)
    g.setPosition(p, x, 0, z)
    for (let i = 0; i < 6; i++) {
      const t = cyl(p, -0.03 * i, 0.18 + i * 0.29, 0, 0.1 - i * 0.004, 0.34, '#a67c47')
      g.setRotation(t, 0, 0, -9)
    }
    for (let i = 0; i < 7; i++) {
      const angle = (i * Math.PI * 2) / 7
      const leaf = sphere(
        p,
        -0.2 + Math.cos(angle) * 0.6,
        1.9,
        Math.sin(angle) * 0.6,
        0.85,
        0.075,
        0.23,
        i % 2 ? '#239965' : '#17794f',
      )
      g.setRotation(leaf, 0, (-angle * 180) / Math.PI, Math.cos(angle) * -12)
    }
    for (const [a, b] of [
      [-0.12, 0],
      [0.1, 0.08],
      [-0.02, -0.14],
    ])
      sphere(p, -0.2 + a, 1.72, b, 0.13, 0.13, 0.13, '#775e37')
    p.scale.x = p.scale.y = p.scale.z = size
  }
  palm(-7, -4.2, 1.2)
  palm(-6.6, 4.5, 1.15)
  for (const [x, z] of [
    [-0.3, -4],
    [0.1, 4.5],
    [-3.2, -4.7],
  ])
    for (let i = 0; i < 3; i++) {
      const leaf = sphere(scenery, x + (i - 1) * 0.14, 0.22, z, 0.07, 0.28, 0.12, '#148259')
      g.setRotation(leaf, 0, i * 50, (i - 1) * 30)
    }
  // Red and white lighthouse, dark door, glazed lantern and pointed red roof.
  g.setPosition(lighthouse, 5.2, 0, 0.1)
  cyl(lighthouse, 0, 1.65, 0, 0.7, 3.3, '#e8eff5')
  for (const y of [0.3, 1.35, 2.4]) cyl(lighthouse, 0, y, 0, 0.714, 0.49, '#cf3d32')
  cyl(lighthouse, 0, 3.33, 0, 0.84, 0.2, '#cf3d32')
  const lantern = cyl(lighthouse, 0, 3.8, 0, 0.68, 0.76, '#45536d')
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4
    box(lighthouse, Math.cos(a) * 0.67, 3.8, Math.sin(a) * 0.67, 0.075, 0.78, 0.075, '#e8eff5')
  }
  cyl(lighthouse, 0, 4.19, 0, 0.83, 0.1, '#e8eff5')
  put(lighthouse, g.createCone(w, { radius: 0.92, height: 1.04, color: '#cf3d32' }), 0, 4.72, 0)
  sphere(lighthouse, 0, 5.29, 0, 0.07, 0.07, 0.07, '#cf3d32')
  box(lighthouse, 0, 0.44, 0.715, 0.37, 0.68, 0.09, '#45536d')
  sphere(lighthouse, 0, 0.79, 0.715, 0.185, 0.19, 0.045, '#45536d')
  const beam = put(
    lighthouse,
    g.createCone(w, { radius: 1.5, height: 7, color: '#ffe68c' }),
    0,
    3.8,
    3.5,
  )
  g.setRotation(beam, -90, 0, 0)
  g.setOpacity(beam, 0.18)
  g.noShadow(beam)
  // Sailboat from the 2D victory: brown hull, white/yellow sails and a small red pennant.
  sphere(boat, 0, 0.02, 0, 1.45, 0.38, 0.47, '#967044')
  ellipse(boat, 0, 0.21, 0, 1.44, 0.46, 0.08, '#ca9e58')
  ellipse(boat, 0, 0.255, 0, 1.28, 0.34, 0.035, '#22394b')
  box(boat, 0.15, 1.38, 0, 0.055, 2.6, 0.055, '#a17842')
  const yellow = put(
    boat,
    g.createCone(w, { radius: 0.87, height: 1.95, color: '#f3b123' }),
    0.62,
    1.3,
    0,
  )
  yellow.scale.z = 0.045
  g.setRotation(yellow, 0, 0, 19)
  const white = put(
    boat,
    g.createCone(w, { radius: 0.57, height: 1.95, color: '#fffaf0' }),
    -0.37,
    1.3,
    0.025,
  )
  white.scale.z = 0.035
  g.setRotation(white, 0, 0, -14)
  box(boat, 0.39, 2.55, 0, 0.48, 0.16, 0.03, '#cf3d32')
  for (const x of [-0.42, 0, 0.42]) sphere(boat, x, 0.01, 0.43, 0.095, 0.095, 0.025, '#f3b123')
  g.setPosition(boat, 7.2, -0.1, 4.5)
  g.setRotation(boat, 0, -10, 0)
  // Cadê Todo Mundo's stones: two unequal masses, rounded light tops, slate sides.
  const stoneMain = cyl(rock, 0.22, 0.87, 0, 1.02, 1.74, '#566c86')
  stoneMain.scale.x = 1.15
  stoneMain.scale.z = 0.83
  sphere(rock, 0.22, 1.73, 0, 1.17, 0.42, 0.85, '#94b0c2')
  const stoneFront = cyl(rock, -0.91, 0.66, 0.46, 0.53, 1.32, '#333c57')
  stoneFront.scale.x = 0.82
  stoneFront.scale.z = 0.95
  g.setRotation(stoneFront, 0, 0, -7)
  sphere(rock, -0.91, 1.32, 0.46, 0.47, 0.3, 0.53, '#94b0c2')
  rock.scale.y = 1.3
  g.setRotation(rock, 0, -10, 0)
  // Invisible contact hull; the visible adventurer fits inside it. Same collision envelope as before.
  const hero = g.createBlock(w, { width: 0.85, height: 1.6, depth: 0.75, color: '#ffffff' })
  g.setOpacity(hero, 0)
  g.noShadow(hero)
  const body = model()
  g.addToModel(hero, body)
  box(body, 0, -0.12, 0, 0.43, 0.49, 0.28, '#f7fbfd')
  sphere(body, 0, 0.34, 0, 0.29, 0.34, 0.26, '#ffe4a6')
  sphere(body, 0, 0.59, -0.035, 0.31, 0.19, 0.28, '#122037')
  sphere(body, -0.23, 0.4, -0.01, 0.11, 0.29, 0.24, '#122037')
  sphere(body, -0.12, 0.5, 0.18, 0.19, 0.14, 0.12, '#122037')
  sphere(body, 0.18, 0.57, 0.12, 0.18, 0.09, 0.17, '#122037')
  for (const x of [-0.11, 0.11]) {
    sphere(body, x, 0.34, 0.246, 0.064, 0.092, 0.025, '#fff')
    sphere(body, x + 0.018, 0.33, 0.268, 0.029, 0.05, 0.018, '#14233b')
  }
  sphere(body, 0.035, 0.18, 0.26, 0.035, 0.025, 0.018, '#8e4950')
  for (const x of [-0.13, 0.13]) {
    box(body, x, -0.48, 0, 0.17, 0.3, 0.24, '#4d6fe5')
    box(body, x, -0.66, 0, 0.13, 0.15, 0.17, '#ffe4a6')
    box(body, x, -0.76, 0.035, 0.18, 0.08, 0.27, '#14233b')
  }
  for (const x of [-0.28, 0.28]) {
    sphere(body, x, -0.1, 0, 0.1, 0.22, 0.12, '#f7fbfd')
    sphere(body, x, -0.3, 0.025, 0.07, 0.13, 0.08, '#ffe4a6')
  }
  // Gold ring, diagonal shaft and two teeth, matching chave-dourada.
  const key = model()
  put(key, g.createTorus(w, { radius: 0.24, tube: 0.07, color: '#f8bc2b' }), -0.22, 0, 0)
  box(key, 0.18, 0, 0, 0.65, 0.13, 0.15, '#f8bc2b')
  box(key, 0.43, -0.13, 0, 0.12, 0.25, 0.15, '#f8bc2b')
  box(key, 0.2, -0.1, 0, 0.12, 0.2, 0.15, '#f8bc2b')
  g.setRotation(key, -30, 0, -40)
  // Separate, quiet work surface for coordinate/contact comparisons.
  const bench = model()
  box(bench, 0, -0.11, 0, 10.6, 0.25, 10.6, '#fae2aa')
  box(bench, 0, 0.025, 0, 10, 0.03, 10, '#508f82')
  return { ground, scenery, lighthouse, lantern, beam, boat, rock, hero, key, bench }
}
