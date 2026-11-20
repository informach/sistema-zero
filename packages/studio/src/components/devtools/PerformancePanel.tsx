import { type JSX, useEffect, useMemo, useState } from 'react'
import { useStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { IconPause, IconPlay } from '#ui'
import { isPythonProject } from '../../core/editableProject'
import { createDictionaryTranslator, type Translator } from '../../core/i18n/translator'
import {
  forgetPerfWindow,
  type PerfSlice,
  perfWindowFor,
  programTimeFor,
} from '../../state/devtools'
import { useProjectStore } from '../../state/projectStore'
import { useProRun } from '../../state/proRun'
import { useUIStore, useUIStoreApi } from '../../state/uiStore'
import { useT } from '../../studio/i18n'
import { PERFORMANCE_COPY } from './performanceCopy'
import { isSlowSlice, PERF_SMOOTH_FRAME_MS, summarizePerf } from './perfSummary'

/** O tradutor do painel: os textos dele, no idioma da instância do Estúdio. */
function usePerfT(): Translator {
  const t = useT()
  return createDictionaryTranslator(PERFORMANCE_COPY, t.locale ?? 'pt-BR')
}

/**
 * O que o projeto Python desenha: `null` fora do Python; `true` com Turtle, Pygame Zero,
 * pygame-ce ou Raylib; `false` no programa só de print e input. Quem decide é a prévia Python
 * (`programTimeFor`): o painel não carrega nada do Python (uma sessão só de JavaScript não baixa
 * um byte dele, `e2e/js-session-python-payload.spec.ts`).
 */
function usePythonCanvas(ui: object): boolean | null {
  const python = useProjectStore((s) => Boolean(s.project && isPythonProject(s.project)))
  const canvas = useStore(
    useMemo(() => programTimeFor(ui), [ui]),
    (s) => s.canvas,
  )
  return python ? (canvas ?? true) : null
}

/**
 * A aba Desempenho da gaveta (proposta aprovada em 20/11/2026, prancha "Desempenho" de
 * `docs/estudio-evolucao/paineis-proposta.md`). Os números vêm do próprio jogo, medidos
 * dentro dele (`preview/devtoolsBridge.ts`; no Python, o quadro dele conta os quadros pintados);
 * cada um diz se foi medido ou se não há leitura. Ligar a medida no JavaScript monta o jogo de
 * novo com a ponte; fechar a gaveta desliga (`ClassicDock`). O programa Python que não desenha
 * mostra o tempo que levou.
 */
export function PerformancePanel(): JSX.Element {
  const t = usePerfT()
  const ui = useUIStoreApi()
  const pythonCanvas = usePythonCanvas(ui)
  // O programa Python sem tela não tem quadros: a aba mostra o tempo que ele leva.
  if (pythonCanvas === false) return <ProgramTimePanel />
  return <FramesPanel t={t} ui={ui} python={pythonCanvas === true} />
}

function FramesPanel({
  t,
  ui,
  python,
}: {
  t: Translator
  ui: ReturnType<typeof useUIStoreApi>
  python: boolean
}): JSX.Element {
  const measuring = useUIStore((s) => s.measuring)
  // Ligar a medida esquece a janela anterior: a nova começa a contar agora.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `measuring` é o GATILHO da janela nova
  const perfWindow = useMemo(() => perfWindowFor(ui), [ui, measuring])
  const { since, slices, refused } = useStore(
    perfWindow,
    useShallow((s) => ({ since: s.since, slices: s.slices, refused: s.refused })),
  )
  const running = useProRun((s) => s.state?.phase === 'running')
  const seconds = useElapsedSeconds(measuring ? since : null)
  const summary = summarizePerf(slices)
  const latest = summary.latest

  return (
    <div className="flex flex-col gap-2" data-sz-devtools="performance">
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          role="switch"
          aria-checked={measuring}
          className="sz-pro-btn sz-pro-btn--sm sz-pro-btn--primary"
          onClick={() => {
            forgetPerfWindow(ui)
            ui.setState({ measuring: !measuring })
          }}
        >
          {measuring ? <IconPause /> : <IconPlay />}
          {measuring ? t('perf.stop') : t('perf.start')}
        </button>
        <span className="text-sm">
          {measuring
            ? t(python ? 'perf.on.python' : 'perf.on', { seconds })
            : t(python ? 'perf.off.python' : 'perf.off')}
        </span>
      </div>
      {measuring && !running ? (
        <p className="m-0 text-sm">{t(python ? 'perf.notRunning.python' : 'perf.notRunning')}</p>
      ) : null}
      {measuring && running && !latest ? (
        <p className="m-0 text-sm" role="status">
          {t(refused ? 'perf.refused' : 'perf.collecting')}
        </p>
      ) : null}
      {latest && !latest.canvas ? <p className="m-0 text-sm">{t('perf.page')}</p> : null}
      {latest?.canvas ? <PerfReadings latest={latest} python={python} /> : null}
      {latest?.canvas ? <PerfHistory slices={slices} /> : null}
    </div>
  )
}

function PerfReadings({ latest, python }: { latest: PerfSlice; python: boolean }): JSX.Element {
  const t = usePerfT()
  const measured = t('perf.measured')
  // Os 3D contam objetos e desenhos (a proposta: "objetos e desenhos por quadro"); os 2D, sprites;
  // o Python, só os quadros e o tempo de cada um (a tabela da proposta).
  const threeD = latest.objects !== null || latest.draws !== null
  return (
    <div
      className={`grid grid-cols-2 gap-2 ${threeD ? 'lg:grid-cols-5' : python ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}
    >
      <Reading
        label={t('perf.fps')}
        tag={measured}
        value={String(Math.round(latest.fps))}
        unit={t('perf.fps.unit')}
        note={t('perf.fps.note')}
      />
      <Reading
        label={t('perf.frame')}
        tag={measured}
        value={String(Math.round(latest.frameMsAvg))}
        unit="ms"
        note={t('perf.frame.note')}
      />
      {threeD ? (
        <>
          <CountReading
            label={t('perf.objects')}
            value={latest.objects}
            unit={t('perf.objects.unit')}
            note={t('perf.objects.note')}
          />
          <CountReading
            label={t('perf.draws')}
            value={latest.draws}
            unit={t('perf.draws.unit')}
            note={t('perf.draws.note')}
          />
        </>
      ) : python ? null : latest.sprites === null ? (
        <Reading
          label={t('perf.sprites')}
          tag={t('perf.unavailable')}
          value={t('perf.noReading')}
          note={t('perf.sprites.none')}
          textValue
        />
      ) : (
        <Reading
          label={t('perf.sprites')}
          tag={measured}
          value={String(latest.sprites)}
          unit={t('perf.sprites.unit')}
          note={t('perf.sprites.note')}
        />
      )}
      <Reading
        label={t('perf.memory')}
        tag={t('perf.unavailable')}
        value={t('perf.noReading')}
        note={t('perf.memory.note')}
        textValue
      />
    </div>
  )
}

/** Um número que o motor conta: medido quando veio, "Sem leitura" quando não. */
function CountReading({
  label,
  value,
  unit,
  note,
}: {
  label: string
  value: number | null
  unit: string
  note: string
}): JSX.Element {
  const t = usePerfT()
  return value === null ? (
    <Reading
      label={label}
      tag={t('perf.unavailable')}
      value={t('perf.noReading')}
      note={note}
      textValue
    />
  ) : (
    <Reading label={label} tag={t('perf.measured')} value={String(value)} unit={unit} note={note} />
  )
}

function Reading({
  label,
  tag,
  value,
  unit,
  note,
  textValue = false,
}: {
  label: string
  tag: string
  value: string
  unit?: string
  note: string
  textValue?: boolean
}): JSX.Element {
  return (
    <article className="sz-pro-card flex flex-col gap-0.5 px-3 py-2.5">
      <div className="flex items-center justify-between gap-1.5">
        <p className="m-0 text-xs font-bold text-sz-fg-soft">{label}</p>
        <span className="sz-pro-badge sz-pro-badge--quiet">{tag}</span>
      </div>
      <p
        className={`m-0 font-extrabold leading-tight ${textValue ? 'text-[15px]' : 'text-[22px]'}`}
      >
        {value}
        {unit ? <span className="ml-1 text-sm font-semibold">{unit}</span> : null}
      </p>
      <p className="m-0 text-xs leading-snug">{note}</p>
    </article>
  )
}

function PerfHistory({ slices }: { slices: readonly PerfSlice[] }): JSX.Element {
  const t = usePerfT()
  const summary = summarizePerf(slices)
  const slow =
    summary.slowEpisodes === 0
      ? t('perf.slow.none')
      : summary.slowEpisodes === 1
        ? t('perf.slow.one')
        : t('perf.slow.many', { count: summary.slowEpisodes })
  // A barra mais alta é o quadro mais lento da janela; abaixo de um quadro liso, a barra é baixa.
  const top = Math.max(summary.slowestFrameMs, PERF_SMOOTH_FRAME_MS * 2)
  return (
    <article className="sz-pro-card flex flex-col gap-1.5 px-3 py-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="m-0 text-sm">
          <b>
            {t('perf.history', { seconds: Math.round(summary.seconds) })}: {slow}
          </b>{' '}
          {summary.slowEpisodes > 0
            ? t('perf.slowest', { ms: Math.round(summary.slowestFrameMs) })
            : null}
        </p>
        <span className="text-xs text-sz-fg-soft">{t('perf.history.slices')}</span>
      </div>
      <div aria-hidden="true" className="flex h-[38px] items-end gap-[3px]">
        {slices.map((slice, index) => (
          <span
            // A janela só cresce pela direita e corta pela esquerda: o índice é a posição da barra.
            // biome-ignore lint/suspicious/noArrayIndexKey: as barras não têm identidade própria
            key={index}
            className={`sz-devtools-bar block flex-1 rounded-[2px] ${isSlowSlice(slice) ? 'sz-devtools-bar--slow' : ''}`}
            style={{ height: `${Math.max(8, Math.min(100, (slice.frameMsMax / top) * 100))}%` }}
          />
        ))}
      </div>
    </article>
  )
}

/**
 * O programa Python que não desenha (só print e input): o tempo que ele levou, marcado pela prévia
 * no começo e no fim de cada execução (`programTimeFor`).
 */
function ProgramTimePanel(): JSX.Element {
  const t = usePerfT()
  const ui = useUIStoreApi()
  const time = useStore(
    useMemo(() => programTimeFor(ui), [ui]),
    useShallow((s) => ({ startedAt: s.startedAt, endedAt: s.endedAt })),
  )
  const running = time.startedAt !== null && time.endedAt === null
  const seconds = useElapsedSeconds(running ? time.startedAt : null)
  const format = (value: number) =>
    new Intl.NumberFormat(t.locale === 'en' ? 'en' : 'pt-BR', { maximumFractionDigits: 1 }).format(
      value,
    )
  const text =
    time.startedAt === null
      ? t('perf.program.none')
      : running
        ? t('perf.program.running', { seconds })
        : t('perf.program.done', { seconds: format(((time.endedAt ?? 0) - time.startedAt) / 1000) })
  return (
    <div className="flex flex-col gap-2" data-sz-devtools="performance">
      <article className="sz-pro-card flex flex-col gap-0.5 px-3 py-2.5">
        <p className="m-0 text-xs font-bold text-sz-fg-soft">{t('perf.program')}</p>
        <p className="m-0 text-[15px] font-extrabold leading-tight" role="status">
          {text}
        </p>
        <p className="m-0 text-xs leading-snug">{t('perf.program.note')}</p>
      </article>
    </div>
  )
}

/** Segundos desde `since`, contados de 1 em 1 (o "Medindo há N segundos"). */
function useElapsedSeconds(since: number | null): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (since === null) return
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [since])
  return since === null ? 0 : Math.max(0, Math.floor((now - since) / 1000))
}
