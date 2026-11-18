import { type JSX, useRef, useState } from 'react'
import { COPY } from '../../core/copy'
import { TiledImportError } from '../../export/tiled/errors'
import { readTiledPackage, tiledPackageSource } from '../../export/tiled/package'
import { usePintaApp } from '../appContext'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Map as MapIcon } from '../ui/icons'
import { useToast } from '../ui/Toast'

/** Só as frases prontas do importador chegam à criança; o resto vira um recado geral. */
function childMessage(e: unknown): string {
  return e instanceof TiledImportError ? e.message : COPY.scene.naoConseguiTrazerEsteMapa
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
      const { entries, maps: candidates } = await readTiledPackage(selected)
      setFiles(entries)
      setChoices(candidates)
      setChosen(candidates[0]!)
      setReport(null)
    } catch (e) {
      showToast(childMessage(e))
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
      const source = tiledPackageSource(files, chosen),
        raw = source.map()
      const loaded = await importTiledScene(
        typeof raw === 'string' ? tiledXmlToJson(raw) : raw,
        source.resolver,
        source.name,
      )
      const converted = await sceneToNative(loaded.scene),
        result = await gallery.getState().importAssets(converted.assets, { atomic: true })
      if (!result.added)
        throw new TiledImportError(
          gallery.getState().mutateError ?? COPY.scene.naoFoiPossivelGuardarOMapa,
        )
      setReport([
        COPY.scene.dynamicDesenhosForamTrazidosParaAGaleria(result.added),
        ...loaded.warnings,
        ...converted.warnings,
      ])
    } catch (e) {
      setReport([childMessage(e)])
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
