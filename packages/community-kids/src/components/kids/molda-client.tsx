'use client'

// O CSS do Molda (tokens + @theme que GERA as utilitárias mld-*) é carregado pelo
// `@import` em `app/globals.css`, DENTRO do pipeline Tailwind — mesmo gotcha do
// Estúdio/Pensa/Pinta: um JS-import aqui só traria os tokens, sem gerar as utilitárias.
import type { MoldaHostAdapter } from '@sistemazero/molda'
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
  const [initialAssetId] = useState(() => searchParams.get('criacao'))
  useEffect(() => {
    if (initialAssetId) router.replace('/molda')
  }, [initialAssetId, router])

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
            viewerId,
            idleMs: MOLDA_CLOUD_IDLE_MS,
          })
          // O desligar da fila ANTERIOR é o cleanup do efeito `[cloud]` (nunca dentro do
          // updater: efeito colateral em updater roda duas vezes no StrictMode).
          setCloud(nextCloud)
          setPersistence(
            createCloudMirroredMoldaPersistence({
              local,
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
    }),
    [theme, studioAvailable, router, initialAssetId],
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
      ) : (
        <>
          <div className="flex justify-end">
            <CloudSaveBadge cloud={cloud} syncing={syncing} />
          </div>
          {/* O selo é irmão do app: o wrapper dá ao `h-full` do Molda uma altura definida. */}
          <div className="flex min-h-0 flex-1 flex-col">
            <mod.MoldaApp adapter={adapter} {...(persistence ? { persistence } : {})} />
          </div>
        </>
      )}
    </div>
  )
}
