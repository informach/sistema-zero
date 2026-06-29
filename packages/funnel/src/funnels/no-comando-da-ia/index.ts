// Funil "No Comando da IA" (adulto, /pro). Monta o FunnelDef reaproveitando os
// módulos de conteúdo em `src/content/*` — a copy/quiz/vendas/resultado seguem
// VERBATIM do briefing; aqui só os embrulhamos no formato do registry de funis.

import { LANDING, PRODUTO } from '../../content/copy'
import { HERO_PADRAO, HERO_PARAGRAFO_COMUM, HERO_POR_PERFIL } from '../../content/hero-perfil'
import { QUIZ_STEPS, TOTAL_PERGUNTAS } from '../../content/quiz-config'
import { FECHO_COMPARTILHADO, RESULT_PROFILES } from '../../content/result-profiles'
import { SALES } from '../../content/sales-sections'
import type { FunnelDef } from '../registry'
import {
  NCI_PERFIL_LABELS,
  NCI_VALUE_SCHEMA,
  nciComputePerfil,
  nciDerive,
  nciRenderCorpo,
} from './quiz'

// Conteúdo da /obrigado (antes inline em obrigado.astro). Espelha "O que você recebe".
const OBRIGADO = {
  entrega: [
    'E-book completo com o método Z.E.R.O.',
    'Kit prático: checklists, template e roteiro de prompt',
    'Bônus: mini-glossário + raio-x "refém da IA"',
  ],
  passos: [
    {
      titulo: 'Abra seu e-mail',
      texto:
        'Enviamos o seu acesso para o e-mail usado na compra. Se não encontrar em alguns minutos, confira a caixa de spam ou promoções.',
    },
    {
      titulo: 'Crie sua senha',
      texto:
        'Primeiro acesso? O link do e-mail te leva direto para definir a sua senha. Já tem conta? É só entrar normalmente.',
    },
    {
      titulo: 'Assuma o comando',
      texto: 'O e-book, o kit prático e os bônus já estão te esperando na área de membros.',
    },
  ],
}

export const NO_COMANDO_DA_IA: FunnelDef = {
  audience: 'pro',
  produto: 'no-comando-da-ia',
  key: 'pro/no-comando-da-ia',
  basePath: '/pro/no-comando-da-ia',
  productName: 'No Comando da IA',
  productSku: 'no-comando-da-ia',
  imagesBase: '/img/no-comando-da-ia',
  byline: 'Helena e Júlio · Sistema Zero',
  seoTitle: 'No Comando da IA · Pare de pedir código no escuro',
  seoDescription:
    'Um guia direto para tirar sua ideia do papel com IA sem virar refém dela. Aprenda a comandar a IA com o método Z.E.R.O.',
  steps: { quiz: true, resultado: true, upsell: false, downsell: false },
  content: {
    copy: PRODUTO,
    landing: LANDING,
    sales: SALES,
    obrigado: OBRIGADO,
    quiz: {
      steps: QUIZ_STEPS,
      total: TOTAL_PERGUNTAS,
      valueSchema: NCI_VALUE_SCHEMA,
      derive: nciDerive,
      computePerfil: nciComputePerfil,
    },
    hero: { padrao: HERO_PADRAO, paragrafoComum: HERO_PARAGRAFO_COMUM, porPerfil: HERO_POR_PERFIL },
    result: {
      profiles: RESULT_PROFILES,
      fecho: FECHO_COMPARTILHADO,
      perfilLabels: NCI_PERFIL_LABELS,
      renderCorpo: nciRenderCorpo,
    },
  },
}
