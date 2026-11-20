import { type JSX, useMemo } from 'react'
import { useStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { IconPause, IconPlay, IconRefresh } from '#ui'
import { javaScriptProject } from '../../core/editableProject'
import { createDictionaryTranslator, type Translator } from '../../core/i18n/translator'
import {
  forgetInvestigationWindow,
  type InvestigationValue,
  investigationWindowFor,
  sendDevtoolsCommand,
} from '../../state/devtools'
import { useHighlightStoreApi } from '../../state/highlightStore'
import { useProjectStore } from '../../state/projectStore'
import { useProRun, useProRunApi } from '../../state/proRun'
import { useSourcemapStore } from '../../state/sourcemapStore'
import { useUIStore, useUIStoreApi } from '../../state/uiStore'
import { useT } from '../../studio/i18n'
import { useStudioTutor } from '../../studio/tutor'
import { blockAtScriptLine, blockLabel, declarationLine } from './investigateBlocks'
import { INVESTIGATE_COPY } from './investigateCopy'

function useInvestigateT(): Translator {
  const t = useT()
  return createDictionaryTranslator(INVESTIGATE_COPY, t.locale ?? 'pt-BR')
}

/** Duas setas e a barra (Lucide "step-forward"): o Avançar 1 quadro. */
function IconStep(): JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M5 4.5v15l11-7.5z" />
      <rect x="17" y="4.5" width="3" height="15" rx="1" />
    </svg>
  )
}

/**
 * A aba Investigar da gaveta (proposta aprovada em 20/11/2026, pranchas "Investigar: o jogo
 * pausado" e "o jogo parou com erro" de `docs/estudio-evolucao/paineis-proposta.md`). Liga a
 * investigação (o jogo recomeça com o leitor das variáveis e a ponte), pausa e avança um quadro
 * pela pausa que o motor já tem, mostra os valores do jogo e, quando ele para com erro, o caminho
 * por onde o jogo passou até o bloco que falhou. Nada disso vale nota.
 */
