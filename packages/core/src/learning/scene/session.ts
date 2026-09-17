import {
  isRecord,
  isSceneAction,
  type SceneAction,
  type SceneId,
  sceneFrameRate,
  sceneLongFrame,
} from './actions'

/** Os mesmos tetos do validador de roteiro — um checkpoint não pode apontar para um passo
 *  que nenhum roteiro válido teria. */
const SCRIPT_STEPS = 12
const SCRIPT_ACTIONS = 16

import type { SceneStep } from './catalog'
import { openScene, stepScene } from './engine'
import {
  cloneScene,
  hydrateSceneState,
  isSceneState,
  type MatchScreen,
  type SceneStart,
  type SceneState,
} from './state'

/**
 * A sessão: o estado da cena mais o que só existe enquanto a criança está nela.
 *
 * ⚠️ São DUAS sessões, uma por tipo. Antes era uma só, com um campo `demo` que ficava `null`
 * na experimentação — e o `stepExperience` virava uma sucessão de `if (!next.demo)`. Pior:
 * a sessão carregava um `demo.learner` que nunca era atualizado mas tinha PRECEDÊNCIA na
 * avaliação, e um `demo.past` que nunca recebia nada. Separando, cada sessão tem só os seus
 * campos e nenhum caminho morto sobra.
 */

/** Um retrato para comparar lado a lado. A criança guarda no máximo dois. */
export interface SceneTrial {
  label: string
  state: {
    force: number
    gravity: boolean
    peak: number
    distance: number
    width: number
    y: number
    soundCount: number
    jumpCount: number
    soundOnJump: boolean
    screen: MatchScreen
    points: number
    born: number
    removed: number
  }
}

/**
 * O caminho de volta: o retrato vira um estado de cena de novo, para ser DESENHADO.
 *
 * ⚠️ O retrato é achatado de propósito (ele viaja até o servidor, e guardar o estado inteiro
 * duas vezes por sessão custa caro). Quem o desenha precisa recompor os grupos — espalhar o
 * retrato por cima de um estado inicial só empilha chaves órfãs no topo e a comparação mostra
 * a cena INICIAL: a criança guarda um salto de impulso 14 e vê o de 9, lado a lado com o de
 * agora. O `tsc` não pega (o objeto passa por variável, sem checagem de excesso), então a
 * recomposição mora aqui, num lugar só, com teste.
 */
export function sceneFromTrial(start: SceneStart, trial: SceneTrial): SceneState {
  const base = openScene(start)
  const t = trial.state
  return {
    ...base,
    flight: {
      ...base.flight,
      force: t.force,
      gravity: t.gravity,
      peak: t.peak,
      y: t.y,
      atForce: t.force,
      atGravity: t.gravity,
    },
    contact: { distance: t.distance, width: t.width },
    sound: { ...base.sound, onJump: t.soundOnJump, count: t.soundCount, jumps: t.jumpCount },
    match: { ...base.match, screen: t.screen, points: t.points },
    crowd: { ...base.crowd, born: t.born, removed: t.removed },
  }
}

export function sceneTrial(state: SceneState, label: string): SceneTrial {
  // Depois de um salto, o que interessa comparar são as condições DAQUELE voo, não as que
  // estão nos controles agora.
  const saltou = state.sound.jumps > 0
  return {
    label,
    state: {
      force: saltou ? state.flight.atForce : state.flight.force,
      gravity: saltou ? state.flight.atGravity : state.flight.gravity,
      peak: state.flight.peak,
      distance: state.contact.distance,
      width: state.contact.width,
      y: state.flight.y,
      soundCount: state.sound.count,
      jumpCount: state.sound.jumps,
      soundOnJump: state.sound.onJump,
      screen: state.match.screen,
      points: state.match.points,
      born: state.crowd.born,
      removed: state.crowd.removed,
    },
  }
}

export interface SceneEvent {
  type: 'discovery' | 'jump' | 'sound' | 'landed' | 'viewed'
  id: string
}

// ── Experimentação ────────────────────────────────────────────────────────────────

export interface ExperimentSession {
  state: SceneState
  /** Pilha de desfazer, limitada. O estado atual e as descobertas nunca entram nela. */
  past: SceneState[]
  trials: SceneTrial[]
}
export type ExperimentCommand = SceneAction | { type: 'capture' } | { type: 'undo' }

