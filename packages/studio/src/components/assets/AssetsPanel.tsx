import { type JSX, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { PROJECT_ASSET_LIMITS, type ProjectAsset } from '#core'
import { Button, ConfirmDialog, Modal } from '#ui'
import { ASSET_LIBRARY, type LibraryAsset } from '../../asset-library/catalog'
import {
  getPersonalAsset,
  getPersonalAssetsNamespace,
  listPersonalAssets,
  type PersonalAsset,
  removePersonalAsset,
  savePersonalAsset,
} from '../../asset-library/personal'
import {
  personalIdOf,
  syncDrawingsIntoProjects,
  takeDrawingSyncFailures,
} from '../../asset-library/personalSync'
import { useProjectStore, useProjectStoreApi } from '../../state/projectStore'
import { useStudioEditCreation } from '../../studio/edit-creation'
import { useStudioEditDrawing } from '../../studio/edit-drawing'
import { useT } from '../../studio/i18n'
import { useStudioMoldaLibrary } from '../../studio/molda-library'
import { useStudioPintaLibrary } from '../../studio/pinta-library'
import { uniqueAssetName } from './assetNames'
import {
  type CreationOrigin,
  creationOriginOf,
  type EditTarget,
  evidencedOriginOf,
  personalKindOf,
} from './creationOrigin'
import { EditInOriginButton } from './EditInOriginButton'
import { projectHas3DConsumer } from './has3DConsumer'
import {
  fileTo3DAssetDataUrl,
  fileToAssetDataUrl,
  fileToAudioAssetDataUrl,
} from './imageProcessing'
import { MoldaImportDialog } from './MoldaImportDialog'
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

type PendingDeletion =
  | { scope: 'project'; id: string; name: string }
  | { scope: 'personal'; id: string; name: string }

export function AssetsPanel({ open, onClose, allowUpload = true }: AssetsPanelProps): JSX.Element {
  const t = useT()
  const { hasProject, assets, has3DExtension } = useProjectStore(
    useShallow((s) => ({
      hasProject: Boolean(s.project),
      assets: s.project?.assets ?? EMPTY_ASSETS,
      // Quem CONSOME .glb/.hdr (Jogo 3D, Jogo 3D Avançado, Mundo 3D ou Canvas 3D —
      // ver `has3DConsumer.ts`). Sem nenhum deles o upload seria peso morto na cota
      // (a SEÇÃO de modelos continua sem gate: gerenciar/excluir um órfão nunca
      // depende disso). A modal do Molda usa a MESMA régua.
      has3DExtension: projectHas3DConsumer(s.project),
    })),
  )
  const addAsset = useProjectStore((s) => s.addAsset)
  const removeAsset = useProjectStore((s) => s.removeAsset)
  const renameAsset = useProjectStore((s) => s.renameAsset)
  const setAssetLibraryOrigin = useProjectStore((s) => s.setAssetLibraryOrigin)

  const fileInputId = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const soundRef = useRef<HTMLInputElement>(null)
  const modelRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion | null>(null)
  const [deleting, setDeleting] = useState(false)
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
  const [personalReady, setPersonalReady] = useState(!personalNamespace)
  const [catalogOrigins, setCatalogOrigins] = useState<Map<string, CreationOrigin | null>>(
    () => new Map(),
  )
  // Só vira `true` com os DOIS adapters presentes E as duas listas resolvidas: "não
  // consultei" (aula, admin, `list()` rejeitado) e "consultei e ninguém conhece" são
  // respostas diferentes, e só a segunda pode pedir reimportação à criança.
  const [catalogsComplete, setCatalogsComplete] = useState(false)
  const storeApi = useProjectStoreApi()
  const onEditDrawing = useStudioEditDrawing()
  // "Trazer do Pinta" (fluxo pull): com o adapter presente, o botão abre a
  // modal com a galeria inteira do Pinta e a seção "Meus desenhos" SOME
  // (substituída pela modal — decisão da dona, 08/2026). O tick força a
  // re-listagem da biblioteca pessoal após um import (alimenta o botão
  // "✏️ editar desenho" de "No projeto" sem esperar o próximo focus).
  const pintaLibrary = useStudioPintaLibrary()
  const [pintaOpen, setPintaOpen] = useState(false)
  // "Trazer do Molda" (modelos .glb, texturas .png, céus .hdr): mesma mecânica, outra
  // galeria. O import também grava na biblioteca pessoal (com `kind`), então a
  // re-listagem abaixo serve aos dois.
  const moldaLibrary = useStudioMoldaLibrary()
  const [moldaOpen, setMoldaOpen] = useState(false)
  // "Editar a criação no Molda" (o gêmeo do `onEditDrawing`).
  const onEditCreation = useStudioEditCreation()
  const [personalTick, setPersonalTick] = useState(0)
  useEffect(() => {
    if (!open) return
    if (!personalNamespace) {
      setPersonal([])
      setPersonalReady(true)
      return
    }
    setPersonalReady(false)
    // `personalTick` re-dispara a listagem após um import da modal do Pinta.
    void personalTick
    let cancelled = false
    // Reconcilia ANTES de listar: abrir o painel é o momento em que a criança
    // olha para as duas listas lado a lado, então elas têm que concordar. O
    // portão da sincronia deixa isso barato quando nada mudou.
    const refresh = () => {
      void syncDrawingsIntoProjects(storeApi)
        .then(() => listPersonalAssets({ namespace: personalNamespace }))
        .then((assets) => {
          if (cancelled) return
          setPersonal(assets)
          setPersonalReady(true)
          // A troca é silenciosa; a RECUSA não pode ser (o jogo ficaria com a
          // arte velha sem ninguém saber). Inclui as falhas da sincronia em
          // segundo plano, que aconteceram com o painel fechado.
          const failures = takeDrawingSyncFailures()
          if (failures.length > 0) setError(failures.join(' '))
        })
        .catch((cause: unknown) => {
          // Biblioteca indisponível (IndexedDB bloqueado, quota): mantém a lista que
          // tinha e loga. Sem isto a rejeição ficava muda e `personal` vazio parecia
          // "nenhum desenho".
          if (cancelled) return
          setPersonalReady(true)
          console.warn('[estudio] biblioteca pessoal indisponível', cause)
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

  // Só as IMAGENS do PINTA na biblioteca pessoal são "desenhos" (a lista e o "editar no
  // Pinta"): um .glb/.hdr trazido do Molda vive lá com o `kind` dele e cairia no
  // `addFromPersonal` como imagem, ou abriria o Pinta num modelo; e a TEXTURA do Molda é
  // imagem, mas não é desenho do Pinta (`origin: 'molda'`). A modal do Molda é o caminho delas.
  const personalImages = useMemo(
    () => personal.filter((d) => d.kind === 'image' && d.origin !== 'molda'),
    [personal],
  )
  const personalById = useMemo(() => new Map(personal.map((d) => [d.id, d])), [personal])

  // Migração preguiçosa dos projetos anteriores a `libOrigin`: consulta as duas
  // galerias autoritativas. Exatamente um catálogo reconhecer o id resolve a
  // origem; nenhum ou ambos reconhecê-lo mantém a imagem ambígua.
  useEffect(() => {
    if (!open || !personalReady) return
    const unresolved = assets
      .filter(
        (asset) =>
          asset.kind === 'image' &&
          asset.libOrigin === undefined &&
          personalIdOf(asset) !== null &&
          !personalById.has(personalIdOf(asset) ?? ''),
      )
      .map((asset) => personalIdOf(asset))
      .filter((id): id is string => id !== null)
    const ids = [...new Set(unresolved)]
    if (ids.length === 0) {
      setCatalogOrigins((current) => (current.size === 0 ? current : new Map()))
      return
    }

    let cancelled = false
    // `null` = catálogo não consultado (sem adapter) ou indisponível (rejeitou). A
    // rejeição é logada em vez de engolida: antes ela era indistinguível de "lista vazia".
    const listCatalog = (library: { list: () => Promise<{ id: string }[]> } | null) =>
      library
        ? library.list().catch((cause: unknown) => {
            console.warn('[estudio] catálogo indisponível', cause)
            return null
          })
        : Promise.resolve(null)
    void Promise.all([listCatalog(pintaLibrary), listCatalog(moldaLibrary)]).then(
      ([pintaItems, moldaItems]) => {
        if (cancelled) return
        const pintaIds = new Set(pintaItems?.map((item) => item.id) ?? [])
        const moldaIds = new Set(moldaItems?.map((item) => item.id) ?? [])
        setCatalogOrigins(
          new Map(
            ids.map((id) => {
              const inPinta = pintaIds.has(id)
              const inMolda = moldaIds.has(id)
              const origin: CreationOrigin | null =
                inPinta === inMolda ? null : inPinta ? 'pinta' : 'molda'
              return [id, origin]
            }),
          ),
        )
        setCatalogsComplete(pintaItems !== null && moldaItems !== null)
      },
    )
    return () => {
      cancelled = true
    }
  }, [assets, moldaLibrary, open, personalById, personalReady, pintaLibrary])

  // Assim que uma EVIDÊNCIA (registro pessoal ou catálogo) resolve o legado, grava no
  // próprio projeto: a próxima abertura (inclusive em outro aparelho) já não depende da
  // biblioteca local. Nunca pelo palpite do `kind`, e nunca num embed sem namespace
  // pessoal (aula, admin): ali não há biblioteca, e gravar sujaria o projeto (autosave +
  // subida para a nuvem) só de abrir o painel.
  useEffect(() => {
    if (!open || !personalReady || !personalNamespace) return
    for (const asset of assets) {
      if (asset.libOrigin !== undefined) continue
      const id = personalIdOf(asset)
      if (!id) continue
      const origin = evidencedOriginOf(asset, personalById.get(id), catalogOrigins.get(id))
      if (!origin) continue
      const originError = setAssetLibraryOrigin(asset.id, origin)
      if (originError) setError(originError)
    }
  }, [
    assets,
    catalogOrigins,
    open,
    personalById,
    personalNamespace,
    personalReady,
    setAssetLibraryOrigin,
  ])

  /**
   * O "✏️ Editar" de um asset do projeto. NÃO exige o registro na biblioteca pessoal:
   * ela é LOCAL por aparelho e o projeto pode ter descido da nuvem só com o `libId`
   * (o clique repara, ver `openInOriginApp`). Só exige o callback do host para a
   * origem certa: a textura do Molda abre o Molda, nunca o Pinta.
   */
  const editTargetOf = (asset: ProjectAsset): EditTarget | null => {
    const id = personalIdOf(asset)
    if (!id) return null
    const origin = creationOriginOf(asset, personalById.get(id), catalogOrigins.get(id))
    if (!origin) return null
    const open = origin === 'pinta' ? onEditDrawing : onEditCreation
    return open ? { id, origin, open } : null
  }

  /**
   * Abre o app de origem PRIMEIRO, de forma síncrona dentro do clique: o host faz
   * `window.open`, e o WebKit (iPad) bloqueia um popup aberto depois de um `await`; com
   * o IndexedDB na frente, o botão ficava morto. O reparo da biblioteca roda em segundo
   * plano e nunca segura a abertura.
   */
  const openInOriginApp = (asset: ProjectAsset, target: EditTarget) => {
    setError(null)
    target.open(target.id)
    void repairPersonalRecord(asset, target)
  }

  /**
   * Reparo: sem o registro pessoal, a VOLTA (salvar no app regrava a biblioteca)
   * esbarraria na guarda `getPersonalAsset` do host e o jogo nunca se atualizaria.
   * Regrava a partir dos bytes que o projeto tem. A falha não impede a edição (o app já
   * abriu), mas precisa aparecer: sem o elo local, o que ela salvar lá não volta ao jogo.
   * `getPersonalAsset`/`savePersonalAsset` são fail-soft (nunca lançam).
   */
  const repairPersonalRecord = async (asset: ProjectAsset, target: EditTarget) => {
    if (await getPersonalAsset(target.id, { namespace: personalNamespace })) return
    const result = await savePersonalAsset(
      {
        id: target.id,
        name: asset.name,
        kind: personalKindOf(asset),
        origin: target.origin,
        dataUrl: asset.dataUrl,
        originalFileName: asset.originalFileName,
        width: asset.width,
        height: asset.height,
        sprite: asset.sprite,
        tileset: asset.tileset,
        tilemap: asset.tilemap,
        updatedAt: asset.libRevision,
      },
      { namespace: personalNamespace },
    )
    if (result.ok) {
      setPersonalTick((tick) => tick + 1)
      return
    }
    const app = target.origin === 'pinta' ? 'Pinta' : 'Molda'
    setError(
      `${result.error ?? 'Não deu para guardar esta criação na biblioteca.'} Até isso dar certo, o jogo não vai se atualizar sozinho quando você salvar no ${app}.`,
    )
  }

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
      libOrigin: drawing.origin ?? 'pinta',
      libRevision: drawing.updatedAt,
      // Leva as animações/tiles/mapa do Pinta ao projeto → seletor por nome e
      // o bloco "Criar mapa do meu desenho" funcionam.
      sprite: drawing.sprite,
      tileset: drawing.tileset,
      tilemap: drawing.tilemap,
    })
    if (err) setError(err)
  }

  const confirmDeletion = async () => {
    if (!pendingDeletion || deleting) return
    if (pendingDeletion.scope === 'project') {
      removeAsset(pendingDeletion.id)
      setPendingDeletion(null)
      return
    }

    setDeleting(true)
    // O namespace capturado no render: o perfil que a criança está vendo, não o singleton.
    const result = await removePersonalAsset(pendingDeletion.id, { namespace: personalNamespace })
    if (result.ok) {
      setPersonal((current) => current.filter((asset) => asset.id !== pendingDeletion.id))
    } else {
      setError(result.error)
    }
    setDeleting(false)
    setPendingDeletion(null)
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
          {allowUpload || pintaLibrary || moldaLibrary ? (
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
              {moldaLibrary ? (
                <Button
                  variant={allowUpload || pintaLibrary ? 'subtle' : 'primary'}
                  size="sm"
                  onClick={() => setMoldaOpen(true)}
                >
                  {t('moldaImport.button')}
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
                      title="Modelo 3D (.glb) ou céu 360° (.hdr) para Jogo 3D, Jogo 3D Avançado, Mundo 3D e Canvas 3D"
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
            <p
              role="alert"
              className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400"
            >
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
                  // Quem edita esta imagem: o Pinta (desenho) ou o Molda (textura).
                  const editTarget = editTargetOf(asset)
                  const personalId = personalIdOf(asset)
                  // Só pede reimportação quando os DOIS catálogos responderam e nenhum
                  // conhece o id; catálogo ausente ou indisponível não é ambiguidade.
                  const unresolvedLegacyOrigin =
                    asset.libOrigin === undefined &&
                    personalId !== null &&
                    !personalById.has(personalId) &&
                    catalogsComplete &&
                    catalogOrigins.has(personalId) &&
                    catalogOrigins.get(personalId) === null
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
                          {editTarget ? (
                            <EditInOriginButton
                              assetName={asset.name}
                              origin={editTarget.origin}
                              onClick={() => openInOriginApp(asset, editTarget)}
                            />
                          ) : null}
                          {unresolvedLegacyOrigin ? (
                            <span className="text-xs text-sz-warn">
                              Não sei de onde veio este desenho. Traga ele de novo pelo Pinta ou
                              pelo Molda.
                            </span>
                          ) : null}
                          <button
                            type="button"
                            className="text-xs text-red-400 hover:underline"
                            onClick={() =>
                              setPendingDeletion({
                                scope: 'project',
                                id: asset.id,
                                name: asset.name,
                              })
                            }
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
                      onClick={() =>
                        setPendingDeletion({ scope: 'project', id: asset.id, name: asset.name })
                      }
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
                Use o NOME no bloco "Criar o objeto … com o modelo" (Jogo 3D) ou na peça "modelo
                importado" do molde; se for .hdr, em "Usar o céu 360°" ou no "céu de foto".
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
                    {(() => {
                      const editTarget = editTargetOf(asset)
                      return editTarget ? (
                        <EditInOriginButton
                          assetName={asset.name}
                          origin={editTarget.origin}
                          onClick={() => openInOriginApp(asset, editTarget)}
                        />
                      ) : null
                    })()}
                    <button
                      type="button"
                      className="text-xs text-red-400 hover:underline"
                      onClick={() =>
                        setPendingDeletion({ scope: 'project', id: asset.id, name: asset.name })
                      }
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
              {personalImages.length === 0 ? (
                <p className="text-sm text-sz-fg-soft">
                  Desenhe no Pinta e toque em "Usar no Estúdio" — seus desenhos aparecem aqui.
                </p>
              ) : (
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {personalImages.map((drawing) => (
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
                            onClick={() =>
                              setPendingDeletion({
                                scope: 'personal',
                                id: drawing.id,
                                name: drawing.name,
                              })
                            }
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
      {moldaOpen && moldaLibrary ? (
        <MoldaImportDialog
          onClose={() => setMoldaOpen(false)}
          onImported={() => setPersonalTick((tick) => tick + 1)}
        />
      ) : null}
      <ConfirmDialog
        open={pendingDeletion !== null}
        title={
          pendingDeletion?.scope === 'personal'
            ? 'Excluir dos seus desenhos?'
            : 'Excluir do projeto?'
        }
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        danger
        busy={deleting}
        onCancel={() => setPendingDeletion(null)}
        onConfirm={confirmDeletion}
      >
        {pendingDeletion?.scope === 'personal' ? (
          <p>
            O desenho <strong>{pendingDeletion.name}</strong> será apagado da sua biblioteca. Essa
            ação não pode ser desfeita.
          </p>
        ) : (
          <p>
            O asset <strong>{pendingDeletion?.name}</strong> será removido deste projeto. Blocos ou
            código que usam esse nome podem deixar de funcionar.
          </p>
        )}
      </ConfirmDialog>
    </Modal>
  )
}
