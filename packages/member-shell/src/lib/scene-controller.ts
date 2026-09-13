import { isLearningAnswers, type LearningAnswers } from '@sistemazero/core/learning'
import {
  applyDemonstrationSegment,
  applyExperimentSegment,
  type DemonstrationCommand,
  type DemonstrationSession,
  type ExperimentCommand,
  type ExperimentSession,
  initialDemonstration,
  initialExperiment,
  isDemonstrationCommand,
  isExperimentCommand,
  packDemonstration,
  packExperiment,
  readDemonstrationSession,
  readExperimentSession,
  type SceneActivity,
  type SceneCheckpoint,
  type SceneCommand,
  type SceneEvent,
  type SceneSegment,
  type SceneSession,
  SESSION_LIMITS,
  sceneScript,
  sceneSegmentAnswers,
  sceneStart,
  stepDemonstration,
  stepExperiment,
} from '@sistemazero/core/learning/scene'

/**
 * O que o cliente guarda no rascunho local, para a criança não perder nada num recarregar.
 */
export interface SceneDraft {
  confirmed: LearningAnswers
  pending: unknown[]
  inFlight: SceneSegment | null
  sessionId: string
}

/**
 * O laço de render lê UM retrato. Rede e disco trabalham fora dos quadros de animação.
 *
 * ⚠️ Os comandos pendentes são guardados um a um, exatamente como a criança os fez. Juntar
 * passos de tempo muda QUANDO as observações são capturadas — três cactos viram trinta no
 * recarregar — e a evidência deixaria de ser a que ela viveu.
 */
/** O que muda entre uma demonstração e uma experimentação, e só isso. */
interface Motor<S, C> {
  inicial: () => S
  ler: (parts: unknown) => S | null
  passo: (session: S, command: C) => { session: S; events: SceneEvent[] }
  aceita: (command: unknown) => command is C
  empacotar: (session: S) => string[]
  aplicar: (checkpoint: SceneCheckpoint<S> | null, segment: SceneSegment) => SceneCheckpoint<S>
}

export class SceneController<S, C> {
  private snapshot: S
  private confirmed: SceneCheckpoint<S> | null
  private pending: C[] = []
  private inFlight: SceneSegment | null = null
  private listeners = new Set<() => void>()

  constructor(
    readonly activity: SceneActivity,
    private sessionId: string,
    private readonly motor: Motor<S, C>,
    answers: LearningAnswers,
  ) {
    this.confirmed = lerCheckpoint(answers, motor.ler)
    this.snapshot = this.confirmed?.session ?? motor.inicial()
  }