export function InvestigatePanel(): JSX.Element {
  const t = useInvestigateT()
  const ui = useUIStoreApi()
  const investigating = useUIStore((s) => s.investigating)
  // Ligar esquece a janela anterior: a nova começa limpa.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `investigating` é o GATILHO da janela nova
  const investigation = useMemo(() => investigationWindowFor(ui), [ui, investigating])
  const reading = useStore(
    investigation,
    useShallow((s) => ({
      ready: s.ready,
      frame: s.frame,
      paused: s.paused,
      canPause: s.canPause,
      values: s.values,
      stopped: s.stopped,
    })),
  )
  const run = useProRun(
    useShallow((s) => ({
      phase: s.state?.phase ?? null,
      runtimeError: s.state?.phase === 'error' && s.state.errorKind === 'runtime',
      hint: s.state?.errorHint ?? null,
    })),
  )
  const toggle = () => {
    forgetInvestigationWindow(ui)
    ui.setState({ investigating: !investigating })
  }

  if (!investigating)
    return (
      <div className="flex flex-wrap items-center gap-2.5" data-sz-devtools="investigate">
        <button
          type="button"
          className="sz-pro-btn sz-pro-btn--sm sz-pro-btn--primary"
          onClick={toggle}
        >
          <IconPlay />
          {t('inv.start')}
        </button>
        <span className="text-sm">{t('inv.off')}</span>
      </div>
    )

  const stopButton = (
    <button type="button" className="sz-pro-btn sz-pro-btn--sm" onClick={toggle}>
      {t('inv.stop')}
    </button>
  )
  let left: JSX.Element
  let right: JSX.Element | null = null
  if (run.runtimeError && reading.stopped) {
    left = <StoppedCard t={t} frame={reading.stopped.frame} hint={run.hint} stop={stopButton} />
    right = <PathCard t={t} lines={reading.stopped.lines} values={reading.stopped.values} />
  } else if (run.phase !== 'running' && run.phase !== 'error') {
    left = (
      <article className="sz-pro-card flex flex-col gap-2.5 p-3.5">
        <p className="m-0 text-sm">{t('inv.notRunning')}</p>
        <div>{stopButton}</div>
      </article>
    )
  } else if (!reading.ready) {
    left = (
      <article className="sz-pro-card flex flex-col gap-2.5 p-3.5">
        <p className="m-0 text-sm" role="status">
          {t('inv.waiting')}
        </p>
        <div>{stopButton}</div>
      </article>
    )
  } else if (reading.paused) {
    left = (
      <article className="sz-pro-card flex flex-col gap-2.5 p-3.5">
        <p className="m-0 text-xs font-bold text-sz-fg-soft">{t('inv.paused')}</p>
        {reading.frame !== null ? (
          <p className="m-0 text-[17px] font-bold">
            {t('inv.frame', { frame: reading.frame.toLocaleString(locale(t)) })}
          </p>
        ) : null}
        <p className="m-0 text-sm leading-snug">
          {t('inv.paused.before')}
          <b>{t('inv.paused.loop')}</b>
          {t('inv.paused.after')}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="sz-pro-btn sz-pro-btn--sm sz-pro-btn--primary"
            onClick={() => sendDevtoolsCommand(ui, 'resume')}
          >
            <IconPlay />
            {t('inv.resume')}
          </button>
          <button
            type="button"
            className="sz-pro-btn sz-pro-btn--sm"
            onClick={() => sendDevtoolsCommand(ui, 'step')}
          >
            <IconStep />
            {t('inv.step')}
          </button>
          {stopButton}
        </div>
      </article>
    )
    right = <ValuesCard t={t} values={reading.values} frame={reading.frame} />
  } else {
    left = (
      <article className="sz-pro-card flex flex-col gap-2.5 p-3.5">
        <p className="m-0 text-xs font-bold text-sz-fg-soft">{t('inv.running')}</p>
        {reading.frame !== null ? (
          <p className="m-0 text-[17px] font-bold">
            {t('inv.frame', { frame: reading.frame.toLocaleString(locale(t)) })}
          </p>
        ) : null}
        {reading.canPause ? null : <p className="m-0 text-sm">{t('inv.cantPause')}</p>}
        <div className="flex flex-wrap gap-2">
          {reading.canPause ? (
            <button
              type="button"
              className="sz-pro-btn sz-pro-btn--sm sz-pro-btn--primary"
              onClick={() => sendDevtoolsCommand(ui, 'pause')}
            >
              <IconPause />
              {t('inv.pause')}
            </button>
          ) : null}
          {stopButton}
        </div>
      </article>
    )
    right = <ValuesCard t={t} values={reading.values} frame={reading.frame} />
  }
  return (
    <div
      className="grid items-start gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]"
      data-sz-devtools="investigate"
    >
      {left}
      {right}
    </div>
  )
}

const locale = (t: Translator) => (t.locale === 'en' ? 'en-US' : 'pt-BR')

/** O bloco que o painel mostra: por uma linha do script gerado, pelo mapa do sinal vermelho. */
function useBlockFinder(): {
  forLine: (line: number) => string | null
  forName: (name: string) => string | null
  label: (blockId: string) => string | null
  reveal: (blockId: string) => void
} {
  const project = useProjectStore((s) => (s.project ? javaScriptProject(s.project) : null))
  const map = useSourcemapStore((s) => s.map)
  const highlight = useHighlightStoreApi()
  return useMemo(() => {
    const script = project?.files['script.js'] ?? ''
    const forLine = (line: number) => blockAtScriptLine(map, line)
    return {
      forLine,
      forName: (name) => {
        const line = declarationLine(script, name)
        return line === null ? null : forLine(line)
      },
      label: (blockId) => blockLabel(project?.blocksState ?? null, blockId),
      reveal: (blockId) => highlight.getState().revealBlock({ kind: 'block', blockId }),
    }
  }, [project, map, highlight])
}

function ValuesCard({
  t,
  values,
  frame,
}: {
  t: Translator
  values: readonly InvestigationValue[]
  frame: number | null
}): JSX.Element {
  const blocks = useBlockFinder()
  return (
    <article className="sz-pro-card px-3.5 pt-3 pb-2">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <p className="m-0 font-bold">{t('inv.values')}</p>
        {frame !== null ? (
          <span className="text-xs text-sz-fg-soft">
            {t('inv.values.frame', { frame: frame.toLocaleString(locale(t)) })}
          </span>
        ) : null}
      </div>
      {values.length === 0 ? <p className="m-0 py-1.5 text-sm">{t('inv.values.none')}</p> : null}
      {values.map((value) => {
        const blockId = blocks.forName(value.name)
        return (
          <div
            key={value.name}
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] items-center gap-2.5 border-t border-sz-border py-1.5"
          >
            <span className="font-mono text-sm font-bold">{value.name}</span>
            <span className="font-mono text-sm">
              {value.text}
              {value.changed ? (
                <span className="sz-pro-badge sz-pro-badge--quiet ml-1.5">{t('inv.changed')}</span>
              ) : null}
            </span>
            {blockId ? (
              <button
                type="button"
                className="sz-pro-btn sz-pro-btn--sm"
                onClick={() => blocks.reveal(blockId)}
              >
                {t('inv.showBlock')}
              </button>
            ) : (
              <span />
            )}
          </div>
        )
      })}
    </article>
  )
}

