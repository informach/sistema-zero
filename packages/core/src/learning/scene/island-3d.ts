import type { SceneState } from './state'
export type IslandView = 'front' | 'side' | 'top'
export type IslandMode = 'view' | 'position' | 'contact'
export type IslandPoint = { x: number; y: number; z: number }
export interface IslandState {
  mode: IslandMode
  view: IslandView
  key: IslandPoint
  before: IslandPoint | null
  hero: { x: number; z: number }
  bounds: boolean
  directions: string[]
  tested: boolean | null
  answer: 'camera' | 'key' | null
}
export type IslandAction =
  | { type: 'island-view'; view: IslandView }
  | { type: 'island-axis'; axis: 'x' | 'y' | 'z'; value: number }
  | { type: 'island-hero'; axis: 'x' | 'z'; value: number }
  | { type: 'island-answer'; answer: 'camera' | 'key' }
  | { type: 'island-test' }
  | { type: 'island-restart' }
  | { type: 'island-bounds'; visible: boolean }
export const ISLAND_ORIGIN = { x: -2, y: 1, z: -3 }
export function initialIsland(goals?: readonly string[]): IslandState {
  const mode = goals?.some((g) => g.startsWith('contact-'))
    ? 'contact'
    : goals?.some((g) => g.startsWith('axis-'))
      ? 'position'
      : 'view'
  return {
    mode,
    view: mode === 'contact' ? 'top' : 'front',
    key: mode === 'contact' ? { x: 0, y: 3, z: 1 } : { ...ISLAND_ORIGIN },
    before: null,
    hero: { x: 0, z: 1 },
    bounds: false,
    directions: [],
    tested: null,
    answer: null,
  }
}
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v)
const coordinate = (v: unknown, min: number, max: number) =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max
export function isIslandAction(
  v: Record<string, unknown>,
): v is Record<string, unknown> & IslandAction {
  switch (v.type) {
    case 'island-view':
      return typeof v.view === 'string' && ['front', 'side', 'top'].includes(v.view)
    case 'island-axis':
      return (
        typeof v.axis === 'string' &&
        ['x', 'y', 'z'].includes(v.axis) &&
        coordinate(v.value, v.axis === 'y' ? 0 : -4, 4)
      )
    case 'island-hero':
      return typeof v.axis === 'string' && ['x', 'z'].includes(v.axis) && coordinate(v.value, -4, 4)
    case 'island-answer':
      return v.answer === 'camera' || v.answer === 'key'
    case 'island-test':
    case 'island-restart':
      return true
    case 'island-bounds':
      return typeof v.visible === 'boolean'
    default:
      return false
  }
}
export function isIslandState(v: unknown): v is IslandState {
  if (!record(v)) return false
  const point = (p: unknown) =>
    record(p) && coordinate(p.x, -4, 4) && coordinate(p.y, 0, 4) && coordinate(p.z, -4, 4)
  return (
    typeof v.mode === 'string' &&
    ['view', 'position', 'contact'].includes(v.mode) &&
    typeof v.view === 'string' &&
    ['front', 'side', 'top'].includes(v.view) &&
    point(v.key) &&
    (v.before === null || point(v.before)) &&
    record(v.hero) &&
    coordinate(v.hero.x, -4, 4) &&
    coordinate(v.hero.z, -4, 4) &&
    typeof v.bounds === 'boolean' &&
    (v.tested === null || typeof v.tested === 'boolean') &&
    [null, 'camera', 'key'].includes(v.answer as null | string) &&
    Array.isArray(v.directions) &&
    v.directions.length <= 6 &&
    new Set(v.directions).size === v.directions.length &&
    v.directions.every((d) => ['x+', 'x-', 'y+', 'y-', 'z+', 'z-'].includes(d))
  )
}
/** Pedagogical contact boxes, also drawn by the 3D stage; y is height. */
export const ISLAND_CONTACT = {
  hero: { width: 0.85, height: 1.6, depth: 0.75, y: 0.8 },
  key: { width: 1.04, height: 1.02, depth: 0.68 },
}
export function islandContact(s: IslandState) {
  const h = ISLAND_CONTACT.hero,
    k = ISLAND_CONTACT.key
  return (
    Math.abs(s.key.x - s.hero.x) <= (h.width + k.width) / 2 &&
    Math.abs(s.key.y - h.y) <= (h.height + k.height) / 2 &&
    Math.abs(s.key.z - s.hero.z) <= (h.depth + k.depth) / 2
  )
}
export function stepIsland(s: SceneState, action: IslandAction): SceneState {
  const p = s.island3d!
  const discover = (id: string) => {
    if (!s.evidence.discoveries.includes(id)) s.evidence.discoveries.push(id)
  }
  switch (action.type) {
    case 'island-view':
      p.view = action.view
      if (p.mode === 'view' && action.view !== 'front') discover('other-view')
      s.caption = 'O ponto de vista mudou. Os objetos continuam no mesmo lugar.'
      break
    case 'island-answer':
      p.answer = action.answer
      if (
        p.mode === 'view' &&
        s.evidence.discoveries.includes('other-view') &&
        action.answer === 'camera'
      )
        discover('same-place')
      s.caption = !s.evidence.discoveries.includes('other-view')
        ? 'Compare as vistas para conferir sua ideia.'
        : action.answer === 'camera'
          ? 'Isso mesmo! Mudou o lugar de onde olhamos.'
          : 'Compare outra vista: a chave continua atrás da mesma pedra.'
      break
    case 'island-axis': {
      if (p.mode === 'view') break
      const before = p.key[action.axis]
      if (before === action.value) break
      p.before = { ...p.key }
      p.key[action.axis] = action.value
      p.tested = null
      const direction = action.axis + (action.value > before ? '+' : '-')
      if (!p.directions.includes(direction)) p.directions.push(direction)
      if (
        p.mode === 'position' &&
        p.directions.includes(`${action.axis}+`) &&
        p.directions.includes(`${action.axis}-`)
      )
        discover(`axis-${action.axis}`)
      s.caption = `${action.axis}: ${before} → ${action.value}. Os outros dois valores ficaram iguais.`
      break
    }
    case 'island-hero':
      if (p.mode === 'contact') {
        p.hero[action.axis] = action.value
        p.tested = null
        s.caption = 'O personagem mudou de lugar. Teste o encontro para conferir.'
      }
      break
    case 'island-test':
      if (p.mode === 'contact') {
        p.tested = islandContact(p)
        discover(p.tested ? 'contact-touch' : 'contact-apart')
        s.caption = p.tested
          ? 'As áreas se encontram: há contato.'
          : 'As áreas estão separadas: não há contato.'
      }
      break
    case 'island-bounds':
      p.bounds = action.visible
      break
    case 'island-restart':
      s.island3d = initialIsland(
        p.mode === 'contact' ? ['contact-apart'] : p.mode === 'position' ? ['axis-x'] : [],
      )
      s.island3d.directions = [...p.directions]
      s.caption = 'Outra tentativa. As descobertas continuam marcadas.'
      break
  }
  return s
}
export const ISLAND_SPEECH = {
  'island-view-start':
    'A pedra esconde a chave deste lado. Experimente olhar de outro lugar. O que muda?',
  'island-view-compare':
    'Você já mudou o ponto de vista. Compare as vistas e responda: o que mudou quando a chave apareceu?',
  'island-position-start':
    'Experimente os três valores. O x e o z mudam o lugar no chão. O y muda a altura. Você escolhe por qual começar.',
  'island-position-x-plus':
    'Aumente x e observe para onde a chave vai no chão. Você também pode testar os outros valores.',
  'island-position-x-minus':
    'Agora diminua x e compare com o movimento anterior. A marca dourada continua no lugar inicial.',
  'island-position-z-plus':
    'Experimente aumentar z. Observe a outra direção do chão; a altura continua igual.',
  'island-position-z-minus':
    'Diminua z e compare os dois sentidos dessa direção do chão. Você pode repetir quando quiser.',
  'island-position-y-plus':
    'Aumente y e observe a altura da chave. Olhar de lado ajuda a enxergar essa mudança.',
  'island-position-y-minus': 'Diminua y e compare a altura. O pontilhado liga a chave ao chão.',
  'island-contact-start':
    'De cima, a chave parece estar sobre o personagem. Teste o encontro e compare com a vista de lado. Todos os controles estão livres.',
  'island-contact-other':
    'Você testou um caso. Mude a altura ou o lugar no chão e teste novamente para comparar contato e separação.',
  'island-complete':
    'Você fez as comparações. Continue explorando: pode mudar os valores, trocar a vista e repetir os testes.',
} as const
export function islandGuidance(s: SceneState, goals?: readonly string[]) {
  const p = s.island3d!,
    has = (id: string) => s.evidence.discoveries.includes(id)
  const done = goals
    ? goals.every(has)
    : p.mode === 'view'
      ? has('same-place')
      : p.mode === 'position'
        ? ['x', 'y', 'z'].every((a) => has(`axis-${a}`))
        : has('contact-apart') && has('contact-touch')
  const axis = (['x', 'z', 'y'] as const).find(
    (a) => (!goals || goals.includes(`axis-${a}`)) && !has(`axis-${a}`),
  )
  const axisId = axis
    ? (`island-position-${axis}-${p.directions.includes(`${axis}+`) ? 'minus' : 'plus'}` as const)
    : 'island-position-start'
  const id = done
    ? 'island-complete'
    : p.mode === 'view'
      ? has('other-view')
        ? 'island-view-compare'
        : 'island-view-start'
      : p.mode === 'position'
        ? p.directions.length
          ? axisId
          : 'island-position-start'
        : has('contact-apart') || has('contact-touch')
          ? 'island-contact-other'
          : 'island-contact-start'
  return { id, text: ISLAND_SPEECH[id] }
}
