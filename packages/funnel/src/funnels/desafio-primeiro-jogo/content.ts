import type { FunnelCopy, FunnelLanding, FunnelObrigado } from '../registry'

export const DESAFIO_PRODUTO: FunnelCopy = { nome: 'Desafio do Primeiro Jogo', precoLabel: 'R$ 67' }
export const DESAFIO_LANDING: FunnelLanding = {
  badge: 'Para mães, pais e responsáveis · 9 a 14 anos',
  h1: 'Descubra por onde seu filho pode começar a criar jogos',
  subtitulo:
    'Conte o que você observa em casa e o que gostaria de experimentar com ele. Você recebe uma orientação para esse começo e conhece o Desafio do Primeiro Jogo.',
  tempo: 'Resultado gratuito na tela, sem cadastro.',
}
export const DESAFIO_OBRIGADO: FunnelObrigado = {
  intro: 'O próximo passo é conhecer A Chave do Farol com seu filho.',
  entrega: [
    'A Chave do Farol: introdução, três etapas de programação e certificado.',
    '30 dias de curso, Estúdio das atividades e Mural completo, desde a aprovação.',
    'Caderno do Aluno, ajuda por mensagens e orientação de publicação.',
    'Depois do prazo, Mural visitante para ver e jogar.',
    'Pagamento único, sem renovação automática.',
  ],
  passos: [
    {
      titulo: 'Entre com o e-mail da compra',
      texto:
        'Se já tem conta no Sistema Zero, use seu acesso habitual. No primeiro acesso, siga as instruções para criar sua senha. Confira também a caixa de spam.',
    },
    {
      titulo: 'Conheçam a aventura no computador',
      texto:
        'Com internet, mouse e teclado, abram a introdução de A Chave do Farol. Seu filho começa jogando para conhecer o projeto que vai construir.',
    },
    {
      titulo: 'Combinem o primeiro momento de construção',
      texto:
        'A montagem tem três etapas para distribuir durante o prazo de acesso. As explicações podem ser pausadas e revistas. Se aparecer uma dúvida, usem o “Preciso de ajuda” no rodapé da aula.',
    },
  ],
}
