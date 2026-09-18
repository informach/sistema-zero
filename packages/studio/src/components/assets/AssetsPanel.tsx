import { type JSX, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { PROJECT_ASSET_LIMITS, type ProjectAsset } from '#core'
import { Button, ConfirmDialog, Modal } from '#ui'
import type { LibraryAsset } from '../../asset-library/catalog'
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
import type { AssetsTab } from '../../state/uiStore'
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
import { projectHas3DConsumer, projectHas3DMaterials } from './has3DConsumer'
import {
  fileTo3DAssetDataUrl,
  fileToAssetDataUrl,
  fileToAudioAssetDataUrl,
} from './imageProcessing'
import { MoldaImportDialog } from './MoldaImportDialog'
import { PintaImportDialog } from './PintaImportDialog'
import { TileConfigDialog, type TileConfigDialogProps } from './TileConfigDialog'
import { type AssetsTabItem, AssetsTabStrip } from './tabs/common'
import { ImagesTab } from './tabs/ImagesTab'
import { Models3DTab } from './tabs/Models3DTab'
import { SoundsTab } from './tabs/SoundsTab'

/**
 * "Materiais do jogo": a janela das imagens, dos sons e dos modelos 3D do projeto.
 * Overlay (espelho do ExtensionsPanel) aberto pelas três portas do menu ⋯ —
 * funciona igual nos dois layouts (wide/narrow), sem comer a largura do editor.
 *
 * ⭐ Esta é a CASCA: a tira de abas, a cota do projeto, o recado de erro, os
 * inputs de arquivo e as modais aninhadas. Cada aba (`tabs/`) desenha o que é
 * dela. O estado caro — a biblioteca pessoal, os catálogos do Pinta e do Molda —
 * fica AQUI e desce por props: carregá-lo por aba refaria a varredura de desenhos
 * a cada troca.
 *
 * Até 18/09/2026 era uma rolagem só, com os três tipos empilhados e o som numa
 * seção que só existia quando já havia som. Todas as ações passam pelo
 * `projectStore` (os assets vivem no Project → autosave/onChange como as demais
 * edições).
 */
export interface AssetsPanelProps {
  open: boolean
  onClose: () => void
  /** Permite desabilitar o envio do computador (ex.: numa aula). Default true. */
  allowUpload?: boolean
  /**
   * A aba pedida pela porta do menu que abriu a janela. A janela ESPELHA isto em
   * estado próprio: clicar numa aba aqui dentro funciona mesmo que o host não
   * passe `onTabChange` (senão as abas ficariam inertes fora do Shell), e uma
   * porta NOVA do menu manda na janela já aberta.
   */
  tab?: AssetsTab
  /** Avisa o host da troca, para a porta do menu marcar a aba certa. */
  onTabChange?: (tab: AssetsTab) => void
}

const EMPTY_ASSETS: ProjectAsset[] = []

type PendingDeletion =
  | { scope: 'project'; id: string; name: string }
  | { scope: 'personal'; id: string; name: string }

export function AssetsPanel({
  open,
  onClose,
  allowUpload = true,
  tab = 'images',
  onTabChange = () => {},
}: AssetsPanelProps): JSX.Element {
  const t = useT()
  const { hasProject, assets, has3DExtension, has3DMaterials } = useProjectStore(
    useShallow((s) => ({
      hasProject: Boolean(s.project),
      assets: s.project?.assets ?? EMPTY_ASSETS,
      // A régua da ABA, na fonte única compartilhada com a porta do menu ⋯. O
      // "Trazer do Molda" entra fora do seletor (é contexto, não projeto).
      has3DMaterials: projectHas3DMaterials(s.project, false),
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
  const tabsBaseId = useId()
  // Espelho da prop: o padrão do React para "ajustar estado quando a prop muda",
  // sem efeito (o efeito renderizaria a aba velha por um quadro).
  const [selectedTab, setSelectedTab] = useState<AssetsTab>(tab)
  const [lastRequestedTab, setLastRequestedTab] = useState<AssetsTab>(tab)
  if (tab !== lastRequestedTab) {
    setLastRequestedTab(tab)
    setSelectedTab(tab)
  }
  const selectTab = (next: AssetsTab) => {
    setSelectedTab(next)
    onTabChange(next)
  }
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

  /**
   * Só pede reimportação quando os DOIS catálogos responderam e nenhum conhece o
   * id: catálogo ausente (aula, admin) ou indisponível não é ambiguidade — "não
   * consultei" e "consultei e ninguém conhece" são respostas diferentes.
   */
  const isOriginUnknown = (asset: ProjectAsset): boolean => {
    const id = personalIdOf(asset)
    return (
      asset.libOrigin === undefined &&
      id !== null &&
      !personalById.has(id) &&
      catalogsComplete &&
      catalogOrigins.has(id) &&
      catalogOrigins.get(id) === null
    )
  }

  const deleteFromProject = (asset: ProjectAsset) =>
    setPendingDeletion({ scope: 'project', id: asset.id, name: asset.name })

  const handleRename = (asset: ProjectAsset, value: string) => {
    if (value === asset.name) return
    const err = renameAsset(asset.id, value)
    if (err) setError(err)
    else setError(null)
  }

  // Quais abas existem. ⚠️ A de modelos 3D aparece por TRÊS motivos independentes,
  // e cada um já custou caro em algum lugar desta base:
  // 1. há quem consuma 3D instalado — o caso normal;
  // 2. o projeto TEM arquivo 3D — um órfão precisa continuar gerenciável (era a
  //    régua da seção antiga, que aparecia por conteúdo, não por extensão);
  // 3. o host deu o "Trazer do Molda" — a aba é o ENDEREÇO dele, e sem ela o
  //    botão sumiria justamente para quem ainda não instalou nada de 3D (inclusive
  //    para trazer TEXTURA, que é imagem e sempre entra).
  const has3DTab = has3DMaterials || Boolean(moldaLibrary)
  const tabs: AssetsTabItem[] = [
    { id: 'images', label: t('assets.tab.images'), icon: '🖼️' },
    { id: 'sounds', label: t('assets.tab.sounds'), icon: '🔊' },
    ...(has3DTab ? [{ id: 'models3d' as const, label: t('assets.tab.models3d'), icon: '🧊' }] : []),
  ]
  // A aba pedida pode ter deixado de existir (a criança removeu a extensão 3D e
  // apagou os modelos com a janela aberta): cai para a primeira, nunca em branco.
  const activeTab: AssetsTab = tabs.some((item) => item.id === selectedTab) ? selectedTab : 'images'

  // ⚠️ O fallback acima não pode ficar só na janela: a aba pode sumir COM a janela
  // aberta (excluir o último .glb de um projeto sem extensão 3D, que é o caminho do
  // próprio teste do órfão). Sem avisar o host, a store continuava em 'models3d' e
  // NENHUMA porta do menu aparecia ligada — e a porta "Imagens" precisava de dois
  // cliques para fechar a janela, contrariando a regra da própria store.
  useEffect(() => {
    if (activeTab !== selectedTab) {
      setSelectedTab(activeTab)
      onTabChange(activeTab)
    }
  }, [activeTab, selectedTab, onTabChange])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('assets.title')}
      className="w-[680px] max-w-[92vw]"
      footer={
        <Button variant="ghost" size="sm" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      {!hasProject ? (
        <p className="text-sm text-sz-fg-soft">Abra um projeto para gerenciar os materiais.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Os inputs de arquivo moram na CASCA (e não na aba que os usa) porque
              o `value` precisa sobreviver à troca de aba enquanto o navegador ainda
              está lendo os arquivos escolhidos. */}
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
            </>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <AssetsTabStrip
              items={tabs}
              active={activeTab}
              onSelect={selectTab}
              baseId={tabsBaseId}
            />
            {/* A cota é do PROJETO inteiro, não de um tipo: fica fora das abas. */}
            <span className="text-xs text-sz-fg-soft">
              {assets.length}/{PROJECT_ASSET_LIMITS.maxAssetsCount} arquivos · {budgetPct}% do
              espaço
            </span>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400"
            >
              {error}
            </p>
          )}

          <div
            role="tabpanel"
            id={`${tabsBaseId}-panel-${activeTab}`}
            aria-labelledby={`${tabsBaseId}-tab-${activeTab}`}
          >
            {activeTab === 'images' ? (
              <ImagesTab
                images={images}
                allowUpload={allowUpload}
                busy={busy}
                onUpload={() => fileRef.current?.click()}
                onOpenPinta={pintaLibrary ? () => setPintaOpen(true) : null}
                onConfigureTiles={(asset, mode) => setTileConfig({ asset, mode })}
                onRename={handleRename}
                onDelete={deleteFromProject}
                editTargetOf={editTargetOf}
                onOpenInOrigin={openInOriginApp}
                isOriginUnknown={isOriginUnknown}
                personalImages={personalNamespace && !pintaLibrary ? personalImages : null}
                onAddFromPersonal={addFromPersonal}
                onEditDrawing={onEditDrawing}
                onDeletePersonal={(drawing) =>
                  setPendingDeletion({ scope: 'personal', id: drawing.id, name: drawing.name })
                }
                onAddFromLibrary={addFromLibrary}
              />
            ) : null}
            {activeTab === 'sounds' ? (
              <SoundsTab
                sounds={sounds}
                allowUpload={allowUpload}
                busy={busy}
                onUpload={() => soundRef.current?.click()}
                onRename={handleRename}
                onDelete={deleteFromProject}
              />
            ) : null}
            {activeTab === 'models3d' ? (
              <Models3DTab
                models3d={models3d}
                allowUpload={allowUpload}
                busy={busy}
                has3DExtension={has3DExtension}
                onUpload={() => modelRef.current?.click()}
                onOpenMolda={moldaLibrary ? () => setMoldaOpen(true) : null}
                onRename={handleRename}
                onDelete={deleteFromProject}
                editTargetOf={editTargetOf}
                onOpenInOrigin={openInOriginApp}
              />
            ) : null}
          </div>
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
