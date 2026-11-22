import { useEffect, useRef, useState } from 'react'
import { COPY } from '../../core/copy'
import { newId } from '../../core/id'
import { type AnyTilesetAsset, isTileLayer, type TilemapAsset } from '../../core/project'
import { triggerDownload } from '../../export/download'
import {
  AUTOMAP_LIMITS,
  type AutomapBook,
  type AutomapRule,
  automapSheetIdentity,
  type PatternLayer,
  readAutomapBook,
  type SheetIdentity,
} from '../../tiles/automapping/book'
import {
  type AutomapFailure,
  captureAutomapExample,
  checkAutomapBindings,
  previewAutomapping,
  previewAutomapStroke,
} from '../../tiles/automapping/engine'
import { automapImportLayers, bindAutomapImport } from '../../tiles/automapping/import'
import type { AutomapEditorMap } from '../../tiles/automapping/model'
import type { CellRect } from '../../tiles/cellGeometry'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { useEditorStores } from './editorContext'
import { sameAssetContent } from './mapTools/commitGuard'

const messages: Record<AutomapFailure, string> = {
  'invalid-area': COPY.automap.areaError,
  'changed-sheet': COPY.automap.sheetError,
  'missing-layer': COPY.automap.missingLayer,
  locked: COPY.automap.locked,
  'work-budget': COPY.automap.tooMuchWork,
  'map-limit': COPY.automap.mapLimit,
}
const field = 'min-h-11 w-full rounded-xl border-2 border-pin-border bg-pin-surface px-2 text-sm'
const initialRect = { col: 0, row: 0, cols: 1, rows: 1 }
export function MapAutomappingPanel({
  map,
  selection,
  sheets,
  showPreview,
  registerStroke,
}: {
  map: AutomapEditorMap
  selection: CellRect | null
  sheets: readonly AnyTilesetAsset[]
  showPreview: (base: TilemapAsset, shown: TilemapAsset | null) => void
  registerStroke: (stage: import('./mapTools/tileGestures').StageBrush | undefined) => void
}) {
  const { editor } = useEditorStores()
  const book = map.automapping,
    layers = map.layers.filter(isTileLayer)
  const [sheetIndex, setSheetIndex] = useState<Map<string, SheetIdentity> | null>(null)
  const [chosen, setChosen] = useState<string[]>([layers[0]?.id ?? ''])
  const [rect, setRect] = useState<CellRect>(initialRect)
  const [draft, setDraft] = useState<{
    input: PatternLayer[]
    width: number
    height: number
  } | null>(null)
  const [name, setName] = useState('')
  const [ruleId, setRuleId] = useState('')
  const [ignoreEmpty, setIgnoreEmpty] = useState(false)
  const [armed, setArmed] = useState(false)
  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState<{ base: AutomapEditorMap; next: AutomapEditorMap } | null>(
    null,
  )
  const [incoming, setIncoming] = useState<{
    base: AutomapEditorMap
    book: AutomapBook
    selected: Map<string, string>
  } | null>(null)
  const importLayers =
    incoming?.base === map && sheetIndex
      ? automapImportLayers(incoming.book, map, sheetIndex)
      : null
  const upload = useRef<HTMLInputElement>(null)
  const selected = book.rules.find((r) => r.id === ruleId)
  function cancel() {
    setPreview(null)
    showPreview(map, null)
  }
  useEffect(() => {
    let active = true
    setSheetIndex(null)
    setPreview(null)
    showPreview(map, null)
    Promise.all(
      sheets.map(async (sheet) => [sheet.id, await automapSheetIdentity(sheet)] as const),
    ).then(
      (entries) => {
        if (active) setSheetIndex(new Map(entries))
      },
      () => {
        if (active) setMessage(messages['changed-sheet'])
      },
    )
    return () => {
      active = false
      showPreview(map, null)
    }
  }, [sheets, map, showPreview])
  useEffect(() => {
    if (!preview) return
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreview(null)
        showPreview(map, null)
      }
    }
    document.addEventListener('keydown', onEscape)
    return () => document.removeEventListener('keydown', onEscape)
  }, [preview, map, showPreview])
  useEffect(() => {
    if (!armed || !book.rules.length) return
    let active = true
    registerStroke((before, painted, layer, shift) => {
      if (!active || before !== map || editor.getState().asset !== map) return
      if (!sheetIndex) {
        setMessage(messages['changed-sheet'])
        return
      }
      if (sameAssetContent(before, painted)) {
        setPreview(null)
        showPreview(map, null)
        setMessage(COPY.automap.noChanges)
        return
      }
      const candidate = { ...painted, schema: 9 as const, automapping: book }
      const result = previewAutomapStroke(map, candidate, layer, book, sheetIndex, shift)
      if (!result.ok) {
        setPreview(null)
        showPreview(map, null)
        setMessage(messages[result.reason])
        return
      }
      if (sameAssetContent({ ...map, updatedAt: result.map.updatedAt }, result.map)) {
        setPreview(null)
        showPreview(map, null)
        setMessage(COPY.automap.noChanges)
        return
      }
      setPreview({ base: map, next: result.map })
      setMessage(COPY.automap.strokePreview(result.changes))
      showPreview(map, result.map)
    })
    return () => {
      active = false
      registerStroke(undefined)
    }
  }, [armed, book, editor, map, registerStroke, sheetIndex, showPreview])
  function save(next: AutomapBook) {
    if (!sheetIndex || editor.getState().asset !== map) return false
    const parsed = readAutomapBook(JSON.stringify(next))
    if (!parsed) {
      setMessage(COPY.automap.invalidRule)
      return false
    }
    const failure = checkAutomapBindings(map, parsed, sheetIndex)
    if (failure) {
      setMessage(messages[failure])
      return false
    }
    cancel()
    const ok = editor.getState().commit({ ...map, automapping: parsed } as AutomapEditorMap)
    setMessage(ok ? COPY.automap.saved : COPY.automap.stale)
    return ok
  }
  function capture(output: boolean, variant = false) {
    if (!sheetIndex) return
    cancel()
    const example = captureAutomapExample(map, rect, chosen, sheetIndex, ignoreEmpty)
    if (!example) {
      setMessage(COPY.automap.captureArea)
      return
    }
    if (!output) {
      setDraft({ input: example, width: rect.cols, height: rect.rows })
      setMessage(COPY.automap.captured)
      return
    }
    const source = variant ? selected : draft
    if (!source || source.width !== rect.cols || source.height !== rect.rows) {
      setMessage(COPY.automap.equalSize)
      return
    }
    if (variant && selected) {
      save({
        ...book,
        rules: book.rules.map((r) =>
          r === selected ? { ...r, outputs: [...r.outputs, example] } : r,
        ),
      })
      return
    }
    const rule: AutomapRule = {
      id: newId(),
      name: name.trim() || COPY.automap.defaultName(book.rules.length + 1),
      width: source.width,
      height: source.height,
      input: source.input,
      outputs: [example],
    }
    if (save({ ...book, rules: [...book.rules, rule] })) {
      setRuleId(rule.id)
      setDraft(null)
      setName('')
    }
  }
  function reorder(delta: number) {
    const i = book.rules.findIndex((r) => r.id === ruleId),
      j = i + delta
    if (i < 0 || j < 0 || j >= book.rules.length) return
    const rules = [...book.rules]
    ;[rules[i], rules[j]] = [rules[j]!, rules[i]!]
    save({ ...book, rules })
  }
  function predict() {
    if (!sheetIndex || editor.getState().asset !== map) return
    const predicted = previewAutomapping(map, book, sheetIndex, rect)
    if (!predicted.ok) {
      cancel()
      setMessage(messages[predicted.reason])
      return
    }
    if (!predicted.changes) {
      cancel()
      setMessage(COPY.automap.noChanges)
      return
    }
    setPreview({ base: map, next: predicted.map })
    setMessage(COPY.automap.preview(predicted.changes))
    showPreview(map, predicted.map)
  }
  return (
    <Panel title={COPY.automap.title}>
      <div data-pinta-automapping="" className="flex flex-col gap-2 text-sm">
        <Button
          variant="barOutline"
          disabled={!selection}
          onClick={() => {
            if (selection) {
              cancel()
              setRect(selection)
            }
          }}
        >
          {COPY.automap.useSelection}
        </Button>
        <div className="grid grid-cols-2 gap-1">
          {(
            [
              ['col', COPY.automap.column],
              ['row', COPY.automap.row],
              ['cols', COPY.automap.width],
              ['rows', COPY.automap.height],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                type="number"
                className={field}
                value={rect[key]}
                onChange={(e) => {
                  cancel()
                  setRect({ ...rect, [key]: Number(e.target.value) })
                }}
              />
            </label>
          ))}
        </div>
        <fieldset>
          <legend>{COPY.automap.layers}</legend>
          {layers.map((l) => (
            <label key={l.id} className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                checked={chosen.includes(l.id)}
                onChange={(e) =>
                  setChosen(
                    e.target.checked ? [...chosen, l.id] : chosen.filter((id) => id !== l.id),
                  )
                }
              />
              {l.name}
            </label>
          ))}
        </fieldset>
        <label>
          <input
            type="checkbox"
            checked={ignoreEmpty}
            onChange={(e) => setIgnoreEmpty(e.target.checked)}
          />{' '}
          {COPY.automap.ignoreEmpty}
        </label>
        <label>
          {COPY.automap.name}
          <input
            className={field}
            maxLength={128}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <Button variant="barOutline" disabled={!sheetIndex} onClick={() => capture(false)}>
          {COPY.automap.input}
        </Button>
        <Button variant="barOutline" disabled={!draft || !sheetIndex} onClick={() => capture(true)}>
          {COPY.automap.output}
        </Button>
        {book.rules.length > 0 ? (
          <>
            <label>
              {COPY.automap.order}
              <select value={ruleId} className={field} onChange={(e) => setRuleId(e.target.value)}>
                <option value="">{COPY.automap.pick}</option>
                {book.rules.map((r, i) => (
                  <option key={r.id} value={r.id}>
                    {i + 1}. {r.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-1">
              <Button
                variant="barQuiet"
                disabled={!selected || selected === book.rules[0]}
                onClick={() => reorder(-1)}
              >
                {COPY.automap.up}
              </Button>
              <Button
                variant="barQuiet"
                disabled={!selected || selected === book.rules.at(-1)}
                onClick={() => reorder(1)}
              >
                {COPY.automap.down}
              </Button>
              <Button
                variant="barQuiet"
                disabled={!selected}
                onClick={() => save({ ...book, rules: book.rules.filter((r) => r !== selected) })}
              >
                {COPY.automap.remove}
              </Button>
            </div>
            <Button variant="barOutline" disabled={!selected} onClick={() => capture(true, true)}>
              {COPY.automap.variant}
            </Button>
            <label>
              {COPY.automap.seed}
              <input
                className={field}
                type="number"
                key={book.seed}
                defaultValue={book.seed}
                onBlur={(e) => {
                  const seed = Number(e.target.value)
                  if (seed !== book.seed && !save({ ...book, seed }))
                    e.target.value = String(book.seed)
                }}
              />
            </label>
            <label className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                checked={armed}
                onChange={(e) => {
                  cancel()
                  setArmed(e.target.checked)
                }}
              />
              {COPY.automap.onPaint}
            </label>
            <Button variant="barOutline" disabled={!sheetIndex} onClick={predict}>
              {COPY.automap.show}
            </Button>
          </>
        ) : null}
        {preview && preview.base === map ? (
          <div className="flex gap-1">
            <Button
              variant="barPrimary"
              onClick={() => {
                setMessage(
                  sheetIndex &&
                    editor.getState().asset === preview.base &&
                    editor.getState().commit(preview.next)
                    ? COPY.automap.applied
                    : COPY.automap.stale,
                )
                cancel()
              }}
            >
              {COPY.automap.apply}
            </Button>
            <Button
              variant="barQuiet"
              onClick={() => {
                cancel()
                setMessage(COPY.automap.cancelled)
              }}
            >
              {COPY.automap.cancel}
            </Button>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-1">
          <Button variant="barQuiet" onClick={() => upload.current?.click()}>
            {COPY.automap.import}
          </Button>
          <Button
            variant="barQuiet"
            disabled={!book.rules.length}
            onClick={() =>
              triggerDownload(
                new Blob([JSON.stringify(book)], { type: 'application/json' }),
                `${map.name}.pinta-regras.json`,
              )
            }
          >
            {COPY.automap.export}
          </Button>
        </div>
        {incoming?.base === map && importLayers && sheetIndex ? (
          <fieldset className="grid gap-2">
            <legend>{COPY.automap.importLayers}</legend>
            {importLayers.map((layer) => (
              <label key={layer.id}>
                {COPY.automap.importLayer(layer.rule, layer.id)}
                <select
                  className={field}
                  value={incoming.selected.get(layer.id) ?? ''}
                  onChange={(e) => {
                    const selected = new Map(incoming.selected)
                    if (e.target.value) selected.set(layer.id, e.target.value)
                    else selected.delete(layer.id)
                    setIncoming({ ...incoming, selected })
                  }}
                >
                  <option value="">{COPY.automap.pickLayer}</option>
                  {layer.choices.map((choice) => (
                    <option key={choice.id} value={choice.id}>
                      {choice.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <Button
              variant="barPrimary"
              disabled={
                incoming.selected.size !== importLayers.length ||
                new Set(incoming.selected.values()).size !== importLayers.length
              }
              onClick={() => {
                const bound = bindAutomapImport(incoming.book, map, sheetIndex, incoming.selected)
                if (bound && save(bound)) setIncoming(null)
                else setMessage(COPY.automap.invalidFile)
              }}
            >
              {COPY.automap.acceptImport}
            </Button>
            <Button variant="barQuiet" onClick={() => setIncoming(null)}>
              {COPY.automap.cancelImport}
            </Button>
          </fieldset>
        ) : null}
        <input
          ref={upload}
          hidden
          type="file"
          accept=".json,application/json"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            try {
              const parsed =
                file.size <= AUTOMAP_LIMITS.fileBytes ? readAutomapBook(await file.text()) : null
              if (!parsed) {
                setMessage(COPY.automap.invalidFile)
                return
              }
              if (editor.getState().asset !== map || !sheetIndex) return
              const bindings = automapImportLayers(parsed, map, sheetIndex)
              if (!bindings || bindings.some((layer) => !layer.choices.length)) {
                setMessage(messages['changed-sheet'])
                return
              }
              const selected = new Map<string, string>()
              for (const layer of bindings)
                if (layer.choices.some((choice) => choice.id === layer.id))
                  selected.set(layer.id, layer.id)
              cancel()
              setIncoming({ base: map, book: parsed, selected })
            } catch {
              setMessage(COPY.automap.unreadable)
            }
          }}
        />
        <p role="status" className="text-xs text-pin-muted">
          {message}
        </p>
      </div>
    </Panel>
  )
}
