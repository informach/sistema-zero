import { useRef, useState } from 'react'
import { PAINT_TEXTURE_DENSITIES, type PaintTextureDensity } from '../../../core/limits'
import { sceneRasterPreview } from '../../../scene/imageImport'
import { ensureScenePaintSurface, type ScenePaintSurfaceRequest } from '../../../scene/paintSurface'
import { SceneValidationError } from '../../../scene/validation'
import { Button } from '../../ui/Button'
import { Dialog } from '../../ui/Dialog'
import { Plus, Upload } from '../../ui/icons'
import { SceneImagePreview } from './SceneImagePreview'
import { SceneRasterFileInput } from './SceneRasterFileInput'
import { SceneTile } from './SceneTile'
import { useSceneRasterFile } from './useSceneRasterFile'
import type { useSceneWorkshop } from './useSceneWorkshop'

/** A texture belongs to the selected piece; the model's default density remains a fallback. */
export function ScenePaintTextureActions({
  workshop,
  currentName,
}: {
  workshop: ReturnType<typeof useSceneWorkshop>
  currentName?: string
}) {
  const [mode, setMode] = useState<'create' | 'import' | null>(null)
  const [density, setDensity] = useState<PaintTextureDensity>(1)
  const [name, setName] = useState('Textura')
  const [splitCrookedFaces, setSplitCrookedFaces] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const createTrigger = useRef<HTMLButtonElement>(null)
  const importTrigger = useRef<HTMLButtonElement>(null)
  const file = useSceneRasterFile(workshop.document.id)
  const node = workshop.primary
  const available = node?.kind === 'mesh' && !workshop.paint.drawing && !workshop.paint.busy
  const imported = file.data ? sceneRasterPreview(file.data.raster, file.data.name) : null

  function close() {
    setMode(null)
    setError(null)
    setSplitCrookedFaces(false)
    file.clear()
  }

  function open(next: 'create' | 'import') {
    setDensity(1)
    setName(next === 'create' ? `${node?.name ?? 'Peça'} · textura` : 'Textura importada')
    setSplitCrookedFaces(false)
    setError(null)
    file.clear()
    setMode(next)
  }

  function apply() {
    if (node?.kind !== 'mesh' || !mode || (mode === 'import' && !file.data)) return
    const request: ScenePaintSurfaceRequest = {
      nodeId: node.id,
      density,
      name: mode === 'import' ? file.data!.name : name.trim(),
      replaceExisting: true,
      splitCrookedFaces,
      ...(mode === 'import' ? { raster: file.data!.raster } : {}),
    }
    workshop.requestTransition(() => {
      let target:
        | Extract<ReturnType<typeof ensureScenePaintSurface>, { status: 'ready' }>['target']
        | null = null
      const next = workshop.run((source) => {
        try {
          const result = ensureScenePaintSurface(source, request)
          if (result.status === 'crooked') {
            setError(
              'A peça tem faces tortas. Marque a opção para dividi-las antes de criar o mapa.',
            )
            return source
          }
          target = result.target
          return result.document
        } catch (failure) {
          if (!(failure instanceof SceneValidationError)) throw failure
          setError(failure.message)
          return source
        }
      })
      if (!next || !target) return
      workshop.openPaint(target)
      close()
    })
  }

  return (
    <section aria-label="Texturas da peça" className="space-y-2 border-t border-mld-border pt-3">
      <p className="px-1 text-xs text-mld-muted">
        {currentName
          ? `Textura ativa: ${currentName}`
          : 'Escolha uma peça para criar ou importar uma textura.'}
      </p>
      <SceneTile
        ref={createTrigger}
        icon={Plus}
        label="Criar textura"
        aria-haspopup="dialog"
        disabled={!available}
        onClick={() => open('create')}
      />
      <SceneTile
        ref={importTrigger}
        icon={Upload}
        label="Importar textura"
        aria-haspopup="dialog"
        disabled={!available}
        onClick={() => open('import')}
      />
      <Dialog
        open={mode !== null}
        onClose={close}
        title={mode === 'import' ? 'Importar textura' : 'Criar textura'}
        returnFocusTo={mode === 'import' ? importTrigger : createTrigger}
      >
        <div className="space-y-3">
          <p className="text-sm text-mld-text-soft">
            O Molda organiza as faces da peça automaticamente. Cada textura pode ter sua própria
            densidade.
          </p>
          {mode === 'create' && (
            <label className="block space-y-1 text-sm">
              <span>Nome da textura</span>
              <input
                name="pieceTextureName"
                className="min-h-11 w-full rounded-lg border border-mld-border bg-mld-bg px-2 text-mld-text"
                value={name}
                maxLength={128}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
          )}
          {mode === 'import' && (
            <>
              <SceneRasterFileInput
                name="pieceTextureFile"
                disabled={file.busy}
                onChoose={(selected) => {
                  setError(null)
                  void file.choose(selected)
                }}
              />
              {file.busy && <p role="status">Lendo imagem…</p>}
              {file.error && <p role="alert">Não foi possível ler essa imagem.</p>}
              {imported && (
                <div className="space-y-2">
                  <p className="break-words text-sm">
                    {imported.name} · {imported.width} × {imported.height} pixels
                  </p>
                  <div role="img" aria-label="Prévia da textura importada">
                    <SceneImagePreview image={imported} palette={[]} base={[0, 0, 0, 0]} />
                  </div>
                </div>
              )}
            </>
          )}
          <label className="block space-y-1 text-sm">
            <span>Densidade de pixels</span>
            <select
              name="pieceTextureDensity"
              className="min-h-11 w-full rounded-lg border border-mld-border bg-mld-bg px-2 text-mld-text"
              value={density}
              onChange={(event) => setDensity(Number(event.target.value) as PaintTextureDensity)}
            >
              {PAINT_TEXTURE_DENSITIES.map((value) => (
                <option key={value} value={value}>
                  {value * 16}px
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-mld-muted">
            16px = 1 pixel por unidade; 512px = 32 pixels por unidade.
            {mode === 'import' ? ' A imagem mantém seu tamanho e seus pixels originais.' : ''}
          </p>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              name="splitCrookedFaces"
              type="checkbox"
              className="size-5 accent-mld-accent"
              checked={splitCrookedFaces}
              onChange={(event) => setSplitCrookedFaces(event.target.checked)}
            />
            Dividir faces tortas, se necessário
          </label>
          {error && (
            <p role="alert" className="text-sm text-mld-danger">
              {error}
            </p>
          )}
          <Button
            className="w-full text-sm"
            disabled={!available || (mode === 'create' ? !name.trim() : !file.data || file.busy)}
            onClick={apply}
          >
            {mode === 'import' ? 'Importar e aplicar' : 'Criar e aplicar'}
          </Button>
        </div>
      </Dialog>
    </section>
  )
}
