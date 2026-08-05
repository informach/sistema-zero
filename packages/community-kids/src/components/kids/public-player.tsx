'use client'

import type { Project, StudioProjectPlayerProps } from '@sistemazero/studio'
import { Gamepad2 } from 'lucide-react'
import { type ComponentType, useCallback, useEffect, useRef, useState } from 'react'
import { KidsMascot } from './mascot'
import { MobileGamepad } from './mobile-gamepad'

// O Player importado dinamicamente precisa aceitar ref — usamos forwardRef no lado do Studio.
// Aqui apenas tipamos o ref como HTMLIFrameElement para o useRef.
type PlayerComponent = ComponentType<
  StudioProjectPlayerProps & { ref?: React.Ref<HTMLIFrameElement> }
>

// A "Sistema Zero Kids" no rodapé leva à oferta do Desafio do 1º jogo. Por ora,
// a home do site (a usuária troca pela URL da oferta quando tiver).
const SITE_URL = 'https://sistemazero.com.br'

/**
 * Player PÚBLICO (sem login) de um projeto compartilhado no Mural. Roda SÓ o jogo
 * (sem editor/código) num iframe sandbox — via o `StudioProjectPlayer` do
 * @sistemazero/studio (subpath `/player`: traz só a cadeia de preview, sem
 * Monaco/Blockly). Busca o projeto na rota mesma-origem `/api/studio/play/:id`
 * (stream do R2) + o **primeiro nome** do autor no header `X-Author-Name` (o hub
 * só guarda o 1º nome — nunca o sobrenome/PII). O palco tem a proporção 800×480
 * (5:3), a mesma dos jogos, sempre inteiro na tela.
 */
export function PublicPlayer({ id }: { id: string }) {
  const [Player, setPlayer] = useState<PlayerComponent | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [author, setAuthor] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [reloadKey, setReloadKey] = useState(0)
  const [showGamepad, setShowGamepad] = useState(false)
  const [forceGamepad, setForceGamepad] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const handleRestart = useCallback(() => setReloadKey((k) => k + 1), [])

  // Detecta tela touch após hidratação (evita mismatch de SSR)
  useEffect(() => {
    const isTouch = window.matchMedia('(pointer: coarse)').matches
    const isNarrow = window.innerWidth < 768
    setShowGamepad(isTouch || isNarrow)
  }, [])

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

  const title = typeof project?.name === 'string' && project.name.trim() ? project.name : 'Projeto'
  const gamepadVisible = showGamepad || forceGamepad

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

      {/* Header — compacto quando o gamepad está visível para sobrar espaço ao jogo */}
      <header className="relative z-10 flex shrink-0 items-center justify-between gap-3 px-4 py-2 sm:py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          {/* Mascote fica oculta no mobile com gamepad para poupar altura */}
          {!gamepadVisible && (
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
          {/* Botão para ativar/desativar gamepad manualmente (desktop com touch, etc.) */}
          {status === 'ready' && (
            <button
              type="button"
              aria-label={gamepadVisible ? 'Ocultar controles' : 'Mostrar controles'}
              aria-pressed={gamepadVisible}
              onClick={() => setForceGamepad((v) => !v)}
              className="ml-1 flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Gamepad2 size={18} />
            </button>
          )}
        </div>
      </header>

      {/* Área do jogo + gamepad */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        {status === 'loading' ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <KidsMascot expression="thinking" className="size-16 kid-float" />
            <p className="font-bold [font-family:var(--font-display)] text-muted-foreground">
              Preparando o jogo…
            </p>
          </div>
        ) : status === 'error' ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <KidsMascot expression="sleeping" className="size-16" />
            <p className="font-bold [font-family:var(--font-display)] text-lg">
              Não encontramos este jogo.
            </p>
            <p className="max-w-xs text-muted-foreground text-sm">
              O link pode estar errado ou o jogo não está mais disponível.
            </p>
          </div>
        ) : Player && project ? (
          gamepadVisible ? (
            // Layout console: MobileGamepad envolve o jogo como filho —
            // em portrait empilha (jogo + controles), em landscape coloca lado a lado.
            <MobileGamepad iframeRef={iframeRef} onRestart={handleRestart}>
              <Player key={reloadKey} ref={iframeRef} project={project} title={title} />
            </MobileGamepad>
          ) : (
            // Layout desktop: palco centralizado sem gamepad
            <div className="grid min-h-0 flex-1 place-items-center p-3 sm:p-5">
              <div
                className="kids-unit-cyan w-full"
                style={{ maxWidth: 'min(56rem, calc((100dvh - 8rem) * 5 / 3))' }}
              >
                <div className="aspect-[5/3] w-full overflow-hidden rounded-3xl border-4 border-(--unit) bg-white shadow-[0_8px_0_color-mix(in_oklch,var(--unit)_40%,transparent)]">
                  <Player key={reloadKey} ref={iframeRef} project={project} title={title} />
                </div>
              </div>
            </div>
          )
        ) : null}
      </div>
    </main>
  )
}
