'use client'

// O CSS do Pinta (tokens + @theme que GERA as utilitárias pin-*) é carregado pelo
// `@import` em `app/globals.css`, DENTRO do pipeline Tailwind — mesmo gotcha do
// Estúdio/Pensa: um JS-import aqui só traria os tokens, sem gerar as utilitárias.
import type { PintaHostAdapter, PintaInitialIntent, PintaTaskSession } from '@sistemazero/pinta'
import { RefreshCw } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { type CreationsCloud, createCreationsCloud } from '@/lib/creations-cloud'
import {
  createCloudMirroredPintaPersistence,
  type PintaPersistenceLike,
} from '@/lib/pinta-cloud-persistence'
import { CloudSaveBadge } from './cloud-save-badge'
import { EMBEDDED_APP_FRAME, EmbeddedAppLoadingBody } from './embedded-app-loading'
import { usePintaTaskHandoff } from './use-pensa-task-handoff'

// O pacote é client-only (zustand/canvas/IndexedDB); carregamos DENTRO de um
// effect (igual ao pensa-client) e o server renderiza só o placeholder.
type PintaModule = typeof import('@sistemazero/pinta')

/**
 * Pinta embarcado na comunidade kids (produto vendável). O pacote traz a UI inteira
 * (galeria + editores); este host injeta o tema da comunidade e a PONTE "Usar no
 * Estúdio": salva o desenho na biblioteca pessoal do Studio (IndexedDB do MESMO
 * perfil — aparece em "Meus desenhos" no painel de Imagens do /estudio).
 */
