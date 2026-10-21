'use client'

import { readJsonBodyWithLimit } from '@sistemazero/core/http'
import { sessionFetch as fetch } from '@sistemazero/member-shell/lib/session-fetch'
import type { EditableStudioProject, Project, StudioProjectPlayerProps } from '@sistemazero/studio'
import { describeProjectControls, type InternalPadMode } from '@sistemazero/studio/controls'
import { BrandLogo } from '@sistemazero/ui/brand-logo'
import {
  AlertCircle,
  ArrowUpRight,
  Gamepad2,
  Keyboard,
  Loader2,
  Maximize,
  Minimize,
  RotateCcw,
} from 'lucide-react'
import { type ComponentType, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type GamepadVisibilityOverride,
  resolveGamepadVisibility,
  toggledGamepadOverride,
} from '../../lib/gamepad-visibility'
import { publicRuntimeLabel } from '../../lib/public-runtime-label'
import {
  DEFAULT_STAGE_ASPECT,
  STAGE_FILL,
  type StageAspect,
  sanitizeStageAspect,
  shouldRotateStage,
} from '../../lib/stage-fit'
import { KidsMascot } from '../cosmetics/presentation'
import { PublicStage } from './public-stage'
import { useFullscreen } from './use-fullscreen'

// O Player importado dinamicamente precisa aceitar ref — usamos forwardRef no lado do Studio.
// Aqui apenas tipamos o ref como HTMLIFrameElement para o useRef.
type PlayerComponent = ComponentType<
  StudioProjectPlayerProps & { ref?: React.Ref<HTMLIFrameElement> }
>

// A "Sistema Zero Kids" no rodapé leva à oferta do Desafio do 1º jogo. Por ora,
// a home do site (a usuária troca pela URL da oferta quando tiver).
const SITE_URL = 'https://sistemazero.com.br'

// Ritmo com que perguntamos o formato do palco ao jogo. Rajada curta no começo
// (o caso comum: o canvas nasce no "Ao iniciar", em menos de um segundo) e, se
// ainda não soubermos, insistência LENTA.
//
// ⚠️ A insistência lenta não é zelo: no Jogo 2D Avançado o canvas só nasce
// quando a criança aperta "Começar" na tela de título, e ela pode ficar ali
// muito mais do que a rajada. Sem isso, justo o kit Profissional ficaria com a
// proporção padrão. Ela para assim que o formato é conhecido, e não corre com a
// aba escondida.
const STAGE_PROBE_FAST_MS = 400
const STAGE_PROBE_SLOW_MS = 2_000
const STAGE_PROBE_BURST_MS = 6_000

/** Viewport ao vivo + se dá para VIRAR o aparelho (o que decide o giro do palco). */
function useViewport() {
  const [viewport, setViewport] = useState({ w: 0, h: 0, coarse: false })

  useEffect(() => {
    function measure() {
      const w = window.innerWidth
      const h = window.innerHeight
      const coarse = window.matchMedia('(pointer: coarse)').matches
      setViewport((prev) =>
        prev.w === w && prev.h === h && prev.coarse === coarse ? prev : { w, h, coarse },
      )
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', measure)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('orientationchange', measure)
    }
  }, [])

  return viewport
}

/**
 * Player PÚBLICO (sem login) de um projeto compartilhado no Mural. Roda SÓ o jogo
 * (sem editor/código) num iframe sandbox — via o `StudioProjectPlayer` do
 * @sistemazero/studio (subpath `/player`: traz só a cadeia de preview, sem
 * Monaco/Blockly). Busca o projeto na rota mesma-origem `/api/studio/play/:id`
 * (stream do R2) + o **primeiro nome** do autor no header `X-Author-Name` (o hub
 * só guarda o 1º nome — nunca o sobrenome/PII).
 *
 * O palco NÃO tem mais proporção cravada: o iframe informa a do jogo (`sz:stage`)
 * e a moldura fica do tamanho exato dele. Um jogo em pé encaixotado num palco
 * 5:3 era o pior caso de "pouca área de jogo" que existia aqui.
 */
