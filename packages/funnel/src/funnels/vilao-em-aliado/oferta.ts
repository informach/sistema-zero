// Página de venda do guia para pais "Transformando o vilão em aliado" (`/kids/vilao-em-aliado`,
// 25/11/2026). O guia virou curso pago normal (R$ 27 no catálogo, 1 ano de acesso); o presente dele sai
// pelos links de campanha e de embaixador, que abrem esta mesma página no modo presente. A copy
// aprovada em 21/11/2026 (`CURSO_PAIS_VILAO`, a do guia gratuito) é a do modo presente; na venda
// mudam só o que falava de "gratuito", os botões e o bloco de compra. O presente do fim do guia
// continua surpresa: nada aqui o revela.
import { CURSO_PAIS_VILAO } from '../../content/curso-pais-vilao'
import type { EstadoPresente, ImagemPresente } from '../../content/presente'

type Raso<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly Raso<U>[]
    : T extends object
      ? { [K in keyof T]: Raso<T[K]> }
      : T

/** A copy do guia (as duas versões têm a mesma forma). */
export type GuiaPaisCopy = Raso<Omit<typeof CURSO_PAIS_VILAO, 'estados'>> & {
  quemConduz: { foto: ImagemPresente }
  oQueMuda: { figuras?: readonly { rotulo: string; imagem: ImagemPresente }[] }
  estados: {
    emBreve: EstadoPresente
    fechado: EstadoPresente
    retomar: { botao: string; texto: string }
    contato: string
  }
}

export interface OfertaVendaGuia {
  selo: string
  sufixo: string
  texto: string
  cta: string
  garantia: string | null
}

const CTA = 'Quero o guia'

/** O guia gratuito aprovado: a copy da página no modo presente. */
export const GUIA_PAIS_PRESENTE: GuiaPaisCopy = CURSO_PAIS_VILAO

/** A copy de venda do guia. `{{preco}}` é trocado pelo preço do catálogo no corpo. */
export function guiaPaisVenda(garantiaDias: number | null): GuiaPaisCopy & {
  oferta: OfertaVendaGuia
} {
  const P = GUIA_PAIS_PRESENTE
  return {
    ...P,
    seoTitle: 'Transformando o vilão em aliado: guia para pais | Sistema Zero',
    description:
      'Guia para pais, em 7 aulas curtas em vídeo. A Helena, mãe e profissional de tecnologia, mostra como a tela que hoje vira briga em casa pode ser sua aliada no desenvolvimento do seu filho.',
    topo: { ...P.topo, cta: CTA },
    barra: { titulo: '{{preco}}', texto: 'Pagamento único', cta: CTA },
    hero: {
      ...P.hero,
      selo: 'Guia para pais',
      beneficios: [
        P.hero.beneficios[0] ?? '',
        'Pagamento único, com 1 ano de acesso',
        P.hero.beneficios[2] ?? '',
      ],
    },
    duvidas: {
      ...P.duvidas,
      itens: P.duvidas.itens.map((item) => {
        if (item.pergunta === 'Tem que pagar alguma coisa?')
          return {
            pergunta: 'Quanto custa?',
            resposta:
              '{{preco}}, em pagamento único. Nenhuma assinatura começa, e o guia fica na sua conta por 1 ano.',
          }
        if (item.pergunta === 'Por quanto tempo fico com o guia?')
          return {
            ...item,
            resposta:
              'Por 1 ano, contado da aprovação do pagamento. Nesse tempo, você pode rever as aulas e consultar a apostila sempre que quiser.',
          }
        if (item.pergunta === 'Já tenho conta no Sistema Zero Kids. Preciso de outra?')
          return {
            ...item,
            resposta:
              'Use na compra o mesmo e-mail da sua conta, e o guia aparece na área dos pais que você já usa.',
          }
        return item
      }),
    },
    fim: { ...P.fim, cta: CTA, nota: 'Pagamento único, sem assinatura.' },
    oferta: {
      selo: 'Transformando o vilão em aliado',
      sufixo: 'pagamento único',
      texto: '7 aulas curtas em vídeo, apostila e certificado. O guia fica na sua conta por 1 ano.',
      cta: CTA,
      garantia:
        garantiaDias === null
          ? null
          : `${garantiaDias} dias de garantia para pedir o reembolso. Pagamento único, sem renovação automática.`,
    },
  }
}

/** Troca `{{preco}}` em todos os textos de uma copy. */
export function comPreco<T>(valor: T, preco: string): T {
  if (typeof valor === 'string') return valor.replaceAll('{{preco}}', preco) as T
  if (Array.isArray(valor)) return valor.map((item) => comPreco(item, preco)) as T
  if (valor && typeof valor === 'object')
    return Object.fromEntries(
      Object.entries(valor).map(([chave, item]) => [chave, comPreco(item, preco)]),
    ) as T
  return valor
}
