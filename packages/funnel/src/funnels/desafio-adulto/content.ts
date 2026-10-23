// Conteúdo do Desafio do Primeiro Jogo para adultos (`pro/desafio-primeiro-jogo`). A página de
// oferta vive em `oferta/pagina.ts`. Aqui ficam as etapas COMPARTILHADAS (checkout e obrigado) e os
// obrigatórios do tipo FunnelContent. Fala com a própria pessoa: ela é quem faz o jogo.

import type { FunnelCheckoutIntro, FunnelCopy, FunnelLanding, FunnelObrigado } from '../registry'
import { PAGINA_DESAFIO_ADULTO } from './oferta/pagina'

export const DESAFIO_ADULTO_PRODUTO: FunnelCopy = {
  nome: 'Desafio do Primeiro Jogo',
  precoLabel: 'R$ 67',
}

// Exigida pelo tipo FunnelContent (este funil não tem quiz nem landing genérica).
export const DESAFIO_ADULTO_LANDING: FunnelLanding = {
  h1: `${PAGINA_DESAFIO_ADULTO.hero.titulo.antes}${PAGINA_DESAFIO_ADULTO.hero.titulo.destaque}${PAGINA_DESAFIO_ADULTO.hero.titulo.depois}`,
  subtitulo: PAGINA_DESAFIO_ADULTO.hero.texto,
  tempo: '',
}

export const DESAFIO_ADULTO_CHECKOUT: FunnelCheckoutIntro = {
  titulo: 'Falta pouco para o seu primeiro jogo começar',
  paragrafos: [
    'Confira o valor, informe os seus dados e escolha a forma de pagamento. Depois da aprovação, você tem 30 dias para fazer, testar e publicar o primeiro jogo.',
  ],
}

export const DESAFIO_ADULTO_OBRIGADO: FunnelObrigado = {
  titulo: 'Seu Desafio está confirmado.',
  intro: 'O próximo passo é abrir A Chave do Farol no computador.',
  acesso:
    'Se já tem conta, entre com seu acesso habitual. No primeiro acesso, siga as instruções enviadas ao e-mail da compra para criar a senha.',
  passosTitulo: 'Os primeiros passos',
  botao: 'Entrar no Sistema Zero →',
  entrega: [
    'A Chave do Farol: três fases e o certificado.',
    '30 dias de curso, Estúdio das aulas e Mural completo, desde a aprovação.',
    'Caderno do Aluno, ajuda por mensagens e orientação para publicar.',
    'Depois do prazo, Mural visitante para ver e jogar.',
    'Pagamento único, sem renovação automática.',
  ],
  passos: [
    {
      titulo: 'Confirme seu acesso no e-mail',
      texto:
        'Depois da aprovação do pagamento, as instruções chegam ao e-mail da compra. No primeiro acesso, você cria sua senha. Confira também o spam ou as promoções.',
    },
    {
      titulo: 'Abra a primeira aula no computador',
      texto:
        'Com mouse e teclado, jogue a versão pronta da Chave do Farol. Depois, monte a primeira regra, teste e siga.',
    },
    {
      titulo: 'Publique e mande o link',
      texto:
        'Quando o farol acender, publique no Mural e mande o link para alguém jogar. Se travar no caminho, o Caderno do Aluno e a ajuda por mensagens ajudam.',
    },
  ],
}