export const SESSION_LIMITS = {
  past: 4,
  trials: 2,
  population: 500,
  segment: 100,
  /**
   * ⚠️⚠️ O tempo que UM comando da criança pode pedir: 1 s e 30 quadros da cena (review do lote 4).
   * Com o relógio de quadro fixo o custo de um `advance` no servidor cresce com os QUADROS: um
   * segmento de 100 comandos de 30 s (o teto do `SCENE_LIMITS`, que é o do professor) custava ~0,25 s
   * de CPU do members por requisição na `spawn`. O player nunca manda mais que ~0,3 s por fatia do ▶
   * nem mais que 1 s no passo (o de produção, 0,2 s), então o teto não recusa ninguém de verdade, e
   * um segmento passa a rodar no máximo 3.000 quadros. O caso e o roteiro do professor não passam
   * por aqui e seguem com a régua da cena.
   */
  advanceSeconds: 1,
  advanceFrames: 30,
} as const

export function initialExperiment(start: SceneStart): ExperimentSession {
  return { state: openScene(start), past: [], trials: [] }
}

export function isExperimentCommand(value: unknown, start: SceneStart): value is ExperimentCommand {
  if (!isRecord(value)) return false
  if (value.type === 'capture' || value.type === 'undo') return Object.keys(value).length === 1
  if (!isSceneAction(value, start.scene)) return false
  if (value.type !== 'advance') return true
  const quadros = value.seconds * (sceneFrameRate(start.scene) ?? 0)
  return (
    value.seconds <= SESSION_LIMITS.advanceSeconds && quadros <= SESSION_LIMITS.advanceFrames + 1e-6
  )
}

export function stepExperiment(
  start: SceneStart,
  previous: ExperimentSession,
  command: ExperimentCommand,
): { session: ExperimentSession; events: SceneEvent[] } {
  if (!isExperimentCommand(command, start)) throw new Error('Comando de experimentação inválido.')
  const before = previous.state
  const next: ExperimentSession = {
    state: before,
    past: [...previous.past],
    trials: [...previous.trials],
  }

  if (command.type === 'capture') {
    next.trials = [
      ...next.trials,
      sceneTrial(before, `Experiência ${before.evidence.actions + 1}`),
    ].slice(-SESSION_LIMITS.trials)
    next.state = cloneScene(before)
    next.state.evidence.actions = before.evidence.actions + 1
  } else if (command.type === 'undo') {
    const anterior = next.past.pop()
    if (anterior) {
      next.state = cloneScene(anterior)
      // Desfazer volta o MUNDO, nunca o que a criança já aprendeu.
      next.state.evidence = { ...before.evidence, actions: before.evidence.actions + 1 }
      // ⚠️⚠️ Desfazer também é GESTO, e nas cenas de quadro longo ele recomeça o quadro como os
      // outros (`stepScene`). O retrato guarda a sobra de ANTES do gesto desfeito: voltar com ela
      // fechava o quadro logo depois, e "no início o placar ficou parado" contava o segundo em que a
      // partida estava rodando.
      if (sceneLongFrame(start.scene)) next.state.clock = { carry: 0 }
    }
  } else {
    // Deixar o tempo correr e pedir dica não são passos de desfazer: a criança espera que
    // "voltar" desfaça o que ELA montou.
    if (command.type !== 'advance' && command.type !== 'hint')
      next.past = [...next.past, withoutEvidence(before)].slice(-SESSION_LIMITS.past)
    next.state = stepScene(start, before, command)
    if (command.type === 'advance') next.state.evidence.actions = before.evidence.actions
  }

  // Memória de desfazer limitada pela POPULAÇÃO, não pela duração: uma sessão longa numa
  // cena calma não deve custar mais que uma curta numa cena cheia.
  const populacao = () =>
    next.state.crowd.cacti.length + next.past.reduce((n, s) => n + s.crowd.cacti.length, 0)
  while (next.past.length && populacao() > SESSION_LIMITS.population) next.past.shift()

  return { session: next, events: sceneEvents(before, next.state, command.type, true) }
}

function withoutEvidence(state: SceneState): SceneState {
  const copia = cloneScene(state)
  copia.evidence = { actions: state.evidence.actions, discoveries: [], observations: [], hints: 0 }
  return copia
}

// ── Demonstração ──────────────────────────────────────────────────────────────────

export interface DemonstrationSession {
  state: SceneState
  /** Em que passo do roteiro a demonstração está. */
  step: number
  /** Qual ação DENTRO do passo está sendo tocada. */
  action: number
  elapsed: number
  /** O passo terminou e espera a criança pedir o próximo. */
  ready: boolean
  viewed: boolean
  before?: SceneTrial
}
export type DemonstrationCommand =
  | { type: 'start' }
  | { type: 'next' }
  | { type: 'tick'; seconds: number }

