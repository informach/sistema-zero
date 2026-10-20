// Quiz adulto v1 (20/10/2026) da Comunidade dos Criadores (`pro/comunidade-dos-criadores`), em
// SPIN. Fonte única: docs/marketing/comunidade-dos-criadores/proposta-2026-10-19/quiz-dados.json
// (chave `adulto`) e as telas do Canvas `QuizAdultoTelas.html`.
//
// Regras da copy (decisão da dona): nenhuma tela antes do resultado cita a área adulta, curso,
// plataforma, assinatura ou preço. A única "aula" é a da pessoa ("Ter aula ao vivo"), uma
// necessidade que ela declara, aprovada no Canvas. O portão de idade (P1) não é pergunta gravada:
// a entrada tem o botão "Começar" e o link "Tenho menos de 18 anos", tratados pela ilha.
import type { Opcao, SelecaoStep } from '../../../content/quiz-config'

const opcoes = (pares: ReadonlyArray<readonly [string, string]>): Opcao[] =>
  pares.map(([value, label]) => ({ value, label }))

const pergunta = (
  id: number,
  key: string,
  etapa: SelecaoStep['etapa'],
  rotuloCurto: string,
  titulo: string,
  pares: ReadonlyArray<readonly [string, string]>,
  extra: Partial<SelecaoStep> = {},
): SelecaoStep => ({
  id,
  key,
  lastStep: `comunidade_adulto_v1_${key}`,
  eventName: `respondeu_comunidade_adulto_v1_${key}`,
  tipo: 'selecao',
  etapa,
  rotuloCurto,
  titulo,
  opcoes: opcoes(pares),
  ...extra,
})

/** As quatro perguntas que somam pontos (P5, I7, N8 e P10): o valor é a letra do perfil. */
export const PERGUNTAS_DE_PERFIL = ['cena', 'preocupacao', 'cena_desejada', 'sintese'] as const

