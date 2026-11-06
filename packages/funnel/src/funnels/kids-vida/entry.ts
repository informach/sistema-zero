import entry from './entry.json'
import type { KidsMode } from './types'
export const DEFAULT_HEADLINE = 'habilidades'
export const QUIZ_HEADLINES = {
  habilidades: {
    label: 'Habilidades para a vida',
    title: entry.title,
    emphasis: 'autonomia, resolver problemas e expressar suas ideias',
  },
}
export const quizHeadlineId = () => DEFAULT_HEADLINE
export const quizEntry = (mode: KidsMode) => ({
  eyebrow: 'Para pais e responsáveis',
  pageTitle: 'Habilidades para a vida do seu filho',
  description: entry[mode],
  note: entry.note,
  sair: 'Sair',
  sobre: 'Sobre seu filho',
  voltar: 'Voltar',
  tocar: 'Escolha uma resposta para continuar.',
  image: '/img/kids-aprender-criando/planejar-caminho.webp',
})
export const STAGE_LABELS = {
  '9a17': {
    rotina: 'A rotina dele',
    casa: 'O que acontece no dia a dia',
    desejo: 'O próximo passo',
  },
  m9: { rotina: 'A rotina dele', casa: 'O que acontece no dia a dia', desejo: 'O próximo passo' },
}
export const ADULT_EXIT = {
  title: 'Quem tem 18 anos ou mais responde por si.',
  text: 'O Sistema Zero tem uma área para adultos, com conta própria. O próximo quiz pode ser respondido pela própria pessoa, a partir dos interesses e objetivos dela.',
  action: 'Abrir o quiz para adultos',
  fallbackAction: 'Voltar para a página inicial',
  fix: 'Corrigir a idade',
}