/** Respiro entre duas ações do roteiro, para a criança ver uma coisa de cada vez. */
const BREATH = 0.45
const MAX_TICK = 1

export function initialDemonstration(start: SceneStart): DemonstrationSession {
  return { state: openScene(start), step: 0, action: 0, elapsed: 0, ready: false, viewed: false }
}

export function isDemonstrationCommand(value: unknown): value is DemonstrationCommand {
  if (!isRecord(value)) return false
  if (value.type === 'start' || value.type === 'next') return Object.keys(value).length === 1
  return (
    value.type === 'tick' &&
    typeof value.seconds === 'number' &&
    Number.isFinite(value.seconds) &&
    value.seconds >= 0.001 &&
    value.seconds <= MAX_TICK
  )
}

/**
 * Como o SERVIDOR rejoga uma demonstração.
 *
 * ⚠️⚠️ `tolerarPlayerAnterior` existe por causa do DEPLOY (lote 1 do Raio-X, consertos). Até o
 * lote 1 a etapa com `waitFor` acabava na primeira fatia em que a descoberta acontecia; hoje ela
 * dura o `advance` inteiro. Uma aba aberta antes do deploy continua mandando os comandos do jeito
 * antigo: o `next` chega com a etapa "ainda não pronta" no servidor novo e é ignorado, e na última
 * etapa ela para de mandar tique — a demonstração assistida inteira nunca era registrada (medido
 * em 10 modelos, entre eles a obrigatória da Aula 5). Os deploys do Railway não são atômicos, então
 * a janela existe também sem aba velha: o members sobe antes do kids.
 *
 * Tolerante, o servidor aceita o que o player antigo considerava pronto: a etapa está na ÚLTIMA
 * ação, ela é `advance` e o `waitFor` já foi descoberto. O cliente continua estrito (nunca passa
 * a opção), e é por isso que ela não muda nada para o player novo: ele só manda `next` com a
 * etapa pronta de verdade.
 *
 * ⚠️⚠️ Com o relógio de quadro fixo (lote 4) "já foi descoberto" deixou de bastar. O player antigo
 * decide pelo motor DELE, que contava um quadro por fatia: a `pool` fechava "criados chegou a 3" em
 * 0,15 s, e o servidor, a um corpo por segundo, só em 3 s. Ele mandava o `next` (ou parava de mandar
 * tique na última etapa) com a descoberta ainda por vir no servidor, e 6 dos 45 modelos voltavam a
 * não registrar (medido com o motor de produção). Por isso a tolerância olha o FIM da ação: o
 * servidor toca o resto do `advance` numa cópia e aceita se a descoberta prometida está lá, que é
 * exatamente o que o player novo teria visto. No `next` a cópia VIRA o estado (a etapa seguinte
 * começa de onde o roteiro a deixa); na última etapa ela só marca `viewed`.
 *
 * ⚠️⚠️ Só para o player ANTERIOR (review do lote 4): o members passa `!sceneSegmentHasClock(...)`.
 * Ligada para todos, a folga valia também para o player novo e para sempre: um tique de 0,04 s na
 * última ação marcava "assistida" com quase todo o `advance` final por ver (13 demonstrações, entre
 * elas a `velocity` das Aulas 5 e 12 do Corre Dino, com 0,96 s faltando).
 */
export interface DemonstrationReplayOptions {
  tolerarPlayerAnterior?: boolean
}

/**
 * A etapa na forma em que o player anterior a dava por pronta: na ÚLTIMA ação, um `advance` já
 * começado, numa etapa que espera uma descoberta. Devolve o estado com o RESTO do `advance` tocado
 * (numa cópia) quando a descoberta prometida está nele, ou `null`.
 */
function fimDaEspera(
  start: SceneStart,
  sessao: DemonstrationSession,
  script: readonly SceneStep[],
  semFim?: Set<string>,
): SceneState | null {
  const passo = script[sessao.step]
  const acao = passo?.actions[sessao.action]
  if (!passo?.waitFor || sessao.action !== passo.actions.length - 1) return null
  if (acao?.type !== 'advance' || sessao.elapsed <= 0) return null
  const chave = `${sessao.step}:${sessao.action}`
  if (semFim?.has(chave)) return null
  const resto = acao.seconds - sessao.elapsed
  const fim =
    resto >= 0.001
      ? stepScene(start, sessao.state, { type: 'advance', seconds: resto })
      : cloneScene(sessao.state)
  if (fim.evidence.discoveries.includes(passo.waitFor)) return fim
  semFim?.add(chave)
  return null
}

