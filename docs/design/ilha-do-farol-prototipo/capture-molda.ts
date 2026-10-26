import '../../../.cache/ilha-do-farol/runtime.js'
import { islandModels } from './models'
import type { GameAPI } from './world'

// Runs only in the offline export page, never in the approval prototype.
const g = (window as unknown as { SZGame3D: GameAPI }).SZGame3D
const w = g.createFullscreenScene('#94d5f5')
const m = islandModels(g, w)
const T = g.THREE as unknown as typeof import('three')
type Obj = import('three').Object3D
const obj = (x: unknown) => x as Obj
const nameChildren = (parent: Obj, names: string[]) =>
  parent.children.forEach((child, i) => {
    child.name = names[i] ?? `Peça ${i + 1}`
  })
const group = (name: string, children: Obj[]) => {
  const root = new T.Group()
  root.name = name
  for (const child of children) root.add(child)
  return root
}
const ground = obj(m.ground),
  scenery = obj(m.scenery)
nameChildren(ground, [
  'Mar',
  'Água rasa',
  'Espuma da praia',
  'Areia clara',
  'Areia',
  'Gramado',
  'Verde do coqueiro de trás',
  'Verde do coqueiro da frente',
  'Caminho',
  'Espuma da ilhota',
  'Areia clara da ilhota',
  'Areia da ilhota',
])
const sea = group('Mar', [ground.children[0]])
ground.name = 'Terreno e praia'
const sceneryParts = [...scenery.children]
const bridge = group('Ponte', sceneryParts.slice(0, 15))
nameChildren(bridge, [
  ...Array.from({ length: 9 }, (_, i) => `Tábua ${i + 1}`),
  'Poste 1',
  'Poste 2',
  'Poste 3',
  'Poste 4',
  'Corrimão 1',
  'Corrimão 2',
])
const palmBack = sceneryParts[15],
  palmFront = sceneryParts[16]
palmBack.name = 'Coqueiro de trás'
palmFront.name = 'Coqueiro da frente'
for (const palm of [palmBack, palmFront])
  nameChildren(palm, [
    ...Array.from({ length: 6 }, (_, i) => `Tronco ${i + 1}`),
    ...Array.from({ length: 7 }, (_, i) => `Folha ${i + 1}`),
    'Coco 1',
    'Coco 2',
    'Coco 3',
  ])
const grass = group('Vegetação pequena', sceneryParts.slice(17))
nameChildren(
  grass,
  Array.from({ length: 9 }, (_, i) => `Folha ${i + 1}`),
)
obj(m.lighthouse).name = 'Farol'
nameChildren(obj(m.lighthouse), [
  'Torre branca',
  'Faixa vermelha 1',
  'Faixa vermelha 2',
  'Faixa vermelha 3',
  'Base da lanterna',
  'Vidro da lanterna',
  ...Array.from({ length: 8 }, (_, i) => `Moldura ${i + 1}`),
  'Borda do telhado',
  'Telhado',
  'Ponta do telhado',
  'Porta',
  'Arco da porta',
  'Feixe de luz',
])
obj(m.boat).name = 'Veleiro'
nameChildren(obj(m.boat), [
  'Casco',
  'Borda',
  'Interior',
  'Mastro',
  'Vela amarela',
  'Vela branca',
  'Bandeira',
  'Vigia 1',
  'Vigia 2',
  'Vigia 3',
])
obj(m.rock).name = 'Pedras'
nameChildren(obj(m.rock), [
  'Pedra maior — lateral',
  'Pedra maior — topo',
  'Pedra menor — lateral',
  'Pedra menor — topo',
])
obj(m.key).name = 'Chave'
nameChildren(obj(m.key), ['Argola', 'Haste', 'Dente 1', 'Dente 2'])
obj(m.hero).name = 'Aventureiro'
nameChildren(obj(m.hero).children[0], [
  'Camiseta',
  'Rosto',
  'Cabelo superior',
  'Cabelo lateral',
  'Franja esquerda',
  'Franja direita',
  'Olho esquerdo',
  'Pupila esquerda',
  'Olho direito',
  'Pupila direita',
  'Boca',
  'Calça esquerda',
  'Perna esquerda',
  'Sapato esquerdo',
  'Calça direita',
  'Perna direita',
  'Sapato direito',
  'Manga esquerda',
  'Mão esquerda',
  'Manga direita',
  'Mão direita',
])
obj(m.hero).children[0].name = 'Corpo'
obj(m.bench).name = 'Bancada das experiências'
nameChildren(obj(m.bench), ['Base de areia', 'Superfície verde'])
g.setPosition(m.hero, -6.5, 0.8, 0.75)
g.setPosition(m.key, -2, 1, -3)
g.setPosition(m.rock, -2, 0, -1)
g.setPosition(m.boat, 8.5, -0.1, 4.5)
g.setVisible(m.beam, 'hide')
function capture(o: Obj): unknown {
  const mesh = o as import('three').Mesh<
    import('three').BufferGeometry,
    import('three').MeshStandardMaterial
  >
  const visual = mesh.isMesh && mesh.material.opacity > 0
  return {
    name: o.name,
    position: o.position.toArray(),
    rotation: o.quaternion.toArray(),
    scale: o.scale.toArray(),
    visible: o.visible,
    ...(visual
      ? {
          shape: mesh.geometry.type,
          parameters: (mesh.geometry as unknown as { parameters: unknown }).parameters,
          color: mesh.material.color.getHexString(),
          opacity: mesh.material.opacity,
          roughness: mesh.material.roughness,
          metalness: mesh.material.metalness,
        }
      : {}),
    children: o.children.map(capture),
  }
}
const roots = [
  sea,
  ground,
  bridge,
  palmBack,
  palmFront,
  grass,
  obj(m.lighthouse),
  obj(m.boat),
  obj(m.rock),
  obj(m.hero),
  obj(m.key),
]
;(window as unknown as { moldaCapture: unknown }).moldaCapture = {
  roots: roots.map(capture),
  bench: capture(obj(m.bench)),
}
g.dispose(w)
