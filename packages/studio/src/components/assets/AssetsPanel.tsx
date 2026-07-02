import { type JSX, useEffect, useId, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { normalizeAssetName, PROJECT_ASSET_LIMITS, type ProjectAsset } from '#core'
import { Button, Modal } from '#ui'
import { ASSET_LIBRARY, type LibraryAsset } from '../../asset-library/catalog'
import {
  getPersonalAssetsNamespace,
  listPersonalAssets,
  type PersonalAsset,
  removePersonalAsset,
} from '../../asset-library/personal'
import { useProjectStore } from '../../state/projectStore'
import { fileToAssetDataUrl } from './imageProcessing'

/**
 * Gerenciador de IMAGENS (assets) do projeto. Overlay (espelho do ExtensionsPanel)
 * aberto pela Topbar — funciona igual nos dois layouts (wide/narrow), sem comer a
 * largura do editor. Três áreas: grade das imagens do projeto (renomear/excluir),
 * "Enviar do computador" (downscale/compressão no canvas) e a "Biblioteca" (starter
 * pack — clique copia para o projeto). Todas as ações passam pelo `projectStore`
 * (os assets vivem no Project → autosave/onChange como as demais edições).
 */
export interface AssetsPanelProps {
  open: boolean
  onClose: () => void
  /** Permite desabilitar o envio do computador (ex.: numa aula). Default true. */
  allowUpload?: boolean
}

const EMPTY_ASSETS: ProjectAsset[] = []

export function AssetsPanel({ open, onClose, allowUpload = true }: AssetsPanelProps): JSX.Element {
  const { hasProject, assets } = useProjectStore(
    useShallow((s) => ({
      hasProject: Boolean(s.project),
      assets: s.project?.assets ?? EMPTY_ASSETS,
    })),
  )
  const addAsset = useProjectStore((s) => s.addAsset)
  const removeAsset = useProjectStore((s) => s.removeAsset)
  const renameAsset = useProjectStore((s) => s.renameAsset)

  const fileInputId = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // "Meus desenhos" (biblioteca pessoal, alimentada pelo Pinta): só existe com
  // namespace de perfil setado — some na aula e no adulto (deliberado). Carrega
  // ao ABRIR o painel (a criança pode ter desenhado no Pinta em outra aba).
  const personalNamespace = getPersonalAssetsNamespace()
  const [personal, setPersonal] = useState<PersonalAsset[]>([])
  useEffect(() => {
    if (!open || !personalNamespace) return
    let cancelled = false
    void listPersonalAssets().then((assets) => {
      if (!cancelled) setPersonal(assets)
    })
    return () => {
      cancelled = true
    }
  }, [open, personalNamespace])

  const addFromPersonal = (drawing: PersonalAsset) => {
    setError(null)
    const taken = new Set(assets.map((a) => a.name))
    const err = addAsset({
      name: uniqueName(drawing.name, taken),
      dataUrl: drawing.dataUrl,
      width: drawing.width,
      height: drawing.height,
      source: 'library',
      libId: `personal:${drawing.id}`,
    })
    if (err) setError(err)
  }

  const removeFromPersonal = (id: string) => {
    // Otimista: a remoção no IDB é best-effort (fail-soft).
    setPersonal((current) => current.filter((a) => a.id !== id))
    void removePersonalAsset(id)
  }

  const usedChars = assets.reduce((sum, a) => sum + a.dataUrl.length, 0)
  const budgetPct = Math.min(
    100,
    Math.round((usedChars / PROJECT_ASSET_LIMITS.maxAssetsTotalChars) * 100),
  )

  const uniqueName = (base: string, taken: Set<string>): string => {
    const root = normalizeAssetName(base) ?? 'imagem'
    if (!taken.has(root)) return root
    let i = 2
    while (taken.has(`${root}-${i}`)) i += 1
    return `${root}-${i}`
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setError(null)
    setBusy(true)
    // Acompanha os nomes já usados DENTRO do lote (o store só atualiza ao fim de
    // cada add; sem isso, dois arquivos com o mesmo nome sugerido colidiriam).
    const taken = new Set(assets.map((a) => a.name))
    try {
      for (const file of Array.from(files)) {
        const { dataUrl, width, height } = await fileToAssetDataUrl(file)
        const base = file.name.replace(/\.[^.]+$/, '')
        const name = uniqueName(base, taken)
        const err = addAsset({ name, dataUrl, width, height, source: 'upload' })
        if (err) {
          setError(err)
          break
        }
        taken.add(name)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao processar a imagem.')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const addFromLibrary = (lib: LibraryAsset) => {
    setError(null)
    const taken = new Set(assets.map((a) => a.name))
    const name = uniqueName(lib.name, taken)
    const err = addAsset({
      name,
      dataUrl: lib.dataUrl,
      width: lib.width,
      height: lib.height,
      source: 'library',
      libId: lib.id,
    })
    if (err) setError(err)
  }

  const handleRename = (asset: ProjectAsset, value: string) => {
    if (value === asset.name) return
    const err = renameAsset(asset.id, value)
    if (err) setError(err)
    else setError(null)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Imagens"
      className="w-[680px] max-w-[92vw]"
      footer={
        <Button variant="ghost" size="sm" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      {!hasProject ? (
        <p className="text-sm text-sz-fg-soft">Abra um projeto para gerenciar imagens.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {allowUpload && (
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileRef}
                id={fileInputId}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => void handleFiles(e.target.files)}
              />
              <Button
                variant="primary"
                size="sm"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                {busy ? 'Processando…' : 'Enviar do computador'}
              </Button>
              <span className="text-xs text-sz-fg-soft">
                {assets.length}/{PROJECT_ASSET_LIMITS.maxAssetsCount} imagens · {budgetPct}% do
                espaço
              </span>
            </div>
          )}

          {error && (
            <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-sz-fg-mute">
              No projeto
            </h3>
            {assets.length === 0 ? (
              <p className="text-sm text-sz-fg-soft">
                Nenhuma imagem ainda. Envie do computador ou escolha uma da biblioteca abaixo.
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {assets.map((asset) => (
                  <li
                    key={asset.id}
                    className="flex items-center gap-2 rounded-md border border-sz-border bg-sz-panel-soft p-2"
                  >
                    <img
                      src={asset.dataUrl}
                      alt={asset.name}
                      className="h-12 w-12 shrink-0 rounded bg-sz-bg object-contain"
                      style={{ imageRendering: 'pixelated' }}
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <input
                        defaultValue={asset.name}
                        spellCheck={false}
                        aria-label={`Nome da imagem ${asset.name}`}
                        className="w-full rounded border border-sz-border bg-sz-bg px-1.5 py-0.5 font-mono text-xs text-sz-fg outline-none focus:border-sz-accent"
                        onBlur={(e) => handleRename(asset, e.target.value.trim())}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                        }}
                      />
                      <button
                        type="button"
                        className="self-start text-xs text-red-400 hover:underline"
                        onClick={() => removeAsset(asset.id)}
                      >
                        Excluir
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {personalNamespace ? (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-sz-fg-mute">
                Meus desenhos
              </h3>
              {personal.length === 0 ? (
                <p className="text-sm text-sz-fg-soft">
                  Desenhe no Pinta e toque em "Usar no Estúdio" — seus desenhos aparecem aqui.
                </p>
              ) : (
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {personal.map((drawing) => (
                    <li
                      key={drawing.id}
                      className="flex items-center gap-2 rounded-md border border-sz-border bg-sz-panel-soft p-2"
                    >
                      <img
                        src={drawing.dataUrl}
                        alt={drawing.name}
                        className="h-12 w-12 shrink-0 rounded bg-sz-bg object-contain"
                        style={{ imageRendering: 'pixelated' }}
                      />
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <span
                          className="truncate font-mono text-xs text-sz-fg"
                          title={drawing.name}
                        >
                          {drawing.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="text-xs text-sz-accent hover:underline"
                            onClick={() => addFromPersonal(drawing)}
                          >
                            Adicionar ao projeto
                          </button>
                          <button
                            type="button"
                            className="text-xs text-red-400 hover:underline"
                            onClick={() => removeFromPersonal(drawing.id)}
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-sz-fg-mute">
              Biblioteca
            </h3>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {ASSET_LIBRARY.map((lib) => (
                <li key={lib.id}>
                  <button
                    type="button"
                    title={`Adicionar "${lib.name}"`}
                    className="flex w-full flex-col items-center gap-1 rounded-md border border-sz-border bg-sz-bg p-2 hover:border-sz-accent"
                    onClick={() => addFromLibrary(lib)}
                  >
                    <img
                      src={lib.dataUrl}
                      alt={lib.name}
                      className="h-10 w-10 object-contain"
                      style={{ imageRendering: 'pixelated' }}
                    />
                    <span className="max-w-full truncate text-[10px] text-sz-fg-soft">
                      {lib.name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </Modal>
  )
}
