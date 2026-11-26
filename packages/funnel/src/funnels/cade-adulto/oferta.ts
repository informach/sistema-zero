// Página de venda do Cadê Todo Mundo adulto (`/pro/cade-todo-mundo/oferta`, 25/11/2026). A mesma
// oferta do catálogo serve de presente e de venda. As seções editoriais são as aprovadas da página
// do presente adulto (`presenteAdulto`, com o prazo da oferta nos marcadores); na venda mudam só o
// topo, as condições, as dúvidas que falavam do presente e o bloco de compra. No modo presente
// (`?presente=`), a página usa a copy do presente inteira.
import { type PRESENTE_ADULTO, presenteAdulto } from '../../content/presente-adulto'
import type { PrazoDoCade } from '../../content/presente-resgate'
import type { OfertaVendaCade } from '../cade-todo-mundo/oferta'

export type CadeAdultoVenda = typeof PRESENTE_ADULTO & { oferta: OfertaVendaCade }

const CTA = 'Quero fazer o meu jogo'

/** A copy de venda do Cadê adulto, com o prazo e a garantia da oferta do catálogo. */
export function cadeAdultoVenda(prazo: PrazoDoCade, garantiaDias: number | null): CadeAdultoVenda {
  const base = presenteAdulto(prazo)
  const [nuncaProgramei, celular, , conta, , travar] = base.duvidas.itens
  return {
    ...base,
    seoTitle: 'Cadê Todo Mundo: o seu primeiro jogo | Sistema Zero',
    description: `O seu primeiro jogo funcionando no navegador, com o Cadê Todo Mundo na versão adulta: ${prazo.dias} de curso e de Mural adulto. Pagamento único, para quem tem 18 anos ou mais.`,
    topo: { ...base.topo, cta: CTA },
    hero: {
      ...base.hero,
      beneficios: [
        base.hero.beneficios[0] ?? '',
        `${prazo.dias} de curso e de Mural adulto, contados da aprovação do pagamento.`,
        'Pagamento único, sem assinatura automática.',
      ],
      cta: CTA,
      tela: { ...base.hero.tela, legenda: 'O jogo do curso, na versão que você termina.' },
    },
    depois: {
      ...base.depois,
      titulo:
        'No curso, você faz o primeiro jogo. Na Comunidade dos Criadores, você segue criando outros, cada vez maiores.',
    },
    condicoes: {
      rotulo: 'O QUE A COMPRA INCLUI',
      titulo: 'O que você recebe',
      cartoes: [
        {
          cor: 'azul',
          rotulo: `CURSO · ${prazo.diasCaixaAlta}`,
          texto:
            'O Cadê Todo Mundo inteiro, na versão adulta, contado a partir da aprovação do pagamento.',
        },
        {
          cor: 'rosa',
          rotulo: `MURAL · ${prazo.diasCaixaAlta}`,
          texto: 'Publicar o jogo do curso, comentar e reagir no Mural adulto.',
        },
        {
          cor: 'verde',
          rotulo: 'PAGAMENTO ÚNICO',
          texto: `Quando os ${prazo.extenso} terminam, nenhuma cobrança começa.`,
        },
      ],
      nota: `Quando os ${prazo.extenso} terminam, o curso fecha, o Mural adulto continua aberto para você ver e jogar, e os projetos ficam guardados na conta. O link do jogo que você publicou continua funcionando enquanto a publicação estiver disponível. Outros cursos, o Estúdio livre e a opção de fazer a sua versão de um jogo do Mural fazem parte da assinatura.`,
      cta: CTA,
    },
    duvidas: {
      ...base.duvidas,
      itens: [
        nuncaProgramei!,
        celular!,
        {
          pergunta: `Quando os ${prazo.extenso} começam?`,
          resposta:
            'Quando o pagamento é aprovado. Compre quando tiver alguns dias livres pela frente.',
        },
        {
          ...conta!,
          resposta:
            'Use o mesmo e-mail. O curso entra na sua conta e você entra com a senha que já tem.',
        },
        {
          pergunta: 'Vou pagar alguma coisa depois?',
          resposta:
            'Não. O pagamento é único e não cria assinatura. Continuar na Comunidade dos Criadores é uma escolha sua.',
        },
        travar!,
      ],
    },
    oferta: {
      etiqueta: 'PLAYER 1 · COMEÇAR',
      titulo: 'O Cadê Todo Mundo para você',
      texto: `${prazo.dias} de curso e de Mural adulto, contados da aprovação do pagamento.`,
      selo: 'CADÊ TODO MUNDO',
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
