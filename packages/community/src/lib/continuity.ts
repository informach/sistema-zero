import { comunidadeAdultoContinuarUrl } from '@sistemazero/member-shell/lib/adult-links'
import {
  type ComebackSubscriptionLike,
  comebackSubscriptionId as comebackSubscriptionIdFor,
  isAdultComunidadeSubscription,
} from '@sistemazero/member-shell/lib/subscription-comeback'

/**
 * Qual assinatura de Compras ganha o "Voltar para a Comunidade": a mais recente da Comunidade
 * ADULTA, só se estiver Encerrada (a Cancelada ainda tem acesso até o fim do período pago). Com outra
 * adulta ativa, nenhuma. ⚠️ A view pública do payments não traz SKU nem slug da oferta, só o nome do
 * produto: a régua (`member-shell/lib/subscription-comeback`) exige "(adultos)" no nome, para uma
 * assinatura Kids da mesma conta ("Comunidade dos Criadores") não levar à oferta adulta.
 */
export function comebackSubscriptionId(subs: readonly ComebackSubscriptionLike[]): string | null {
  return comebackSubscriptionIdFor(subs, isAdultComunidadeSubscription)
}

/** O botão de um curso bloqueado: para onde leva, o rótulo e o aviso da outra aba. */
export interface LockedCourseLink {
  href: string
  label: string
  note: string
}

/**
 * Para onde vai o botão de um curso bloqueado: a página de vendas do próprio curso ("Conhecer o
 * curso") e, sem ela, a oferta de continuidade da Comunidade ("Conhecer a Comunidade"; não o
 * `FUNNEL_URL`, que é de outro funil). Sempre há destino: o rótulo diz qual página abre.
 */
export function lockedCourseLink(salesPageUrl: string | null | undefined): LockedCourseLink {
  if (salesPageUrl)
    return {
      href: salesPageUrl,
      label: 'Conhecer o curso',
      note: 'Abre a página do curso em outra aba.',
    }
  return {
    href: comunidadeAdultoContinuarUrl('curso-bloqueado'),
    label: 'Conhecer a Comunidade',
    note: 'Abre a página da Comunidade em outra aba.',
  }
}
