import { clsx } from 'clsx'
import { useMemo, useState } from 'react'
import { COPY } from '../../../core/copy'
import type { SceneFileFormat } from '../../../export/sceneFileFormat'
import type { SceneGlbIssue } from '../../../export/sceneGlbReport'
import type { MoldaSceneDocument } from '../../../scene/document'
import type { EditorStore } from '../../../state/editorStore'
import type { SceneViewportPort } from '../../../viewport/sceneViewportTypes'
import { useMoldaToolAccess } from '../../toolAccess'
import { Button } from '../../ui/Button'
import { ScenePhotoExportPanel } from './ScenePhotoExportPanel'
import { SceneStudioCompatibility } from './SceneStudioCompatibility'
import { useSceneGlbExport } from './useSceneGlbExport'

function ExportChanges({ issues }: { issues: readonly SceneGlbIssue[] }) {
  // One row per issue code, independent of face/key count; consent changes do not rescan the report.
  const groups = useMemo(() => {
    const counts = new Map<SceneGlbIssue['code'], number>()
    for (const issue of issues) counts.set(issue.code, (counts.get(issue.code) ?? 0) + 1)
    return Array.from(counts, ([code, count]) => ({ code, count }))
  }, [issues])
  const copy = COPY.scene.glbExport
  return (
    <section className="space-y-2 rounded-xl border border-mld-border bg-mld-bg p-4">
      <h3 className="font-bold">{copy.changes}</h3>
      <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
        {groups.map(({ code, count }) => (
          <li key={code}>{copy.issues[code](count)}</li>
        ))}
      </ul>
    </section>
  )
}

