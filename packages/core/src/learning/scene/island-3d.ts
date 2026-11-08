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
 * As falas do Zappy nas três experiências da Ilha.
 *
 * ⭐ 08/11/2026 (proposta "Experiências do Faísca", aprovada): falas curtas (no máximo 12
 * palavras), uma coisa por vez, na língua da tela nova: a câmera é um controle com três lugares
 * (Frente, Lado, Cima), cada número tem − e + com a cor do eixo do Estúdio 3D, e no contato o jogo
 * confere o encontro o tempo todo (o resultado fica na cena). Antes do teste, a fala pede uma ação;
 * o que cada número faz só aparece depois de a criança ir para os dois lados dele.
 *
 * ⚠️ As falas não usam "−" nem "+": a voz leria os sinais.
 *
 * `-idea` e `-bridge` de cada modo são a ideia e o "No seu jogo:" do cartão dourado do fim.
 */
export const ISLAND_SPEECH = {
  'island-view-start': 'A chave está atrás da pedra. Mude a câmera!',
  'island-view-compare': 'Apareceu! O que mudou: a câmera ou a chave?',
  'island-view-wrong': 'Volte para a frente: a chave saiu do lugar?',
  'island-view-idea':
    'No 3D, a câmera é o lugar de onde a gente olha. Mudar a câmera muda a imagem, mas as coisas continuam no mesmo lugar.',
  'island-view-bridge':
    'No seu jogo: a câmera já está pronta; o que você vai mudar é o lugar das coisas.',
  'island-view-complete': 'Mudou a câmera. A chave ficou no mesmo lugar.',
  'island-position-start': 'A chave tem três números. Mude um para mais e para menos!',
  'island-position-other-side': 'Agora o mesmo número para o outro lado.',
  'island-position-next': 'E os outros números? Teste um de cada vez.',
  'island-position-idea':
    'No 3D, o lugar tem três números: x e z andam pelo chão, e o y é a altura.',
  'island-position-bridge': 'No seu jogo: você vai escolher os três números do lugar das coisas.',
  'island-position-complete': 'x e z andam no chão. O y é a altura.',
  'island-contact-start': 'De cima, parece junto. Será que encostou? Olhe de lado!',
  'island-contact-top': 'Não encostou! Olhe de lado: por quê?',
  'island-contact-space': 'Tem um espaço! Baixe a chave até encostar.',
  'island-contact-idea':
    'A imagem pode enganar: de cima, parece junto. O jogo só conta o encontro quando os dois se tocam de verdade, inclusive na altura.',
  'island-contact-bridge':
    'No seu jogo: o encontro do personagem com a chave vai acontecer só quando eles encostarem.',
  'island-contact-complete': 'Parecer junto não basta: precisa encostar.',
} as const
type IslandAxis = 'x' | 'y' | 'z'
const AXES: readonly IslandAxis[] = ['x', 'y', 'z']

/**
 * Qual fala vale agora. As metas da atividade (`goals`) decidem o que conta como "tudo
 * descoberto"; sem elas, valem as de fábrica de cada modo.
 */
export function islandGuidance(s: SceneState, goals?: readonly string[]) {
  const p = s.island3d!,
    has = (id: string) => s.evidence.discoveries.includes(id)
  const deFabrica =
    p.mode === 'view'
      ? ['other-view', 'same-place']
      : p.mode === 'position'
        ? ['axis-x', 'axis-y', 'axis-z']
        : ['contact-apart', 'contact-touch']
  const metas = goals?.length ? deFabrica.filter((g) => goals.includes(g)) : deFabrica
  const done = (metas.length ? metas : deFabrica).every(has)
  const id: keyof typeof ISLAND_SPEECH = done
    ? `island-${p.mode}-complete`
    : p.mode === 'view'
      ? !has('other-view')
        ? 'island-view-start'
        : p.answer === 'key'
          ? 'island-view-wrong'
          : 'island-view-compare'
      : p.mode === 'position'
        ? p.directions.length === 0
          ? 'island-position-start'
          : AXES.some((a) => !has(`axis-${a}`) && p.directions.some((d) => d[0] === a))
            ? 'island-position-other-side'
            : 'island-position-next'
        : !has('contact-apart')
          ? 'island-contact-start'
          : p.view === 'top'
            ? 'island-contact-top'
            : 'island-contact-space'
  return { id, text: ISLAND_SPEECH[id] }
}
