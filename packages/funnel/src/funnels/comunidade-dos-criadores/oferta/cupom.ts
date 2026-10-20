import type { CouponPresentation } from '../../../lib/coupon-query'

export interface CupomDaOferta {
  /** O código que o pré-checkout leva ao checkout, que volta a validá-lo para o plano escolhido. */
  codigo: string | null
  /** O aviso da seção dos planos; `alerta` quando o cupom não vale ou não pôde ser conferido. */
  aviso: { texto: string; alerta: boolean } | null
}

/**
 * O cupom da URL (`?cupom=`/`?coupon=`) nas páginas de assinatura da Comunidade, Kids e adulta. Os
 * preços dos planos continuam os do catálogo: o cupom foi cotado contra a oferta principal e pode não
 * valer no outro plano, então a página só avisa que o recebeu e o checkout mostra o valor final.
 */
export function cupomDaOferta(coupon: CouponPresentation): CupomDaOferta {
  if (coupon.status === 'none') return { codigo: null, aviso: null }
  if (coupon.status === 'valid')
    return {
      codigo: coupon.code,
      aviso: {
        texto: `Cupom ${coupon.code} recebido. Na próxima tela, você confere se ele vale para o plano escolhido e o valor final antes de pagar.`,
        alerta: false,
      },
    }
  return {
    codigo: coupon.code,
    aviso: {
      texto: `${coupon.message} No checkout, o cupom é conferido de novo, e você pode trocar o código ou continuar sem ele.`,
      alerta: true,
    },
  }
}
