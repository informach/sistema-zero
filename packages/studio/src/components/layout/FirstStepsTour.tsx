import { type JSX, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button } from '#ui'
import { captureProjectStorageScope } from '../../state/projectStorageRuntime'
import { useProjectStore } from '../../state/projectStore'
import { useStudioConfig } from '../../studio/config'
import { useT } from '../../studio/i18n'

/**
 * O passeio de primeiros passos (D6 do redesenho do clássico, 11/2026): quatro balões no
 * primeiro jogo de blocos — a paleta, as áreas, o Rodar e o caminho do erro — com "Pular".
 * Só no Estúdio livre (`firstStepsTour`, que só o host do Estúdio livre liga; a aula e a oficina
 * ao vivo nunca, o robô de gravação opera ali), só para
 * quem edita, e uma vez por perfil (a chave leva o namespace do perfil; neste navegador).
 */
const STEPS = [
  { key: 'tour.palette', anchors: ['.blocklyToolbox'] },
  { key: 'tour.areas', anchors: ['.sz_frame_start', '.blocklySvg'] },
  { key: 'tour.run', anchors: ['[data-live-target="studio-run"]'] },
  { key: 'tour.problems', anchors: ['.sz-classic-dock'] },
] as const

const BUBBLE_WIDTH = 300
const GAP = 12

function tourKey(): string {
  return `sz:first-steps-done:${captureProjectStorageScope().namespace || 'default'}`
}

function tourDone(): boolean {
  try {
    return localStorage.getItem(tourKey()) === '1'
  } catch {
    // Sem armazenamento: não insiste (o passeio voltaria a cada abertura).
    return true
  }
}

function markTourDone(): void {
  try {
    localStorage.setItem(tourKey(), '1')
  } catch {
    // Armazenamento bloqueado: vale só nesta visita.
  }
}

function visibleAnchor(selectors: readonly string[]): Element | null {
  for (const selector of selectors) {
    for (const element of document.querySelectorAll(selector)) {
      const box = element.getBoundingClientRect()
      if (box.width > 0 && box.height > 0) return element
    }
  }
  return null
}

export function FirstStepsTour(): JSX.Element | null {
  const t = useT()
  const enabled = useStudioConfig().firstStepsTour
  const eligible = useProjectStore(
    (s) =>
      s.editingAccess === 'author' &&
      !!s.project &&
      s.project.kind !== 'pro' &&
      s.project.mode === 'blocks' &&
      s.project.programmingLanguage !== 'python',
  )
  const [step, setStep] = useState<number | null>(null)
  const [place, setPlace] = useState<{ top: number; left: number } | null>(null)
  const bubble = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Deixou de valer no meio (foi para o código, outro projeto): o balão sai sem marcar.
    if (!enabled || !eligible) {
      setStep(null)
      return
    }
    if (tourDone()) return
    // Um respiro para o editor desenhar a paleta e as áreas antes do primeiro balão.
    const timer = setTimeout(() => setStep(0), 1200)
    return () => clearTimeout(timer)
  }, [enabled, eligible])

  useLayoutEffect(() => {
    if (step === null) return
    const current = STEPS[step]
    if (!current) return
    const measure = () => {
      const anchor = visibleAnchor(current.anchors)
      const height = bubble.current?.offsetHeight ?? 160
      if (!anchor) {
        setPlace({
          top: Math.max(GAP, window.innerHeight / 2 - height / 2),
          left: Math.max(GAP, window.innerWidth / 2 - BUBBLE_WIDTH / 2),
        })
        return
      }
      const box = anchor.getBoundingClientRect()
      const width = Math.min(BUBBLE_WIDTH, window.innerWidth - GAP * 2)
      // Ao lado de uma coluna alta (a paleta), embaixo/em cima de uma peça baixa.
      const beside =
        box.height > window.innerHeight * 0.5 && box.right + GAP + width < window.innerWidth
      const top = beside
        ? Math.min(Math.max(GAP, box.top + 24), window.innerHeight - height - GAP)
        : box.bottom + GAP + height < window.innerHeight
          ? box.bottom + GAP
          : Math.max(GAP, box.top - GAP - height)
      const left = beside
        ? box.right + GAP
        : Math.min(
            Math.max(GAP, box.left + box.width / 2 - width / 2),
            window.innerWidth - width - GAP,
          )
      setPlace({ top, left })
    }
    measure()
    window.addEventListener('resize', measure)
    const late = setTimeout(measure, 300)
    return () => {
      window.removeEventListener('resize', measure)
      clearTimeout(late)
    }
  }, [step])

  if (step === null) return null
  const current = STEPS[step]
  if (!current) return null
  const last = step === STEPS.length - 1
  const finish = () => {
    markTourDone()
    setStep(null)
  }
  return (
    <div
      ref={bubble}
      role="dialog"
      aria-label={t('tour.title')}
      className="sz-tour"
      style={{
        top: place?.top ?? -9999,
        left: place?.left ?? -9999,
        width: Math.min(
          BUBBLE_WIDTH,
          typeof window === 'undefined' ? BUBBLE_WIDTH : window.innerWidth - GAP * 2,
        ),
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') finish()
      }}
    >
      <p className="sz-tour__step">
        {t('tour.title')} · {t('tour.step', { n: step + 1, total: STEPS.length })}
      </p>
      <p className="sz-tour__text">{t(current.key)}</p>
      <div className="sz-tour__actions">
        {!last ? (
          <Button variant="ghost" size="sm" className="sz-tour__skip" onClick={finish}>
            {t('tour.skip')}
          </Button>
        ) : null}
        <Button
          variant="primary"
          size="sm"
          // Sem autoFocus: o balão aparece sozinho e não pode roubar o foco de quem já está
          // arrastando um bloco ou escrevendo.
          onClick={() => (last ? finish() : setStep(step + 1))}
        >
          {last ? t('tour.done') : t('tour.next')}
        </Button>
      </div>
    </div>
  )
}
