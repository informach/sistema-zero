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
  titulo: 'O que trava você não é falta de ideia. É falta de critério pra comandar a IA.',
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

// CTAs da página de vendas (todos abrem o modal de pré-checkout). O preço é
// injetado pela página (vem do catálogo) para não duplicar/desatualizar o valor.
export const CTA = {
  principal: (preco: string) => `Quero assumir o comando da IA — ${preco}`,
  comecar: (preco: string) => `Quero começar no comando — ${preco}`,
}
