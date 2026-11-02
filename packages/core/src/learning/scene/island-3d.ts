import type { SceneState } from './state'

/**
 * O número como a tela escreve (vírgula e o sinal de menos U+2212), a mesma régua do `numero` de
 * `cast.ts`. Copiada aqui de propósito: importar `cast.ts` fecharia um ciclo actions → island-3d →
 * cast → actions.
 */
const numero = (n: number) => {
  const r = Number(n.toFixed(2))
  const texto = String(Math.abs(r)).replace('.', ',')
  return r < 0 ? `−${texto}` : texto
}
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
/** O resultado do teste do encontro, dito com a palavra da criança (sem "áreas"). */
export const ISLAND_CONTACT_TEXT = {
  touch: 'Estão encostando.',
  apart: 'Não estão encostando: há um espaço entre eles.',
} as const
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
      // ⚠️ A legenda pede para observar, sem afirmar: que os objetos ficaram no lugar é a descoberta
      // (02/11/2026, convite à investigação).
      s.caption =
        'Agora você olha de outro lugar. Compare com a vista anterior: o que mudou na imagem?'
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
          ? 'Isso mesmo! Mudou o lugar de onde a gente olha.'
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
      s.caption = `${action.axis}: ${numero(before)} → ${numero(action.value)}. Os outros dois valores ficaram iguais.`
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
        s.caption = p.tested ? ISLAND_CONTACT_TEXT.touch : ISLAND_CONTACT_TEXT.apart
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
/**
 * As falas do Zappy nas três experiências da Ilha (02/11/2026, convite à investigação do Cadê e do
 * Farol). ⚠️ ANTES do teste, a fala pede uma ação e diz o que observar, sem contar o resultado; DEPOIS,
 * explica. Na posição, `-plus`/`-minus` convidam a mexer num número e `-found` explica o que aquele
 * número faz só depois de a criança ter ido para mais e para menos nele.
 */
export const ISLAND_SPEECH = {
  'island-view-start':
    'A pedra esconde a chave deste lado. Olhe a ilha de outro lugar e procure a chave. O que você vê agora?',
  'island-view-compare':
    'Você olhou de outro lugar. Compare as vistas e responda: o que mudou quando a chave apareceu?',
  'island-view-complete':
    'Isso mesmo! A chave continuou atrás da mesma pedra. O que mudou foi o lugar de onde você olha: a câmera. Você pode continuar comparando as vistas.',
  'island-position-start':
    'A chave tem três números: x, y e z. Mude um de cada vez, para mais e para menos, e observe para onde a chave vai. Você escolhe por qual começar.',
  'island-position-x-plus': 'Aumente o x e observe a chave. Para onde ela foi?',
  'island-position-x-minus':
    'Agora diminua o x e compare com o que aconteceu antes. A marca dourada guarda o lugar do começo.',
  'island-position-z-plus': 'Aumente o z e observe a chave. Para onde ela foi?',
  'island-position-z-minus':
    'Agora diminua o z e compare os dois sentidos. Você pode repetir quando quiser.',
  'island-position-y-plus':
    'Aumente o y e observe a chave. Se ficar difícil de ver, troque a vista.',
  'island-position-y-minus':
    'Agora diminua o y e compare com o que aconteceu antes. Repare no pontilhado embaixo da chave.',
  'island-position-x-found':
    'Viu? O x leva a chave pelo chão, para um lado e para o outro, e a altura não muda. Agora investigue outro número.',
  'island-position-z-found':
    'Viu? O z também leva a chave pelo chão, mas na outra direção: para a frente e para trás. A altura não muda. Agora investigue outro número.',
  'island-position-y-found':
    'Viu? O y muda a altura: a chave sobe e desce, e o lugar no chão continua o mesmo. No jogo 2D, o y tinha outro papel. Agora investigue outro número.',
  'island-position-complete':
    'Você investigou os três números: o x e o z levam a chave pelo chão, e o y muda a altura. Continue explorando quando quiser.',
  'island-contact-start':
    'De cima, a chave parece estar em cima do personagem. Será que eles estão encostando? Teste o encontro e compare com o que você vê de lado.',
  'island-contact-other':
    'Eles não encostaram, mesmo parecendo juntos de cima. Olhando de lado, dá para ver o espaço entre a chave e o personagem. Mude um dos dois de lugar e teste de novo: dá para fazer os dois se encontrarem?',
  'island-contact-touch-first':
    'Desta vez eles encostaram. Agora mude a altura da chave ou o lugar no chão e teste de novo: quando eles ficam separados?',
  'island-contact-complete':
    'Você comparou os dois casos. A imagem pode enganar: para encostar, os dois precisam se encontrar no chão e também na altura. Continue testando quando quiser.',
} as const
type IslandAxis = 'x' | 'y' | 'z'
const AXIS_ORDER = ['x', 'z', 'y'] as const
/**
 * O número em que a criança está agora, pela última direção NOVA que ela testou: se ele já foi para
 * mais e para menos, `found` (é hora de explicar); se só para um lado, falta o outro. Sem direção
 * nenhuma dentro das metas, sugere o primeiro número ainda não investigado.
 */
export function islandAxisFocus(s: SceneState, goals?: readonly string[]) {
  const p = s.island3d!,
    has = (id: string) => s.evidence.discoveries.includes(id),
    inGoals = (a: IslandAxis) => !goals || goals.includes(`axis-${a}`)
  const last = [...p.directions]
    .reverse()
    .map((d) => d[0] as IslandAxis)
    .find(inGoals)
  if (last && has(`axis-${last}`)) return { axis: last, step: 'found' as const }
  if (last)
    return {
      axis: last,
      step: p.directions.includes(`${last}+`) ? ('minus' as const) : ('plus' as const),
    }
  const next = AXIS_ORDER.find((a) => inGoals(a) && !has(`axis-${a}`))
  return next ? { axis: next, step: 'plus' as const } : null
}
/** O próximo número a investigar, para o destaque do botão: o de agora ou o primeiro que falta. */
export function islandNextAxis(s: SceneState, goals?: readonly string[]): IslandAxis | undefined {
  const focus = islandAxisFocus(s, goals)
  if (focus && focus.step !== 'found') return focus.axis
  return AXIS_ORDER.find(
    (a) => (!goals || goals.includes(`axis-${a}`)) && !s.evidence.discoveries.includes(`axis-${a}`),
  )
}
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
  const focus = islandAxisFocus(s, goals)
  const id: keyof typeof ISLAND_SPEECH = done
    ? `island-${p.mode}-complete`
    : p.mode === 'view'
      ? has('other-view')
        ? 'island-view-compare'
        : 'island-view-start'
      : p.mode === 'position'
        ? p.directions.length && focus
          ? `island-position-${focus.axis}-${focus.step}`
          : 'island-position-start'
        : has('contact-apart')
          ? 'island-contact-other'
          : has('contact-touch')
            ? 'island-contact-touch-first'
            : 'island-contact-start'
  return { id, text: ISLAND_SPEECH[id] }
}