export function PintaClient({
  viewerId,
  studioAvailable,
}: {
  viewerId: string | null
  studioAvailable: boolean
}) {
  const [mod, setMod] = useState<PintaModule | null>(null)
  const [loadError, setLoadError] = useState(false)
  // "Guardado na sua conta": a fila da nuvem (uma por montagem, por perfil) e o
  // armazenamento local EMBRULHADO no espelho — o pacote continua sem backend.
  const [cloud, setCloud] = useState<CreationsCloud | null>(null)
  // A DESCIDA está em andamento (o wrapper avisa `sync-start`/`sync-end`): selo "buscando…".
  const [syncing, setSyncing] = useState(false)
  const [persistence, setPersistence] = useState<PintaPersistenceLike | null>(null)
  const router = useRouter()
  // O Pinta SEGUE o tema da comunidade (next-themes) — sem toggle próprio.
  const { resolvedTheme } = useTheme()
  const theme: 'light' | 'dark' = resolvedTheme === 'dark' ? 'dark' : 'light'
  // "Editar este desenho" vindo do Estúdio: `/pinta?desenho=<id>` numa ABA NOVA.
  // Precisa ser query string — o botão de lá abre com `noopener` (padrão do app),
  // e aí sessionStorage (o caminho do intent do Pensa) não atravessa. Lido no 1º
  // render e limpo da URL logo depois, para um F5 não reabrir o mesmo desenho.
  const searchParams = useSearchParams()
  const taskId = searchParams.get('tarefa')
  const {
    data: handoff,
    status: handoffStatus,
    error: handoffError,
    retry: retryHandoff,
    updateProgress: updateHandoffProgress,
  } = usePintaTaskHandoff(taskId)
  const [initialAssetId] = useState(() => searchParams.get('desenho'))
  useEffect(() => {
    if (initialAssetId && !taskId) router.replace('/pinta')
  }, [initialAssetId, taskId, router])

  const loadPinta = useCallback(
    async (isCurrent?: () => boolean) => {
      setMod(null)
      setLoadError(false)
      try {
        const m = await import('@sistemazero/pinta')
        // Namespace por PERFIL ANTES de montar (mesmo contrato do /estudio):
        // irmãos no mesmo navegador não compartilham a galeria.
        m.setPintaStorageNamespace(viewerId ?? '')
        if (isCurrent && !isCurrent()) return
        // Só com PERFIL: sem sessão de perfil não há dono na nuvem, e o Pinta abre
        // como sempre (só local).
        if (viewerId) {
          // `viewerId` vai em toda chamada (`x-sz-viewer`): o BFF recusa se a sessão já
          // trocou de perfil (irmão que entrou no meio de um upload em voo).
          const nextCloud = createCreationsCloud({ tool: 'pinta', viewerId })
          // O desligar da fila ANTERIOR é o cleanup do efeito `[cloud]` (nunca dentro do
          // updater: efeito colateral em updater roda duas vezes no StrictMode).
          setCloud(nextCloud)
          setPersistence(
            createCloudMirroredPintaPersistence({
              local: m.createPintaPersistence({ namespace: viewerId }),
              cloud: nextCloud,
              viewerId,
              // A descida não grava por baixo de um desenho ABERTO no editor — e, ao fechar um
              // que ficou pulado, traz a versão da nuvem na hora.
              isAssetOpen: m.isPintaAssetOpen,
              subscribeAssetOpenState: m.subscribePintaAssetOpenState,
            }),
          )
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
    void loadPinta(() => active)
    return () => {
      active = false
    }
  }, [loadPinta])

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

  // O selo acompanha a descida (a galeria já abriu com o local; os desenhos de outro aparelho
  // vão chegando). Ao trocar de persistência (perfil), a antiga desliga o que escutava por fora.
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

  const adapter = useMemo<PintaHostAdapter>(() => {
    const initialIntent: PintaInitialIntent | undefined =
      handoff && !handoff.task.progress.outputRef
        ? {
            projectRef: {
              id: handoff.project.id,
              name: handoff.project.name,
              palette: handoff.task.context.palette.map((item) => item.color),
            },
            artKind: handoff.task.context.artKind,
            style: handoff.task.context.style,
          }
        : undefined
    const taskSession: PintaTaskSession | undefined = handoff
      ? {
          taskId: handoff.task.id,
          project: handoff.project,
          cycle: handoff.cycle,
          title: handoff.task.title,
          summary: handoff.task.summary,
          brief: handoff.task.context,
          guide: handoff.task.guide,
          ...(handoff.task.context.requiresStudioUse && !studioAvailable
            ? { studioUseBlockedReason: 'O Estúdio ainda não foi liberado pela sua carreira.' }
            : {}),
          progress: handoff.task.progress,
          onProgress: async (input) => {
            const response = await fetch(
              `/api/pensa/tasks/${encodeURIComponent(handoff.task.id)}/progress`,
              {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                  ...input,
                  expectedUpdatedAt: handoff.task.progress.updatedAt,
                }),
              },
            )
            const body = (await response.json().catch(() => null)) as {
              task?: { progress: PintaTaskSession['progress'] }
              error?: { message?: string }
            } | null
            if (response.status === 409) {
              retryHandoff()
              throw new Error('A tarefa mudou em outro lugar. Recarreguei o brief para você.')
            }
            if (!response.ok || !body?.task)
              throw new Error(body?.error?.message ?? 'Não consegui sincronizar a tarefa.')
            updateHandoffProgress(body.task.progress)
          },
        }
      : undefined
    return {
      theme,
      studioOwned: studioAvailable,
      // "Abrir o Estúdio" (link no sucesso da ponte).
      onOpenStudio: () => router.push('/estudio'),
      // A ponte: grava na biblioteca pessoal que o Estúdio lê ("Meus desenhos").
      // O Studio é o dono do formato/limites; aqui só ligamos os dois.
      ...(studioAvailable
        ? {
            sendToStudio: async (asset) => {
              const bridge = await import('@sistemazero/studio/personal-assets')
              bridge.setPersonalAssetsNamespace(viewerId ?? '')
              return bridge.savePersonalAsset(asset)
            },
          }
        : {}),
      // A volta da ponte: salvar aqui atualiza o desenho que JÁ está no Estúdio,
      // e de lá ele entra sozinho nos jogos da criança (a sincronia é do Studio).
      // ⚠️ A guarda do `getPersonalAsset` é a regra do recurso: sem ela, TODO
      // rascunho do Pinta cairia na biblioteca do Estúdio sozinho e o "Usar no
      // Estúdio" deixaria de ser a decisão explícita que é hoje.
      resyncToStudio: async (asset) => {
        const bridge = await import('@sistemazero/studio/personal-assets')
        bridge.setPersonalAssetsNamespace(viewerId ?? '')
        if (!(await bridge.getPersonalAsset(asset.id))) return { updated: false }
        const result = await bridge.savePersonalAsset(asset)
        return { updated: result.ok }
      },
      // "Jogar meu mapa": o Estúdio monta um JOGO pronto a partir do mapa e a
      // criança vai direto pra lá. SÓ com o Estúdio Completo (senão cairia na
      // tela bloqueada com o jogo já feito).
      ...(studioAvailable
        ? {
            sendGameToStudio: async (asset) => {
              if (!asset.tilemap) return { ok: false }
              const studio = await import('@sistemazero/studio')
              studio.setStudioStorageNamespace(viewerId ?? '')
              const project = await studio.buildTilemapGameProject({
                name: asset.name,
                dataUrl: asset.dataUrl,
                width: asset.width,
                height: asset.height,
                tilemap: asset.tilemap,
                tilemapFront: asset.tilemapFront,
              })
              if (!project) return { ok: false }
              router.push('/estudio')
              return { ok: true }
            },
          }
        : {}),
      // Missão de arte do Pensa: abre a criação pré-configurada (1x no mount).
      ...(initialIntent ? { initialIntent } : {}),
      ...(taskSession ? { taskSession } : {}),
      // Botão "Editar" do Estúdio: abre direto o desenho pedido (1x no mount).
      ...(handoff?.task.progress.outputRef?.assetId || initialAssetId
        ? {
            initialAssetId:
              handoff?.task.progress.outputRef?.assetId ?? initialAssetId ?? undefined,
          }
        : {}),
    }
  }, [
    theme,
    studioAvailable,
    viewerId,
    router,
    handoff,
    updateHandoffProgress,
    retryHandoff,
    initialAssetId,
  ])

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
      ) : handoff && !handoff.capability.owned ? (
        <div className="grid flex-1 place-items-center p-6 text-center">
          <p className="max-w-sm font-semibold">{handoff.capability.blockedReason}</p>
        </div>
      ) : loadError ? (
        <div className="grid flex-1 place-items-center p-6 text-center">
          <div className="flex max-w-sm flex-col items-center gap-3">
            <p className="font-semibold">Não consegui carregar o Pinta.</p>
            <button
              type="button"
              onClick={() => void loadPinta()}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 font-bold text-primary-foreground"
            >
              <RefreshCw className="size-4" /> Tentar de novo
            </button>
          </div>
        </div>
      ) : // Espera do brief (deep link do Pensa) e espera do pacote viram UMA só:
      // os dois fetches correm em paralelo, e mostrar dois textos diferentes em
      // sequência fazia `/pinta?tarefa=` ter quatro telas.
      handoffStatus === 'loading' || mod === null ? (
        <EmbeddedAppLoadingBody label="Carregando o Pinta…" />
      ) : (
        <>
          <div className="flex justify-end">
            <CloudSaveBadge cloud={cloud} syncing={syncing} />
          </div>
          {/* O selo é irmão do app: o wrapper dá ao `h-full` do Pinta uma altura definida. */}
          <div className="flex min-h-0 flex-1 flex-col">
            <mod.PintaApp adapter={adapter} {...(persistence ? { persistence } : {})} />
          </div>
        </>
      )}
    </div>
  )
}
