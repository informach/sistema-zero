// Conteúdo do funil "Comunidade dos Criadores" (kids, assinatura mensal/anual).
// A copy da página de vendas (dez seções) vive DENTRO do body próprio
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
  h1: 'Seu filho aprende a criar os próprios jogos.',
  subtitulo:
    'Projetos guiados para crianças de 9 a 14 anos aprenderem a montar regras, testar ideias e criar jogos que podem compartilhar com a família.',
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
    'Seu filho pode começar por um projeto guiado ou continuar do ponto em que está na Jornada do Criador.',
  entrega: [
    'Desafio do Primeiro Jogo e acesso aos cursos publicados durante a assinatura',
    'Estúdio, Pinta, Pensa e Molda, com liberação por progresso e disponibilidade dos cursos necessários',
    'Clube dos Criadores e Mural para publicar e compartilhar os jogos',
    'Recados para enviar dúvidas à equipe dentro da plataforma',
    'Jornada do Criador para encontrar a etapa atual e os próximos passos disponíveis',
    'Até 2 perfis de criança, cada um com seu próprio progresso',
  ],
  passos: [
    {
      titulo: 'Confirme seu acesso no e-mail',
      texto:
        'Depois da aprovação do pagamento, as instruções de acesso chegam ao e-mail da compra. No primeiro acesso, você cria sua senha. Se já tem conta, entre com seu acesso habitual. Confira também o spam ou as promoções.',
    },
    {
      titulo: 'Abra ou crie o perfil da criança',
      texto:
        'Dentro da plataforma, abra o perfil do seu filho. Se ainda não tiver um, crie o perfil da criança. A assinatura permite até 2 perfis, cada um com seu próprio progresso.',
    },
    {
      titulo: 'Mostre a Jornada do Criador',
      texto:
        'Abra a Jornada com seu filho. Se ele está começando, sigam a atividade de entrada. Se já começou pelo Desafio, continuem do ponto em que está. As aulas guiam a montagem por etapas.',
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
