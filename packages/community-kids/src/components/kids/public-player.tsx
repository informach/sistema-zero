'use client'

import type { Project, StudioProjectPlayerProps } from '@sistemazero/studio'
import { describeProjectControls, type InternalPadMode } from '@sistemazero/studio/controls'
import { Gamepad2, Maximize } from 'lucide-react'
import { type ComponentType, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type GamepadVisibilityOverride,
  resolveGamepadVisibility,
  toggledGamepadOverride,
} from '@/lib/gamepad-visibility'
import {
  DEFAULT_STAGE_ASPECT,
  STAGE_FILL,
  type StageAspect,
  sanitizeStageAspect,
  shouldRotateStage,
} from '@/lib/stage-fit'
import { requestGamepadFullscreen } from './gamepad-fullscreen'
import { KidsMascot } from './mascot'
import { PublicStage } from './public-stage'

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
export function PublicPlayer({ id }: { id: string }) {
  // `id` identifica todo o recurso assíncrono e todo o estado de execução do
  // jogo. Uma key nova desmonta a instância anterior de forma atômica: autor,
  // projeto, iframe, aspecto, foco e preferências nunca atravessam entre jogos.
  return <PublicPlayerForProject key={id} id={id} />
}

function PublicPlayerForProject({ id }: { id: string }) {
  const [Player, setPlayer] = useState<PlayerComponent | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [author, setAuthor] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [reloadKey, setReloadKey] = useState(0)
  const [gamepadOverride, setGamepadOverride] = useState<GamepadVisibilityOverride>(null)
  const [stageAspect, setStageAspect] = useState<StageAspect>(DEFAULT_STAGE_ASPECT)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const stageRootRef = useRef<HTMLDivElement>(null)
  const viewport = useViewport()

  const handleRestart = useCallback(() => setReloadKey((k) => k + 1), [])

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const [mod, res] = await Promise.all([
          import('@sistemazero/studio/player'),
          fetch(`/api/studio/play/${encodeURIComponent(id)}`),
        ])
        if (!active) return
        if (!res.ok) {
          setStatus('error')
          return
        }
        const rawAuthor = res.headers.get('X-Author-Name')
        const proj = (await res.json()) as Project
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
        setProject(proj)
        setStatus('ready')
      } catch {
        if (active) setStatus('error')
      }
    })()
    return () => {
      active = false
    }
  }, [id])

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

  const header = (
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
            Sistema Zero Kids
          </a>
        </p>
        {/* Sem o console, a tela cheia mora aqui: quem esconde os controles é
            justamente quem mais quer área de jogo, e ficava sem esse botão. */}
        {status === 'ready' && !gamepadVisible && (
          <button
            type="button"
            aria-label="Tela cheia"
            onClick={() => {
              void requestGamepadFullscreen(stageRootRef.current)
            }}
            className="flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Maximize size={18} />
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
    <main className="relative flex h-dvh w-full flex-col overflow-hidden bg-background text-foreground">
      {/* Fundo lúdico: dois brilhos suaves da marca (cyan/lime) — o jogo é a estrela. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(60rem 40rem at 12% -10%, color-mix(in oklch, var(--kids-cyan) 22%, transparent), transparent 60%), radial-gradient(50rem 36rem at 100% 110%, color-mix(in oklch, var(--kids-lime) 22%, transparent), transparent 60%)',
        }}
      />

      {status === 'ready' && Player && project ? (
        <PublicStage
          rootRef={stageRootRef}
          iframeRef={iframeRef}
          onRestart={handleRestart}
          showControls={gamepadVisible}
          rotated={rotated}
          landscape={landscape}
          stageAspect={stageAspect}
          controls={controls}
          header={header}
        >
          <Player key={reloadKey} ref={iframeRef} project={project} title={title} />
        </PublicStage>
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
                  Não encontramos este jogo.
                </p>
                <p className="max-w-xs text-muted-foreground text-sm">
                  O link pode estar errado ou o jogo não está mais disponível.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </main>
  )
}
