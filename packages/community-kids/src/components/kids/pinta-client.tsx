'use client'

// O CSS do Pinta (tokens + @theme que GERA as utilitárias pin-*) é carregado pelo
// `@import` em `app/globals.css`, DENTRO do pipeline Tailwind — mesmo gotcha do
// Estúdio/Pensa: um JS-import aqui só traria os tokens, sem gerar as utilitárias.
import type { PintaHostAdapter, PintaInitialIntent } from '@sistemazero/pinta'
import { RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { clearPintaIntent, readPintaIntent } from './pinta-intent'

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
  studioOwned,
}: {
  viewerId: string | null
  studioOwned: boolean
}) {
  const [mod, setMod] = useState<PintaModule | null>(null)
  const [loadError, setLoadError] = useState(false)
  const router = useRouter()
  // O Pinta SEGUE o tema da comunidade (next-themes) — sem toggle próprio.
  const { resolvedTheme } = useTheme()
  const theme: 'light' | 'dark' = resolvedTheme === 'dark' ? 'dark' : 'light'
  // Intent da missão de arte do Pensa: leitura SÍNCRONA no 1º render (o adapter
  // precisa dele quando o PintaApp montar) + limpeza 1x no mount — recarregar
  // /pinta depois não reabre o "Criar novo" pré-configurado.
  const [initialIntent] = useState<PintaInitialIntent | null>(readPintaIntent)
  useEffect(() => {
    clearPintaIntent()
  }, [])

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

  const adapter = useMemo<PintaHostAdapter>(
    () => ({
      theme,
      studioOwned,
      // "Abrir o Estúdio" (link no sucesso da ponte).
      onOpenStudio: () => router.push('/estudio'),
      // A ponte: grava na biblioteca pessoal que o Estúdio lê ("Meus desenhos").
      // O Studio é o dono do formato/limites; aqui só ligamos os dois.
      sendToStudio: async (asset) => {
        const bridge = await import('@sistemazero/studio/personal-assets')
        bridge.setPersonalAssetsNamespace(viewerId ?? '')
        return bridge.savePersonalAsset(asset)
      },
      // Missão de arte do Pensa: abre a criação pré-configurada (1x no mount).
      ...(initialIntent ? { initialIntent } : {}),
    }),
    [theme, studioOwned, viewerId, router, initialIntent],
  )

  return (
    <div className="flex min-h-[34rem] w-full flex-1 flex-col overflow-hidden rounded-2xl border-2 border-border bg-card">
      {loadError ? (
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
      ) : mod === null ? (
        <div className="grid flex-1 place-items-center text-muted-foreground text-sm">
          Carregando o Pinta…
        </div>
      ) : (
        <mod.PintaApp adapter={adapter} />
      )}
    </div>
  )
}
