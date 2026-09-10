'use client'

// O CSS do Molda (tokens + @theme que GERA as utilitárias mld-*) é carregado pelo
// `@import` em `app/globals.css`, DENTRO do pipeline Tailwind — mesmo gotcha do
// Estúdio/Pensa/Pinta: um JS-import aqui só traria os tokens, sem gerar as utilitárias.
import type { MoldaHostAdapter } from '@sistemazero/molda'
import { MOLDA_MAX_READ_VERSION } from '@sistemazero/molda/assets'
import { RefreshCw } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { type CreationsCloud, createCreationsCloud } from '@/lib/creations-cloud'
import {
  createCloudMirroredMoldaPersistence,
  type MoldaPersistenceLike,
} from '@/lib/molda-cloud-persistence'
import { CloudSaveBadge } from './cloud-save-badge'
import { EMBEDDED_APP_FRAME, EmbeddedAppLoadingBody } from './embedded-app-loading'
import { type MoldaGuidePersistence, MoldaTaskGuide } from './molda-task-guide'
import { useMoldaTaskHandoff } from './use-pensa-task-handoff'

// O pacote é client-only (zustand/WebGL/IndexedDB); carregamos DENTRO de um
// effect (igual ao pinta-client) e o server renderiza só o placeholder.
type MoldaModule = typeof import('@sistemazero/molda')

/**
 * Folga entre o autosave e a subida: um modelo pintado chega a alguns MB de JSON
 * (as peles em base64), e cada pincelada dispara o autosave. Entre o Pinta (2 s) e
 * o Estúdio (10 s).
 */
const MOLDA_CLOUD_IDLE_MS = 5_000

/**
 * Molda embarcado na comunidade kids (produto vendável). O pacote traz a UI inteira
 * (galeria + editores); este host injeta o tema da comunidade, o namespace do
 * PERFIL, o atalho para o Estúdio (o Estúdio PUXA as criações pelo "Trazer do
 * Molda"; não há botão de envio aqui) e a nuvem ("Guardado na sua conta": a fila
 * de subida + o armazenamento local embrulhado no espelho; o pacote segue sem backend).
 */
