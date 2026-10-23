'use client'
import { ArrowRight, Blocks } from 'lucide-react'
import { useEffect, useState } from 'react'
import { liveRequest } from '../../lib/live/client'
import { friendlyWhen } from '../../lib/live/schedule'

type SavedCreation = {
  id: string
  sessionId: string
  title: string
  revision: number
  updatedAt: string
  canEdit: boolean
}
/**
 * Os projetos que a criança fez numa oficina, em Criar. Só aparece para quem TEM projeto de
 * oficina: carregando, sem nenhum ou com erro, não ocupa espaço (antes toda criança via o título e
 * um "Buscando…" piscando, como uma propaganda das oficinas; decisão da dona, 14/10/2026).
 */
export function LiveCreationList({ membershipHref }: { membershipHref: string }) {
  const [creations, setCreations] = useState<SavedCreation[] | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    liveRequest<{ workspaces: SavedCreation[] }>(
      '/api/live/workspaces',
      undefined,
      'GET',
      controller.signal,
    )
      .then((data) => setCreations(data.workspaces))
      .catch(() => {
        /* Sem a lista agora: a parte simplesmente não aparece nesta visita. */
      })
    return () => controller.abort()
  }, [])
  if (!creations?.length) return null
  return (
    <section className="mt-7 space-y-4" aria-labelledby="live-saved-creations">
      <h2 id="live-saved-creations" className="sz-display flex items-center gap-3 text-2xl">
        <Blocks className="size-6 text-primary" aria-hidden />
        Criações das oficinas ao vivo
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {creations.map((creation) => (
          <li key={creation.id} className="kids-carta space-y-3 p-5">
            <span className="inline-flex rounded-full bg-[var(--sz-kids-menta-bg,#dcf0e4)] px-3 py-1 font-extrabold text-xs">
              {creation.canEdit ? 'Guardado na sua conta' : 'Só para ver'}
            </span>
            <h3 className="sz-display text-xl">{creation.title}</h3>
            <p className="text-muted-foreground text-sm">
              Você mexeu {lowerFirst(friendlyWhen(creation.updatedAt))}
            </p>
            {creation.canEdit ? (
              // Navegação COMPLETA (`<a>`, não `<Link>`): a página do projeto libera o quadro
              // isolado do jogo pelos cabeçalhos DELA, e a navegação do Next manteria os da
              // página atual, com o jogo bloqueado.
              <a
                href={`/criar/oficinas/${creation.id}`}
                className="inline-flex min-h-11 items-center gap-2 font-bold text-primary"
              >
                Continuar meu projeto
                <ArrowRight className="size-4" aria-hidden />
              </a>
            ) : (
              <>
                <p className="text-sm">
                  Seu jogo está guardado do jeitinho que você deixou. Para continuar criando nele,
                  peça para um adulto da sua casa conhecer a Comunidade dos Criadores.
                </p>
                <div className="flex flex-wrap gap-x-5 gap-y-1">
                  {/* O projeto vencido abre só para ver e baixar uma cópia (o servidor decide). */}
                  <a
                    href={`/criar/oficinas/${creation.id}`}
                    className="inline-flex min-h-11 items-center gap-2 font-bold text-primary"
                  >
                    Ver e baixar uma cópia
                  </a>
                  <a
                    href={membershipHref}
                    className="inline-flex min-h-11 items-center gap-2 font-bold text-primary underline"
                  >
                    Conhecer a Comunidade
                  </a>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** "Hoje, às 16h31" vira "hoje, às 16h31" no meio da frase. */
function lowerFirst(text: string) {
  return text.charAt(0).toLowerCase() + text.slice(1)
}
