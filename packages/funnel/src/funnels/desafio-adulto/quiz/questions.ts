// Quiz adulto do Desafio, v1 (21/10/2026), aprovado no Canvas "Quiz do Desafio · Kids e adulto"
// (quadros PlanoAdulto e TelasAdulto). Formato em conversa, o mesmo motor do quiz da Comunidade
// adulta: "Começar" e oito perguntas, sem condicional e sem calculadora de horas.
//
// Regras da copy (decisão da dona): nenhuma tela antes do resultado cita o Desafio, A Chave do
// Farol, curso, aula, plataforma, preço ou prazo. Cada opção é uma frase que a pessoa diria. O
// portão de idade não é pergunta gravada: a entrada tem "Começar" e "Tenho menos de 18 anos".
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
  lastStep: `desafio_adulto_v1_${key}`,
  eventName: `respondeu_desafio_adulto_v1_${key}`,
  tipo: 'selecao',
  etapa,
  rotuloCurto,
  titulo,
  opcoes: opcoes(pares),
  ...extra,
})

/** As três perguntas que somam pontos: o valor é a letra do perfil. */
export const PERGUNTAS_DE_PERFIL = ['cena', 'cena_desejada', 'sintese'] as const

export const DESAFIO_ADULTO_QUESTIONS: SelecaoStep[] = [
  // S. O requisito real, logo: só celular ou tablet vira condição não atendida.
  pergunta(1, 'computador', 'rotina', 'Computador', 'Você tem computador com mouse e teclado?', [
    ['meu', 'Tenho o meu'],
    ['compartilhado', 'Uso um compartilhado'],
    ['celular_tablet', 'Só celular ou tablet'],
    ['verificar', 'Ainda vou ver'],
  ]),
  // S. Calibra a frase dos blocos, sem medir nível. Não pontua.
  pergunta(2, 'programacao', 'rotina', 'Já programou', 'Você já programou?', [
    ['nunca', 'Nunca'],
    ['um_pouco', 'Um pouco, sozinho'],
    ['estudei', 'Estudei ou trabalho com isso'],
  ]),
  // S. "Não tenho tempo", a objeção mais citada. Não pontua e não promete duração.
  pergunta(
    3,
    'tempo_livre',
    'rotina',
    'Tempo livre',
    'Numa semana normal, quanto tempo sobra para um projeto seu?',
    [
      ['menos_1', 'Menos de 1 hora'],
      ['1_3', 'De 1 a 3 horas'],
      ['mais_3', 'Mais de 3 horas'],
      ['depende', 'Depende da semana'],
    ],
    { subtitulo: 'Pode chutar.' },
  ),
  // P. A frase que a pessoa diria (3 pontos).
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
  // I. O que aconteceu quando tentou: escolhe o parágrafo do porquê. Em ordem, do nunca ao
  // terminado. Não pontua.
  pergunta(5, 'tentativa', 'trava', 'Já tentou', 'Você já tentou fazer um jogo?', [
    ['vontade', 'Nunca tentei, ficou só na vontade'],
    ['fechei', 'Abri um programa e fechei no mesmo dia'],
    ['tutorial', 'Segui um tutorial, mas não passou dali'],
    ['grande', 'Comecei um projeto grande e parei no meio'],
    ['terminei', 'Já terminei um jogo pequeno'],
  ]),
  // N. Daqui a um mês, o tempo do acesso (2 pontos). Sem opção neutra: sempre sai um perfil.
  pergunta(
    6,
    'cena_desejada',
    'quer',
    'Daqui a um mês',
    'Daqui a um mês, o que você gostaria de ter?',
    [
      ['A', 'Um jogo meu pronto, e não só horas jogando'],
      ['B', 'A minha ideia funcionando na tela, mesmo pequena'],
      ['D', 'Entender o que faz um jogo funcionar'],
    ],
    { shuffle: true },
  ),
  // N. Os medos do adulto e as duas condições que a oferta não atende (no fim, para a posição
  // não puxar a escolha). O Canvas trazia "Ter aula ao vivo"; virou "Ter professor ao vivo", como no
  // Kids e na Comunidade adulta, porque nenhuma tela antes do resultado cita aula. "Não ser curso
  // de criança" fica: é o medo do adulto nas palavras dele.
  pergunta(
    7,
    'garantia',
    'quer',
    'O que precisa estar garantido',
    'Para dar certo, o que precisa estar garantido?',
    [
      ['zero', 'Começar do zero, sem saber programar'],
      ['pouco_tempo', 'Caber em pouco tempo por dia'],
      ['terminar', 'Um projeto que eu consiga terminar'],
      ['nao_infantil', 'Não ser curso de criança'],
      ['ao_vivo', 'Ter professor ao vivo'],
      ['trabalho', 'Aprender para trabalhar com jogos'],
    ],
    { shuffle: true, fixedLast: ['ao_vivo', 'trabalho'] },
  ),
  // D. A pessoa escolhe o próprio diagnóstico (3 pontos e o desempate).
  pergunta(
    8,
    'sintese',
    'quer',
    'Frase-síntese',
    'Juntando tudo, o que você quer agora?',
    [
      ['A', 'Usar meu tempo livre para fazer algo meu'],
      ['B', 'Tirar uma ideia de jogo do papel'],
      ['D', 'Entender como um jogo funciona por dentro'],
      ['conhecer', 'Ainda estou conhecendo'],
    ],
    { shuffle: true, fixedLast: ['conhecer'] },
  ),
]