export function PublicPlayer({
  id,
  brandLabel = 'Sistema Zero',
  skin = 'kids',
}: {
  id: string
  brandLabel?: string
  /**
   * `adult` veste a página da comunidade adulta (direção de arte de 18/10/2026): o cabeçalho
   * marinho com a logo, o nome do jogo e o crédito escritos, os botões com texto, uma linha de
   * como jogar e nenhum mascote. O padrão é o Kids de sempre.
   */
  skin?: 'kids' | 'adult'
}) {
  // `id` identifica todo o recurso assíncrono e todo o estado de execução do
  // jogo. Uma key nova desmonta a instância anterior de forma atômica: autor,
  // projeto, iframe, aspecto, foco e preferências nunca atravessam entre jogos.
  return <PublicPlayerForProject key={id} id={id} brandLabel={brandLabel} skin={skin} />
}

function PublicPlayerForProject({
  id,
  brandLabel,
  skin,
}: {
  id: string
  brandLabel: string
  skin: 'kids' | 'adult'
}) {
  const adult = skin === 'adult'
  const [Player, setPlayer] = useState<PlayerComponent | null>(null)
  const [project, setProject] = useState<EditableStudioProject | null>(null)
  const [published, setPublished] = useState<StudioProjectPlayerProps['published']>()
  const [author, setAuthor] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [runtimeError, setRuntimeError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [muted, setMuted] = useState(false)
  const [gamepadOverride, setGamepadOverride] = useState<GamepadVisibilityOverride>(null)
  const [stageAspect, setStageAspect] = useState<StageAspect>(DEFAULT_STAGE_ASPECT)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const stageRootRef = useRef<HTMLDivElement>(null)
  const viewport = useViewport()
  const { fullscreen: telaCheia, alternar: alternarTelaCheia } = useFullscreen(stageRootRef)

  const handleRestart = useCallback(() => setReloadKey((k) => k + 1), [])
  const pythonRuntimeRequest = useCallback(
    async (input: { playId: string; publicationRevision: string }, signal: AbortSignal) => {
      const response = await fetch('/api/studio/public-runtime', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
      })
      const body: unknown = await readJsonBodyWithLimit(response, 2_000_000)
      if (!response.ok)
        throw Object.assign(
          new Error(
            'Não foi possível abrir esta revisão do jogo. Reabra a página para tentar novamente.',
          ),
          { status: response.status },
        )
      return body
    },
    [],
  )

  useEffect(() => {
    let active = true
    setRuntimeError(null)
    void (async () => {
      try {
        const [mod, res] = await Promise.all([
          import('@sistemazero/studio/player'),
          fetch(`/api/studio/play/${encodeURIComponent(id)}?reload=${reloadKey}`, {
            cache: 'no-store',
          }),
        ])
        if (!active) return
        if (!res.ok) {
          setStatus('error')
          return
        }
        const rawAuthor = res.headers.get('X-Author-Name')
        const raw: unknown = await res.json()
        let proj: EditableStudioProject
        if (
          raw &&
          typeof raw === 'object' &&
          'programmingLanguage' in raw &&
          raw.programmingLanguage === 'python'
        ) {
          const { refinePythonProjectDocument } = await import(
            '@sistemazero/studio/python-project-validation'
          )
          proj = await refinePythonProjectDocument(raw)
        } else proj = raw as Project
        if (!active) return
        // Header URI-encoded (só ASCII em header). Falha de decode → sem nome.
        if (rawAuthor) {
          try {
            setAuthor(decodeURIComponent(rawAuthor))
          } catch {
            setAuthor(null)
          }
        }
        setPlayer(() => mod.StudioProjectPlayer)
        const compiledUrl = res.headers.get('X-Studio-Pro-Url')
        const compiledRevision = res.headers.get('X-Studio-Pro-Revision')
        const pythonRevision = res.headers.get('X-Studio-Python-Revision')
        if (proj.programmingLanguage === 'python' && !/^[a-f0-9]{64}$/.test(pythonRevision ?? '')) {
          setStatus('error')
          return
        }
        if (
          proj.programmingLanguage !== 'python' &&
          proj.kind === 'pro' &&
          (!compiledUrl || !compiledRevision)
        ) {
          setStatus('error')
          return
        }
        setPublished(
          proj.programmingLanguage === 'python' && pythonRevision
            ? { programmingLanguage: 'python', playId: id, revision: pythonRevision }
            : compiledUrl && compiledRevision
              ? { playId: id, revision: compiledRevision, url: compiledUrl }
              : undefined,
        )
        setProject(proj)
        setStatus('ready')
      } catch {
        if (active) setStatus('error')
      }
    })()
    return () => {
      active = false
    }
  }, [id, reloadKey])

  // ⚠️ No desktop o teclado É o controle, e ele não chegava ao jogo: o foco nasce
  // na página de fora, então a criança abria o link, apertava a seta e não
  // acontecia NADA até clicar no jogo. Medido: 0 teclas antes do clique, 1 depois.
  // O foco é dado quando o jogo RESPONDE, e não ao montar: até lá o `<Player>`
  // ainda troca de elemento (o documento do jogo substitui o de carregando).
  const focadoRef = useRef(false)
  // O que queremos do pad interno neste instante, para a resposta do palco poder
  // reforçar sem trazer dependência nova para o efeito da sondagem.
  const padDesejadoRef = useRef<InternalPadMode | 'off'>('off')
  const padAvisadoRef = useRef(false)
  const focarJogo = useCallback(() => {
    if (focadoRef.current) return
    const iframe = iframeRef.current
    if (!iframe) return
    focadoRef.current = true
    // ⚠️ Só se ninguém tiver o foco ainda: quem chegou de Tab e está no cabeçalho
    // não pode ser puxado para o jogo no meio da navegação.
    const atual = document.activeElement
    if (atual && atual !== document.body && atual !== iframe) return
    iframe.focus({ preventScroll: true })
  }, [])

  // O iframe é sandbox de origem opaca: não dá para LER o palco de fora. Então a
  // gente PERGUNTA e ele responde — o mesmo par do screenshot. Insistimos por um
  // tempo porque o canvas só existe depois que o jogo começa a rodar, e a
  // resposta é DADO do jogo da criança: passa pelo `sanitizeStageAspect` antes
  // de virar layout.
  //
  // O `reloadKey` está nas dependências DE PROPÓSITO, mesmo sem aparecer no
  // corpo: reiniciar troca a `key` do `<Player>`, ou seja, nasce um iframe NOVO.
  // A resposta que já temos é sobre uma janela que não existe mais.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reiniciar cria outro iframe, que precisa ser perguntado de novo
  useEffect(() => {
    if (status !== 'ready') return
    const startedAt = Date.now()
    // Reiniciar cria um iframe NOVO, que nasce sem foco.
    focadoRef.current = false
    padAvisadoRef.current = false
    // "Já sei o formato" é ter recebido um palco DE VERDADE. A resposta "não
    // tenho palco" é legítima (página só de HTML e CSS), mas é também o que o
    // jogo responde enquanto a tela de título não virou canvas — então ela não
    // encerra a pergunta.
    let known = false
    let timer: ReturnType<typeof setTimeout> | undefined

    function ask() {
      iframeRef.current?.contentWindow?.postMessage({ type: 'sz:stage?' }, '*')
    }
    function onMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) return
      const data: unknown = event.data
      if (typeof data !== 'object' || data === null) return
      if ((data as { type?: unknown }).type !== 'sz:stage') return
      focarJogo()
      // ⚠️ Reforça o pedido sobre o pad interno AGORA, uma vez: a mensagem que
      // sai no tempo fixo pode chegar ANTES de o "Ao iniciar" do jogo rodar, e aí
      // o `enableClassicControls` dele ligaria o pad depois do nosso desliga — dois
      // direcionais na tela de novo. Uma resposta de palco DE VERDADE prova que o
      // começo do jogo já rodou, porque é ele que cria o canvas.
      if (!padAvisadoRef.current) {
        padAvisadoRef.current = true
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'sz:pad-interno', mode: padDesejadoRef.current },
          '*',
        )
      }
      const next = sanitizeStageAspect(data)
      if (next === null) return
      if (project?.kind === 'pro' && (data as { responsive?: unknown }).responsive === true)
        known = true
      if (next !== STAGE_FILL) known = true
      setStageAspect(next)
    }
    function schedule() {
      const slow = Date.now() - startedAt > STAGE_PROBE_BURST_MS
      timer = setTimeout(
        () => {
          if (known) return
          if (!document.hidden) ask()
          schedule()
        },
        slow ? STAGE_PROBE_SLOW_MS : STAGE_PROBE_FAST_MS,
      )
    }

    window.addEventListener('message', onMessage)
    ask()
    schedule()

    return () => {
      if (timer !== undefined) clearTimeout(timer)
      window.removeEventListener('message', onMessage)
    }
  }, [status, reloadKey])

  // Quais botões este jogo pede. Sai do PROJETO, então vale já no primeiro quadro,
  // sem piscar e sem esperar o jogo responder. Projeto que o Estúdio não consiga
  // ler mantém exatamente o pad de antes deste lote.
  const controls = useMemo(() => describeProjectControls(project), [project])

  const title = typeof project?.name === 'string' && project.name.trim() ? project.name : 'Projeto'
  // R09: a página diz qual perfil publicado ela executa, a partir do próprio documento.
  const runtime = useMemo(() => (project ? publicRuntimeLabel(project) : null), [project])
  // Tela sensível ao toque OU janela estreita pedem o console. Medido AO VIVO: a
  // versão lida uma vez no mount ficava velha assim que o aparelho girava.
  const automaticGamepad = viewport.coarse || (viewport.w > 0 && viewport.w < 768)
  const gamepadVisible = resolveGamepadVisibility(automaticGamepad, gamepadOverride)
  const landscape = viewport.w > viewport.h
  // Sem os controles o palco pode girar para usar o lado comprido do aparelho.
  // Com eles não: o console em pé já preenche a tela, e girar deitaria o direcional.
  padDesejadoRef.current = gamepadVisible ? 'off' : (controls.ownPadMode ?? 'off')
  const rotated =
    !gamepadVisible &&
    shouldRotateStage({
      viewportW: viewport.w,
      viewportH: viewport.h,
      aspect: stageAspect,
      coarsePointer: viewport.coarse,
    })

  // O runtime do Jogo 2D sabe desenhar o próprio direcional por cima do palco.
  // Com o nosso console na tela, a criança via DOIS direcionais (o Reino Zero faz
  // exatamente isso). Some com o de dentro enquanto o de fora existe — e devolve
  // quando ela esconde o console, senão ela fica sem controle nenhum num jogo que
  // tinha pedido botões.
  //
  // O `reloadKey` está nas dependências pelo mesmo motivo do palco: reiniciar
  // cria um iframe NOVO, que nasce com o pad interno do jeito que o jogo pediu.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reiniciar cria outro iframe, que precisa ser avisado de novo
  useEffect(() => {
    if (status !== 'ready') return
    const mode = gamepadVisible ? 'off' : (controls.ownPadMode ?? 'off')
    const timer = setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage({ type: 'sz:pad-interno', mode }, '*')
    }, STAGE_PROBE_FAST_MS)
    return () => clearTimeout(timer)
  }, [status, reloadKey, gamepadVisible, controls.ownPadMode])

  const reload = () => {
    setStatus('loading')
    handleRestart()
  }

  const header = adult ? (
    <AdultHeader
      title={status === 'ready' ? title : null}
      runtime={status === 'ready' ? runtime : null}
      author={author}
      brandLabel={brandLabel}
      compact={rotated || gamepadVisible}
      ready={status === 'ready'}
      gamepadVisible={gamepadVisible}
      onToggleGamepad={() => setGamepadOverride(toggledGamepadOverride(gamepadVisible))}
      fullscreen={telaCheia}
      onToggleFullscreen={alternarTelaCheia}
    />
  ) : (
    <header
      className={`relative z-10 flex shrink-0 items-center justify-between gap-3 px-4 ${
        rotated ? 'py-0' : 'py-2 sm:px-6 sm:py-3'
      }`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {/* Mascote sai quando a altura está disputada: console ou palco girado */}
        {!gamepadVisible && !rotated && (
          <KidsMascot expression="celebrating" className="size-9 shrink-0 kid-float" />
        )}
        <span className="truncate font-bold [font-family:var(--font-display)] text-base sm:text-xl">
          {status === 'ready' ? title : 'Sistema Zero'}
        </span>
        {status === 'ready' && runtime ? (
          <RuntimeBadge
            runtime={runtime}
            className="bg-muted text-muted-foreground text-[11px] sm:text-xs"
          />
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <p className="text-muted-foreground text-xs sm:text-sm">
          {author ? (
            <>
              feito por <span className="font-bold text-foreground">{author}</span> ·{' '}
            </>
          ) : (
            'feito no '
          )}
          <a
            href={SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-(--kids-cyan) underline decoration-2 underline-offset-2 hover:opacity-80 dark:text-(--kids-lime)"
          >
            {brandLabel}
          </a>
        </p>
        {/* Sem o console, a tela cheia mora aqui: quem esconde os controles é
            justamente quem mais quer área de jogo, e ficava sem esse botão. */}
        {status === 'ready' && !gamepadVisible && (
          <button
            type="button"
            aria-label={telaCheia ? 'Sair da tela cheia' : 'Tela cheia'}
            onClick={alternarTelaCheia}
            className="flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {telaCheia ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        )}
        {/* Botão para ativar/desativar gamepad manualmente (desktop com touch, etc.) */}
        {status === 'ready' && (
          <button
            type="button"
            aria-label={gamepadVisible ? 'Ocultar controles' : 'Mostrar controles'}
            aria-pressed={gamepadVisible}
            onClick={() => setGamepadOverride(toggledGamepadOverride(gamepadVisible))}
            className="flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Gamepad2 size={18} />
          </button>
        )}
      </div>
    </header>
  )

  return (
    <main
      className={`relative flex h-dvh w-full flex-col overflow-hidden ${
        adult
          ? 'bg-[color-mix(in_oklab,var(--topo)_78%,black)] text-(--topo-texto)'
          : 'bg-background text-foreground'
      }`}
    >
      {/* Fundo lúdico: dois brilhos suaves da marca (cyan/lime) — o jogo é a estrela. */}
      {adult ? null : (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              'radial-gradient(60rem 40rem at 12% -10%, color-mix(in oklch, var(--kids-cyan) 22%, transparent), transparent 60%), radial-gradient(50rem 36rem at 100% 110%, color-mix(in oklch, var(--kids-lime) 22%, transparent), transparent 60%)',
          }}
        />
      )}

      {status === 'ready' && Player && project ? (
        <PublicStage
          rootRef={stageRootRef}
          iframeRef={iframeRef}
          onRestart={handleRestart}
          muted={muted}
          onMutedChange={setMuted}
          showControls={gamepadVisible}
          screenshotEnabled={project.programmingLanguage === 'python' || project.kind !== 'pro'}
          rotated={rotated}
          landscape={landscape}
          stageAspect={stageAspect}
          controls={controls}
          header={header}
          frameClassName={adult ? 'rounded-2xl border-2 border-(--topo-borda) bg-black' : undefined}
        >
          <Player
            key={reloadKey}
            ref={iframeRef}
            project={project}
            muted={muted}
            published={published}
            pythonRuntimeRequest={pythonRuntimeRequest}
            onReady={focarJogo}
            onError={(error) => {
              setRuntimeError(
                project.programmingLanguage === 'python' && error
                  ? error.message.slice(0, 2000)
                  : null,
              )
              setStatus('error')
            }}
            title={title}
          />
        </PublicStage>
      ) : adult ? (
        <>
          {header}
          <AdultStatus status={status} runtimeError={runtimeError} onReload={reload} />
        </>
      ) : (
        <>
          {header}
          <div className="relative z-10 flex min-h-0 flex-1 flex-col">
            {status === 'loading' ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <KidsMascot expression="thinking" className="size-16 kid-float" />
                <p className="font-bold [font-family:var(--font-display)] text-muted-foreground">
                  Preparando o jogo…
                </p>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                <KidsMascot expression="sleeping" className="size-16" />
                <p className="font-bold [font-family:var(--font-display)] text-lg">
                  {runtimeError
                    ? 'Não foi possível executar este jogo.'
                    : 'Não encontramos este jogo.'}
                </p>
                <p className="max-w-xs text-muted-foreground text-sm">
                  {runtimeError ?? 'O link pode estar errado ou o jogo não está mais disponível.'}
                </p>
              </div>
            )}
          </div>
        </>
      )}
      {adult && status === 'ready' && !rotated && !gamepadVisible ? (
        <div className="relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 pb-4 text-[17px] sm:px-7">
          <span className="flex items-start gap-2">
            <Keyboard aria-hidden="true" className="mt-0.5 size-5 flex-none" />
            <span>
              No computador, jogue pelo teclado. No celular, toque em{' '}
              <strong className="text-white">Controles na tela</strong>.
            </span>
          </span>
          <a
            href={SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center gap-1.5 font-bold text-(--sz-community-action-light) underline underline-offset-4"
          >
            Quer criar um jogo assim? Conheça a Sistema Zero
            <ArrowUpRight aria-hidden="true" className="size-5" />
          </a>
        </div>
      ) : null}
    </main>
  )
}

const ADULT_BUTTON =
  'inline-flex min-h-12 items-center gap-2 rounded-xl px-4 font-bold text-[17px] focus-visible:outline-3 focus-visible:outline-(--sz-community-action-light) focus-visible:outline-offset-2'

/** Linguagem e tipo à vista; a identidade exata do runtime vai no título e para leitores de tela. */
function RuntimeBadge({
  runtime,
  className,
}: {
  runtime: ReturnType<typeof publicRuntimeLabel>
  className: string
}) {
  return (
    <span
      data-runtime-profile
      title={runtime.detail ?? undefined}
      className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 font-bold ${className}`}
    >
      {runtime.label}
      {runtime.detail ? <span className="sr-only">. {runtime.detail}</span> : null}
    </span>
  )
}

/** O cabeçalho marinho da página pública na comunidade adulta. */
function AdultHeader({
  title,
  runtime,
  author,
  brandLabel,
  compact,
  ready,
  gamepadVisible,
  onToggleGamepad,
  fullscreen,
  onToggleFullscreen,
}: {
  title: string | null
  runtime: ReturnType<typeof publicRuntimeLabel> | null
  author: string | null
  brandLabel: string
  /** Com o console ou o palco girado a altura é disputada: sai a logo. */
  compact: boolean
  ready: boolean
  gamepadVisible: boolean
  onToggleGamepad: () => void
  fullscreen: boolean
  onToggleFullscreen: () => void
}) {
  return (
    <header
      className={`relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-(--topo-borda) border-b bg-(--topo) px-4 ${
        compact ? 'py-1.5' : 'py-3 sm:px-7'
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        {compact ? null : (
          <>
            <BrandLogo
              fundo="escuro"
              label={brandLabel}
              className="hidden h-auto w-[132px] flex-none sm:block"
            />
            <span
              aria-hidden="true"
              className="hidden h-8 w-px flex-none bg-(--topo-borda) sm:block"
            />
          </>
        )}
        <div className="flex min-w-0 flex-col leading-tight">
          <div className="flex min-w-0 items-center gap-2.5">
            <h1 className="m-0 truncate font-extrabold text-[22px] text-white [font-family:var(--font-display)]">
              {title ?? 'Jogo da comunidade'}
            </h1>
            {runtime ? (
              <RuntimeBadge
                runtime={runtime}
                className="border border-(--topo-borda) text-[17px] text-white"
              />
            ) : null}
          </div>
          <span className="truncate text-[17px]">
            {author ? (
              <>
                feito por <strong className="text-white">{author}</strong> na comunidade{' '}
                {brandLabel}
              </>
            ) : (
              <>feito na comunidade {brandLabel}</>
            )}
          </span>
        </div>
      </div>
      {ready ? (
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            aria-pressed={gamepadVisible}
            onClick={onToggleGamepad}
            className={`${ADULT_BUTTON} border-2 border-(--topo-borda) text-white hover:bg-(--topo-borda) aria-pressed:bg-(--topo-borda)`}
          >
            <Gamepad2 aria-hidden="true" className="size-5" />
            Controles na tela
          </button>
          {/* Com o console, a tela cheia mora na barra dele (o alvo é o corpo do console). */}
          {gamepadVisible ? null : (
            <button
              type="button"
              onClick={onToggleFullscreen}
              className={`${ADULT_BUTTON} bg-primary text-primary-foreground hover:bg-(--primary-hover)`}
            >
              {fullscreen ? (
                <Minimize aria-hidden="true" className="size-5" />
              ) : (
                <Maximize aria-hidden="true" className="size-5" />
              )}
              {fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            </button>
          )}
        </div>
      ) : null}
    </header>
  )
}

/** Abrindo, link sem jogo e erro ao rodar, sem o mascote do Kids. */
function AdultStatus({
  status,
  runtimeError,
  onReload,
}: {
  status: 'loading' | 'ready' | 'error'
  runtimeError: string | null
  onReload: () => void
}) {
  return (
    <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-[17px]">
      {status === 'loading' ? (
        <div role="status" className="flex flex-col items-center gap-3">
          <Loader2 aria-hidden="true" className="size-10 animate-spin" />
          <p className="m-0 font-bold text-[20px] text-white">Preparando o jogo…</p>
        </div>
      ) : (
        <div role="alert" className="flex max-w-md flex-col items-center gap-3">
          <AlertCircle aria-hidden="true" className="size-10" />
          <p className="m-0 font-bold text-[20px] text-white">
            {runtimeError ? 'Não foi possível executar este jogo.' : 'Não encontramos este jogo.'}
          </p>
          {runtimeError ? (
            <>
              <button
                type="button"
                onClick={onReload}
                className={`${ADULT_BUTTON} bg-primary text-primary-foreground hover:bg-(--primary-hover)`}
              >
                <RotateCcw aria-hidden="true" className="size-5" />
                Recarregar
              </button>
              <details className="w-full text-left">
                <summary className="min-h-12 cursor-pointer py-3 font-bold">Detalhes</summary>
                <pre className="m-0 whitespace-pre-wrap break-words font-mono text-[17px]">
                  {runtimeError}
                </pre>
              </details>
            </>
          ) : (
            <p className="m-0">O link pode estar errado ou o jogo não está mais disponível.</p>
          )}
        </div>
      )}
    </div>
  )
}
