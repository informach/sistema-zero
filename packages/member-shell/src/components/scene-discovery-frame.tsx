'use client'
/**
 * ⭐⭐ A MOLDURA das experiências livres (08/11/2026, proposta aprovada por ela no Canvas
 * "Experiências do Cadê e do Farol"). Vale para TODAS as telas livres (`setup.freeExploration`):
 *
 *   1. uma fala curta do Zappy, que muda com o estado e, depois do primeiro gesto da criança e com o
 *      som ligado, toca SOZINHA (`falarSozinho` da `DialogueBlockView`, que pede o foco como `fala` e
 *      por isso não pausa o relógio da cena);
 *   2. o palco, com o que muda a regra dentro dele ou colado nele, e o painel embaixo;
 *   3. os cartões de pergunta, SÓ DE LEITURA (decisão dela: a criança explora na ordem que quiser),
 *      que viram "Descobri: …" com som e o selo "Você descobriu!" no palco;
 *   4. as fotinhos dos testes ("Seus testes"), quando a tela as fornece;
 *   5. com tudo descoberto, o balão do Zappy VIRA o cartão dourado da ideia (com "No seu jogo:" e o
 *      "Ouvir" lendo as duas frases).
 *
 * As telas antigas seguem com a API de antes (`goals`, `completed`, `done`, `reset`, `stage`, `hud`,
 * `after`, `children`): os `goals` viram os cartões, os `children` vão para o painel embaixo da cena
 * e a ideia é a fala de conclusão que a tela já tinha. As 7 telas do Cadê e do Farol passam os
 * campos novos (`cartoes`, `ideia`, `ponte`, `fotos`, `controles`…).
 */
