// Página de venda do Cadê Todo Mundo Kids (`/kids/cade-todo-mundo/oferta`, 25/11/2026). Uma página
// por oferta: a mesma oferta do catálogo serve de presente e de venda. As seções editoriais são as
// aprovadas da página do presente (`presenteKids`, com o prazo da oferta nos marcadores); na venda
// mudam só o topo, as condições, as dúvidas que falavam do presente e o bloco de compra. No modo
// presente (`?presente=`), a página usa a copy do presente inteira.
import { type PRESENTE_KIDS, presenteKids } from '../../content/presente'
import type { PrazoDoCade } from '../../content/presente-resgate'

export interface OfertaVendaCade {
  etiqueta: string
  titulo: string
  texto: string
  selo: string
  sufixo: string
  cta: string
  /** Sem garantia informada pelo catálogo, a linha sai. */
  garantia: string | null
}

export type CadeKidsVenda = typeof PRESENTE_KIDS & {
  oferta: OfertaVendaCade
  barra: { titulo: string; texto: string; cta: string }
}

const CTA = 'Quero para meu filho'

/** A copy de venda do Cadê Kids, com o prazo e a garantia da oferta do catálogo. */
export function cadeKidsVenda(prazo: PrazoDoCade, garantiaDias: number | null): CadeKidsVenda {
  const base = presenteKids(prazo)
  const [idade, comecar, autonomo, autista, frustrar, celular, rotina] = base.duvidas.itens
  return {
    ...base,
    seoTitle: 'Cadê Todo Mundo: o primeiro jogo do seu filho | Sistema Zero',
    description: `Cadê Todo Mundo: ${prazo.dias} de curso para seu filho praticar planejamento, raciocínio e comunicação criando um jogo, com orientação. Pagamento único, sem assinatura.`,
    topo: { ...base.topo, cta: CTA },
    hero: {
      ...base.hero,
      beneficios: [
        base.hero.beneficios[0] ?? '',
        `${prazo.dias} de acesso ao curso e ao Mural`,
        'Pagamento único, sem assinatura automática',
      ],
      cta: CTA,
      figura: { ...base.hero.figura, rotulo: `Cadê Todo Mundo • ${prazo.dias} de acesso` },
    },
    condicoes: {
      etiqueta: 'Um primeiro projeto para começar',
      titulo: `${prazo.extensoInicial} para fazer o curso e observar seu filho criando`,
      cartoes: [
        {
          titulo: `O curso completo por ${prazo.dias}`,
          paragrafos: [
            'Cadê Todo Mundo, com duas aulas guiadas, experiências, projeto e atividades de conclusão. O acesso começa quando o pagamento é aprovado.',
          ],
        },
        {
          titulo: 'Mural para compartilhar',
          paragrafos: [
            `Durante os ${prazo.extenso}, pode publicar, comentar e reagir. Depois, a conta continua vendo e jogando, e o link de um jogo publicado permanece acessível.`,
          ],
        },
        {
          titulo: 'Pagamento único',
          paragrafos: [
            'Ao fim do prazo, o acesso ao curso termina. Nenhuma assinatura ou cobrança começa automaticamente. Continuar em outros cursos é uma decisão à parte da família.',
          ],
        },
      ],
      cta: CTA,
      nota: base.condicoes.nota,
    },
    duvidas: {
      ...base.duvidas,
      itens: [
        { ...idade!, pergunta: 'Para qual idade é o curso?' },
        comecar!,
        autonomo!,
        autista!,
        frustrar!,
        celular!,
        rotina!,
        {
          pergunta: `Quando começam os ${prazo.extenso}?`,
          resposta:
            'Quando o pagamento é aprovado. O prazo corre a partir desse momento, inclusive nos dias em que vocês não entrarem. Escolha uma ocasião em que seu filho possa usar o computador nos dias seguintes.',
        },
        {
          pergunta: 'O que acontece quando o prazo termina?',
          resposta:
            'O acesso ao curso termina. A conta continua vendo e jogando no Mural, e o jogo que foi publicado continua acessível pelo link. Publicar, comentar e reagir fazem parte do período de acesso. Nenhuma assinatura ou cobrança começa automaticamente.',
        },
        {
          pergunta: 'O curso inclui os outros cursos da plataforma?',
          resposta:
            'Ele inclui o curso Cadê Todo Mundo e o Mural nas condições descritas aqui. Os demais cursos e espaços da Comunidade dos Criadores fazem parte de uma assinatura à parte, que a família pode escolher depois.',
        },
      ],
    },
    oferta: {
      etiqueta: 'Para começar em casa',
      titulo: 'O Cadê Todo Mundo para o seu filho',
      texto: `${prazo.dias} de acesso ao curso e ao Mural, contados da aprovação do pagamento.`,
      selo: 'Cadê Todo Mundo',
      sufixo: 'pagamento único',
      cta: CTA,
      garantia:
        garantiaDias === null
          ? null
          : `${garantiaDias} dias de garantia para pedir o reembolso. Pagamento único, sem renovação automática.`,
    },
    barra: { titulo: '', texto: 'pagamento único', cta: CTA },
  }
}
