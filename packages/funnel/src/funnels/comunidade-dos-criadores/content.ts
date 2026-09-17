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
  h1: 'Seu filho está crescendo em um mundo tecnológico. Na Comunidade, ele aprende a transformar ideias em jogos e projetos próprios.',
  subtitulo:
    'Uma jornada online com projetos guiados, ferramentas próprias, acompanhamento de professor e uma Carreira do Criador que mostra o próximo passo.',
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
  intro: 'A Comunidade já está pronta para receber o primeiro perfil da sua família.',
  entrega: [
    'Desafio do Primeiro Jogo e todos os cursos da plataforma',
    'Estúdio, Pinta, Pensa e Molda, liberados conforme a Carreira do Criador',
    'Clube dos Criadores e Mural para publicar e compartilhar os jogos',
    'Acompanhamento do professor pelas atividades e pelos Recados',
    'Carreira do Criador, desafios, conquistas e Mundo do Criador',
    'Até 2 perfis de criança, cada um com seu próprio progresso',
  ],
  passos: [
    {
      titulo: 'Confirme seu acesso no e-mail',
      texto:
        'Enviamos o link de primeiro acesso para o e-mail da compra. É com ele que você cria a sua senha. Se não chegar em alguns minutos, dê uma olhada no spam ou nas promoções.',
    },
    {
      titulo: 'Crie o perfil da criança',
      texto:
        'Já dentro da plataforma, crie o perfil do seu filho. A assinatura permite até 2 perfis de criança na mesma conta, cada um com seu próprio progresso.',
    },
    {
      titulo: 'Mostre a Carreira do Criador',
      texto:
        'Abra a plataforma junto com seu filho, veja o posto inicial e entre no primeiro curso liberado. A carreira vai mostrar o que vem depois.',
    },
    {
      titulo: 'Acompanhe pela área do responsável',
      texto:
        'Perfis e assinatura ficam na sua área. Por ali, você também controla a próxima renovação. Antes de renovar, enviamos um aviso por e-mail.',
    },
  ],
}
