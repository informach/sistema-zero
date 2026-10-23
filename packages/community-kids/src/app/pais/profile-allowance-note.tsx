'use client'

import { Button } from '@sistemazero/ui/button'
import { RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { comunidadeContinuarUrl } from '@/lib/links'
import { comunidadeRaisesLimit, type ProfileAllowance } from '@/lib/profile-allowance'
import { PARENT_SUPPORT_HREF } from './parent-routes'

/** O caminho para a Comunidade, com a origem `pais-limite-perfis` no UTM. */
const OFFER_HREF = comunidadeContinuarUrl('pais-limite-perfis')

const OFFER_LINK =
  'font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2'

/**
 * O limite de perfis do plano, dito com clareza na área dos pais (a trava real é o servidor).
 * Volta o que a grade antiga mostrava: "Perfis ilimitados", a chamada para ampliar o acesso no
 * limite e o "Tentar de novo" quando a consulta falhou. A chamada só aparece quando a Comunidade
 * de fato aumenta o limite (`comunidadeRaisesLimit`); no teto dela, o caminho é o Atendimento.
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
          comunidadeRaisesLimit(max) ? (
            <>
              Você usou todos os <strong>{max}</strong> {word} do seu plano. Para liberar mais,{' '}
              <a href={OFFER_HREF} target="_blank" rel="noopener noreferrer" className={OFFER_LINK}>
                amplie o seu acesso
              </a>
              .
            </>
          ) : (
            // Quem já tem o teto da Comunidade (o assinante) não ganha vaga assinando de novo:
            // mandar para a oferta seria vender o que a família já tem.
            <>
              Você usou todos os <strong>{max}</strong> {word} do seu plano. Se a família precisa de
              mais,{' '}
              <Link href={PARENT_SUPPORT_HREF} className={OFFER_LINK}>
                fale com a gente no Atendimento
              </Link>
              .
            </>
          )
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
        <a href={OFFER_HREF} target="_blank" rel="noopener noreferrer" className={OFFER_LINK}>
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