function StoppedCard({
  t,
  frame,
  hint,
  stop,
}: {
  t: Translator
  frame: number | null
  hint: string | null
  stop: JSX.Element
}): JSX.Element {
  const proRun = useProRunApi()
  const tutor = useStudioTutor()
  return (
    <article className="sz-pro-card flex flex-col gap-2 p-3.5">
      <p className="m-0 text-xs font-bold text-sz-error">
        {frame !== null
          ? t('inv.stopped', { frame: frame.toLocaleString(locale(t)) })
          : t('inv.stopped.noFrame')}
      </p>
      {hint ? <p className="m-0 text-[15px] font-bold leading-snug">{hint}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="sz-pro-btn sz-pro-btn--sm"
          onClick={() => {
            const { actions, revealStage } = proRun.getState()
            actions?.run()
            revealStage?.()
          }}
        >
          <IconRefresh />
          {t('inv.runAgain')}
        </button>
        {tutor.config ? (
          <button
            type="button"
            className="sz-pro-btn sz-pro-btn--sm"
            onClick={() => tutor.setOpen(true)}
          >
            {t('inv.askZappy')}
          </button>
        ) : null}
        {stop}
      </div>
    </article>
  )
}

function PathCard({
  t,
  lines,
  values,
}: {
  t: Translator
  lines: readonly number[]
  values: readonly InvestigationValue[]
}): JSX.Element {
  const blocks = useBlockFinder()
  // O jogo manda de dentro para fora; a criança lê de onde o jogo veio até onde parou. Linhas
  // repetidas (o mesmo bloco chamado de novo) e as que não viram bloco ficam uma vez só.
  const steps = useMemo(() => {
    const seen = new Set<string>()
    const out: { key: string; line: number; blockId: string | null; label: string }[] = []
    for (const line of [...lines].reverse()) {
      const blockId = blocks.forLine(line)
      const key = blockId ?? `line:${line}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({
        key,
        line,
        blockId,
        label: (blockId && blocks.label(blockId)) || t('inv.path.line', { line }),
      })
    }
    return out
  }, [lines, blocks, t])
  return (
    <article className="sz-pro-card px-3.5 pt-3 pb-2">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <p className="m-0 font-bold">{t('inv.path')}</p>
        <span className="text-xs text-sz-fg-soft">{t('inv.path.from')}</span>
      </div>
      {steps.length === 0 ? <p className="m-0 py-1.5 text-sm">{t('inv.path.none')}</p> : null}
      {steps.map((step, index) => {
        const here = index === steps.length - 1
        return (
          <div
            key={step.key}
            className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-2.5 border-t border-sz-border py-1.5"
          >
            <span className="text-xs font-bold text-sz-fg-soft">{index + 1}</span>
            <span className={`text-sm ${here ? 'font-bold' : ''}`}>
              {step.label}
              {here ? <span className="sz-pro-badge ml-1.5">{t('inv.path.here')}</span> : null}
            </span>
            {step.blockId ? (
              <button
                type="button"
                className={`sz-pro-btn sz-pro-btn--sm ${here ? 'sz-pro-btn--primary' : ''}`}
                onClick={() => step.blockId && blocks.reveal(step.blockId)}
              >
                {t('inv.showBlock')}
              </button>
            ) : (
              <span />
            )}
          </div>
        )
      })}
      {values.length ? (
        <p className="m-0 pt-1.5 pb-0.5 text-xs text-sz-fg-soft">
          {t('inv.stoppedValues', {
            values: values.map((value) => `${value.name} ${value.text}`).join(' · '),
          })}
        </p>
      ) : null}
    </article>
  )
}