export function stepDemonstration(
  start: SceneStart,
  script: readonly SceneStep[],
  previous: DemonstrationSession,
  command: DemonstrationCommand,
  opcoes: DemonstrationReplayOptions = {},
): { session: DemonstrationSession; events: SceneEvent[] } {
  return passoDaDemonstracao(start, script, previous, command, opcoes)
}

/**
 * ⚠️⚠️ O CUSTO da tolerância por requisição (full review final de dados e deploy, MÉDIO-2).
 *
 * `fimDaEspera` toca o RESTO do `advance` numa cópia (até os 10 s do `scriptAdvance`). Chamado a cada
 * comando, um segmento de 100 comandos rodava o resto 100 vezes: 185 ms de CPU do members por
 * requisição num roteiro autorável da `spawn`, com 300 requisições por minuto por conta e uma réplica.
 * Duas travas, nenhuma muda o que o player anterior registra:
 * - o `next` na ÚLTIMA etapa não toca nada (não há etapa seguinte para onde a cópia iria; aplicá-la
 *   só adiantava o mundo, e o tique seguinte tocava o mesmo resto de novo por cima dele);
 * - `semFim`, por segmento: a (etapa, ação) cuja espera já se provou impossível não é tocada de novo.
 *   O relógio de quadro fixo toca o mesmo mundo em qualquer fatiamento (`clock.test.ts`), então o fim
 *   do `advance` visto de um ponto mais adiante da MESMA ação é o mesmo: a resposta continua `null`.
 * O custo fica em no máximo um resto por (etapa, ação) por requisição.
 */
