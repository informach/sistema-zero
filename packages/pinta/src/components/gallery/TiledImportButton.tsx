import { type JSX, useRef, useState } from 'react'
import { COPY } from '../../core/copy'
import { usePintaApp } from '../appContext'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Map as MapIcon } from '../ui/icons'
import { useToast } from '../ui/Toast'

function pathOf(path: string): string {
  if (/^[a-z]+:|^[/\\]/i.test(path)) throw new Error(COPY.scene.localImagesOnly)
  const parts: string[] = []
  for (const part of path.replaceAll('\\', '/').split('/')) {
    if (part === '..') {
      if (!parts.length) throw new Error(COPY.scene.pathOutsideMap)
      parts.pop()
    } else if (part && part !== '.') parts.push(part)
  }
  return parts.join('/')
}
export function TiledImportButton(): JSX.Element {
  const ref = useRef<HTMLInputElement>(null),
    { gallery } = usePintaApp(),
    { showToast } = useToast()
  const [files, setFiles] = useState<Map<string, Uint8Array> | null>(null),
    [choices, setChoices] = useState<string[]>([]),
    [chosen, setChosen] = useState(''),
    [busy, setBusy] = useState(false),
    [report, setReport] = useState<string[] | null>(null)
  async function read(selected: FileList | null): Promise<void> {
    if (!selected?.length) return
    setBusy(true)
    try {
      const entries = new Map<string, Uint8Array>()
      let total = 0
      for (const file of selected) {
        if (file.size > 32 * 1024 * 1024) throw new Error(COPY.scene.umArquivoPassouDe32MiB)
        const bytes = new Uint8Array(await file.arrayBuffer())
        if (file.name.endsWith('.zip')) {
          const { unzipSync } = await import('fflate')
          const unpacked = unzipSync(bytes, {
            filter: (e) => {
              total += e.originalSize
              if (total > 128 * 1024 * 1024) throw new Error(COPY.scene.unpackedTooLarge)
              return true
            },
          })
          for (const [name, content] of Object.entries(unpacked)) entries.set(pathOf(name), content)
        } else entries.set(pathOf(file.webkitRelativePath || file.name), bytes)
      }
      const candidates = [...entries.keys()]
        .filter(
          (p) =>
            /\.(tmx|tmj|json)$/i.test(p) &&
            !p.endsWith('.pinta.json') &&
            !/(^|\/)(maps|start)\.json$/.test(p),
        )
        .filter((p) => {
          if (p.endsWith('.tmx')) return true
          try {
            const value = JSON.parse(new TextDecoder().decode(entries.get(p)))
            return value?.orientation !== undefined
          } catch {
            return false
          }
        })
      if (!candidates.length) throw new Error(COPY.scene.naoEncontreiUmMapaTiledNoPacote)
      setFiles(entries)
      setChoices(candidates)
      setChosen(candidates[0]!)
      setReport(null)
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
      if (ref.current) ref.current.value = ''
    }
  }
  async function restore(): Promise<void> {
    if (!files || !chosen) return
    setBusy(true)
    try {
      const { importTiledScene, tiledXmlToJson } = await import('../../export/tiled/import'),
        { sceneToNative } = await import('../../export/tiled/native')
      const decoder = new TextDecoder(),
        base = chosen.includes('/') ? chosen.slice(0, chosen.lastIndexOf('/') + 1) : ''
      const get = (path: string): Uint8Array => {
        const full = pathOf(base + path),
          entry = files.get(full) ?? files.get(pathOf(path))
        if (!entry) throw new Error(COPY.scene.dynamicFaltaOArquivoIncluaAsImagens(path))
        return entry
      }
      const source = decoder.decode(files.get(chosen)!),
        raw = chosen.endsWith('.tmx') ? tiledXmlToJson(source) : JSON.parse(source)
      const loaded = await importTiledScene(
        raw,
        {
          text: async (path) => decoder.decode(get(path)),
          image: async (path) => {
            const data = get(path),
              type = /\.jpe?g$/i.test(path) ? 'image/jpeg' : 'image/png'
            let binary = ''
            for (const n of data) binary += String.fromCharCode(n)
            return `data:${type};base64,${btoa(binary)}`
          },
        },
        chosen
          .split('/')
          .at(-1)
          ?.replace(/\.[^.]+$/, '') ?? 'mapa',
      )
      const converted = await sceneToNative(loaded.scene),
        result = await gallery.getState().importAssets(converted.assets, { atomic: true })
      if (!result.added)
        throw new Error(gallery.getState().mutateError ?? COPY.scene.naoFoiPossivelGuardarOMapa)
      setReport([
        COPY.scene.dynamicDesenhosForamTrazidosParaAGaleria(result.added),
        ...loaded.warnings,
        ...converted.warnings,
      ])
    } catch (e) {
      setReport([e instanceof Error ? e.message : String(e)])
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <Button variant="pillSoft" disabled={busy} onClick={() => ref.current?.click()}>
        <MapIcon aria-hidden="true" />
        {COPY.scene.trazerMapa}
      </Button>
      <input
        ref={ref}
        type="file"
        multiple
        accept=".zip,.tmx,.tsx,.tmj,.tsj,.json,.png,.jpg,.jpeg"
        className="hidden"
        onChange={(e) => void read(e.target.files)}
      />
      <Dialog
        open={files !== null}
        title={COPY.scene.trazerMapaDoTiled}
        onClose={() => {
          if (!busy) setFiles(null)
        }}
      >
        {report ? (
          <div role="status" className="flex flex-col gap-2">
            {report.map((line) => (
              <p key={line} className="text-sm">
                {line}
              </p>
            ))}
            <Button onClick={() => setFiles(null)}>{COPY.scene.fechar}</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <label className="text-sm font-bold">
              {COPY.scene.mapa}
              <select
                className="mt-1 min-h-11 w-full rounded-xl border-2 border-pin-border bg-pin-surface px-2"
                value={chosen}
                onChange={(e) => setChosen(e.target.value)}
              >
                {choices.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-sm text-pin-muted">{COPY.scene.asImagensEFolhasDePecasPrecisam}</p>
            <Button disabled={busy} onClick={() => void restore()}>
              {busy ? COPY.scene.trazendo : COPY.scene.trazerParaAGaleria}
            </Button>
          </div>
        )}
      </Dialog>
    </>
  )
}
