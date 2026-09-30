// Conteúdo do funil "Comunidade dos Criadores" (kids, assinatura mensal/anual).
// A copy da página de vendas (19 blocos) vive DENTRO do body próprio
// (ComunidadeOfertaBody.astro), na mesma convenção do Desafio. Aqui ficam só os
// conteúdos consumidos pelas etapas COMPARTILHADAS (obrigado) + os obrigatórios
// pelo tipo FunnelContent (copy/landing — este funil não tem quiz, então a
// landing nunca renderiza; os valores espelham o hero por consistência).

import type { FunnelCopy, FunnelLanding, FunnelObrigado } from '../registry'

export const COMUNIDADE_PRODUTO: FunnelCopy = {
  nome: 'Comunidade dos Criadores',
  precoLabel: 'R$ 97/mês',
  // "O seu acesso À Comunidade dos Criadores" (a /obrigado monta a frase).
  artigo: 'a',
}

// Exigida pelo tipo FunnelContent; a /quiz deste funil é 404 (steps.quiz=false).
export const COMUNIDADE_LANDING: FunnelLanding = {
  h1: 'Seu filho já joga. Aqui ele aprende a criar os próprios jogos.',
  subtitulo:
    'Crianças de 9 a 14 anos transformam as próprias ideias em jogos de verdade: aulas guiadas, uma pessoa acompanhando o que elas enviam e um link para a família jogar. Terminou o primeiro, a Jornada do Criador mostra o próximo.',
  tempo: '',
}

// Preços de FALLBACK da página de vendas quando o catálogo está fora do ar.
// ⚠️ O fallback da rota (`env.PRODUCT_PRICE_CENTS`) é o do NCI (R$ 37) — errado
// aqui; o body usa ESTES valores. Exibição apenas: a cobrança sempre cota ao
// vivo no catálogo (quote autoritativa).
export const COMUNIDADE_PRECO_FALLBACK = { mensalCents: 9_700, anualCents: 79_700 } as const

// Conteúdo da /obrigado (entrega + primeiros passos), em linguagem para os pais.
// Diferença pro Desafio: é ASSINATURA — o texto aponta o controle da renovação e
// o cancelamento na área do responsável. ⚠️ Não prometer "aviso antes de toda
// renovação": o lembrete só existe para o anual à vista (renewal-reminder); o
// cartão recorrente não recebe aviso prévio.
export const COMUNIDADE_OBRIGADO: FunnelObrigado = {
  intro:
    'O primeiro projeto vem com orientação para seu filho começar a montar, testar e experimentar as próprias ideias.',
  entrega: [
    'Desafio do Primeiro Jogo e cursos com projetos guiados para começar e continuar criando',
    'Estúdio, Pinta, Pensa e Molda, liberados conforme a Jornada do Criador',
    'Clube dos Criadores e Mural para publicar e compartilhar os jogos',
    'Uma pessoa lendo as atividades enviadas e respondendo pelos Recados',
    'Jornada do Criador, desafios, conquistas e Mundo do Criador',
    'Até 2 perfis de criança, cada um com seu próprio progresso',
  ],
  passos: [
    {
      titulo: 'Confirme seu acesso no e-mail',
      texto:
        'Depois da aprovação do pagamento, as instruções de acesso chegam ao e-mail da compra. No primeiro acesso, você cria sua senha. Se já tem conta, entre com seu acesso habitual. Confira também o spam ou as promoções.',
    },
    {
      titulo: 'Crie o perfil da criança',
      texto:
        'Já dentro da plataforma, crie o perfil do seu filho. A assinatura permite até 2 perfis de criança na mesma conta, cada um com seu próprio progresso.',
    },
    {
      titulo: 'Mostre a Jornada do Criador',
      texto:
        'Abra a plataforma com seu filho e escolham o primeiro curso disponível. As aulas guiam a montagem por etapas. A jornada mostra o que vem depois de cada conquista.',
    },
    {
      titulo: 'Combinem um momento para criar',
      texto:
        'Reservem uma parte do tempo de tela já combinado para uma etapa do projeto. Depois, peça que ele mostre o que montou e conte o que mudou quando testou. Se surgir uma dúvida, ele pode pedir orientação pelos Recados.',
    },
    {
      titulo: 'Acompanhe pela área do responsável',
      texto:
        'Perfis e assinatura ficam na sua área. Por ali, você também controla a próxima renovação e pode cancelar quando quiser; o acesso continua até o fim do período já pago.',
    },
  ],
}