export const ADULT_QUESTIONS: SelecaoStep[] = [
  // S2. Situação: o dado da calculadora (I6) e a primeira linha do resultado.
  pergunta(
    1,
    'tempo_jogo',
    'rotina',
    'Horas de jogo',
    'Numa semana normal, quanto você joga?',
    [
      ['menos_3', 'Menos de 3 horas'],
      ['3_7', 'De 3 a 7 horas'],
      ['7_14', 'De 7 a 14 horas'],
      ['mais_14', 'Mais de 14 horas'],
    ],
    { subtitulo: 'Computador, console e celular, tudo junto. Chute.' },
  ),
  // S3. Situação: o requisito real. Só celular ou tablet vira condição não atendida.
  pergunta(2, 'computador', 'rotina', 'Computador', 'Você tem computador com mouse e teclado?', [
    ['meu', 'Tenho o meu'],
    ['compartilhado', 'Uso um compartilhado'],
    ['celular_tablet', 'Só celular ou tablet'],
    ['verificar', 'Ainda vou ver'],
  ]),
  // S4. Situação: muda uma frase do resultado (blocos primeiro ou Ponte e código). Não pontua.
  pergunta(3, 'programacao', 'rotina', 'Já programou', 'Você já programou?', [
    ['nunca', 'Nunca'],
    ['um_pouco', 'Um pouco, sozinho'],
    ['estudei', 'Estudei ou trabalho com isso'],
  ]),
  // P5. Problema: a frase que a pessoa diria (3 pontos).
  pergunta(
    4,
    'cena',
    'trava',
    'Frase que parece com você',
    'Qual destas frases parece mais com você?',
    [
      ['A', 'Jogo há anos e nunca fiz nada além de jogar'],
      ['B', 'Tenho uma ideia de jogo há anos e nunca comecei'],
      ['D', 'Jogo e fico pensando em como fizeram aquilo'],
      ['nenhum', 'Nenhuma dessas'],
    ],
    { shuffle: true, fixedLast: ['nenhum'] },
  ),
  // P6. Problema: o que já aconteceu quando tentou. Escolhe o parágrafo do porquê. Não pontua.
  pergunta(
    5,
    'tentativa',
    'trava',
    'Já tentou',
    'Você já tentou fazer um jogo?',
    [
      ['vontade', 'Nunca tentei, ficou só na vontade'],
      ['perdi', 'Abri um programa e fechei no mesmo dia'],
      ['tutorial', 'Segui um tutorial, mas não passou dali'],
      ['sonhos', 'Comecei um projeto grande e parei no meio'],
      ['terminei', 'Já terminei um jogo pequeno'],
      ['nao_apareceu', 'Nunca pensei nisso'],
    ],
    { shuffle: true, fixedLast: ['nao_apareceu'] },
  ),
  // I6. Implicação: a calculadora. O título na tela repete a S2 (`stepOnScreen`, engine.ts).
  pergunta(
    6,
    'tempo_criacao',
    'trava',
    'Calculadora',
    'Quanto das suas horas de jogo virou alguma coisa sua?',
    [
      ['quase_nada', 'Quase nada'],
      ['um_pouco', 'Um pouco'],
      ['boa_parte', 'Boa parte'],
      ['nao_sei', 'Não sei'],
    ],
  ),
  // I7. Implicação: o custo de não mudar (2 pontos).
  pergunta(
    7,
    'preocupacao',
    'trava',
    'O que incomoda',
    'Se nada mudar no próximo ano, o que mais incomoda?',
    [
      ['A', 'Continuar só jogando'],
      ['B', 'A ideia continuar na gaveta'],
      ['D', 'Continuar sem entender como se faz'],
      ['nenhum', 'Nada, está bom assim'],
    ],
    { shuffle: true, fixedLast: ['nenhum'] },
  ),
  // N8. Necessidade: a cena desejada (2 pontos). Sem opção neutra: sempre sai um perfil.
  pergunta(
    8,
    'cena_desejada',
    'quer',
    'Cena desejada',
    'Daqui a três meses, qual cena você gostaria de ver?',
    [
      ['A', 'Uma noite livre que termina com uma fase pronta, feita por mim'],
      ['B', 'Um amigo jogando uma fase que eu inventei'],
      ['D', 'Eu explicando para alguém como um jogo funciona por dentro'],
    ],
    { shuffle: true },
  ),
  // N9. Necessidade: a objeção. "Ter aula ao vivo" e "Servir para trabalhar com jogos" são
  // condições que a oferta não atende; ficam no fim para a posição não puxar a escolha.
  pergunta(
    9,
    'garantia',
    'quer',
    'O que precisa estar garantido',
    'Para dar certo na sua rotina, o que precisa estar garantido?',
    [
      ['sozinho', 'Aprender sozinho, no meu horário'],
      ['recorrer', 'Ter a quem recorrer quando travar'],
      ['tempo', 'Caber em poucas horas por semana'],
      ['orcamento', 'Caber no meu orçamento'],
      ['ao_vivo', 'Ter aula ao vivo'],
      ['trabalho', 'Servir para trabalhar com jogos'],
    ],
    { shuffle: true, fixedLast: ['ao_vivo', 'trabalho'] },
  ),
  // P10. Diagnóstico: a frase-síntese (3 pontos e o desempate; "Ainda estou conhecendo" não soma).
  pergunta(
    10,
    'sintese',
    'quer',
    'Frase-síntese',
    'Juntando tudo, o que você quer?',
    [
      ['A', 'Que o meu tempo de jogo renda alguma coisa minha'],
      ['B', 'Tirar a ideia da gaveta e fazer o jogo'],
      ['D', 'Entender como um jogo é feito e aprender a programar'],
      ['conhecer', 'Ainda estou conhecendo'],
    ],
    { shuffle: true, fixedLast: ['conhecer'] },
  ),
  // Condicionais: só no perfil somado B (a ferramenta) ou D (o código).
  pergunta(
    11,
    'ferramenta',
    'quer',
    'Ferramenta (perfil B)',
    'O jogo precisa ser numa ferramenta específica?',
    [
      ['unity', 'Unity'],
      ['unreal', 'Unreal'],
      ['roblox', 'Roblox'],
      ['outra', 'Outra'],
      ['qualquer', 'Qualquer uma, se eu terminar'],
      ['nao_pensei', 'Não pensei nisso'],
    ],
    { condicional: true },
  ),
  pergunta(
    12,
    'codigo',
    'quer',
    'Código (perfil D)',
    'Para você, aprender a programar é…',
    [
      ['codigo_ja', 'Escrever código desde o primeiro dia'],
      ['logica', 'Entender a lógica primeiro'],
      ['tanto_faz', 'Tanto faz, quero ver funcionando'],
    ],
    { condicional: true },
  ),
]

/**
 * O título da calculadora (I6) repete as horas por semana da S2 (× 52, em faixa): entre as duas
 * há três telas, e um "Isso dá…" ficaria sem referência.
 */
export const CALCULADORA_POR_SEMANA: Record<string, string> = {
  menos_3: 'Menos de 3 horas por semana dão até 156 horas',
  '3_7': 'De 3 a 7 horas por semana dão entre 156 e 364 horas',
  '7_14': 'De 7 a 14 horas por semana dão entre 364 e 728 horas',
  mais_14: 'Mais de 14 horas por semana dão mais de 728 horas',
}

/** A faixa por ano (horas por semana × 52), para não inventar um número exato. */
export const HORAS_POR_ANO: Record<string, string> = {
  menos_3: 'até 156 horas',
  '3_7': 'entre 156 e 364 horas',
  '7_14': 'entre 364 e 728 horas',
  mais_14: 'mais de 728 horas',
}
