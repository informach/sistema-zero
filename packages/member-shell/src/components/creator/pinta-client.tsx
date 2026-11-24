'use client'

import {
  PINTA_INVENTORY_READER_VERSION,
  PINTA_MAX_READ_FORMAT_VERSION,
} from '@sistemazero/core/creations'
// O CSS do Pinta (tokens + @theme que GERA as utilitárias pin-*) é carregado pelo
// `@import` em `app/globals.css`, DENTRO do pipeline Tailwind — mesmo gotcha do
// Estúdio/Pensa: um JS-import aqui só traria os tokens, sem gerar as utilitárias.
import type {
  PintaCompletionControl,
  PintaHostAdapter,
  PintaInitialCanvas,
  PintaInitialIntent,
} from '@sistemazero/pinta'
import type { PintaWorkshopAsset } from '@sistemazero/pinta/assets'
import { RefreshCw } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { concluirPinta } from '../../lib/arquipelago-pinta'
import { type CreationsCloud, createCreationsCloud } from '../../lib/creations-cloud'
import { creatorStorageNamespace } from '../../lib/creator-storage-namespace'
import type { EmbeddedCreationControl } from '../../lib/embedded-creation-control'
import { navigatePensaMission } from '../../lib/pensa-next-mission'
import {
  createCloudMirroredPintaPersistence,
  type PintaPersistenceLike,
} from '../../lib/pinta-cloud-persistence'
import { pintaRecoveryHelpFor } from '../../lib/pinta-recovery-help'
import { EMBEDDED_APP_FRAME, EmbeddedAppLoadingBody } from './embedded-app-loading'
import { useFocusMode } from './focus-mode'
import { PensaMissionBlocked } from './pensa-mission-blocked'
import { usePintaAccount } from './pinta-account-scope'
import { savePintaStudioBundle } from './save-pinta-studio-bundle'
import { HostChromeAnnouncer, useHostChrome } from './use-host-chrome'
import {
  canOpenPensaMission,
  usePensaMissionHandoff,
  usePensaMissionOutline,
  usePensaMissionSession,
} from './use-pensa-mission-session'

// O pacote é client-only (zustand/canvas/IndexedDB); carregamos DENTRO de um
// effect (igual ao pensa-client) e o server renderiza só o placeholder.
type PintaModule = typeof import('@sistemazero/pinta')

/**
 * Regiões do Pinta (23/11/2026, etapa 1): o leitor e o escritor da conta que a oficina anuncia.
 * Nuvem 7 = nativo 8 (regiões). Nuvem 8 (autorregras e projeções) ainda não está pronta e não é
 * anunciada; por isso a oficina deste host grava no máximo o nativo 8.
 */
export const PINTA_REGIONS_CLOUD_FORMAT = 7 as const
if (PINTA_REGIONS_CLOUD_FORMAT > PINTA_INVENTORY_READER_VERSION)
  throw new Error('O leitor regional do Pinta passa do leitor negociado pelo serviço.')

type PintaLoad =
  | {
      key: string
      status: 'ready'
      mod: PintaModule
      cloud: CreationsCloud | null
      persistence: PintaPersistenceLike<PintaWorkshopAsset>
    }
  | { key: string; status: 'error' }

/**
 * O resultado da volta da ponte, COM o motivo (o mesmo contrato do Molda; o do Pinta está sendo
 * alargado em lockstep e deixa o `reason` opcional para o host continuar válido nas duas
 * versões). Anotado aqui para o objeto devolvido não ser um literal checado contra o contrato antigo.
 */
type PintaResyncResult =
  | { updated: true }
  | { updated: false; reason?: 'not-linked' | 'failed'; error?: string }

/**
 * Pinta embarcado na comunidade kids (produto vendável). O pacote traz a UI inteira
 * (galeria + editores); este host injeta o tema da comunidade e a PONTE "Usar no
 * Estúdio": salva o desenho na biblioteca pessoal do Studio (IndexedDB do MESMO
 * perfil — aparece em "Meus desenhos" na aba "Imagens" do /estudio).
 */