import {
  type SceneAction,
  type SceneActivity,
  type SceneState,
  sceneTargets,
} from '@sistemazero/core/learning/scene'
import { RotateCcw, Sparkles, Star, Volume2, VolumeX } from 'lucide-react'
import {
  createContext,
  type PointerEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { ligarSons, SONS, sonsLigados } from '../lib/scene-sons'
import { SceneButton } from './exploration-stage'
import {
  ConsoleActions,
  ConsoleFala,
  ConsoleMundo,
  ConsolePrancha,
  ConsoleVisual,
  SceneConsole,
} from './scene-console'
import { SceneReadoutBand } from './scene-frame'

export { SceneButton }

/** O jeito de o Zappy falar na moldura nova. Sem opções, a fala de sempre (as telas antigas). */
export type FalaDaDescoberta = {
  /** As frases que o "Ouvir" lê em sequência (a ideia e o "No seu jogo:"). */
  textos?: string[]
  pose?: 'speaking' | 'celebrating'
  /** Toca sozinha a cada texto novo (depois do primeiro gesto e com o som ligado). */
  falarSozinho?: boolean
  /** O corpo rico do balão no lugar do texto (o cartão da ideia). */
  corpo?: ReactNode
}

export const DiscoveryContext = createContext<{
  activity: SceneActivity
  state: SceneState
  dispatch: (a: SceneAction) => void
  instruction: string
  running: boolean
  setRunning: (v: boolean) => void
  /**
   * Passa tempo na cena SEM contar como gesto (a câmera lenta do Farol tem o relógio dela). Pelo
   * `dispatch`, cada tique apagaria o aviso da descoberta que acabou de cair.
   */
  tick?: (seconds: number) => void
  dialogue: (text: string, opcoes?: FalaDaDescoberta) => ReactNode
  tools: ReactNode
  /** Só o "Continuar para a pergunta" (as telas da moldura nova não mostram o Desfazer nem a pista). */
  continuar?: ReactNode
} | null>(null)
export function useDiscovery() {
  const context = useContext(DiscoveryContext)
  if (!context) throw Error('Discovery context missing')
  return context
}
export function Note({
  label,
  children,
  tone = 'blue',
}: {
  label: string
  children: ReactNode
  tone?: string
}) {
  return (
    <div className="sz-discovery-note" data-tone={tone}>
      <span>{label}</span>
      <strong>{children}</strong>
    </div>
  )
}

/** A ponte vem com "No seu jogo:" (é como a voz lê); a moldura escreve o prefixo em negrito. */
export const semNoSeuJogo = (frase: string) => frase.replace(/^No seu jogo:\s*/, '')

export type Cartao = { id: string; emoji: string; pergunta: string; descoberta: string }
export type Foto = { titulo: string; texto: string }
export type FotoGuardada = Foto & { n: number; descoberta?: boolean }
export type FotoDe = (antes: SceneState, depois: SceneState, acao: SceneAction) => Foto | null

/* ───────────────────────── as fotinhos dos testes ───────────────────────── */

/**
 * O `dispatch` da tela com a fotinho de cada gesto (`fotoDe`) e a de cada descoberta
 * (`fotoDaDescoberta`). Recomeçar a experiência (descobertas zeradas) apaga as fotos.
 */
export function useFotinhos({
  fotoDe,
  fotoDaDescoberta,
}: {
  fotoDe?: FotoDe
  fotoDaDescoberta?: Record<string, Foto>
} = {}) {
  const ctx = useDiscovery()
  const { state } = ctx
  const atual = useRef(state)
  atual.current = state
  const pendente = useRef<{ acao: SceneAction; antes: SceneState } | null>(null)
  const [fotos, setFotos] = useState<FotoGuardada[]>([])
  const contador = useRef(0)
  const guardar = useCallback((foto: Foto, descoberta = false) => {
    contador.current += 1
    const n = contador.current
    setFotos((lista) => [{ ...foto, n, descoberta }, ...lista].slice(0, 6))
  }, [])
  const dispatch = useCallback(
    (acao: SceneAction) => {
      pendente.current = { acao, antes: atual.current }
      ctx.dispatch(acao)
    },
    [ctx],
  )
  useEffect(() => {
    const p = pendente.current
    if (!p || p.antes === state) return
    pendente.current = null
    const foto = fotoDe?.(p.antes, state, p.acao)
    if (foto) guardar(foto)
  }, [state, fotoDe, guardar])

  const chave = state.evidence.discoveries.join('|')
  const vistas = useRef<Set<string> | null>(null)
  useEffect(() => {
    const agora = new Set(chave ? chave.split('|') : [])
    const antes = vistas.current
    vistas.current = agora
    if (!antes) return
    if (agora.size === 0 && antes.size > 0) {
      setFotos([])
      return
    }
    for (const id of agora) {
      if (antes.has(id)) continue
      const foto = fotoDaDescoberta?.[id]
      // A fotinho do teste que virou descoberta ganha o selo.
      if (foto) guardar(foto, true)
      else setFotos((l) => l.map((f, i) => (i === 0 ? { ...f, descoberta: true } : f)))
    }
  }, [chave, fotoDaDescoberta, guardar])
  return { ...ctx, dispatch, fotos, limparFotos: () => setFotos([]) }
}

/** A descoberta NOVA (para o selo e o som): o id dela por 2,2 s; a primeira leitura não conta. */
function useDescobertaNova(ids: readonly string[], discoveries: readonly string[]) {
  const chave = discoveries.filter((d) => ids.includes(d)).join('|')
  const vistas = useRef<Set<string> | null>(null)
  const [nova, setNova] = useState<string | null>(null)
  useEffect(() => {
    const agora = new Set(chave ? chave.split('|') : [])
    const antes = vistas.current
    vistas.current = agora
    if (!antes) return
    const id = [...agora].find((d) => !antes.has(d))
    if (!id) return
    setNova(id)
    SONS.descoberta()
    const t = setTimeout(() => setNova(null), 2200)
    return () => clearTimeout(t)
  }, [chave])
  return nova
}

/* ───────────────────────── a moldura ───────────────────────── */

export function Frame({
  activity,
  state,
  text,
  children,
  after,
  goals = [],
  done,
  reset,
  stage,
  hud,
  completed,
  cartoes,
  fotos,
  ideia,
  ponte,
  mostrarIdeia = true,
  pulso,
  noPalco,
  sobrePalco,
  abaixoDoPalco,
  controles,
  ferramentas,
  raiz,
}: {
  title: string
  activity: SceneActivity
  state: SceneState
  kind: string
  /** A fala do Zappy agora (sem emoji: a voz lê a frase inteira). */
  text: string
  /** Os controles das telas antigas: vão para o painel embaixo da cena. */
  children?: ReactNode
  after?: ReactNode
  /** As perguntas das telas antigas, na ordem das metas da atividade. */
  goals?: string[]
  done?: number
  reset: () => void
  stage?: ReactNode
  hud?: ReactNode
  completed?: boolean[]
  /** Os cartões de pergunta da moldura nova (o `id` é a meta da cena). */
  cartoes?: Cartao[]
  /** As fotinhos dos testes (`useFotinhos`). Sem elas, "Seus testes" não aparece. */
  fotos?: FotoGuardada[]
  /** A ideia que a criança descobriu. Sem ela, a fala do momento (a de conclusão da tela). */
  ideia?: string
  /** "No seu jogo: …": a ponte da ideia para a montagem, sem nome de bloco (sem o prefixo). */
  ponte?: string
  /** Com tudo descoberto, o balão vira a ideia (falso durante um desafio extra). */
  mostrarIdeia?: boolean
  /** O anel que pulsa sobre a coisa a tocar primeiro (em % do palco). */
  pulso?: { left: string; top: string; width: string; height: string } | null
  /** Algo que a tela posiciona sozinha dentro do palco (o "+1" no placar). */
  noPalco?: ReactNode
  /** O que muda a regra, desenhado no canto de cima do palco. */
  sobrePalco?: ReactNode
  abaixoDoPalco?: ReactNode
  /** Os módulos do painel embaixo da cena (`Modulo`). */
  controles?: ReactNode
  /** Ferramentas da tela na linha de cima, ao lado do som e do Recomeçar. */
  ferramentas?: ReactNode
  raiz?: RefObject<HTMLDivElement | null>
}) {
  const context = useDiscovery()
  const feitas = state.evidence.discoveries
  const metas = sceneTargets(activity)
  // Os cartões: os da tela nova, ou um por pergunta antiga. ⚠️ Nas antigas o cartão feito diz só
  // "Descobri!": o rótulo da meta no catálogo fala de bloco ("Em Ao iniciar, …"), e as telas livres
  // falam só da ideia.
  const lista: Array<{
    id: string
    emoji?: string
    pergunta: string
    descoberta?: string
    feito: boolean
  }> = cartoes
    ? cartoes.map((c) => ({ ...c, feito: feitas.includes(c.id) }))
    : goals.map((g, i) => ({
        id: metas[i] ?? `meta-${i}`,
        pergunta: g,
        feito: completed?.[i] ?? i < (done ?? 0),
      }))
  const n = lista.filter((c) => c.feito).length
  const todas = lista.length > 0 && n === lista.length
  const nova = useDescobertaNova(
    lista.map((c) => c.id),
    feitas,
  )
  // Nas telas antigas a ideia é a fala de conclusão que a tela já tinha (o vocabulário dela).
  const ideiaFinal = ideia ?? text
  const ideiaNoBalao = todas && mostrarIdeia && Boolean(ideiaFinal)
  const falasDaIdeia = ponte ? [ideiaFinal, `No seu jogo: ${ponte}`] : [ideiaFinal]
  const falaAgora = ideiaNoBalao ? falasDaIdeia.join(' ') : text

  const [confirmando, setConfirmando] = useState(false)
  useEffect(() => {
    if (!confirmando) return
    const t = setTimeout(() => setConfirmando(false), 4000)
    return () => clearTimeout(t)
  }, [confirmando])
  // ⭐ A voz só toca sozinha depois do primeiro gesto AQUI DENTRO (o navegador só libera som depois
  // de um gesto, e a fala da abertura fica com o "Ouvir") e com o som ligado.
  const [interagiu, setInteragiu] = useState(false)
  const [som, setSom] = useState(true)
  useEffect(() => setSom(sonsLigados()), [])
  const marcarGesto = () => {
    if (!interagiu) setInteragiu(true)
  }
  const recomecar = () => {
    setConfirmando(false)
    reset()
  }
  const cartaoNovo = lista.find((c) => c.id === nova)

  return (
    <div
      ref={raiz}
      className="sz-scene-workspace-body sz-discovery-proposed sz-discovery-moldura"
      onPointerDownCapture={marcarGesto}
      onKeyDownCapture={marcarGesto}
    >
      <SceneConsole>
        <ConsoleVisual>
          {/* No celular a fala vem depois dos controles: uma linha dela fica acima da cena. */}
          <p className="sz-discovery-fala-celular" aria-hidden>
            <span className="sz-discovery-fala-celular-z">Z</span>
            {falaAgora}
          </p>
          <div className="sz-discovery-hud">
            <span className="sz-scene-placa sz-scene-momento">
              {todas ? 'Você descobriu!' : 'Sua vez'}
            </span>
            <span className="sz-discovery-contagem">
              <span className="sr-only">
                {n} de {lista.length} descobertas
              </span>
              {lista.map((c) => (
                <span
                  key={c.id}
                  className="sz-discovery-estrela"
                  data-feito={c.feito}
                  data-nova={nova === c.id}
                  aria-hidden
                >
                  <Star size={20} strokeWidth={2.5} />
                </span>
              ))}
            </span>
            <span className="sz-discovery-direita">
              <span className="sz-discovery-ferramentas">
                {ferramentas}
                <Redondo
                  rotulo={
                    som ? 'Desligar o som e a voz automática' : 'Ligar o som e a voz automática'
                  }
                  onClick={() => {
                    ligarSons(!som)
                    setSom(!som)
                  }}
                  pressionado={som}
                >
                  {som ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </Redondo>
                {confirmando ? (
                  <span
                    className="sz-discovery-confirma"
                    role="group"
                    aria-label="Apagar as descobertas?"
                  >
                    Apagar as descobertas?
                    <button type="button" onClick={recomecar}>
                      Sim
                    </button>
                    <button type="button" onClick={() => setConfirmando(false)}>
                      Não
                    </button>
                  </span>
                ) : (
                  <Redondo
                    rotulo="Recomeçar experiência"
                    onClick={() => (n > 0 ? setConfirmando(true) : recomecar())}
                  >
                    <RotateCcw size={18} />
                  </Redondo>
                )}
              </span>
            </span>
          </div>
          {hud ? (
            <div className="sz-discovery-simple-hud">{hud}</div>
          ) : !cartoes ? (
            <SceneReadoutBand activity={activity} state={state} />
          ) : null}
          <ConsoleMundo>
            <div className="sz-discovery-palco">
              {stage}
              {pulso ? <span className="sz-discovery-pulso" aria-hidden style={pulso} /> : null}
              {noPalco}
              {sobrePalco ? <div className="sz-discovery-sobre">{sobrePalco}</div> : null}
              {cartaoNovo ? (
                <div className="sz-discovery-selo" role="status">
                  <span className="sz-discovery-selo-brilho" aria-hidden>
                    ✦ ✧ ✦
                  </span>
                  <Star size={22} fill="currentColor" aria-hidden /> Você descobriu!
                  <Sparkles size={18} aria-hidden />
                </div>
              ) : null}
            </div>
          </ConsoleMundo>
          {abaixoDoPalco}
          {after ? (
            <div className="sz-discovery-evidence" aria-live="polite">
              {after}
            </div>
          ) : null}
          {controles ? <div className="sz-discovery-deck">{controles}</div> : null}
          {children ? (
            <div className="sz-discovery-deck sz-discovery-deck-livre">
              <ConsolePrancha>{children}</ConsolePrancha>
            </div>
          ) : null}
        </ConsoleVisual>
        <ConsoleActions>
          <div className={ideiaNoBalao ? 'sz-discovery-fala-ideia' : undefined}>
            <ConsoleFala>
              {context.dialogue(falaAgora, {
                textos: ideiaNoBalao ? falasDaIdeia : [falaAgora],
                pose: todas ? 'celebrating' : 'speaking',
                falarSozinho: interagiu && som,
                corpo: ideiaNoBalao ? (
                  <div className="sz-discovery-ideia-balao">
                    <span className="sz-discovery-ideia-titulo">
                      <span aria-hidden>🏆</span> A ideia que você descobriu
                    </span>
                    <p className="sz-discovery-ideia-texto">{ideiaFinal}</p>
                    {ponte ? (
                      <p className="sz-discovery-ideia-ponte">
                        <strong>No seu jogo:</strong> {ponte}
                      </p>
                    ) : null}
                  </div>
                ) : undefined,
              })}
            </ConsoleFala>
          </div>
          {lista.length ? (
            <div className="sz-discovery-secao">
              <p className="sz-discovery-rotulo">
                Suas descobertas{' '}
                <span>
                  {n} de {lista.length}
                </span>
              </p>
              <ul className="sz-discovery-cartoes">
                {lista.map((c, i) => (
                  <li
                    key={c.id}
                    data-cor={i % 5}
                    className="sz-discovery-cartao"
                    data-feito={c.feito}
                    data-nova={nova === c.id}
                  >
                    <div className="sz-discovery-cartao-botao">
                      <span className="sz-discovery-cartao-emoji" aria-hidden>
                        {c.emoji ?? (c.feito ? '✅' : '❓')}
                      </span>
                      <span className="sz-discovery-cartao-texto">
                        <strong>{c.pergunta}</strong>
                        <small>
                          {c.feito
                            ? c.descoberta
                              ? `Descobri: ${c.descoberta}`
                              : 'Descobri!'
                            : 'Ainda não testado'}
                        </small>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {fotos ? (
            <div className="sz-discovery-secao">
              <p className="sz-discovery-rotulo">Seus testes</p>
              {fotos.length ? (
                <ol className="sz-discovery-fotos">
                  {fotos.map((f) => (
                    <li
                      key={f.n}
                      className="sz-discovery-foto"
                      data-descoberta={f.descoberta === true}
                      data-lado={f.n % 2}
                    >
                      <strong>{f.titulo}</strong>
                      <span>{f.texto}</span>
                      {f.descoberta ? (
                        <em>
                          <Star size={12} fill="currentColor" aria-hidden /> virou descoberta
                        </em>
                      ) : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="sz-discovery-vazio">Cada teste que você fizer aparece aqui.</p>
              )}
            </div>
          ) : null}
          {cartoes ? context.continuar : context.tools}
        </ConsoleActions>
      </SceneConsole>
    </div>
  )
}

/* ───────────────────────── o painel embaixo da cena ───────────────────────── */

/**
 * Um módulo do painel: um nome curto em cima (o que aquele controle é no jogo) e o controle.
 * Os módulos ficam lado a lado e quebram linha sozinhos.
 */
export function Modulo({
  titulo,
  icone,
  children,
  largo,
  dica,
}: {
  titulo: string
  icone: string
  children: ReactNode
  largo?: boolean
  /** A linha de ajuda do módulo (a do teclado some em tela de toque). */
  dica?: ReactNode
}) {
  return (
    <section className="sz-discovery-modulo" data-largo={largo} aria-label={titulo}>
      <span className="sz-discovery-modulo-titulo">
        <span aria-hidden>{icone}</span> {titulo}
      </span>
      <div className="sz-discovery-modulo-corpo">{children}</div>
      {dica ? <span className="sz-discovery-modulo-dica">{dica}</span> : null}
    </section>
  )
}

/** O rolo de filme: a tira de quadros do jogo, com as perfurações e o quadro de agora. */
export function Filme({ children, info }: { children: ReactNode; info?: ReactNode }) {
  return (
    <div className="sz-discovery-filme">
      <span className="sz-discovery-filme-titulo">
        <span aria-hidden>🎞️</span> Os quadros do jogo
      </span>
      {info ? <span className="sz-discovery-filme-info">{info}</span> : null}
      {children}
    </div>
  )
}

/* ───────────────────────── controles com a forma do que imitam ───────────────────────── */

/** Botão de ferramenta: com `texto`, uma pílula com o nome escrito; sem ele, um círculo. */
export function Redondo({
  rotulo,
  texto,
  onClick,
  children,
  pressionado,
}: {
  rotulo: string
  texto?: string
  onClick: () => void
  children: ReactNode
  pressionado?: boolean
}) {
  return (
    <button
      type="button"
      className="sz-discovery-redondo"
      data-com-texto={Boolean(texto)}
      aria-pressed={pressionado}
      title={rotulo}
      onClick={onClick}
    >
      {children}
      {texto ? <span>{texto}</span> : <span className="sr-only">{rotulo}</span>}
    </button>
  )
}

/** A tecla do teclado vale com a experiência na tela e fora de um campo de texto. */
export function useNaTela(raiz: RefObject<HTMLElement | null>) {
  // ⚠️ Conferido NA HORA da tecla, pelo retângulo: o IntersectionObserver responde depois, e logo
  // após trocar de parte a primeira tecla se perdia.
  const [visivel] = useState(() => ({
    get current() {
      const el = raiz.current
      if (!el || typeof window === 'undefined') return false
      const r = el.getBoundingClientRect()
      return r.bottom > 120 && r.top < window.innerHeight - 120
    },
  }))
  return visivel
}
export function alvoDeTexto(alvo: EventTarget | null) {
  return (
    typeof HTMLElement !== 'undefined' &&
    alvo instanceof HTMLElement &&
    (alvo.isContentEditable || alvo.closest('input, textarea, select, [role="slider"]') !== null)
  )
}
/** A tecla casa pela seta (`key`) ou pela posição da letra (`code`, igual no ABNT e no inglês). */
export function casaTecla(e: Pick<KeyboardEvent, 'key' | 'code'>, teclas: readonly string[]) {
  return teclas.includes(e.key) || teclas.includes(e.code)
}

export type Direcao = 'cima' | 'baixo' | 'esquerda' | 'direita'
export const TECLAS: Record<Direcao, { teclas: string[]; letra: string; seta: string }> = {
  cima: { teclas: ['ArrowUp', 'KeyW'], letra: 'W', seta: 'M5 16l7-9 7 9z' },
  baixo: { teclas: ['ArrowDown', 'KeyS'], letra: 'S', seta: 'M5 8l7 9 7-9z' },
  esquerda: { teclas: ['ArrowLeft', 'KeyA'], letra: 'A', seta: 'M16 5L7 12l9 7z' },
  direita: { teclas: ['ArrowRight', 'KeyD'], letra: 'D', seta: 'M8 5l9 7-9 7z' },
}

/**
 * A tecla de seta desenhada como a do teclado. Dedo, mouse, Espaço/Enter nela, a seta do teclado
 * e a letra do WASD acionam a MESMA tecla, e ela afunda em todos os casos (`apertada` vem do motor
 * quando o motor sabe; senão ela afunda enquanto está segura).
 */
export function TeclaDeSeta({
  direcao,
  rotulo,
  apertada,
  segurar,
  soltar,
  mao,
  raiz,
  pequena,
}: {
  direcao: Direcao
  rotulo: string
  apertada?: boolean
  segurar: () => void
  soltar?: () => void
  /** A mãozinha que mostra o gesto de segurar, na abertura. */
  mao?: boolean
  raiz: RefObject<HTMLElement | null>
  pequena?: boolean
}) {
  const [segura, setSegura] = useState(false)
  const segurando = useRef(false)
  const visivel = useNaTela(raiz)
  const fns = useRef({ segurar, soltar })
  fns.current = { segurar, soltar }
  const descer = useCallback(() => {
    if (segurando.current) return
    segurando.current = true
    setSegura(true)
    fns.current.segurar()
  }, [])
  const subir = useCallback(() => {
    if (!segurando.current) return
    segurando.current = false
    setSegura(false)
    fns.current.soltar?.()
  }, [])
  const { teclas, letra, seta } = TECLAS[direcao]
  useEffect(() => {
    const desce = (e: KeyboardEvent) => {
      if (!casaTecla(e, teclas) || !visivel.current || alvoDeTexto(e.target)) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      e.preventDefault()
      if (!e.repeat) descer()
    }
    const sobe = (e: KeyboardEvent) => {
      if (casaTecla(e, teclas)) subir()
    }
    window.addEventListener('keydown', desce)
    window.addEventListener('keyup', sobe)
    window.addEventListener('blur', subir)
    return () => {
      window.removeEventListener('keydown', desce)
      window.removeEventListener('keyup', sobe)
      window.removeEventListener('blur', subir)
      subir()
    }
  }, [teclas, descer, subir, visivel])
  const afundada = apertada ?? segura
  return (
    <button
      type="button"
      className="sz-discovery-tecla"
      data-pequena={pequena}
      aria-label={rotulo}
      aria-pressed={afundada}
      data-mao={mao}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e: PointerEvent<HTMLButtonElement>) => {
        e.preventDefault()
        try {
          e.currentTarget.setPointerCapture?.(e.pointerId)
        } catch {
          // Sem captura, o soltar ainda chega pelo pointerup.
        }
        descer()
      }}
      onPointerUp={subir}
      onPointerCancel={subir}
      onLostPointerCapture={subir}
      onKeyDown={(e) => {
        if (e.key !== ' ' && e.key !== 'Enter') return
        e.preventDefault()
        if (!e.repeat) descer()
      }}
      onKeyUp={(e) => {
        if (e.key !== ' ' && e.key !== 'Enter') return
        e.preventDefault()
        subir()
      }}
    >
      <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
        <path d={seta} fill="currentColor" />
      </svg>
      <span className="sz-discovery-letra" aria-hidden>
        {letra}
      </span>
      {mao ? (
        <span className="sz-discovery-mao" aria-hidden>
          👆
        </span>
      ) : null}
    </button>
  )
}

/** As quatro setas no desenho do teclado (↑ em cima; ← ↓ → embaixo). Segurar anda; soltar para. */
export function Cruzeta({
  raiz,
  segurando,
  segurar,
  soltar,
  mao,
}: {
  raiz: RefObject<HTMLElement | null>
  segurando: ReadonlySet<Direcao>
  segurar: (d: Direcao) => void
  soltar: (d: Direcao) => void
  mao?: boolean
}) {
  const tecla = (d: Direcao, rotulo: string) => (
    <TeclaDeSeta
      direcao={d}
      rotulo={rotulo}
      raiz={raiz}
      pequena
      apertada={segurando.has(d)}
      segurar={() => segurar(d)}
      soltar={() => soltar(d)}
      mao={mao && d === 'direita'}
    />
  )
  return (
    <div className="sz-discovery-cruzeta" role="group" aria-label="Andar com as setas">
      <span className="sz-discovery-cruzeta-cima">{tecla('cima', 'Andar para cima')}</span>
      {tecla('esquerda', 'Andar para a esquerda')}
      {tecla('baixo', 'Andar para baixo')}
      {tecla('direita', 'Andar para a direita')}
    </div>
  )
}

/**
 * O andar livre: o lugar do personagem no palco (as unidades do palco do jogo) e as direções
 * seguradas. O relógio é do navegador; parar de segurar para na hora.
 */
export function useAndarLivre({
  inicio,
  limites,
  velocidade = 150,
}: {
  inicio: { x: number; y: number }
  limites: { x0: number; x1: number; y0: number; y1: number }
  velocidade?: number
}) {
  const [pos, setPos] = useState(inicio)
  const [segurando, setSegurando] = useState<ReadonlySet<Direcao>>(new Set())
  const dirs = useRef(new Set<Direcao>())
  const quadro = useRef<number | null>(null)
  const ultimo = useRef(0)
  const passo = useCallback(
    (agora: number) => {
      const dt = Math.min(0.05, (agora - ultimo.current) / 1000)
      ultimo.current = agora
      const d = dirs.current
      const vx = (d.has('direita') ? 1 : 0) - (d.has('esquerda') ? 1 : 0)
      const vy = (d.has('baixo') ? 1 : 0) - (d.has('cima') ? 1 : 0)
      const norma = vx && vy ? Math.SQRT1_2 : 1
      if (vx || vy)
        setPos((p) => ({
          x: Math.max(limites.x0, Math.min(limites.x1, p.x + vx * velocidade * norma * dt)),
          y: Math.max(limites.y0, Math.min(limites.y1, p.y + vy * velocidade * norma * dt)),
        }))
      if (d.size) quadro.current = requestAnimationFrame(passo)
      else quadro.current = null
    },
    [limites.x0, limites.x1, limites.y0, limites.y1, velocidade],
  )
  const segurar = useCallback(
    (d: Direcao) => {
      dirs.current.add(d)
      setSegurando(new Set(dirs.current))
      if (quadro.current === null) {
        ultimo.current = performance.now()
        quadro.current = requestAnimationFrame(passo)
      }
    },
    [passo],
  )
  const soltar = useCallback((d: Direcao) => {
    dirs.current.delete(d)
    setSegurando(new Set(dirs.current))
  }, [])
  useEffect(
    () => () => {
      if (quadro.current !== null) cancelAnimationFrame(quadro.current)
    },
    [],
  )
  const inicioX = inicio.x
  const inicioY = inicio.y
  return {
    pos,
    andando: segurando.size > 0,
    segurando,
    segurar,
    soltar,
    voltar: useCallback(() => setPos({ x: inicioX, y: inicioY }), [inicioX, inicioY]),
  }
}

export function Interruptor({
  ligado,
  rotulo,
  estado,
  onClick,
  pulsar,
}: {
  ligado: boolean
  rotulo?: string
  estado: (ligado: boolean) => string
  onClick: () => void
  pulsar?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      className="sz-discovery-interruptor"
      data-pulsar={pulsar}
      onClick={onClick}
    >
      <span className="sz-discovery-trilho" aria-hidden />
      <span>
        {rotulo ? <small>{rotulo}</small> : null}
        <strong>{estado(ligado)}</strong>
      </span>
    </button>
  )
}

export function Velocidade({
  valor,
  onChange,
  pulsar,
}: {
  valor: 'lenta' | 'real'
  onChange: (v: 'lenta' | 'real') => void
  /** A velocidade que a fala do Zappy pede agora acende. */
  pulsar?: 'lenta' | 'real' | null
}) {
  return (
    <div className="sz-discovery-velocidade" role="group" aria-label="Velocidade dos quadros">
      <button
        type="button"
        aria-pressed={valor === 'lenta'}
        data-pulsar={pulsar === 'lenta' && valor !== 'lenta'}
        onClick={() => onChange('lenta')}
      >
        <span aria-hidden>🐢</span> Devagar
      </button>
      <button
        type="button"
        aria-pressed={valor === 'real'}
        data-pulsar={pulsar === 'real' && valor !== 'real'}
        onClick={() => onChange('real')}
      >
        <span aria-hidden>🐇</span> Rápido
      </button>
    </div>
  )
}

/** A memória do jogo com cara de memória: um caderninho que o jogo escreve. */
export function Caderninho({ sim, lapis }: { sim: boolean; lapis?: boolean }) {
  return (
    <div className="sz-discovery-caderno" data-lapis={lapis}>
      {lapis !== undefined ? (
        <span className="sz-discovery-lapis" aria-hidden>
          ✏️
        </span>
      ) : null}
      <span className="sz-discovery-caderno-titulo">Caderninho do jogo</span>
      <span className="sz-discovery-caderno-linha">Tem a chave?</span>
      {/* A `key` faz a resposta ser ESCRITA de novo quando muda (a animação do lápis). */}
      <strong key={sim ? 'sim' : 'nao'} className="sz-discovery-caderno-resposta" data-sim={sim}>
        {sim ? 'SIM' : 'NÃO'}
      </strong>
    </div>
  )
}

export function BotaoGrande({
  children,
  onClick,
  pulsar,
}: {
  children: ReactNode
  onClick: () => void
  pulsar?: boolean
}) {
  return (
    <button type="button" className="sz-discovery-botao" data-pulsar={pulsar} onClick={onClick}>
      {children}
    </button>
  )
}
