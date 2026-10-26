import '../../../.cache/ilha-do-farol/runtime.js'
import { islandModels } from './models'
// Approval stage: every scene object is created through the real Jogo 3D extension.
import type { WorldState } from './stage'

export type Object3D = {
  name: string
  scale: { x: number; y: number; z: number }
  visible: boolean
}
export type World3D = {
  scene: { add: (...objects: Object3D[]) => void }
  camera: { lookAt: (x: number, y: number, z: number) => void }
}
type Helper = Object3D & { update: () => void }
type Shape = {
  color: string
  size?: number
  radius?: number
  tube?: number
  height?: number
  width?: number
  depth?: number
}
export type GameAPI = {
  createFullscreenScene: (color: string) => World3D
  createBlock: (world: World3D, options: Shape) => Object3D
  createCylinder: (world: World3D, options: Shape) => Object3D
  createCone: (world: World3D, options: Shape) => Object3D
  createSphere: (world: World3D, options: Shape) => Object3D
  createTorus: (world: World3D, options: Shape) => Object3D
  createModel: (world: World3D) => Object3D
  addToModel: (model: Object3D, part: Object3D) => void
  setPosition: (object: Object3D, x: number, y: number, z: number) => void
  setRotation: (object: Object3D, x: number, y: number, z: number) => void
  setCameraPosition: (world: World3D, x: number, y: number, z: number) => void
  setVisible: (object: Object3D, mode: 'show' | 'hide') => void
  setColor: (object: Object3D, color: string) => void
  setOpacity: (object: Object3D, opacity: number) => void
  noShadow: (object: Object3D) => void
  setFOV: (world: World3D, degrees: number) => void
  addAmbientLight: (world: World3D, color: string, intensity: number) => void
  collides: (a: Object3D, b: Object3D) => boolean
  animate: (world: World3D, callback: () => void) => void
  dispose: (world: World3D) => void
  THREE: { BoxHelper: new (object: Object3D, color: string) => Helper }
}
const g = (window as unknown as { SZGame3D: GameAPI }).SZGame3D
try {
  const w = g.createFullscreenScene('#94d5f5')
  g.addAmbientLight(w, '#ffffff', 0.65)
  const { ground, scenery, lighthouse, lantern, beam, boat, rock, hero, key, bench } = islandModels(
    g,
    w,
  )
  const block = (
    name: string,
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    depth: number,
    color: string,
  ) => {
    const mesh = g.createBlock(w, { width, height, depth, color })
    mesh.name = name
    g.setPosition(mesh, x, y, z)
    return mesh
  }
  const origin = g.createTorus(w, { radius: 0.45, tube: 0.025, color: '#ce8b17' })
  g.setRotation(origin, 90, 0, 0)
  g.setPosition(origin, -2, 0.08, -3)
  const projection = g.createTorus(w, { radius: 0.4, tube: 0.025, color: '#315ee9' })
  g.setRotation(projection, 90, 0, 0)
  const guide = block('altura', 0, 1, 0, 0.025, 1, 0.025, '#d75b95')
  const axes = []
  for (let n = -4; n <= 4; n++) {
    axes.push(block('grade', n, 0.06, 0, 0.018, 0.012, 8, '#b8d4a3'))
    axes.push(block('grade', 0, 0.06, n, 8, 0.012, 0.018, '#b8d4a3'))
  }
  axes.push(block('x', 0, 0.08, 0, 8, 0.025, 0.045, '#eb8952'))
  axes.push(block('z', 0, 0.085, 0, 0.045, 0.025, 8, '#3784bc'))
  const hb = new g.THREE.BoxHelper(hero, '#4172ff'),
    kb = new g.THREE.BoxHelper(key, '#db8a05')
  w.scene.add(hb, kb)
  let config: WorldState | null = null,
    lastContact: boolean | null = null
  function apply(c: WorldState) {
    config = c
    const full = c.mode === 'view' || c.mode === 'game'
    for (const item of [ground, scenery, lighthouse, boat])
      g.setVisible(item, full ? 'show' : 'hide')
    g.setVisible(bench, full ? 'hide' : 'show')
    g.setPosition(
      hero,
      c.mode === 'view' ? -6.5 : (c.hero?.x ?? -2),
      0.8,
      c.mode === 'view' ? 0.75 : (c.hero?.z ?? 1),
    )
    g.setPosition(key, c.key.x, c.key.y, c.key.z)
    g.setVisible(key, c.visible === false ? 'hide' : 'show')
    g.setPosition(rock, -2, 0, -1.0)
    g.setVisible(rock, c.mode === 'view' ? 'show' : 'hide')
    g.setVisible(hero, 'show')
    g.setColor(lantern, c.light ? '#ffe78b' : '#45536d')
    g.setVisible(beam, c.light ? 'show' : 'hide')
    g.setPosition(boat, c.light ? 6.6 : 8.5, -0.1, 4.5)
    for (const a of axes) g.setVisible(a, c.axes ? 'show' : 'hide')
    g.setVisible(origin, c.mode === 'position' ? 'show' : 'hide')
    g.setVisible(projection, c.axes ? 'show' : 'hide')
    g.setVisible(guide, c.axes ? 'show' : 'hide')
    g.setPosition(projection, c.key.x, 0.08, c.key.z)
    g.setPosition(guide, c.key.x, c.key.y / 2, c.key.z)
    guide.scale.y = Math.max(0.01, c.key.y)
    const cameras: Record<WorldState['view'], [number, number, number]> = {
      front: full ? [0, 12, 21] : [0, 6, 13],
      side: full ? [20, 12, 5] : [13, 7, 0],
      top: full ? [0, 25, 0.01] : [0, 16, 0.01],
    }
    g.setCameraPosition(w, ...cameras[c.view])
    g.setFOV(w, full ? 48 : 60)
    w.camera.lookAt(full ? -1 : 0, full ? 0 : 0.7, 0)
    hb.visible = kb.visible = !!c.bounds
    hb.update()
    kb.update()
    lastContact = null
  }
  window.addEventListener('message', (e) => {
    if (e.source === parent && e.data?.type === 'ilha-state') apply(e.data.state)
  })
  g.animate(w, () => {
    if (!config) return
    const contact = g.collides(hero, key)
    if (contact !== lastContact) {
      lastContact = contact
      parent.postMessage({ type: 'ilha-contact', contact, stamp: JSON.stringify(config) }, '*')
    }
  })
  window.addEventListener('pagehide', () => g.dispose(w), { once: true })
  parent.postMessage({ type: 'ilha-ready' }, '*')
} catch (error) {
  parent.postMessage({ type: 'ilha-error', message: String(error) }, '*')
}
