// Conteúdo do funil adulto "Comunidade dos Criadores" (`pro/comunidade-dos-criadores`). A página de
// oferta vive em `oferta/pagina.ts`. Aqui ficam as etapas COMPARTILHADAS (checkout e obrigado) e os
// obrigatórios do tipo FunnelContent (copy/landing: a landing genérica nunca renderiza neste funil;
// os valores espelham o herói da página).

import type { FunnelCheckoutIntro, FunnelCopy, FunnelLanding, FunnelObrigado } from '../registry'
import { PAGINA_ADULTO } from './oferta/pagina'

export const COMUNIDADE_ADULTO_PRODUTO: FunnelCopy = {
  nome: 'Comunidade dos Criadores',
  precoLabel: 'R$ 97/mês',
  // "O seu acesso À Comunidade dos Criadores" (a /obrigado monta a frase).
  artigo: 'a',
}

// Exigida pelo tipo FunnelContent (o quiz deste funil tem entrada própria).
export const COMUNIDADE_ADULTO_LANDING: FunnelLanding = {
  h1: `${PAGINA_ADULTO.hero.titulo.antes}${PAGINA_ADULTO.hero.titulo.destaque}${PAGINA_ADULTO.hero.titulo.depois}`,
  subtitulo: PAGINA_ADULTO.hero.texto,
  tempo: '',
}

// Preços de FALLBACK da página de vendas quando o catálogo está fora do ar. Exibição apenas: a
// cobrança sempre cota ao vivo no catálogo, e a economia do anual só aparece com os dois preços
// ao vivo (`calcularEconomiaAnual`).
export const COMUNIDADE_ADULTO_PRECO_FALLBACK = { mensalCents: 9_700, anualCents: 79_700 } as const

// Abertura do checkout (acima do card do produto). Fala com a própria pessoa: ela é quem estuda.
export const COMUNIDADE_ADULTO_CHECKOUT: FunnelCheckoutIntro = {
  titulo: 'Confirme sua assinatura da Comunidade dos Criadores',
  paragrafos: [
    'Cursos do primeiro jogo ao código e as ferramentas para fazer o jogo inteiro, num lugar só. Confira o plano, o valor e a renovação antes de pagar.',
  ],
}

// Conteúdo da /obrigado (entrega e primeiros passos). É ASSINATURA: o texto aponta onde controlar a
// renovação. ⚠️ Não prometer aviso antes de toda renovação: o lembrete só existe para o anual à
// vista; o cartão recorrente não recebe aviso prévio.
export const COMUNIDADE_ADULTO_OBRIGADO: FunnelObrigado = {
  titulo: 'Sua assinatura está confirmada.',
  intro: 'Você pode começar pelo primeiro curso hoje mesmo.',
  acesso:
    'Se já tem conta, entre com seu acesso habitual. No primeiro acesso, siga as instruções enviadas ao e-mail da compra para criar a senha.',
  passosTitulo: 'Os primeiros passos',
  botao: 'Entrar na Comunidade →',
  entrega: PAGINA_ADULTO.oferta.cartao.inclui,
  passos: [
    {
      titulo: 'Confirme seu acesso no e-mail',
      texto:
        'Depois da aprovação do pagamento, as instruções de acesso chegam ao e-mail da compra. No primeiro acesso, você cria sua senha. Confira também o spam ou as promoções.',
    },
    {
      titulo: 'Abra o primeiro curso no computador',
      texto:
        'Com mouse e teclado, abra o primeiro curso e jogue a versão pronta. Depois, mude a primeira regra, teste e salve.',
    },
    {
      titulo: 'Publique e mande o link',
      texto:
        'Quando o primeiro jogo estiver do seu jeito, publique no Mural e mande o link para alguém jogar. Se travar no caminho, os tutoriais e os Recados ajudam.',
    },
    {
      titulo: 'Acompanhe a assinatura na sua conta',
      texto:
        'O plano e os pagamentos ficam em Compras, na sua conta. Por ali, você pode cancelar quando quiser, e o acesso continua até o fim do período já pago.',
    },
  ],
}