/** Small modal content; the encoder and its CPU work stay in the on-demand worker. */
export function SceneGlbExportPanel({
  editor,
  onClose,
  viewport = null,
}: {
  editor: EditorStore<MoldaSceneDocument>
  onClose(): void
  viewport?: SceneViewportPort | null
}) {
  const task = useSceneGlbExport(editor)
  const { state } = task
  const copy = COPY.scene.glbExport
  const [chosenFormat, setFormat] = useState<SceneFileFormat | 'png' | 'presentation'>('glb')
  const [chosenStudio, setAnimatedPaint] = useState(false)
  // O portão: GLB, foto e apresentação são `files.export` (o básico); glTF, OBJ e a cópia "para
  // outros programas" são `files.interop`. Sem ele, o GLB vai para o Estúdio, sem escolha.
  const interop = useMoldaToolAccess().can('files.interop')
  // O portão pode fechar com o painel aberto (a prévia da equipe, um posto que muda): o formato
  // escolhido que trancou volta ao GLB, em vez de exportar pelo caminho trancado.
  const format =
    interop || chosenFormat === 'glb' || chosenFormat === 'png' || chosenFormat === 'presentation'
      ? chosenFormat
      : 'glb'
  const animatedPaint = interop ? chosenStudio : true
  /** Trocar o destino descarta a cópia preparada: consentimento não atravessa gravações. */
  function chooseDestination(next: boolean) {
    if (next === animatedPaint) return
    setAnimatedPaint(next)
    if (state.status === 'busy' || state.status === 'ready') task.cancel()
  }
  const formatControl = (
    <label className="block space-y-2 text-sm font-bold">
      <span>{copy.format}</span>
      <select
        name="molda-export-format"
        className="min-h-11 w-full rounded-xl border border-mld-border bg-mld-bg px-3"
        value={format}
        onChange={(event) => {
          setFormat(event.target.value as typeof format)
          task.cancel()
        }}
      >
        {Object.entries({
          ...(interop ? copy.formats : { glb: copy.formats.glb }),
          png: COPY.scene.photoExport.png,
          presentation: COPY.scene.photoExport.presentation,
        }).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  )
  if (format === 'png' || format === 'presentation')
    return (
      <div className="space-y-4">
        {formatControl}
        <ScenePhotoExportPanel
          key={format}
          editor={editor}
          viewport={viewport}
          format={format}
          onClose={onClose}
        />
      </div>
    )
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed">{copy.intro}</p>
      <p className="text-sm leading-relaxed text-mld-muted">{copy.original}</p>
      {formatControl}
      {format === 'obj' ? (
        <p className="text-sm">{copy.objHint}</p>
      ) : !interop ? null : (
        <fieldset className="space-y-2 rounded-xl border border-mld-border bg-mld-bg p-4">
          <legend className="px-1 font-bold">{copy.destination}</legend>
          {[
            {
              value: false,
              label: copy.destinationDownload,
              hint: copy.destinationDownloadHint,
            },
            { value: true, label: copy.destinationStudio, hint: copy.destinationStudioHint },
          ].map((option) => (
            <label
              key={String(option.value)}
              className={clsx(
                'flex min-h-11 cursor-pointer items-start gap-3 rounded-xl p-2 text-sm',
                'focus-within:outline-2 focus-within:outline-mld-accent',
              )}
            >
              <input
                type="radio"
                name="glbDestination"
                className="mt-0.5 size-5 shrink-0 accent-mld-accent"
                checked={animatedPaint === option.value}
                onChange={() => chooseDestination(option.value)}
              />
              <span>
                <span className="font-bold">{option.label}</span>
                <span className="block text-mld-muted">{option.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}
      <p role="status" aria-atomic="true" className="font-bold">
        {state.status === 'busy'
          ? copy[state.progress]
          : state.status === 'ready'
            ? copy.ready
            : state.status === 'downloaded'
              ? copy.downloaded
              : state.status === 'idle'
                ? state.message
                : null}
      </p>
      {state.status === 'error' && (
        <p role="alert" className="text-sm text-mld-danger">
          {state.message}
        </p>
      )}
      {state.status === 'ready' && (
        <>
          <p className="break-words font-bold">{state.owner.name}</p>
          <p className="text-sm text-mld-muted">
            {copy.summary(
              state.result.stats.renderedParts,
              state.result.stats.clips,
              state.result.bytes.byteLength,
            )}
          </p>
          {format !== 'obj' && <SceneStudioCompatibility result={state.result} />}
          {state.result.clips.length > 0 && (
            <details className="rounded-xl border border-mld-border bg-mld-bg p-3">
              <summary
                className={clsx(
                  'min-h-11 cursor-pointer content-center rounded-lg font-bold',
                  'focus-visible:outline-2 focus-visible:outline-mld-accent',
                )}
              >
                {copy.clipsTitle}
              </summary>
              <p className="pt-2 text-sm leading-relaxed">{copy.clipsHint}</p>
              <dl className="mt-2 space-y-2 text-sm">
                {state.result.clips.map((clip) => (
                  <div key={clip.id} className="rounded-lg border border-mld-border p-2">
                    <dt className="break-words font-bold">{clip.name}</dt>
                    <dd className="text-mld-muted">
                      {copy.clipSummary(clip.duration, clip.fps, clip.loop)}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          )}
          {state.result.issues.length ? (
            <>
              <ExportChanges issues={state.result.issues} />
              <label
                className={clsx(
                  'flex min-h-11 cursor-pointer items-start gap-3 rounded-xl p-3 text-sm',
                  'focus-within:outline-2 focus-within:outline-mld-accent',
                )}
              >
                <input
                  name="acceptGlbChanges"
                  type="checkbox"
                  className="mt-0.5 size-5 shrink-0 accent-mld-accent"
                  checked={state.accepted}
                  onChange={(event) => task.accept(event.target.checked)}
                />
                {copy.accept}
              </label>
            </>
          ) : (
            <p className="text-sm">{copy.noChanges}</p>
          )}
          {state.error && (
            <p role="alert" className="text-sm text-mld-danger">
              {state.error}
            </p>
          )}
        </>
      )}
      <div className="flex flex-wrap gap-2">
        {state.status === 'busy' ? (
          <Button onClick={task.cancel}>{copy.cancel}</Button>
        ) : state.status === 'ready' ? (
          <Button
            variant="primary"
            disabled={state.result.issues.length > 0 && !state.accepted}
            onClick={task.download}
          >
            {format === 'glb' ? copy.download : copy.downloadFile}
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={() =>
              void task.prepare(
                format === 'obj' ? false : animatedPaint,
                format === 'glb' ? undefined : format,
              )
            }
          >
            {format === 'glb' ? copy.prepare : copy.prepareFile}
          </Button>
        )}
        <Button variant="ghost" onClick={onClose}>
          {copy.close}
        </Button>
      </div>
    </div>
  )
}
