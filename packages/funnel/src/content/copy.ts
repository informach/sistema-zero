// Textos gerais (landing, resultado, CTAs) em pt-BR — verbatim do briefing.

export const PRODUTO = {
  nome: 'No Comando da IA',
  precoLabel: 'R$ 37',
}

export const LANDING = {
  h1: 'Descubra o que trava as suas ideias quando você tenta criar com IA',
  subtitulo:
    'Responda algumas perguntas rápidas e receba um diagnóstico de onde você emperra ao criar com a IA, e o caminho pra assumir o comando.',
  tempo: 'Leva apenas 2 minutos para responder',
}

export const RESULTADO = {
  titulo: 'Ideia você tem. O que falta é o critério pra comandar a IA.',
  paragrafoFinal:
    'A boa notícia é que a distância entre criar no escuro e criar no comando é menor do que parece, e ficou mais curta com a própria IA ajudando no caminho. Existe um material direto, de uma leitura, feito pra te dar esse critério e te tirar da posição de refém.',
  cta: 'Ver como assumir o comando',
}

export const QUIZ_UI = {
  continuar: 'Continuar',
  calcular: 'Calcular',
  entendiContinuar: 'Entendi, continuar →',
  progresso: (atual: number, total: number) => `Pergunta ${atual} de ${total}`,
}

// CTAs da página de vendas (todos abrem o modal de pré-checkout). Sem preço no
// label: o preço já aparece ao lado dos botões e espalhado pela página.
export const CTA = {
  principal: 'Quero assumir o comando da IA',
  comecar: 'Quero começar no comando',
}
