'use client'

import { Button } from '@sistemazero/ui/button'
import { RefreshCw } from 'lucide-react'
import { COMUNIDADE_OFERTA_URL } from '@/lib/links'
import type { ProfileAllowance } from '@/lib/profile-allowance'

const OFFER_LINK =
  'font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2'

/**
 * O limite de perfis do plano, dito com clareza na área dos pais (a trava real é o servidor).
 * Volta o que a grade antiga mostrava: "Perfis ilimitados", a chamada para ampliar o acesso no
 * limite e o "Tentar de novo" quando a consulta falhou.
 */
export function ProfileAllowanceNote({
  allowance,
  profilesCount,
}: {
  allowance: ProfileAllowance
  profilesCount: number
}) {
  if (allowance.kind === 'unlimited')
    return <p className="mt-3 text-sm text-muted-foreground">Perfis ilimitados neste acesso.</p>
  if (allowance.kind === 'limited') {
    const max = allowance.maxProfiles
    const word = max === 1 ? 'perfil' : 'perfis'
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        {profilesCount >= max ? (
          <>
            Você usou todos os <strong>{max}</strong> {word} do seu plano. Para liberar mais,{' '}
            <a
              href={COMUNIDADE_OFERTA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={OFFER_LINK}
            >
              amplie o seu acesso
            </a>
            .
          </>
        ) : (
          <>
            {profilesCount} de {max} {word} do seu plano.
          </>
        )}
      </p>
    )
  }
  if (allowance.kind === 'none')
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        Seu acesso atual não inclui novos perfis.{' '}
        <a
          href={COMUNIDADE_OFERTA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={OFFER_LINK}
        >
          Conheça a Comunidade dos Criadores
        </a>
        .
      </p>
    )
  return (
    <div className="mt-3 flex flex-col items-start gap-2 text-sm text-muted-foreground">
      <p>
        Não foi possível verificar novas vagas agora. Tente de novo antes de adicionar outra
        criança.
      </p>
      <Button
        variant="ghost"
        className="min-h-11 rounded-full"
        onClick={() => window.location.reload()}
      >
        <RefreshCw className="size-4" aria-hidden="true" /> Tentar de novo
      </Button>
    </div>
  )
}
