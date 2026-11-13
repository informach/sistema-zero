import type { CouponPresentation } from '../../../lib/coupon-query'
import { formatBRLFromCents, formatBRLFromCents2 } from '../../../lib/money'
import { precoPorDiaCents } from '../../comunidade-dos-criadores/oferta/economia'

export interface PrecoDoDesafio {
  /** O valor que a pessoa paga: o do catálogo ou, com cupom válido, o já descontado. */
  preco: string
  /** O valor cheio riscado, só quando um cupom válido deu desconto. */
  precoCheio: string | null
  /** O desconto do cupom em porcentagem inteira ("50"), só quando um cupom válido deu desconto. */
  descontoPct: number | null
  /** "Menos de R$ X por dia de acesso": os 30 dias de acesso, sempre acima da conta exata. */
  precoDia: string
  /** O código que o pré-checkout leva ao checkout, que volta a cotá-lo. */
  codigo: string | null
  /** O aviso perto do preço; `alerta` quando o cupom não vale ou não pôde ser conferido. */
  aviso: { texto: string; alerta: boolean } | null
}

/**
 * O preço das páginas do Desafio (Kids e adulta). A oferta é de pagamento único e o cupom da URL foi
 * cotado contra ela mesma, então a página já mostra o valor com desconto (diferente das assinaturas
 * da Comunidade, que têm dois planos). `priceReais` vem do catálogo pela rota.
 */
export function precoDoDesafio(priceReais: string, coupon: CouponPresentation): PrecoDoDesafio {
  const valido = coupon.status === 'valid' ? coupon : null
  const cheioCents = valido ? valido.listPriceCents : Math.round(Number(priceReais) * 100)
  const finalCents = valido ? valido.finalPriceCents : cheioCents
  const comDesconto = valido !== null && valido.discountCents > 0 && cheioCents > 0
  const preco = formatarPreco(finalCents)
  const precoCheio = comDesconto ? formatarPreco(cheioCents) : null
  const descontoPct =
    comDesconto && valido ? Math.round((valido.discountCents / cheioCents) * 100) : null
  return {
    preco,
    precoCheio,
    descontoPct,
    precoDia: formatBRLFromCents2(precoPorDiaCents(finalCents)),
    codigo: coupon.status === 'none' ? null : coupon.code,
    aviso:
      coupon.status === 'none'
        ? null
        : coupon.status === 'valid'
          ? {
              texto:
                precoCheio && descontoPct
                  ? `Cupom ${coupon.code} aplicado: ${descontoPct}% de desconto. De ${precoCheio} por ${preco}.`
                  : `Cupom ${coupon.code} aplicado. O valor já está com o desconto.`,
              alerta: false,
            }
          : {
              texto: `${coupon.message} Confira o valor no checkout antes de pagar.`,
              alerta: true,
            },
  }
}

/**
 * O valor em reais, com centavos só quando houver: R$ 67 ou R$ 33,50. Sem isso, um cupom de 50% sobre
 * R$ 67 aparecia como R$ 34, um valor diferente do cobrado no checkout.
 */
export function formatarPreco(cents: number): string {
  return Math.round(cents) % 100 === 0 ? formatBRLFromCents(cents) : formatBRLFromCents2(cents)
}

/** Troca os marcadores de preço da copy pelos valores do catálogo. */
export function preencherPreco(texto: string, p: PrecoDoDesafio): string {
  return texto.replaceAll('{{preco}}', p.preco).replaceAll('{{preco_dia}}', p.precoDia)
}