export function PintaClient({
  viewerId,
  audience = 'kids',
  studioAvailable,
  narrationEnabled = false,
  onCompletionControlChange,
  initialCanvas,
}: {
  viewerId: string | null
  audience?: 'adult' | 'kids'
  studioAvailable: boolean
  narrationEnabled?: boolean
  onCompletionControlChange?: (control: EmbeddedCreationControl | null) => void
  /** O molde de um objeto do Arquipélago: o Pinta abre (ou reabre) a planificação dele. */
  initialCanvas?: PintaInitialCanvas
}) {
  // A conta do Pinta (fila causal e paletas negociadas) vale para todo aluno desde 23/11/2026, sem
  // flag: o escopo vem do servidor (`PintaAccountSession`) e cobre também o Pinta do Arquipélago.
  const account = usePintaAccount(viewerId, audience)
  const localNamespace = creatorStorageNamespace(viewerId, audience)
  const [attempt, setAttempt] = useState(0)
  const loadKey = JSON.stringify([viewerId, audience, attempt, account])
  const [load, setLoad] = useState<PintaLoad | null>(null)
  const current = load?.key === loadKey ? load : null
  const session = current?.status === 'ready' ? current : null
  const mod = session?.mod ?? null
  const cloud = session?.cloud ?? null
  const persistence = session?.persistence ?? null
  const pintaControl = useRef<PintaCompletionControl | null>(null)
  const registrarControle = useCallback((controle: PintaCompletionControl | null) => {
    pintaControl.current = controle
  }, [])
  useEffect(() => {
    if (!onCompletionControlChange) return
    onCompletionControlChange({
      async concluir() {
        if (!pintaControl.current || !cloud)
          throw new Error('O Pinta ainda não está pronto para guardar a criação')
        return concluirPinta(pintaControl.current, persistence?.accountConfirmation ?? cloud)
      },
    })
    return () => onCompletionControlChange(null)
  }, [cloud, onCompletionControlChange, persistence])

  // A DESCIDA está em andamento (o wrapper avisa `sync-start`/`sync-end`): selo "buscando…".
  const [syncingSession, setSyncingSession] =
    useState<PintaPersistenceLike<PintaWorkshopAsset> | null>(null)
  const syncing = persistence !== null && syncingSession === persistence
  const router = useRouter()
  const { setWorkspaceActive } = useFocusMode()
  // O Pinta SEGUE a plataforma (hoje só claro) — sem toggle próprio.
  // ⚠️ O tema escuro não existe nesta plataforma desde 11/09/2026: este valor era uma
  // CONSTANTE calculada por um hook. Trocar por literal é apagar código morto, não mudar
  // comportamento. Se o eixo claro/escuro voltar, ele volta com atributo e hook próprios.
  const theme: 'light' | 'dark' = 'light'
  // "Editar este desenho" vindo do Estúdio: `/pinta?desenho=<id>` numa ABA NOVA.
  // Precisa ser query string — o botão de lá abre com `noopener` (padrão do app),
  // e aí sessionStorage (o caminho do intent do Pensa) não atravessa. Lido no 1º
  // render e limpo da URL logo depois, para um F5 não reabrir o mesmo desenho.
  const searchParams = useSearchParams()
  const taskId = searchParams.get('missao')
  const {
    data: handoff,
    status: handoffStatus,
    error: handoffError,
    retry: retryHandoff,
    update: updateHandoffProgress,
  } = usePensaMissionHandoff(taskId, 'pinta', viewerId)
  // "Continuar no Estúdio" quando a próxima missão é em outra oficina.
  const [initialAssetId] = useState(() => searchParams.get('desenho'))
  useEffect(() => {
    if (initialAssetId && !taskId) router.replace('/pinta')
  }, [initialAssetId, taskId, router])

  useEffect(() => {
    let retired = false
    let cloud: CreationsCloud | null = null
    let persistence: PintaPersistenceLike<PintaWorkshopAsset> | null = null
    async function loadWorkshop() {
      try {
        const m = await import('@sistemazero/pinta')
        if (retired) return
        // Namespace por PERFIL ANTES de montar (mesmo contrato do /estudio):
        // irmãos no mesmo navegador não compartilham a galeria.
        m.setPintaStorageNamespace(localNamespace)
        if (!viewerId) {
          // Sem conta: a oficina regional só neste aparelho, com o teto nativo 8.
          const workshop = await import('@sistemazero/pinta/workshop-reader')
          if (retired) return
          persistence = workshop.createWorkshopPintaPersistence({
            namespace: localNamespace,
            nativeCeiling: 8,
          })
        } else {
          cloud = createCreationsCloud({
            tool: 'pinta',
            maxFormatVersion: PINTA_MAX_READ_FORMAT_VERSION,
            viewerId,
            audience,
            pintaPaletteWriteEnabled: !!account,
            pintaCausalEnabled: !!account,
            pintaCausalReader: PINTA_REGIONS_CLOUD_FORMAT,
          })
          if (cloud.pintaCausal) {
            // A oficina regional: o mesmo IndexedDB do perfil e a mesma fila V4, com o teto
            // nativo 8 (o nativo 9 ainda não está pronto e não é anunciado).
            const workshop = await import('@sistemazero/pinta/workshop-reader')
            if (retired) return
            const regional = workshop.createWorkshopPintaPersistence({
              namespace: localNamespace,
              guardCausalWrites: true,
              nativeCeiling: 8,
            })
            persistence = createCloudMirroredPintaPersistence({
              local: regional,
              cloud,
              viewerId,
              localNamespace,
              isAssetOpen: m.isPintaAssetOpen,
              subscribeAssetOpenState: m.subscribePintaAssetOpenState,
              causal: {
                local: regional.causal,
                reader: PINTA_REGIONS_CLOUD_FORMAT,
                writer: PINTA_REGIONS_CLOUD_FORMAT,
                holdOpen: (id) => m.holdPintaEditorLock(localNamespace, id),
                withClosed: (ids, apply) => m.withClosedPintaEditors(localNamespace, ids, apply),
              },
            })
          } else {
            // Sem a fila causal (suporte em modo leitura, navegador sem gzip/SHA-256, servidor sem
            // storage), a nuvem antiga declararia nuvem 6 para um documento nativo 8: a conta fica
            // no armazenamento de sempre, e um regional deste aparelho vira aviso.
            persistence = createCloudMirroredPintaPersistence({
              local: m.createPintaPersistence({ namespace: localNamespace }),
              cloud,
              viewerId,
              localNamespace,
              isAssetOpen: m.isPintaAssetOpen,
              subscribeAssetOpenState: m.subscribePintaAssetOpenState,
            })
          }
        }
        setLoad({ key: loadKey, status: 'ready', mod: m, cloud, persistence })
      } catch {
        if (retired) return
        setLoad({ key: loadKey, status: 'error' })
      }
    }
    void loadWorkshop()
    return () => {
      retired = true
      persistence?.dispose?.()
      // The old profile's documents and outbox stay in its database for the next session.
      cloud?.dispose({ abort: true })
    }
  }, [audience, loadKey, localNamespace, account, viewerId])

  // O selo acompanha a descida (a galeria já abriu com o local; os desenhos de outro aparelho
  // vão chegando). Ao trocar de persistência (perfil), a antiga desliga o que escutava por fora.
  useEffect(() => {
    if (!persistence) return
    return persistence.subscribe?.((event) => {
      if (event.type === 'sync-start') setSyncingSession(persistence)
      else if (event.type === 'sync-end')
        setSyncingSession((active) => (active === persistence ? null : active))
    })
  }, [persistence])

  // O guia do Pensa recolhido, lembrado por CRIANÇA e valendo para as três oficinas. O painel
  // vive no PACOTE e não conhece `viewerId` nem `localStorage`, então o par desce como DADO —
  // o mesmo idioma do `menu.hidden`/`onToggle` do `hostChrome`.
  const navigate = useCallback((path: string) => router.push(path), [router])
  const outline = usePensaMissionOutline(handoff, viewerId)
  const missionSession = usePensaMissionSession({
    handoff,
    viewerId,
    cloud,
    update: updateHandoffProgress,
    retry: retryHandoff,
    navigate,
    narrationEnabled,
    outline,
  })

  const adapter = useMemo<PintaHostAdapter>(() => {
    const proProjectId = handoff?.studioAuthoring === 'code' ? handoff.studioProjectId : undefined
    const canSendDrawing = studioAvailable || Boolean(proProjectId)
    const slot =
      missionSession?.assetSlots.find(
        (item) =>
          !missionSession.progress.deliveries.some((delivery) => delivery.assetSlotId === item.id),
      ) ?? missionSession?.assetSlots[0]
    const pintaKind =
      slot && ['sprite', 'background', 'tileset', 'tilemap'].includes(slot.kind) ? slot.kind : null
    const initialIntent: PintaInitialIntent | undefined =
      handoff && slot && pintaKind && !handoff.progress.deliveries.length
        ? {
            projectRef: { id: handoff.project.id, name: handoff.project.name, palette: [] },
            artKind:
              pintaKind === 'background' || pintaKind === 'tileset' || pintaKind === 'tilemap'
                ? pintaKind
                : 'sprite',
            style: 'either',
          }
        : undefined
    const taskSession = missionSession
    return {
      theme,
      studioOwned: canSendDrawing,
      // "Abrir o Estúdio" (link no sucesso da ponte).
      onOpenStudio: () =>
        navigatePensaMission(
          proProjectId ? `/estudio/pro/${encodeURIComponent(proProjectId)}` : '/estudio',
          (path) => router.push(path),
        ),
      // A ponte: grava na biblioteca pessoal que o Estúdio lê ("Meus desenhos").
      // O Studio é o dono do formato/limites; aqui só ligamos os dois.
      ...(canSendDrawing
        ? {
            sendToStudio: async (asset) => {
              const namespace = localNamespace
              return savePintaStudioBundle(asset, namespace)
            },
          }
        : {}),
      // A volta da ponte: salvar aqui atualiza o desenho que JÁ está no Estúdio,
      // e de lá ele entra sozinho nos jogos da criança (a sincronia é do Studio).
      // ⚠️ A guarda do `getPersonalAsset` é a regra do recurso: sem ela, TODO
      // rascunho do Pinta cairia na biblioteca do Estúdio sozinho e o "Usar no
      // Estúdio" deixaria de ser a decisão explícita que é hoje.
      resyncToStudio: async (asset): Promise<PintaResyncResult> => {
        const namespace = localNamespace
        const bridge = await import('@sistemazero/studio/personal-assets')
        if (!(await bridge.getPersonalAsset(asset.id, { namespace }))) {
          return { updated: false, reason: 'not-linked' }
        }
        const result = await savePintaStudioBundle(asset, namespace)
        if (!result.ok) {
          // O motivo VIAJA (o pacote mostra o recado): antes a recusa da biblioteca morria num
          // `updated: false` mudo, igual ao "nunca foi levado", e a criança não sabia por quê.
          return {
            updated: false,
            reason: 'failed',
            error: result.error ?? 'Não consegui atualizar este desenho no Estúdio.',
          }
        }
        return { updated: true }
      },
      // "Jogar meu mapa": o Estúdio monta um JOGO pronto a partir do mapa e a
      // criança vai direto pra lá. SÓ com o Estúdio Completo (senão cairia na
      // tela bloqueada com o jogo já feito).
      ...(studioAvailable
        ? {
            sendGameToStudio: async (asset) => {
              if (!asset.tilemap && !asset.scene) return { ok: false }
              const saved = await savePintaStudioBundle(asset, localNamespace)
              if (!saved.ok) return { ok: false, error: saved.error }
              const studio = await import('@sistemazero/studio')
              studio.setStudioStorageNamespace(localNamespace)
              const project = await studio.buildTilemapGameProject({
                id: asset.id,
                libRevision: saved.asset.libRevision,
                name: saved.asset.name,
                dataUrl: asset.dataUrl,
                width: asset.width,
                height: asset.height,
                tilemap: asset.tilemap,
                tilemapFront: asset.tilemapFront,
                scene: asset.scene,
                maps: saved.asset.maps,
              })
              if (!project) return { ok: false }
              router.push('/estudio')
              return { ok: true }
            },
          }
        : {}),
      // Missão de arte do Pensa: abre a criação pré-configurada (1x no mount).
      ...(initialIntent ? { initialIntent } : {}),
      ...(initialCanvas ? { initialCanvas } : {}),
      ...(taskSession ? { taskSession } : {}),
      // Botão "Editar" do Estúdio: abre direto o desenho pedido (1x no mount).
      ...(handoff?.progress.deliveries[0]?.creation.creationId || initialAssetId
        ? {
            initialAssetId:
              handoff?.progress.deliveries[0]?.creation.creationId ?? initialAssetId ?? undefined,
          }
        : {}),
    }
    // ⚠️ `theme` saiu do dep array: virou constante (sem tema escuro nesta plataforma).
  }, [
    studioAvailable,
    router,
    handoff,
    initialAssetId,
    missionSession,
    localNamespace,
    initialCanvas,
  ])

  // O selo "Guardado na sua conta" fica na barra do Pinta. O menu lateral pertence
  // à alça do shell Kids; `hostChrome.menu` é null para não duplicar o botão.
  const { chrome: hostChrome, announcement } = useHostChrome({ cloud, syncing })
  // O "Preciso de ajuda" do aviso de recuperação da galeria: o canal de recados do aluno, ligado
  // só com a conta do Pinta dele (o aviso só existe com a nuvem da conta).
  const help = useMemo(() => pintaRecoveryHelpFor(account), [account])
  const pintaChrome = useMemo(() => ({ ...hostChrome, help }), [hostChrome, help])

  return (
    // ⚠️ A moldura é COMPARTILHADA com o `loading.tsx` da rota (ver
    // `embedded-app-loading.tsx`): sem card, porque o Pinta é uma SEÇÃO da
    // comunidade, e idêntica à da espera anterior — é o que faz a troca ser
    // invisível em vez de um piscar.
    <div className={EMBEDDED_APP_FRAME}>
      {handoffStatus === 'error' ? (
        <div className="grid flex-1 place-items-center p-6 text-center">
          <div className="flex max-w-sm flex-col items-center gap-3">
            <p className="font-semibold">{handoffError}</p>
            <button
              type="button"
              onClick={retryHandoff}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 font-bold text-primary-foreground"
            >
              <RefreshCw className="size-4" /> Tentar de novo
            </button>
          </div>
        </div>
      ) : handoff && !canOpenPensaMission(handoff) ? (
        // A missão é de quem programa (ou de outra artista que já começou): sem o brief e
        // sem concluir, com o caminho de volta ao plano.
        <PensaMissionBlocked
          reason={handoff.availability.message}
          onBackToPlan={() => router.push(`/pensa?plano=${encodeURIComponent(handoff.project.id)}`)}
        />
      ) : current?.status === 'error' ? (
        <div className="grid flex-1 place-items-center p-6 text-center">
          <div className="flex max-w-sm flex-col items-center gap-3">
            <p className="font-semibold">Não consegui carregar o Pinta.</p>
            <button
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 font-bold text-primary-foreground"
            >
              <RefreshCw className="size-4" /> Tentar de novo
            </button>
          </div>
        </div>
      ) : // Espera do brief (deep link do Pensa) e espera do pacote viram UMA só:
      // os dois fetches correm em paralelo, e mostrar dois textos diferentes em
      // sequência fazia `/pinta?missao=` ter quatro telas.
      (handoffStatus === 'loading' && !handoff) || mod === null ? (
        <EmbeddedAppLoadingBody label="Carregando o Pinta…" />
      ) : (
        <>
          {/* A região viva do selo fica no HOST (sempre montada; só offline/erro falam). */}
          <HostChromeAnnouncer text={announcement} />
          {/* O wrapper dá ao `h-full` do Pinta uma altura definida. */}
          <div className="flex min-h-0 flex-1 flex-col">
            <mod.PintaHostChromeProvider value={pintaChrome}>
              <mod.PintaApp
                key={`${loadKey}:${handoff?.mission.id ?? 'free'}`}
                adapter={adapter}
                // Só a missão que conclui pela oficina (Arquipélago) pede o controle; sem ela, a
                // galeria pode abrir o cenário grande pela janela focal.
                {...(onCompletionControlChange
                  ? { onCompletionControlChange: registrarControle }
                  : {})}
                onWorkspaceChange={setWorkspaceActive}
                {...(persistence ? { persistence } : {})}
              />
            </mod.PintaHostChromeProvider>
          </div>
        </>
      )}
    </div>
  )
}
