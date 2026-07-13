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
  h1: 'O foco que segura o seu filho por horas no jogo é o maior talento dele esperando um lugar pra ir',
  subtitulo:
    'Na Comunidade dos Criadores, o mesmo foco que hoje só consome jogo passa a criar: cursos com professor acompanhando, jogos publicados com link de verdade e uma carreira de criador que sobe nível a nível.',
  tempo: '',
}

// Preços de FALLBACK da página de vendas quando o catálogo está fora do ar.
// ⚠️ O fallback da rota (`env.PRODUCT_PRICE_CENTS`) é o do NCI (R$ 37) — errado
// aqui; o body usa ESTES valores. Exibição apenas: a cobrança sempre cota ao
// vivo no catálogo (quote autoritativa).
export const COMUNIDADE_PRECO_FALLBACK = { mensalCents: 9_700, anualCents: 79_700 } as const

// Conteúdo da /obrigado (entrega + primeiros passos), em linguagem para os pais.
// Diferença pro Desafio: é ASSINATURA — o texto avisa do aviso prévio de renovação
// e aponta o cancelamento na área do responsável.
export const COMUNIDADE_OBRIGADO: FunnelObrigado = {
  intro: 'Obrigado por investir no potencial do seu filho.',
  entrega: [
    'Todos os cursos kids, com o Estúdio dentro de cada aula (e os novos que entrarem)',
    'Clube dos Criadores: o fórum seguro e moderado da idade dele',
    'Mural dos Criadores: cada jogo publicado com link próprio e QR code',
    'Acompanhamento de professor nos Recados',
    'Carreira de Criador: níveis, conquistas e missões',
    'Kit de Criação Livre: Estúdio Completo, Pensa e Pinta',
    'Desafio do Mês: um tema novo pra comunidade inteira, todo mês',
    'Mundo do Criador: avatar e quarto virtual com os troféus dele',
  ],
  passos: [
    {
      titulo: 'Confirme seu acesso no e-mail',
      texto:
        'Enviamos o link de primeiro acesso para o e-mail da compra. É com ele que você cria a sua senha. Se não chegar em alguns minutos, dê uma olhada no spam ou nas promoções.',
    },
    {
      titulo: 'Faça o cadastro do seu filho',
      texto:
        'Já dentro da plataforma, crie o perfil do seu filho. É rapidinho, e a assinatura cobre até 2 perfis de criança na mesma conta.',
    },
    {
      titulo: 'Cada um tem o seu acesso',
      texto:
        'Tem a área do aluno, onde seu filho entra pelo perfil dele, e a área do responsável, onde você acompanha o progresso e gerencia a assinatura (inclusive o cancelamento, em um clique).',
    },
    {
      titulo: 'É só começar a criar',
      texto:
        'Abra a plataforma junto com o seu filho. O primeiro curso já leva ele do zero ao primeiro jogo publicado no Mural, com link pra mandar pra família. Antes de cada renovação, você recebe um aviso por e-mail.',
    },
  ],
}