function passoDaDemonstracao(
  start: SceneStart,
  script: readonly SceneStep[],
  previous: DemonstrationSession,
  command: DemonstrationCommand,
  { tolerarPlayerAnterior = false }: DemonstrationReplayOptions,
  semFim?: Set<string>,
): { session: DemonstrationSession; events: SceneEvent[] } {
  if (!isDemonstrationCommand(command)) throw new Error('Comando de demonstração inválido.')
  const before = previous.state
  const next: DemonstrationSession = { ...previous }

  /**
   * ⚠️⚠️ O ROTEIRO pode ter ENCOLHIDO desde que a sessão foi guardada (consertos do review da onda A do
   * lote 5, A3). O roteiro do modelo das `lives` passou de 4 para 3 etapas, e o bloco publicado do Dia 4
   * (mesma revisão) seguia valendo: quem parou na 4ª etapa reabria com `step=3`, o primeiro tique
   * LANÇAVA "Etapa de demonstração inválida." no player e o members respondia 500. Etapa ou ação que
   * não existe mais não é erro de protocolo: é roteiro novo, e a demonstração recomeça do zero, sem
   * perder o `viewed` (rever nunca desconclui). Vale para qualquer lote futuro que encurte um roteiro.
   */
  const passoGuardado = script[previous.step]
  const acoesDoPasso = passoGuardado?.actions.length ?? 0
  if (
    command.type !== 'start' &&
    (!passoGuardado ||
      previous.action > acoesDoPasso ||
      (previous.action === acoesDoPasso && !previous.ready))
  ) {
    const inicio = openScene(start)
    return {
      session: {
        state: inicio,
        step: 0,
        action: 0,
        elapsed: 0,
        ready: false,
        viewed: previous.viewed,
        before: sceneTrial(inicio, 'Antes desta etapa'),
      },
      events: [],
    }
  }

  if (command.type === 'start') {
    const inicio = openScene(start)
    return {
      session: {
        state: inicio,
        step: 0,
        action: 0,
        elapsed: 0,
        ready: false,
        // ⚠️ Rever NÃO desconclui. A criança que terminou e clicou em "assistir de novo"
        // não pode perder o bloco que já estava concluído.
        viewed: previous.viewed,
        before: sceneTrial(inicio, 'Antes desta etapa'),
      },
      events: [],
    }
  }

  if (command.type === 'next') {
    const fim =
      !next.ready && tolerarPlayerAnterior && next.step < script.length - 1
        ? fimDaEspera(start, next, script, semFim)
        : null
    // ⚠️ Aceito, o `next` do player anterior completa a ação que ele pulou: a etapa seguinte começa
    // do estado em que o roteiro deixa esta, e não do meio do `advance`.
    if (fim) next.state = fim
    const pronta = next.ready || fim !== null
    if (pronta && next.step < script.length - 1) {
      next.step += 1
      next.action = 0
      next.elapsed = 0
      next.ready = false
      next.before = sceneTrial(next.state, 'Antes desta etapa')
    }
    return { session: next, events: [] }
  }

  if (next.ready) return { session: next, events: [] }
  const passo = script[next.step]
  if (!passo) throw new Error('Etapa de demonstração inválida.')
  const acao = passo.actions[next.action]
  if (!acao) throw new Error('Ação de demonstração inválida.')

  next.elapsed += command.seconds
  if (acao.type === 'advance') {
    // O tempo do roteiro é consumido em fatias do tamanho do quadro, para a criança ver o
    // movimento acontecer em vez de receber o resultado pronto.
    const restante = acao.seconds - (next.elapsed - command.seconds)
    // ⚠️⚠️ A SOBRA nunca se perde. O player acumula quadros do `requestAnimationFrame` até
    // ~0,04 s, e a soma das fatias fica ora um fio acima, ora um fio abaixo do segundo inteiro:
    // quando ficava abaixo, a sobra (< 0,001 s) era jogada fora, e na `circle-collision` a
    // distância parava em 60,0016 contra 60 — a batida do roteiro sumia em ~9 de cada 10 vezes.
    // Se o que resta depois deste tique não chega a um milésimo, ele é consumido INTEIRO agora.
    const encerra = restante - command.seconds < 0.001
    const fatia = encerra ? restante : command.seconds
    if (fatia >= 0.001)
      next.state = stepScene(start, next.state, { type: 'advance', seconds: fatia })
    // ⚠️⚠️ A etapa só termina com o `advance` INTEIRO consumido, mesmo quando ela espera uma
    // descoberta (`waitFor`). Encerrar na primeira fatia em que a descoberta acontecia fazia o
    // roteiro "avance 1 s" durar uma fatia de 0,05 s: na `velocity` o Dino andava 2,5 px e a
    // fala dizia "a cada quadro ele anda um pouco para a direita" sobre um movimento invisível.
    // O `waitFor` continua sendo a PROMESSA que o validador (`playsOut`) confere tocando o
    // roteiro inteiro; aqui ele não encurta mais o tempo que o professor escreveu.
    if (encerra) {
      next.action += 1
      next.elapsed = 0
    }
  } else if (next.elapsed >= BREATH) {
    next.state = stepScene(start, next.state, acao)
    next.action += 1
    next.elapsed = 0
  }

  if (next.action >= passo.actions.length) {
    next.ready = true
    if (next.step === script.length - 1) next.viewed = true
  }
  // O player anterior parava de mandar tique na última etapa assim que a descoberta acontecia NO
  // MOTOR DELE. ⚠️ Aqui o estado não muda: o player novo continua mandando os tiques dessa ação, e
  // tocar o resto agora os aplicaria duas vezes.
  if (
    tolerarPlayerAnterior &&
    !next.viewed &&
    !next.ready &&
    next.step === script.length - 1 &&
    fimDaEspera(start, next, script, semFim)
  )
    next.viewed = true

  const events = sceneEvents(before, next.state, 'tick', false)
  if (next.viewed && !previous.viewed) events.push({ type: 'viewed', id: 'viewed' })
  return { session: next, events }
}

/**
 * A cena FAZ som? É a pergunta que decide se o player oferece "Ligar som".
 *
 * ⚠️⚠️ O botão aparecia em TODAS as cenas e em toda demonstração (lote 2 do Raio-X, 16/09/2026),
 * mas o único gerador de evento `sound` é o salto da `jump-sound`: nas outras 44 ele era um botão
 * mudo, que ensina a criança que o som está quebrado. A régua é a de LEGALIDADE (a porta `sound`
 * existe nesta cena), como o relógio já faz com `advance`, e não uma lista escrita no player.
 * `session.test.ts` confere contra o MOTOR: cena que diz não nunca emite som, e a que diz sim emite.
 */
export function sceneEmitsSound(scene: SceneId): boolean {
  return isSceneAction({ type: 'connect', port: 'sound', enabled: true }, scene)
}

/**
 * O que aconteceu no mundo entre dois estados. O player usa isto para o som e a animação.
 *
 * ⚠️ Descoberta feita DURANTE uma demonstração não conta: quem conduziu foi o roteiro, e
 * creditar a criança por assistir tiraria o sentido da experimentação que vem depois.
 */
