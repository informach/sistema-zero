// Página de venda do curso para pais "Como ajudar seu filho autista a lidar com frustrações e evitar
// crises" (`/kids/como-ajudar-seu-filho-autista-nas-frustracoes`, 25/11/2026): R$ 67 no catálogo,
// 1 ano de acesso. O presente sai pelos links de campanha e de embaixador, que abrem esta mesma
// página no modo presente (copy de `content/curso-pais-autismo.ts`). Na venda mudam só o que fala
// de presente, os botões e o bloco de compra; o preço vem do catálogo (`{{preco}}`).
import {
  CURSO_PAIS_AUTISMO_PRESENTE,
  CURSO_PAIS_AUTISMO_TITULO,
} from '../../content/curso-pais-autismo'
import type { GuiaPaisCopy, OfertaVendaGuia } from '../vilao-em-aliado/oferta'

const CTA = 'Quero o curso'

/** A copy de venda do curso. `{{preco}}` é trocado pelo preço do catálogo no corpo. */
export function cursoAutismoVenda(garantiaDias: number | null): GuiaPaisCopy & {
  oferta: OfertaVendaGuia
} {
  const P = CURSO_PAIS_AUTISMO_PRESENTE
  return {
    ...P,
    seoTitle: `${CURSO_PAIS_AUTISMO_TITULO}: curso para pais | Sistema Zero`,
    topo: { ...P.topo, cta: CTA },
    barra: { titulo: '{{preco}}', texto: 'Pagamento único', cta: CTA },
    hero: {
      ...P.hero,
      cta: CTA,
      beneficios: [
        P.hero.beneficios[0] ?? '',
        'Pagamento único, com 1 ano de acesso',
        P.hero.beneficios[2] ?? '',
      ],
    },
    duvidas: {
      ...P.duvidas,
      itens: [
        ...P.duvidas.itens.map((item) => {
          if (item.pergunta === 'Tem que pagar alguma coisa?')
            return {
              pergunta: 'Quanto custa?',
              resposta:
                '{{preco}}, em pagamento único. Nenhuma assinatura começa, e o curso fica na sua conta por 1 ano.',
            }
          if (item.pergunta === 'Por quanto tempo fico com o curso?')
            return {
              ...item,
              resposta:
                'Por 1 ano, contado da aprovação do pagamento. Nesse tempo, você pode rever as aulas e consultar a apostila sempre que quiser.',
            }
          if (item.pergunta === 'Já tenho conta no Sistema Zero Kids. Preciso de outra?')
            return {
              ...item,
              resposta:
                'Use na compra o mesmo e-mail da sua conta, e o curso aparece na área dos pais que você já usa.',
            }
          return item
        }),
        // A assinatura Kids inclui os cursos para pais (decisão da dona, 25/11/2026).
        {
          pergunta: 'Assino a Comunidade dos Criadores. Preciso comprar o curso?',
          resposta:
            'Não. A assinatura da Comunidade dos Criadores inclui os cursos para pais. Entre na área dos pais e abra o curso em Cursos para pais.',
        },
      ],
    },
    formato: {
      ...P.formato,
      itens: P.formato.itens.map((item) =>
        item.titulo === 'Na área dos pais'
          ? {
              ...item,
              texto:
                'O curso fica na sua conta do Sistema Zero Kids por 1 ano, no menu Cursos para pais, e termina com o certificado.',
            }
          : item,
      ),
    },
    fim: { ...P.fim, cta: CTA, nota: 'Pagamento único, sem assinatura.' },
    oferta: {
      selo: CURSO_PAIS_AUTISMO_TITULO,
      sufixo: 'pagamento único',
      texto:
        '5 aulas curtas em vídeo, apostila e certificado. O curso fica na sua conta por 1 ano.',
      cta: CTA,
      garantia:
        garantiaDias === null
          ? null
          : `${garantiaDias} dias de garantia para pedir o reembolso. Pagamento único, sem renovação automática.`,
    },
  }
}
