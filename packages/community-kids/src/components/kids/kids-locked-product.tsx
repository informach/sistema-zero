import type { JourneyLevelSlug } from '@sistemazero/core/journey'
import { Lock, Sparkles } from 'lucide-react'
import { levelInfo } from '@/lib/level-info'
import { comunidadeContinuarUrl } from '@/lib/links'
import { KidsClosingCard } from './kids-closing-card'
import { KidsRecado } from './kids-recado'
import { KidsMascot } from './mascot'

type PreviewItem = { emoji: string; text: string }

/**
 * Como cada produto abre DENTRO da Comunidade. As ferramentas abrem por posto da Jornada (a
 * política publicada decide qual; a tela recebe o posto em `opensAt`). O Clube e o Mural abrem
 * com a assinatura, e a frase diz o que a criança faz lá dentro. `slug` vai no `utm_content`.
 */
export const LOCKED_PRODUCTS = {
  estudio: { name: 'Estúdio', slug: 'estudio', opens: 'journey' },
  pinta: { name: 'Pinta', slug: 'pinta', opens: 'journey' },
  pensa: { name: 'Pensa', slug: 'pensa', opens: 'journey' },
  molda: { name: 'Molda', slug: 'molda', opens: 'journey' },
  clube: {
    name: 'Clube',
    slug: 'clube',
    opens: 'subscription',
    doing: 'conversar com a turma e mostrar as suas criações',
  },
  mural: { name: 'Mural', slug: 'mural', opens: 'subscription', doing: 'publicar e comentar' },
} as const
export type LockedProductId = keyof typeof LOCKED_PRODUCTS

/** O pedido de sempre, igual nas seis telas: a página é para o adulto ver junto. */
export const LOCKED_PRODUCT_ASK =
  'Chame o seu responsável para ver com você como entrar na Comunidade.'

/**
 * A frase do cartão da Comunidade, sem prometer o que a conta não abre. `earned`: a criança já
 * conquistou a ferramenta na Jornada (voltou depois do fim da assinatura), então a frase diz que
 * ela volta a abrir, em vez de prometer o posto.
 */
export function lockedProductText(
  product: LockedProductId,
  opensAt: JourneyLevelSlug | null = null,
  earned = false,
): string {
  const info = LOCKED_PRODUCTS[product]
  if (info.opens === 'subscription')
    return `Com a assinatura, o ${info.name} abre para você ${info.doing}. ${LOCKED_PRODUCT_ASK}`
  if (earned) {
    const reached = opensAt ? `Você já chegou ao posto ${levelInfo(opensAt).label}. ` : ''
    return `${reached}Com a assinatura, o ${info.name} volta a abrir para você. ${LOCKED_PRODUCT_ASK}`
  }
  // Sem posto conhecido (política pausada, sem horizonte, jornada indisponível), a frase do
  // posto sai inteira: nenhum nome de posto é digitado à mão.
  const post = opensAt ? ` O ${info.name} abre no posto ${levelInfo(opensAt).label}.` : ''
  return `Na Comunidade, cada posto da Jornada abre ferramentas novas.${post} ${LOCKED_PRODUCT_ASK}`
}

/**
 * Tela compartilhada de PRODUTO bloqueado (Estúdio/Pinta/Pensa/Molda/Clube/Mural): o item
 * aparece no menu, mas a conta não tem o produto (nunca assinou ou a assinatura acabou).
 * Mascote + prévia do que tem dentro (no cartão do recado) e o cartão da **Comunidade dos
 * Criadores** na faixa lilás, com o botão para a página de continuidade (`/oferta/continuar`,
 * com `utm_content=ferramenta-<slug>`).
 *
 * ⚠️ A promessa é a da política: na Comunidade as FERRAMENTAS abrem por posto da Jornada
 * (Estúdio e Pinta no Construtor(a), Pensa no Inventor(a), Molda no Explorador(a) de Mundos,
 * no seed), e o posto vem de `toolOpensAtLevel` (`lib/tool-opens-at.ts`), nunca escrito aqui.
 * Quem já conquistou a ferramenta (`toolEarnedInJourney`, a assinatura acabou depois) lê que ela
 * volta a abrir com a assinatura.
 * Só o Clube e o Mural abrem direto com a assinatura. NÃO usar na tela genérica
 * `KidsLockedSpace` (coringa gateado por curso/cargo: o botão prometeria errado).
 */
export function KidsLockedProduct({
  product,
  title,
  intro,
  preview,
  opensAt = null,
  earned = false,
  numbered = false,
}: {
  product: LockedProductId
  title: string
  intro: string
  preview: readonly PreviewItem[]
  /** Posto da política em que a ferramenta abre (só as ferramentas; o Clube e o Mural ignoram). */
  opensAt?: JourneyLevelSlug | null
  /** A criança já conquistou a ferramenta na Jornada (`toolEarnedInJourney`). */
  earned?: boolean
  /**
   * A prévia é uma sequência (o Pensa: contar, conferir, construir): no lugar do emoji, o número
   * do passo no ladrilho âmbar. As outras telas seguem com o emoji.
   */
  numbered?: boolean
}) {
  const info = LOCKED_PRODUCTS[product]
  return (
    <KidsRecado
      art={<KidsMascot expression="sleeping" className="kid-float size-24" />}
      chip="Parte da Comunidade"
      chipIcon={Lock}
      title={title}
      closing={
        <KidsClosingCard
          icon={Sparkles}
          title={`O ${info.name} faz parte da Comunidade dos Criadores`}
          description={lockedProductText(product, opensAt, earned)}
          action={
            <a
              href={comunidadeContinuarUrl(`ferramenta-${info.slug}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="sz-btn-gradient h-12 px-6 text-base"
            >
              Ver com o meu responsável
            </a>
          }
        />
      }
    >
      <p>{intro}</p>
      <ul className="mt-2 flex w-full flex-col gap-2 text-left">
        {preview.map((item, index) => (
          <li
            key={item.text}
            className={
              numbered
                ? 'flex items-center gap-3 rounded-2xl bg-(--sz-yellow-surface) px-4 py-3'
                : 'flex items-center gap-3 rounded-2xl bg-(--band-creme) px-4 py-3'
            }
          >
            {numbered ? (
              <span
                aria-hidden="true"
                className="sz-display grid size-9 flex-none place-items-center rounded-[10px] bg-(--sz-amber) text-base text-foreground"
              >
                {index + 1}
              </span>
            ) : (
              <span aria-hidden="true" className="text-2xl leading-none">
                {item.emoji}
              </span>
            )}
            <span className="font-bold text-[0.9375rem] text-foreground">{item.text}</span>
          </li>
        ))}
      </ul>
    </KidsRecado>
  )
}
