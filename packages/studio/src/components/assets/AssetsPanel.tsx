import { type JSX, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { PROJECT_ASSET_LIMITS, type ProjectAsset } from '#core'
import { Button, Modal } from '#ui'
import { ASSET_LIBRARY, type LibraryAsset } from '../../asset-library/catalog'
import {
  getPersonalAssetsNamespace,
  listPersonalAssets,
  type PersonalAsset,
  removePersonalAsset,
} from '../../asset-library/personal'
import {
  personalIdOf,
  syncDrawingsIntoProjects,
  takeDrawingSyncFailures,
} from '../../asset-library/personalSync'
import { useProjectStore, useProjectStoreApi } from '../../state/projectStore'
import { useStudioEditDrawing } from '../../studio/edit-drawing'
import { useT } from '../../studio/i18n'
import { useStudioPintaLibrary } from '../../studio/pinta-library'
import { uniqueAssetName } from './assetNames'
import {
  fileTo3DAssetDataUrl,
  fileToAssetDataUrl,
  fileToAudioAssetDataUrl,
} from './imageProcessing'
import { PintaImportDialog } from './PintaImportDialog'
import { TileConfigDialog, type TileConfigDialogProps } from './TileConfigDialog'

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
  const t = useT()
  const { hasProject, assets, has3DExtension } = useProjectStore(
    useShallow((s) => ({
      hasProject: Boolean(s.project),
      assets: s.project?.assets ?? EMPTY_ASSETS,
      // Quem CONSOME .glb/.hdr: as extensões Jogo 3D Avançado e Mundo 3D OU a
      // categoria de núcleo Canvas 3D (que carrega o modelo por
      // `loader.load('modelo.glb')`). Sem nenhum deles o upload seria peso morto
      // na cota (a SEÇÃO de modelos continua sem gate: gerenciar/excluir um
      // órfão nunca depende disso). O sinal do Canvas 3D é o import do three no
      // código gerado (ou um bloco `sz_t3d_` no blocksState, para o projeto
      // novo em Blocos antes da geração).
      has3DExtension:
        (s.project?.installedExtensions ?? []).some(
          (e) => e.id === 'game-3d-advanced' || e.id === 'world-3d',
        ) ||
        /from\s+['"]three(['"]|\/)/.test(s.project?.files?.['script.js'] ?? '') ||
        (s.project?.blocksState
          ? JSON.stringify(s.project.blocksState).includes('sz_t3d_')
          : false),
    })),
  )
  const addAsset = useProjectStore((s) => s.addAsset)
  const removeAsset = useProjectStore((s) => s.removeAsset)
  const renameAsset = useProjectStore((s) => s.renameAsset)

  const fileInputId = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const soundRef = useRef<HTMLInputElement>(null)
  const modelRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // Imagens (desenhos/sprites), sons (áudio importado) e binários 3D (modelo
  // .glb / céu .hdr) vivem na mesma lista de assets; separamos só para exibir
  // em seções distintas (um .glb na grade de imagens viraria <img> quebrado).
  const images = assets.filter(
    (a) => a.kind !== 'audio' && a.kind !== 'model3d' && a.kind !== 'environment3d',
  )
  const sounds = assets.filter((a) => a.kind === 'audio')
  const models3d = assets.filter((a) => a.kind === 'model3d' || a.kind === 'environment3d')
  // "Usar como peças" / "Usar como mapa (fatiar)" — upload vira tileset/mapa sem Pinta.
  const [tileConfig, setTileConfig] = useState<Pick<
    TileConfigDialogProps,
    'asset' | 'mode'
  > | null>(null)

  // "Meus desenhos" (biblioteca pessoal, alimentada pelo Pinta): só existe com
  // namespace de perfil setado — some na aula e no adulto (deliberado). Carrega
  // ao ABRIR o painel (a criança pode ter desenhado no Pinta em outra aba).
  const personalNamespace = getPersonalAssetsNamespace()
  const [personal, setPersonal] = useState<PersonalAsset[]>([])
  const storeApi = useProjectStoreApi()
  const onEditDrawing = useStudioEditDrawing()
  // "Trazer do Pinta" (fluxo pull): com o adapter presente, o botão abre a
  // modal com a galeria inteira do Pinta e a seção "Meus desenhos" SOME
  // (substituída pela modal — decisão da dona, 08/2026). O tick força a
  // re-listagem da biblioteca pessoal após um import (alimenta o botão
  // "✏️ editar desenho" de "No projeto" sem esperar o próximo focus).
  const pintaLibrary = useStudioPintaLibrary()
  const [pintaOpen, setPintaOpen] = useState(false)
  const [personalTick, setPersonalTick] = useState(0)
  useEffect(() => {
    if (!open || !personalNamespace) return
    // `personalTick` re-dispara a listagem após um import da modal do Pinta.
    void personalTick
    let cancelled = false
    // Reconcilia ANTES de listar: abrir o painel é o momento em que a criança
    // olha para as duas listas lado a lado, então elas têm que concordar. O
    // portão da sincronia deixa isso barato quando nada mudou.
    const refresh = () => {
      void syncDrawingsIntoProjects(storeApi)
        .then(() => listPersonalAssets())
        .then((assets) => {
          if (cancelled) return
          setPersonal(assets)
          // A troca é silenciosa; a RECUSA não pode ser (o jogo ficaria com a
          // arte velha sem ninguém saber). Inclui as falhas da sincronia em
          // segundo plano, que aconteceram com o painel fechado.
          const failures = takeDrawingSyncFailures()
          if (failures.length > 0) setError(failures.join(' '))
        })
    }
    refresh()
    // Voltar do Pinta com o painel ABERTO: sem isto, a imagem no jogo se
    // atualizava (o watcher do Shell cuida disso) mas a miniatura em "Meus
    // desenhos" ficava com o desenho velho até fechar e reabrir — duas listas
    // lado a lado discordando.
    window.addEventListener('focus', refresh)
    return () => {
      cancelled = true
      window.removeEventListener('focus', refresh)
    }
  }, [open, personalNamespace, storeApi, personalTick])

  /** Desenhos que ainda existem no Pinta — quem pode abrir o editor de lá. */
  const editableDrawingIds = useMemo(
    () => (onEditDrawing ? new Set(personal.map((d) => d.id)) : null),
    [personal, onEditDrawing],
  )

  const addFromPersonal = (drawing: PersonalAsset) => {
    setError(null)
    const taken = new Set(assets.map((a) => a.name))
    const err = addAsset({
      name: uniqueAssetName(drawing.name, taken),
      dataUrl: drawing.dataUrl,
      width: drawing.width,
      height: drawing.height,
      source: 'library',
      libId: `personal:${drawing.id}`,
      // Leva as animações/tiles/mapa do Pinta ao projeto → seletor por nome e
      // o bloco "Criar mapa do meu desenho" funcionam.
      sprite: drawing.sprite,
      tileset: drawing.tileset,
      tilemap: drawing.tilemap,
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
        const name = uniqueAssetName(base, taken)
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

  const handleAudioFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setError(null)
    setBusy(true)
    const taken = new Set(assets.map((a) => a.name))
    try {
      for (const file of Array.from(files)) {
        const { dataUrl } = await fileToAudioAssetDataUrl(file)
        const base = file.name.replace(/\.[^.]+$/, '')
        const name = uniqueAssetName(base, taken)
        const err = addAsset({ name, dataUrl, kind: 'audio', source: 'upload' })
        if (err) {
          setError(err)
          break
        }
        taken.add(name)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao processar o som.')
    } finally {
      setBusy(false)
      if (soundRef.current) soundRef.current.value = ''
    }
  }

  const handle3DFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setError(null)
    setBusy(true)
    const taken = new Set(assets.map((a) => a.name))
    try {
      for (const file of Array.from(files)) {
        const { dataUrl, kind, fileName } = await fileTo3DAssetDataUrl(file)
        const base = file.name.replace(/\.[^.]+$/, '')
        const name = uniqueAssetName(base, taken)
        // O nome do arquivo vai junto: a validação do store cruza a extensão
        // com o MIME e a assinatura binária (um .glb renomeado é recusado).
        const err = addAsset({ name, dataUrl, kind, originalFileName: fileName, source: 'upload' })
        if (err) {
          setError(err)
          break
        }
        taken.add(name)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao processar o arquivo 3D.')
    } finally {
      setBusy(false)
      if (modelRef.current) modelRef.current.value = ''
    }
  }

  const addFromLibrary = (lib: LibraryAsset) => {
    setError(null)
    const taken = new Set(assets.map((a) => a.name))
    const name = uniqueAssetName(lib.name, taken)
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
      title="Imagens e sons"
      className="w-[680px] max-w-[92vw]"
      footer={
        <Button variant="ghost" size="sm" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      {!hasProject ? (
        <p className="text-sm text-sz-fg-soft">Abra um projeto para gerenciar imagens e sons.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {allowUpload || pintaLibrary ? (
            <div className="flex flex-wrap items-center gap-3">
              {allowUpload ? (
                <>
                  <input
                    ref={fileRef}
                    id={fileInputId}
                    type="file"
                    name="project-image-files"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => void handleFiles(e.target.files)}
                  />
                  <input
                    ref={soundRef}
                    type="file"
                    name="project-audio-files"
                    accept="audio/*"
                    multiple
                    className="hidden"
                    onChange={(e) => void handleAudioFiles(e.target.files)}
                  />
                  {has3DExtension ? (
                    <input
                      ref={modelRef}
                      type="file"
                      name="project-3d-files"
                      accept=".glb,.hdr"
                      multiple
                      className="hidden"
                      onChange={(e) => void handle3DFiles(e.target.files)}
                    />
                  ) : null}
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={busy}
                    onClick={() => fileRef.current?.click()}
                  >
                    {busy ? 'Processando…' : 'Enviar imagem'}
                  </Button>
                </>
              ) : null}
              {pintaLibrary ? (
                <Button
                  variant={allowUpload ? 'subtle' : 'primary'}
                  size="sm"
                  onClick={() => setPintaOpen(true)}
                >
                  {t('pintaImport.button')}
                </Button>
              ) : null}
              {allowUpload ? (
                <>
                  <Button
                    variant="subtle"
                    size="sm"
                    disabled={busy}
                    onClick={() => soundRef.current?.click()}
                  >
                    🔊 Enviar som
                  </Button>
                  {has3DExtension ? (
                    <Button
                      variant="subtle"
                      size="sm"
                      disabled={busy}
                      title="Modelo 3D (.glb) ou céu 360° (.hdr) para Canvas 3D, Jogo 3D Avançado e Mundo 3D"
                      onClick={() => modelRef.current?.click()}
                    >
                      📦 Enviar modelo 3D
                    </Button>
                  ) : null}
                </>
              ) : null}
              <span className="text-xs text-sz-fg-soft">
                {assets.length}/{PROJECT_ASSET_LIMITS.maxAssetsCount} arquivos · {budgetPct}% do
                espaço
              </span>
            </div>
          ) : null}

          {/* O que cabe, ANTES do envio. A dúvida veio da dona do produto ("qual
              tipo de som aceita, quanto tempo?") e o WAV é a armadilha: pelo
              mesmo som ele ocupa ~10× o de um mp3, então 1 minuto já estoura
              enquanto o mp3 aguenta uns 5. O erro de teto já existia, mas só
              aparecia DEPOIS de escolher o arquivo. */}
          {allowUpload ? (
            <p className="text-xs text-sz-fg-mute">
              Som: mp3, wav, ogg ou m4a, até 5 MB por arquivo. Um mp3 cabe com uns 5 minutos; um
              wav, só uns 30 segundos (ele ocupa bem mais pelo mesmo som).
            </p>
          ) : null}

          {error && (
            <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-sz-fg-mute">
              No projeto
            </h3>
            {images.length === 0 ? (
              <p className="text-sm text-sz-fg-soft">
                Nenhuma imagem ainda. Envie do computador ou escolha uma da biblioteca abaixo.
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {images.map((asset) => {
                  // O desenho de origem no Pinta, quando esta imagem veio de
                  // "Meus desenhos" E o desenho ainda existe lá (apagado no
                  // Pinta → sem botão, em vez de abrir um editor vazio).
                  const drawingId = personalIdOf(asset)
                  const editableId =
                    drawingId && editableDrawingIds?.has(drawingId) ? drawingId : null
                  return (
                    <li
                      key={asset.id}
                      className="flex items-center gap-2 rounded-md border border-sz-border bg-sz-panel-soft p-2"
                    >
                      <img
                        src={asset.dataUrl}
                        alt={asset.name}
                        width={48}
                        height={48}
                        loading="lazy"
                        className="h-12 w-12 shrink-0 rounded bg-sz-bg object-contain"
                        style={{ imageRendering: 'pixelated' }}
                      />
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <input
                          name={`image-name-${asset.id}`}
                          autoComplete="off"
                          defaultValue={asset.name}
                          spellCheck={false}
                          aria-label={`Nome da imagem ${asset.name}`}
                          className="w-full rounded border border-sz-border bg-sz-bg px-1.5 py-0.5 font-mono text-xs text-sz-fg outline-none focus:border-sz-accent"
                          onBlur={(e) => handleRename(asset, e.target.value.trim())}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                          }}
                        />
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          {asset.tilemap ? (
                            <span
                              className="text-[9px] text-sz-fg-soft"
                              title={`mapa ${asset.tilemap.cols}×${asset.tilemap.rows}`}
                            >
                              🗺️ mapa
                            </span>
                          ) : null}
                          <button
                            type="button"
                            title="Definir o tamanho das peças e os tiles sólidos"
                            className="text-[10px] text-sz-fg-soft hover:text-sz-accent hover:underline"
                            onClick={() => setTileConfig({ asset, mode: 'tileset' })}
                          >
                            🧩 peças
                          </button>
                          <button
                            type="button"
                            title="Fatiar esta imagem como um mapa de tiles"
                            className="text-[10px] text-sz-fg-soft hover:text-sz-accent hover:underline"
                            onClick={() => setTileConfig({ asset, mode: 'tilemap' })}
                          >
                            🗺️ fatiar
                          </button>
                          {editableId && onEditDrawing ? (
                            <button
                              type="button"
                              title="Abrir este desenho no Pinta (ele se atualiza aqui sozinho)"
                              className="text-[10px] text-sz-fg-soft hover:text-sz-accent hover:underline"
                              onClick={() => onEditDrawing(editableId)}
                            >
                              ✏️ editar desenho
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="text-xs text-red-400 hover:underline"
                            onClick={() => removeAsset(asset.id)}
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {sounds.length > 0 ? (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-sz-fg-mute">
                Sons no projeto
              </h3>
              <ul className="flex flex-col gap-2">
                {sounds.map((asset) => (
                  <li
                    key={asset.id}
                    className="flex items-center gap-2 rounded-md border border-sz-border bg-sz-panel-soft p-2"
                  >
                    <span className="text-lg" aria-hidden>
                      🔊
                    </span>
                    <input
                      name={`sound-name-${asset.id}`}
                      autoComplete="off"
                      defaultValue={asset.name}
                      spellCheck={false}
                      aria-label={`Nome do som ${asset.name}`}
                      className="min-w-0 flex-1 rounded border border-sz-border bg-sz-bg px-1.5 py-0.5 font-mono text-xs text-sz-fg outline-none focus:border-sz-accent"
                      onBlur={(e) => handleRename(asset, e.target.value.trim())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                      }}
                    />
                    {/* biome-ignore lint/a11y/useMediaCaption: efeito sonoro de jogo, sem fala/legenda */}
                    <audio
                      src={asset.dataUrl}
                      controls
                      preload="none"
                      className="h-8 max-w-[46%]"
                    />
                    <button
                      type="button"
                      className="text-xs text-red-400 hover:underline"
                      onClick={() => removeAsset(asset.id)}
                    >
                      Excluir
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {models3d.length > 0 ? (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-sz-fg-mute">
                Modelos 3D
              </h3>
              <p className="mb-2 text-xs text-sz-fg-soft">
                Use o NOME na peça "modelo importado" do molde (ou no "céu de foto", se for .hdr).
              </p>
              <ul className="flex flex-col gap-2">
                {models3d.map((asset) => (
                  <li
                    key={asset.id}
                    className="flex items-center gap-2 rounded-md border border-sz-border bg-sz-panel-soft p-2"
                  >
                    <span
                      className="text-lg"
                      aria-hidden
                      title={asset.kind === 'model3d' ? 'Modelo .glb' : 'Céu 360° .hdr'}
                    >
                      {asset.kind === 'model3d' ? '📦' : '🌅'}
                    </span>
                    <input
                      name={`model-name-${asset.id}`}
                      autoComplete="off"
                      defaultValue={asset.name}
                      spellCheck={false}
                      aria-label={`Nome do modelo 3D ${asset.name}`}
                      className="min-w-0 flex-1 rounded border border-sz-border bg-sz-bg px-1.5 py-0.5 font-mono text-xs text-sz-fg outline-none focus:border-sz-accent"
                      onBlur={(e) => handleRename(asset, e.target.value.trim())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                      }}
                    />
                    <span
                      className="max-w-[30%] truncate text-[10px] text-sz-fg-soft"
                      title={asset.originalFileName}
                    >
                      {asset.originalFileName}
                    </span>
                    <button
                      type="button"
                      className="text-xs text-red-400 hover:underline"
                      onClick={() => removeAsset(asset.id)}
                    >
                      Excluir
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Com o "Trazer do Pinta" presente, a seção morre (a modal cobre a
              galeria INTEIRA, com busca). Sem o adapter (ex.: perfil que perdeu
              a posse do Pinta), a lista antiga preserva o acesso ao que já foi
              enviado. O EFEITO de sincronia acima roda nos dois casos — ele
              alimenta o auto-update dos jogos e o "✏️ editar desenho". */}
          {personalNamespace && !pintaLibrary ? (
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
                        width={48}
                        height={48}
                        loading="lazy"
                        className="h-12 w-12 shrink-0 rounded bg-sz-bg object-contain"
                        style={{ imageRendering: 'pixelated' }}
                      />
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <span
                          className="truncate font-mono text-xs text-sz-fg"
                          title={drawing.name}
                        >
                          {drawing.name}
                          {drawing.tilemap ? (
                            <span
                              className="ml-1 text-[9px] text-sz-fg-soft"
                              title={`mapa ${drawing.tilemap.cols}×${drawing.tilemap.rows}`}
                            >
                              🗺️ mapa
                            </span>
                          ) : null}
                        </span>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <button
                            type="button"
                            className="text-xs text-sz-accent hover:underline"
                            onClick={() => addFromPersonal(drawing)}
                          >
                            Adicionar ao projeto
                          </button>
                          {onEditDrawing ? (
                            <button
                              type="button"
                              title="Abrir este desenho no Pinta (ele se atualiza nos seus jogos sozinho)"
                              className="text-xs text-sz-fg-soft hover:text-sz-accent hover:underline"
                              onClick={() => onEditDrawing(drawing.id)}
                            >
                              ✏️ Editar
                            </button>
                          ) : null}
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
                      width={40}
                      height={40}
                      loading="lazy"
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
      {tileConfig ? (
        <TileConfigDialog
          asset={tileConfig.asset}
          mode={tileConfig.mode}
          onClose={() => setTileConfig(null)}
        />
      ) : null}
      {pintaOpen && pintaLibrary ? (
        <PintaImportDialog
          onClose={() => setPintaOpen(false)}
          onImported={() => setPersonalTick((tick) => tick + 1)}
        />
      ) : null}
    </Modal>
  )
}