function sceneEvents(
  before: SceneState,
  after: SceneState,
  command: string,
  colheDescobertas: boolean,
): SceneEvent[] {
  const events: SceneEvent[] = []
  if (after.sound.jumps > before.sound.jumps)
    events.push({ type: 'jump', id: String(after.sound.jumps) })
  if (after.sound.count > before.sound.count)
    events.push({ type: 'sound', id: String(after.sound.count) })
  if (before.flight.time !== null && after.flight.time === null && command !== 'reset')
    events.push({ type: 'landed', id: String(after.sound.jumps) })
  if (colheDescobertas)
    for (const id of after.evidence.discoveries)
      if (!before.evidence.discoveries.includes(id)) events.push({ type: 'discovery', id })
  return events
}

// ── O que vai e volta do servidor ─────────────────────────────────────────────────

/** O que o cliente MANDA: um punhado de comandos a aplicar sobre a versão que ele conhece. */
export interface SceneSegment {
  sessionId: string
  segmentId: string
  baseSequence: number
  commands: unknown[]
}
/** O que o servidor GUARDA: a sessão inteira, com a versão que ela representa. */
export interface SceneCheckpoint<S> {
  sequence: number
  sessionId: string
  segmentId: string
  session: S
}

const ID = /^[a-zA-Z0-9_-]{1,80}$/
const CHUNK = 7000

function chunks(json: string): string[] {
  const out: string[] = []
  for (let i = 0; i < json.length; i += CHUNK) out.push(json.slice(i, i + CHUNK))
  return out
}

/** Cactos viram tuplas: um objeto por cacto multiplicava o tamanho do checkpoint por três. */
const pack = (s: SceneState) => ({
  ...s,
  crowd: { ...s.crowd, cacti: s.crowd.cacti.map((c) => [c.id, c.x, c.velocity]) },
})
const unpack = (key: string, value: unknown) =>
  key === 'cacti' &&
  Array.isArray(value) &&
  value.every((c) => Array.isArray(c) && c.length === 3 && c.every(Number.isFinite))
    ? value.map((c) => ({ id: c[0], x: c[1], velocity: c[2] }))
    : value

/**
 * ⚠️ A cena vai GRAVADA no que se guarda, e a leitura exige que ela confira.
 *
 * O estado de todas as cenas tem a mesma forma, então um retrato do `spawn` passa como
 * retrato do `world` sem nada acusar — e as cenas compartilham ids de descoberta. O professor
 * que troca a cena de um bloco já publicado faria o registro antigo ser relido como se fosse
 * desta cena: a criança apareceria com uma descoberta que nunca fez, ou com uma montagem que
 * nunca montou. A revisão do bloco esconde esse registro do PLAYER, mas não do relatório.
 */
export function packExperiment(scene: SceneId, session: ExperimentSession): string[] {
  return chunks(
    JSON.stringify({
      scene,
      state: pack(session.state),
      past: session.past.map(pack),
      trials: session.trials,
    }),
  )
}
export function packDemonstration(scene: SceneId, session: DemonstrationSession): string[] {
  return chunks(JSON.stringify({ ...session, scene, state: pack(session.state) }))
}

export function readExperimentSession(scene: SceneId, parts: unknown): ExperimentSession | null {
  const raw = parseChunks(parts)
  // ⚠️ Hidrata ANTES de validar: retrato gravado antes de a cena ganhar um grupo novo de
  // estado continua válido, e recusá-lo apagaria o trabalho da criança (ver `hydrateSceneState`).
  if (!isRecord(raw) || raw.scene !== scene) return null
  const state = hydrateSceneState(raw.state)
  if (!isSceneState(state)) return null
  if (!Array.isArray(raw.past) || raw.past.length > SESSION_LIMITS.past) return null
  const past = raw.past.map(hydrateSceneState)
  if (!past.every(isSceneState)) return null
  if (!Array.isArray(raw.trials) || raw.trials.length > SESSION_LIMITS.trials) return null
  if (!raw.trials.every(isSceneTrial)) return null
  return { state, past, trials: raw.trials }
}

