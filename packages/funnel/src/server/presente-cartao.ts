// O cartão de compra no MODO PRESENTE (`?presente=<código>`, decisão da dona de 26/11/2026): a
// página da oferta continua a de venda, com o MESMO cartão; como no modo cupom, só mudam a etiqueta
// de quem dá o presente, o preço riscado até R$ 0 e o botão "Quero o meu presente", que abre o
// cadastro numa janela (`PresenteModal`, com o `BolsaResgate`). Campanha pausada ou encerrada: o
// estado no lugar do botão, com a retomada para quem já começou; agendada ou em preparação: o estado.
// Uma fonte para as páginas Kids (`.c9-*`/`.pk-*`) e adultas (`.cda-*`/`.pa-*`).
import { giftDurationLabel } from '@sistemazero/core/referrals'
import type { EstadoPresente } from '../content/presente'
import { presenteCursoCopy } from '../content/presente-curso'
import { dataBrasilia } from '../content/presente-resgate'
import { formatarPreco } from '../funnels/desafio-primeiro-jogo/oferta/preco'
import type { BolsaResgateProps } from '../islands/BolsaResgate'
import type { OfferGiftMode } from './offer-page'
import { giftVariant } from './referral-gift-page'

export const CTA_DO_PRESENTE = 'Quero o meu presente'
export const CONDICAO_DO_PRESENTE = 'sem custo e sem cartão'

export interface CartaoDoPresente {
  /** "Um presente de Marta para você" ou "Um presente da campanha <título> para você". */
  etiqueta: string
  /**
   * O preço da oferta da página, riscado ("De R$ 27"), vindo do catálogo. `null` quando a oferta de
   * venda não resolveu (sem principal, catálogo fora, fora do contrato) ou custa zero: o cartão mostra
   * só o "R$ 0", nunca o preço de reserva de outro produto (revisão de 26/11/2026).
   */
  precoCheio: string | null
  /** O preço do presente. */
  precoFinal: string
  /** O que o presente dá e por quanto tempo (só o prazo; a condição vai embaixo do preço). */
  texto: string
  /** A linha embaixo do "R$ 0" no cartão, no lugar do "pagamento único". */
  condicao: string
  /** O prazo com a condição, para o texto fora do cartão (ao lado dele, no topo e no fim). */
  frase: string
  cta: string
  /** O prazo do presente em dias (`null` sem prazo), para a copy em volta do cartão. */
  dias: number | null
  /** Formulário aberto: o botão abre a janela do cadastro. */
  aberto: boolean
  /** Pausada ou encerrada: quem já começou o cadastro pode concluir. */
  retomavel: boolean
  estado: EstadoPresente | null
  retomar: { botao: string; texto: string }
  /** O título e o texto da janela do cadastro. */
  janela: { titulo: string; texto: string }
  /** As props do `BolsaResgate` (na janela e na retomada). */
  resgate: BolsaResgateProps
  adulto: boolean
}

export function cartaoDoPresente(
  presente: OfferGiftMode,
  opts: {
    /** A base do app do público, sem a barra final. */
    communityUrl: string
    /** O preço da oferta da página, em reais, como a rota o entrega. */
    priceReais: string
    /** O formulário do guia para pais ("guia" no lugar de "curso"). */
    formulario?: 'guia'
    /** A oferta de VENDA da página resolveu no catálogo (padrão: sim). Sem ela, sem preço riscado. */
    offerResolved?: boolean
  },
): CartaoDoPresente {
  const { gift, kind } = presente
  const audience = gift.audience === 'adult' ? 'adult' : 'kids'
  const adulto = audience === 'adult'
  const variante = giftVariant(gift.gift, audience) === 'pais' ? 'pais' : 'curso'
  const P = presenteCursoCopy(audience, gift.gift, variante)
  const campanha = gift.source.kind === 'campaign'
  const nome = gift.source.name
  const aberto = kind === 'ready'
  const retomavel = kind === 'paused' || kind === 'ended'
  const lastClaimAt = gift.endsAt ? new Date(Date.parse(gift.endsAt) - 1).toISOString() : null
  const quando = kind === 'scheduled' ? gift.startsAt : lastClaimAt
  const estado: EstadoPresente | null = aberto
    ? null
    : {
        ...P.estados[kind],
        titulo:
          kind === 'ended' && !gift.endsAt
            ? P.estados.endedSemData
            : P.estados[kind].titulo.replace('{{data}}', quando ? dataBrasilia(quando, false) : ''),
      }
  const dias = gift.gift.accessDays
  const pais = variante === 'pais' && !adulto
  const alvo =
    opts.formulario === 'guia'
      ? 'ao guia'
      : gift.gift.includesMural && !pais
        ? `ao curso e ao ${adulto ? 'Mural adulto' : 'Mural'}`
        : 'ao curso'
  const texto =
    dias === null
      ? `Acesso ${alvo}, a partir do cadastro.`
      : `${giftDurationLabel(dias)} de acesso ${alvo}, contados do cadastro.`
  const frase =
    dias === null
      ? `Acesso ${alvo}, sem custo e sem cartão.`
      : `${texto} ${CONDICAO_DO_PRESENTE.replace(/^s/, 'S')}.`
  const centavos = Math.round(Number(opts.priceReais) * 100)
  return {
    // Evento ("Feira de Ciências") e pessoa: "Um presente de …"; campanha: "da campanha …".
    etiqueta:
      campanha && gift.source.context !== 'event'
        ? `Um presente da campanha ${nome} para você`
        : `Um presente de ${nome} para você`,
    precoCheio:
      opts.offerResolved !== false && Number.isFinite(centavos) && centavos > 0
        ? formatarPreco(centavos)
        : null,
    precoFinal: formatarPreco(0),
    texto,
    condicao: CONDICAO_DO_PRESENTE,
    frase,
    cta: CTA_DO_PRESENTE,
    dias,
    aberto,
    retomavel,
    estado,
    retomar: P.estados.retomar,
    // O guia para pais chama o curso de guia também na janela do cadastro (26/11/2026).
    janela:
      opts.formulario === 'guia'
        ? {
            titulo: P.resgatar.titulo.replace(/\bcurso\b/g, 'guia'),
            texto: P.resgatar.texto.replace(/\bcurso\b/g, 'guia'),
          }
        : { titulo: P.resgatar.titulo, texto: P.resgatar.texto },
    resgate: {
      code: gift.code,
      referrerName: nome,
      communityUrl: opts.communityUrl,
      audience,
      campaign: campanha,
      gift: gift.gift,
      variante: opts.formulario ?? variante,
      // A escolha do embaixador (`?oferta-presente=`); sem ela, a oferta padrão do código.
      ...(presente.chosenOffer ? { oferta: presente.chosenOffer } : {}),
    },
    adulto,
  }
}