  /** Monta o controlador certo para o tipo da atividade. */
  static create(
    activity: SceneActivity,
    sessionId: string,
    answers: LearningAnswers = {},
    // ⚠️ A interface de FORA é uma só: o player guarda uma referência e distingue pelo tipo
    // da atividade. Devolver a união crua obrigaria cada uso a estreitar de novo.
  ): SceneController<SceneSession, SceneCommand> {
    const start = sceneStart(activity)
    if (activity.type === 'demonstration') {
      const script = sceneScript(activity)
      return new SceneController<SceneSession, SceneCommand>(
        activity,
        sessionId,
        {
          inicial: () => initialDemonstration(start),
          ler: readDemonstrationSession,
          passo: (session, command) =>
            stepDemonstration(
              start,
              script,
              session as DemonstrationSession,
              command as DemonstrationCommand,
            ),
          aceita: (c): c is SceneCommand => isDemonstrationCommand(c),
          empacotar: (session) => packDemonstration(session as DemonstrationSession),
          aplicar: (checkpoint, segment) =>
            applyDemonstrationSegment(
              start,
              script,
              checkpoint as SceneCheckpoint<DemonstrationSession> | null,
              segment,
            ),
        },
        answers,
      )
    }
    return new SceneController<SceneSession, SceneCommand>(
      activity,
      sessionId,
      {
        inicial: () => initialExperiment(start),
        ler: readExperimentSession,
        passo: (session, command) =>
          stepExperiment(start, session as ExperimentSession, command as ExperimentCommand),
        aceita: (c): c is SceneCommand => isExperimentCommand(c, start),
        empacotar: (session) => packExperiment(session as ExperimentSession),
        aplicar: (checkpoint, segment) =>
          applyExperimentSegment(
            start,
            checkpoint as SceneCheckpoint<ExperimentSession> | null,
            segment,
          ),
      },
      answers,
    )
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
  getSnapshot = () => this.snapshot

  dispatch(command: C): SceneEvent[] {
    const { session, events } = this.motor.passo(this.snapshot, command)
    this.snapshot = session
    this.pending.push(command)
    for (const listener of this.listeners) listener()
    return events
  }

  segment(): LearningAnswers | null {
    if (!this.pending.length) return null
    this.inFlight ??= {
      sessionId: this.sessionId,
      segmentId: crypto.randomUUID(),
      baseSequence: this.confirmed?.sequence ?? 0,
      commands: this.pending.slice(0, SESSION_LIMITS.segment),
    }
    return sceneSegmentAnswers(this.inFlight) as LearningAnswers
  }

  acknowledge(answers: LearningAnswers) {
    const checkpoint = lerCheckpoint(answers, this.motor.ler)
    if (
      !checkpoint ||
      !this.inFlight ||
      checkpoint.segmentId !== this.inFlight.segmentId ||
      checkpoint.sessionId !== this.sessionId ||
      checkpoint.sequence !== this.inFlight.baseSequence + this.inFlight.commands.length
    )
      throw new Error('Confirmação de experiência inválida.')
    this.confirmed = checkpoint
    this.pending.splice(0, this.inFlight.commands.length)
    this.inFlight = null
  }

  /** Na prévia de autoria não há servidor: o próprio cliente confirma o que aplicou. */
  previewConfirm(): LearningAnswers {
    this.segment()
    if (this.inFlight)
      this.acknowledge(this.escrever(this.motor.aplicar(this.confirmed, this.inFlight)))
    return this.answers()
  }

  answers(): LearningAnswers {
    return this.confirmed ? this.escrever(this.confirmed) : {}
  }

  private escrever(checkpoint: SceneCheckpoint<S>): LearningAnswers {
    return {
      sceneSequence: checkpoint.sequence,
      sceneSessionId: checkpoint.sessionId,
      sceneSegmentId: checkpoint.segmentId,
      sceneCheckpoint: this.motor.empacotar(checkpoint.session),
    }
  }

  draft(): SceneDraft {
    return {
      confirmed: this.answers(),
      pending: [...this.pending],
      inFlight: this.inFlight,
      sessionId: this.sessionId,
    }
  }

  /**
   * Volta de um rascunho local. Cada comando é reconferido: um rascunho adulterado, ou de
   * uma versão anterior do jogo, não pode ressuscitar como estado válido.
   */
  restore(value: unknown): boolean {
    if (!value || typeof value !== 'object') return false
    const v = value as Record<string, unknown>
    if (v.sessionId !== this.sessionId || !Array.isArray(v.pending)) return false
    if (!v.pending.every((c) => this.motor.aceita(c))) return false
    if (!isLearningAnswers(v.confirmed)) return false
    const checkpoint = lerCheckpoint(v.confirmed, this.motor.ler)
    let flight = lerSegmento<C>(v.inFlight, this.sessionId, this.motor.aceita)
    if (v.inFlight != null && !flight) return false
    if (flight && flight.baseSequence !== (checkpoint?.sequence ?? 0)) return false
    const pendentes = v.pending as C[]
    // ⚠️ O segmento em voo é o PREFIXO dos pendentes, não uma lista à parte — é isso que
    // deixa o `acknowledge` cortar por tamanho. Somar os dois repetiria cada comando em voo:
    // dois passos de tempo de 0,2s virariam 0,4s, e a criança veria o mundo pular no F5.
    if (
      flight &&
      JSON.stringify(flight.commands) !== JSON.stringify(pendentes.slice(0, flight.commands.length))
    )
      return false

    // ⚠️ O servidor pode ter aceitado o segmento que o rascunho ainda dá como em voo: a aba
    // caiu entre a resposta e a gravação. Quem manda é o servidor — o prefixo confirmado sai
    // dos pendentes, senão esses comandos seriam aplicados DUAS vezes.
    let base = checkpoint
    let restantes = [...pendentes]
    if (this.confirmed && this.confirmed.sequence > (checkpoint?.sequence ?? 0)) {
      if (
        !flight ||
        flight.segmentId !== this.confirmed.segmentId ||
        flight.sessionId !== this.confirmed.sessionId ||
        flight.baseSequence + flight.commands.length !== this.confirmed.sequence
      )
        return false
      restantes = restantes.slice(flight.commands.length)
      flight = null
      base = this.confirmed
    }

    let session = base?.session ?? this.motor.inicial()
    for (const command of restantes) session = this.motor.passo(session, command).session
    this.confirmed = base
    this.snapshot = session
    this.pending = restantes
    this.inFlight = flight
    for (const listener of this.listeners) listener()
    return true
  }
}

function lerCheckpoint<S>(
  answers: LearningAnswers,
  ler: (parts: unknown) => S | null,
): SceneCheckpoint<S> | null {
  const { sceneSequence, sceneSessionId, sceneSegmentId, sceneCheckpoint } = answers
  if (!Number.isSafeInteger(sceneSequence) || Number(sceneSequence) < 0) return null
  if (typeof sceneSessionId !== 'string' || typeof sceneSegmentId !== 'string') return null
  const session = ler(sceneCheckpoint)
  if (!session) return null
  return {
    sequence: Number(sceneSequence),
    sessionId: sceneSessionId,
    segmentId: sceneSegmentId,
    session,
  }
}

function lerSegmento<C>(
  value: unknown,
  sessionId: string,
  aceita: (command: unknown) => command is C,
): (SceneSegment & { commands: C[] }) | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  if (v.sessionId !== sessionId) return null
  if (typeof v.segmentId !== 'string') return null
  if (!Number.isSafeInteger(v.baseSequence) || Number(v.baseSequence) < 0) return null
  if (!Array.isArray(v.commands) || v.commands.length > SESSION_LIMITS.segment) return null
  if (!v.commands.every(aceita)) return null
  return {
    sessionId,
    segmentId: v.segmentId,
    baseSequence: Number(v.baseSequence),
    commands: v.commands as C[],
  }
}

/**
 * O rascunho local, em IndexedDB.
 *
 * ⚠️ Ele existe para que um recarregar no meio da brincadeira não apague o que a criança
 * fez. O nome do banco carrega a versão do formato: mudar a forma da sessão sem trocá-lo
 * faria um rascunho antigo voltar como estado válido.
 */
const DB = 'sz-scene-v1'
async function draftStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore('drafts')
    }
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const tx = db.transaction('drafts', mode)
      const result = run(tx.objectStore('drafts'))
      tx.oncomplete = () => {
        db.close()
        resolve(result.result)
      }
      tx.onerror = tx.onabort = () => {
        db.close()
        reject(tx.error)
      }
    }
  })
}
export const readSceneDraft = (key: string) =>
  draftStore<unknown>('readonly', (store) => store.get(key))
export const writeSceneDraft = (key: string, draft: SceneDraft) =>
  draftStore('readwrite', (store) => store.put(draft, key))
/** Um rascunho que conflitou não some: fica guardado à parte, para não perder o trabalho. */
export const archiveSceneDraft = (key: string, draft: unknown) =>
  draftStore('readwrite', (store) => store.put(draft, `${key}:conflict:${Date.now()}`))
