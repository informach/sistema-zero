import {
  codeAnchorRangeFits,
  type StudioCodeAnchor,
  studioSourceSha256,
} from '@sistemazero/core/studio/code-anchor'
import { sourcePositions } from '@sistemazero/core/studio/python-source-positions'
import type { IPosition, IRange } from 'monaco-editor'

interface Model {
  uri: { path: string; toString(): string }
  dispose(): void
  isDisposed(): boolean
  getVersionId(): number
  getValue(): string
  getOffsetAt(position: IPosition): number
  getPositionAt(offset: number): IPosition
}
/** Narrow public Monaco port; no runtime Monaco import reaches the Studio shell. */
export interface ObservedCodeEditor {
  onDidChangeModel?(listener: () => void): { dispose(): void }
  onDidChangeModelContent?(listener: () => void): { dispose(): void }
  onDidScrollChange?(listener: () => void): { dispose(): void }
  onDidLayoutChange?(listener: () => void): { dispose(): void }
  getModel(): Model | null
  getDomNode(): HTMLElement | null
  getTargetAtClientPoint(x: number, y: number): { position: IPosition | null } | null
  getVisibleRanges(): readonly IRange[]
  getScrolledVisiblePosition(
    position: IPosition,
  ): { top: number; left: number; height: number } | null
}
export interface StudioCodeObservation {
  invalidate(): void
  subscribe(listener: () => void): () => void
  register(
    editor: ObservedCodeEditor,
    file: (model: Model) => { path: string; source: string } | null,
  ): () => void
  anchorAt(x: number, y: number): Promise<StudioCodeAnchor | null>
  positionOf(anchor: StudioCodeAnchor): Promise<{ left: number; top: number } | null>
}

/** No global Monaco registry: each Studio owns only its currently mounted editors. */
export function createCodeObservationRegistry(): StudioCodeObservation {
  type Entry = {
    editor: ObservedCodeEditor
    file: (model: Model) => { path: string; source: string } | null
  }
  const entries = new Set<Entry>()
  const listeners = new Set<() => void>()
  const invalidate = () => {
    for (const listener of listeners) listener()
  }
  const hashes = new WeakMap<
    Model,
    {
      version: number
      source: string
      hash: Promise<string>
      positions: ReturnType<typeof sourcePositions>
    }
  >()
  function snapshot(entry: Entry) {
    const model = entry.editor.getModel()
    if (!model || model.isDisposed()) return null
    const file = entry.file(model),
      version = model.getVersionId()
    if (!file) return null
    const { path, source } = file
    let value = hashes.get(model)
    if (value?.version !== version || value.source !== source) {
      // Monaco normalizes mixed line endings. Offsets and hashes refer to the unchanged file,
      // while its line/column positions remain equivalent. Any other pending edit hides the pointer.
      if (model.getValue().replace(/\r\n|\r/g, '\n') !== source.replace(/\r\n|\r/g, '\n'))
        return null
      value = {
        version,
        source,
        hash: studioSourceSha256(source),
        positions: sourcePositions(source),
      }
      hashes.set(model, value)
    }
    return {
      model,
      path,
      ...value,
      current: () =>
        entries.has(entry) &&
        !model.isDisposed() &&
        entry.editor.getModel() === model &&
        model.getVersionId() === version &&
        entry.file(model)?.path === path &&
        entry.file(model)?.source === source,
    }
  }
  return {
    invalidate,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    register(editor, file) {
      const entry = { editor, file }
      entries.add(entry)
      const events = [
        editor.onDidChangeModel?.(invalidate),
        editor.onDidChangeModelContent?.(invalidate),
        editor.onDidScrollChange?.(invalidate),
        editor.onDidLayoutChange?.(invalidate),
      ]
      return () => {
        entries.delete(entry)
        for (const event of events) event?.dispose()
        invalidate()
      }
    },
    async anchorAt(x, y) {
      for (const entry of entries) {
        const hit = entry.editor.getTargetAtClientPoint(x, y)
        if (!hit?.position) continue
        const state = snapshot(entry)
        if (!state) continue
        let offset: number
        try {
          offset = state.positions.offset({
            line: hit.position.lineNumber - 1,
            character: hit.position.column - 1,
          })
        } catch {
          continue
        }
        const anchor: StudioCodeAnchor = {
          kind: 'code',
          id: state.path,
          start: offset,
          end: offset,
          modelVersion: state.version,
          sourceSha256: await state.hash,
        }
        if (state.current() && codeAnchorRangeFits(anchor, state.source)) return anchor
      }
      return null
    },
    async positionOf(anchor) {
      for (const entry of entries) {
        const state = snapshot(entry)
        if (!state || state.path !== anchor.id || !codeAnchorRangeFits(anchor, state.source))
          continue
        if ((await state.hash) !== anchor.sourceSha256 || !state.current()) continue
        const sourcePosition = state.positions.position(anchor.start)
        const position = {
          lineNumber: sourcePosition.line + 1,
          column: sourcePosition.character + 1,
        }
        const visible = entry.editor
          .getVisibleRanges()
          .some(
            (range) =>
              (position.lineNumber > range.startLineNumber ||
                (position.lineNumber === range.startLineNumber &&
                  position.column >= range.startColumn)) &&
              (position.lineNumber < range.endLineNumber ||
                (position.lineNumber === range.endLineNumber &&
                  position.column <= range.endColumn)),
          )
        if (!visible) continue
        const point = entry.editor.getScrolledVisiblePosition(position)
        const rect = entry.editor.getDomNode()?.getBoundingClientRect()
        if (
          !point ||
          !rect?.width ||
          !rect.height ||
          point.left < 0 ||
          point.top < 0 ||
          point.left > rect.width ||
          point.top + point.height > rect.height
        )
          continue
        const viewport = {
          left: rect.left + point.left,
          top: rect.top + point.top + point.height / 2,
        }
        // A scroll/fold/widget can occlude text even when its approximate geometry is in bounds.
        const hit = entry.editor.getTargetAtClientPoint(viewport.left, viewport.top)?.position
        if (hit?.lineNumber !== position.lineNumber || hit.column !== position.column) continue
        return viewport
      }
      return null
    },
  }
}