export function MoldaClient({
  viewerId,
  studioAvailable,
}: {
  viewerId: string | null
  studioAvailable: boolean
}) {
  const [mod, setMod] = useState<MoldaModule | null>(null)
  const [loadError, setLoadError] = useState(false)
  // "Guardado na sua conta": a fila da nuvem (uma por montagem, por perfil) e o
  // armazenamento local EMBRULHADO no espelho — o pacote continua sem backend.
  const [cloud, setCloud] = useState<CreationsCloud | null>(null)
  // A DESCIDA está em andamento (o wrapper avisa `sync-start`/`sync-end`): selo "buscando…".
  const [syncing, setSyncing] = useState(false)
  const [persistence, setPersistence] = useState<MoldaPersistenceLike | null>(null)
  const router = useRouter()
  // O Molda SEGUE o tema da comunidade (next-themes) — sem toggle próprio.
  const { resolvedTheme } = useTheme()
  const theme: 'light' | 'dark' = resolvedTheme === 'dark' ? 'dark' : 'light'
  // Deep link `/molda?criacao=<id>` (o Estúdio abre numa aba nova, com `noopener`,
  // então é query string). Lido no 1º render e limpo da URL logo depois.
  const searchParams = useSearchParams()
  const [openRequest, setOpenRequest] = useState(() => ({
    assetId: searchParams.get('criacao'),
    revision: 0,
  }))
  const initialAssetId = openRequest.assetId
  const [taskId] = useState(() => searchParams.get('tarefa'))
  const handoff = useMoldaTaskHandoff(taskId)
  useEffect(() => {
    if (initialAssetId)
      router.replace(taskId ? `/molda?tarefa=${encodeURIComponent(taskId)}` : '/molda')
  }, [initialAssetId, router, taskId])

  const loadMolda = useCallback(
    async (isCurrent?: () => boolean) => {
      setMod(null)
      setLoadError(false)
      setCloud(null)
      setPersistence(null)
      setSyncing(false)
      try {
        const m = await import('@sistemazero/molda')
        if (isCurrent && !isCurrent()) return
        // Namespace por PERFIL ANTES de montar (mesmo contrato do /estudio e do
        // /pinta): irmãos no mesmo navegador não compartilham a galeria.
        m.setMoldaStorageNamespace(viewerId ?? '')
        const local = m.createMoldaPersistence({ namespace: viewerId ?? '' })
        // Só com PERFIL: sem sessão de perfil não há dono na nuvem, e o Molda abre
        // como sempre (só local).
        if (viewerId) {
          // `viewerId` vai em toda chamada (`x-sz-viewer`): o BFF recusa se a sessão já
          // trocou de perfil (irmão que entrou no meio de um upload em voo).
          const nextCloud = createCreationsCloud({
            tool: 'molda',
            maxFormatVersion: MOLDA_MAX_READ_VERSION,
            viewerId,
            idleMs: MOLDA_CLOUD_IDLE_MS,
          })
          // O desligar da fila ANTERIOR é o cleanup do efeito `[cloud]` (nunca dentro do
          // updater: efeito colateral em updater roda duas vezes no StrictMode).
          setCloud(nextCloud)
          setPersistence(
            createCloudMirroredMoldaPersistence({
              local,
              // A geração seguinte entra no MESMO espelho. Sem ela, uma criação promovida
              // sairia do inventário v1 e a reconciliação a leria como ausente.
              sceneSource: m.createMoldaSceneCloudSource(),
              cloud: nextCloud,
              viewerId,
              // A descida não grava por baixo de uma criação ABERTA no editor — e, ao fechar
              // uma que ficou pulada, traz a versão da nuvem na hora.
              isAssetOpen: m.isMoldaAssetOpen,
              subscribeAssetOpenState: m.subscribeMoldaAssetOpenState,
            }),
          )
        } else {
          setPersistence(local)
        }
        setMod(m)
      } catch {
        if (isCurrent && !isCurrent()) return
        setLoadError(true)
      }
    },
    [viewerId],
  )

  useEffect(() => {
    let active = true
    void loadMolda(() => active)
    return () => {
      active = false
    }
  }, [loadMolda])

  // Ao sair da página (ou trocar de fila), o que estiver pendente sobe INTEIRO e só
  // então a fila fecha: `dispose()` antes do fim do `flush` deixava só um item subir.
  // A troca de perfil no meio é barrada pelo BFF (`x-sz-viewer` ≠ sessão → 409).
  useEffect(() => {
    if (!cloud) return
    return () => {
      // Com teto: sem internet a fila espera o backoff e a antiga nunca fecharia (idas e
      // vindas na SPA acumulavam filas vivas). O que ficar sobe na próxima carga (reconcilia).
      void cloud.flush({ timeoutMs: 5000 }).finally(() => cloud.dispose())
    }
  }, [cloud])

  // O selo acompanha a descida (a galeria já abriu com o local; as criações de outro
  // aparelho vão chegando). Ao trocar de persistência (perfil), a antiga desliga o que
  // escutava por fora.
  useEffect(() => {
    if (!persistence) return
    const unsubscribe = persistence.subscribe?.((event) => {
      if (event.type === 'sync-start') setSyncing(true)
      else if (event.type === 'sync-end') setSyncing(false)
    })
    return () => {
      unsubscribe?.()
      persistence.dispose?.()
    }
  }, [persistence])

  const adapter = useMemo<MoldaHostAdapter>(
    () => ({
      theme,
      studioOwned: studioAvailable,
      onOpenStudio: () => router.push('/estudio'),
      ...(initialAssetId ? { initialAssetId } : {}),
      // A volta da ponte: salvar aqui atualiza a criação que JÁ está no Estúdio, e de lá
      // ela entra sozinha nos jogos (a sincronia é do Studio). ⚠️ A guarda do
      // `getPersonalAsset` é a regra do recurso (igual ao Pinta): sem ela, TODA criação
      // cairia na biblioteca do Estúdio sozinha e o "Trazer do Molda" deixaria de ser a
      // decisão explícita que é hoje.
      resyncToStudio: async (asset) => {
        const namespace = viewerId ?? ''
        const bridge = await import('@sistemazero/studio/personal-assets')
        if (!(await bridge.getPersonalAsset(asset.id, { namespace }))) {
          return { updated: false, reason: 'not-linked' }
        }
        const result = await bridge.savePersonalAsset(
          {
            id: asset.id,
            name: asset.name,
            kind: asset.kind,
            origin: 'molda',
            dataUrl: asset.dataUrl,
            originalFileName: asset.originalFileName,
            ...(asset.width !== undefined ? { width: asset.width } : {}),
            ...(asset.height !== undefined ? { height: asset.height } : {}),
          },
          { namespace },
        )
        if (!result.ok) {
          return {
            updated: false,
            reason: 'failed',
            error: result.error ?? 'Não consegui atualizar esta criação no Estúdio.',
          }
        }
        return { updated: true }
      },
    }),
    [theme, studioAvailable, router, initialAssetId, viewerId],
  )

  return (
    // ⚠️ A moldura é COMPARTILHADA com o `loading.tsx` da rota (ver
    // `embedded-app-loading.tsx`): sem card, porque o Molda é uma SEÇÃO da
    // comunidade, e idêntica à da espera anterior — é o que faz a troca ser
    // invisível em vez de um piscar.
    <div className={EMBEDDED_APP_FRAME}>
      {loadError ? (
        <div className="grid flex-1 place-items-center p-6 text-center">
          <div className="flex max-w-sm flex-col items-center gap-3">
            <p className="font-semibold">Não consegui carregar o Molda.</p>
            <button
              type="button"
              onClick={() => void loadMolda()}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 font-bold text-primary-foreground"
            >
              <RefreshCw className="size-4" /> Tentar de novo
            </button>
          </div>
        </div>
      ) : mod === null ? (
        <EmbeddedAppLoadingBody label="Carregando o Molda…" />
      ) : taskId && handoff.status !== 'success' ? (
        <div className="grid flex-1 place-content-center gap-4 p-6">
          <p role="status">{handoff.error ?? 'Buscando o guia do Pensa…'}</p>
          {handoff.status === 'error' ? (
            <button
              type="button"
              onClick={handoff.retry}
              className="min-h-11 rounded-xl border px-4 font-bold"
            >
              Tentar novamente
            </button>
          ) : null}
        </div>
      ) : handoff.data && !handoff.data.capability.owned ? (
        <p role="status" className="p-6">
          {handoff.data.capability.blockedReason}
        </p>
      ) : (
        <>
          {handoff.data && persistence ? (
            <MoldaTaskGuide
              key={`${viewerId}:${handoff.data.task.id}:${handoff.data.task.revision}`}
              profileId={viewerId}
              handoff={handoff.data}
              persistence={persistence}
              onProgress={handoff.updateProgress}
              onOpenAsset={(assetId) =>
                setOpenRequest((current) => ({ assetId, revision: current.revision + 1 }))
              }
              hasOpenCreation={async () => {
                const gallery: MoldaGuidePersistence = persistence
                const all = gallery.listSummaries
                  ? await gallery.listSummaries()
                  : await gallery.loadAll()
                return all.some((asset) => mod.isMoldaAssetOpen(asset.id))
              }}
              onReturn={() =>
                router.push(`/pensa?plano=${encodeURIComponent(handoff.data.project.id)}`)
              }
            />
          ) : null}
          <div className="flex justify-end">
            <CloudSaveBadge cloud={cloud} syncing={syncing} />
          </div>
          {/* O selo é irmão do app: o wrapper dá ao `h-full` do Molda uma altura definida. */}
          <div className="flex min-h-0 flex-1 flex-col">
            <mod.MoldaApp
              key={openRequest.revision}
              adapter={adapter}
              {...(persistence ? { persistence } : {})}
            />
          </div>
        </>
      )}
    </div>
  )
}
