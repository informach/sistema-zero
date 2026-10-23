/**
 * O botão de voltar para a Comunidade dos Criadores em Compras (adulto) e na Conta dos pais (Kids).
 *
 * ⚠️ A view pública de "Minhas assinaturas" do payments (`MySubscriptionView`) não traz SKU, slug da
 * oferta, produto nem público: só a descrição, que é o nome do produto gravado no checkout. Por isso
 * a régua lê o NOME. Hoje a oferta principal Kids cobra como "Comunidade dos Criadores" e a adulta
 * leva "(adultos)" no nome ("Comunidade dos Criadores (adultos)"; a principal adulta passa a usar
 * esse nome no funil). O adulto EXIGE "adult" no nome; o Kids o EXCLUI. Uma assinatura adulta antiga
 * com o nome sem "(adultos)" não ganha botão em nenhum dos dois: melhor faltar o atalho que levar a
 * pessoa à oferta do outro público.
 */

/** Uma assinatura de "Minhas assinaturas", só com o que a régua do retorno lê. */
export interface ComebackSubscriptionLike {
  id: string
  status: string
  description: string | null
  createdAt: string
}

const COMMUNITY_NAME = /^\s*Comunidade dos Criadores\b/i
const ADULT_MARK = /adult/i

/** A Comunidade dos Criadores ADULTA ("Comunidade dos Criadores (adultos)"). */
export function isAdultComunidadeSubscription(sub: Pick<ComebackSubscriptionLike, 'description'>) {
  const name = sub.description ?? ''
  return COMMUNITY_NAME.test(name) && ADULT_MARK.test(name)
}

/** A Comunidade dos Criadores KIDS: o nome da Comunidade sem a marca "(adultos)". */
export function isKidsComunidadeSubscription(sub: Pick<ComebackSubscriptionLike, 'description'>) {
  const name = sub.description ?? ''
  return COMMUNITY_NAME.test(name) && !ADULT_MARK.test(name)
}

/**
 * Qual assinatura ganha o botão de voltar: a mais recente do produto, SÓ se ela estiver Encerrada
 * (`EXPIRED`). Cancelada (`CANCELED`) ainda dá acesso até o fim do período pago mais a carência, e
 * o botão ali faria a família pagar duas vezes; por isso a cancelada mais recente também segura o
 * botão de uma encerrada mais antiga. Com outra ATIVA do mesmo produto, nenhuma. Pendente
 * (`PENDING`, cobrança que nunca confirmou) não conta: não segura o botão para sempre.
 */
export function comebackSubscriptionId(
  subs: readonly ComebackSubscriptionLike[],
  isProduct: (sub: ComebackSubscriptionLike) => boolean,
): string | null {
  const product = subs.filter(isProduct)
  if (product.some((sub) => sub.status === 'ACTIVE')) return null
  const latest = product
    .filter((sub) => sub.status === 'EXPIRED' || sub.status === 'CANCELED')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  return latest?.status === 'EXPIRED' ? latest.id : null
}