export function readDemonstrationSession(
  scene: SceneId,
  parts: unknown,
): DemonstrationSession | null {
  const raw = parseChunks(parts)
  if (!isRecord(raw) || raw.scene !== scene) return null
  const state = hydrateSceneState(raw.state)
  if (!isSceneState(state)) return null
  const { step, action, elapsed, ready, viewed, before } = raw
  if (!Number.isInteger(step) || (step as number) < 0 || (step as number) >= SCRIPT_STEPS)
    return null
  if (!Number.isInteger(action) || (action as number) < 0 || (action as number) > SCRIPT_ACTIONS)
    return null
  if (typeof elapsed !== 'number' || !Number.isFinite(elapsed) || elapsed < 0) return null
  if (typeof ready !== 'boolean' || typeof viewed !== 'boolean') return null
  if (before !== undefined && !isSceneTrial(before)) return null
  return {
    state,
    step: step as number,
    action: action as number,
    elapsed,
    ready,
    viewed,
    ...(before === undefined ? {} : { before: before as SceneTrial }),
  }
}

function parseChunks(parts: unknown): unknown {
  if (!Array.isArray(parts) || !parts.every((p) => typeof p === 'string')) return null
  try {
    return JSON.parse(parts.join(''), unpack)
  } catch {
    return null
  }
}

function isSceneTrial(value: unknown): value is SceneTrial {
  if (!isRecord(value) || typeof value.label !== 'string' || value.label.length > 200) return false
  const s = value.state
  if (!isRecord(s)) return false
  const n = (v: unknown) => typeof v === 'number' && Number.isFinite(v)
  if (s.screen !== 'start' && s.screen !== 'playing' && s.screen !== 'end') return false
  if (typeof s.gravity !== 'boolean' || typeof s.soundOnJump !== 'boolean') return false
  return (
    n(s.force) &&
    n(s.peak) &&
    n(s.distance) &&
    n(s.width) &&
    n(s.y) &&
    n(s.soundCount) &&
    n(s.jumpCount) &&
    n(s.points) &&
    n(s.born) &&
    n(s.removed)
  )
}

/**
 * Lê o pacote que o CLIENTE mandou. Nunca aceita um checkpoint por aqui.
 *
 * ⚠️ O segmento chega ACHATADO nas respostas, com os comandos como strings JSON. Não é
 * estilo: `LearningAnswers` só admite valores rasos (string, número, booleano, lista de
 * strings ou objeto de números), então um segmento aninhado seria recusado na borda.
 */
export function readSceneSegment(answers: unknown): SceneSegment | null {
  if (!isRecord(answers)) return null
  const sessionId = answers.sceneSessionId
  const segmentId = answers.sceneSegmentId
  const baseSequence = answers.sceneBaseSequence
  const cru = answers.sceneCommands
  if (typeof sessionId !== 'string' || !ID.test(sessionId)) return null
  if (typeof segmentId !== 'string' || !ID.test(segmentId)) return null
  if (!Number.isSafeInteger(baseSequence) || (baseSequence as number) < 0) return null
  if (!Array.isArray(cru) || cru.length === 0 || cru.length > SESSION_LIMITS.segment) return null
  if (!cru.every((c) => typeof c === 'string' && c.length <= 8000)) return null
  const commands: unknown[] = []
  for (const texto of cru as string[]) {
    try {
      commands.push(JSON.parse(texto))
    } catch {
      return null
    }
  }
  return { sessionId, segmentId, baseSequence: baseSequence as number, commands }
}

/**
 * ⭐⭐ O MARCADOR do player que conhece o relógio de quadro fixo (review do lote 4 do Raio-X).
 *
 * ⚠️⚠️ Existe por causa do deploy. O player de antes do lote 4 decide a conclusão pelo motor DELE (um
 * quadro por fatia): numa aba aberta durante o deploy, a EXPERIMENTAÇÃO mostrava "concluiu" e o
 * members novo, rejogando os mesmos comandos no relógio novo, gravava `passed:false`; com a
 * assinatura das descobertas igual, o player antigo nem reenviava, e depois do F5 as metas voltavam
 * a faltar (122 de 432 reproduções com o player de produção). Sem marcador o servidor não tinha como
 * separar os dois players. Com ele, o members pode recusar o antigo com 409 (`SCENE_CLOCK_STRICT`), e
 * o player antigo cai no recado que ele já sabe mostrar ("Reabra a aula"), que carrega o novo.
 *
 * ⚠️ O marcador fica FORA do `readSceneSegment` de propósito: o members guarda o hash do segmento
 * lido para reconhecer um reenvio, e um campo novo nele mudaria o hash dos segmentos gravados antes
 * do deploy (o reenvio de um deles viraria conflito).
 *
 * ⚠️⚠️ É a VERSÃO DAS REGRAS do player, e não só "conhece o relógio" (consertos do review da onda A do
 * lote 5, A2). O lote 5 mudou a regra de cenas SEM relógio (`coordinates`, `layers`, `hitbox`) e tirou o
 * relógio de outras (`random`, `acceleration`): o player do lote 4 mandava o mesmo `1`, e o members novo
 * não tinha como recusá-lo. Mudou regra de meta que o player decide sozinho? Suba o número.
 */
export const SCENE_CLOCK_MARK = 2

/** O lado do cliente: monta as respostas achatadas de um segmento, com o marcador do relógio. */
export function sceneSegmentAnswers(segment: {
  sessionId: string
  segmentId: string
  baseSequence: number
  commands: unknown[]
}): Record<string, unknown> {
  return {
    sceneSessionId: segment.sessionId,
    sceneSegmentId: segment.segmentId,
    sceneBaseSequence: segment.baseSequence,
    sceneCommands: segment.commands.map((c) => JSON.stringify(c)),
    sceneClock: SCENE_CLOCK_MARK,
  }
}

/**
 * O segmento veio de um player com as regras DESTE core? ⚠️ O nome é do relógio de quadro fixo, mas a
 * pergunta é a versão das regras (`SCENE_CLOCK_MARK`), em qualquer cena.
 */
export function sceneSegmentHasClock(answers: unknown): boolean {
  return isRecord(answers) && answers.sceneClock === SCENE_CLOCK_MARK
}

export class SceneConflictError extends Error {
  constructor() {
    super('EXPERIENCE_CONFLICT')
    this.name = 'SceneConflictError'
  }
}

/**
 * Aplica um segmento sobre o checkpoint guardado, com verificação otimista de versão.
 *
 * Se a base que o cliente diz conhecer não é a versão atual, alguém escreveu no meio — duas
 * abas abertas, ou um pedido que chegou fora de ordem. Recusar é o certo: aplicar por cima
 * perderia o que a outra ponta fez.
 */
export function applyExperimentSegment(
  start: SceneStart,
  checkpoint: SceneCheckpoint<ExperimentSession> | null,
  segment: SceneSegment,
): SceneCheckpoint<ExperimentSession> {
  if (segment.baseSequence !== (checkpoint?.sequence ?? 0)) throw new SceneConflictError()
  let session = checkpoint?.session ?? initialExperiment(start)
  for (const command of segment.commands) {
    if (!isExperimentCommand(command, start)) throw new Error('Comando de experimentação inválido.')
    session = stepExperiment(start, session, command).session
  }
  return {
    sequence: segment.baseSequence + segment.commands.length,
    sessionId: segment.sessionId,
    segmentId: segment.segmentId,
    session,
  }
}

export function applyDemonstrationSegment(
  start: SceneStart,
  /**
   * ⚠️ O roteiro AUTORADO, quando existe — nunca presuma o do modelo aqui. Com um roteiro
   * de 5 passos na atividade e 3 no modelo, o servidor marcaria "assistido" no passo errado:
   * a criança concluiria sem ter visto, ou nunca concluiria.
   */
  script: readonly SceneStep[],
  checkpoint: SceneCheckpoint<DemonstrationSession> | null,
  segment: SceneSegment,
  /** ⚠️ Só o members passa `tolerarPlayerAnterior` (ver `DemonstrationReplayOptions`). */
  opcoes: DemonstrationReplayOptions = {},
): SceneCheckpoint<DemonstrationSession> {
  if (segment.baseSequence !== (checkpoint?.sequence ?? 0)) throw new SceneConflictError()
  let session = checkpoint?.session ?? initialDemonstration(start)
  // ⚠️ Um por SEGMENTO (ver `passoDaDemonstracao`): é o que limita a tolerância a um resto por
  // (etapa, ação) em cada requisição.
  const semFim = opcoes.tolerarPlayerAnterior ? new Set<string>() : undefined
  for (const command of segment.commands) {
    if (!isDemonstrationCommand(command)) throw new Error('Comando de demonstração inválido.')
    session = passoDaDemonstracao(start, script, session, command, opcoes, semFim).session
  }
  return {
    sequence: segment.baseSequence + segment.commands.length,
    sessionId: segment.sessionId,
    segmentId: segment.segmentId,
    session,
  }
}

/** Qualquer comando de cena — o player guarda um só tipo de referência para os dois. */
export type SceneCommand = ExperimentCommand | DemonstrationCommand

/** A sessão de qualquer cena. O player guarda uma referência só e distingue pelo tipo. */
export type SceneSession = ExperimentSession | DemonstrationSession
