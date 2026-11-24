/** Autoria local do Poder "Moedas no caminho". Importação, gravação e publicação são etapas à parte. */
// A estrutura das aulas, o roteiro e os derivados saem do gerador comum dos Poderes (poder-gerador.ts).
import { moedasAjuda, moedasAulas, moedasExperiencia } from './moedas-conteudo'
import { moedasChecks } from './moedas-criterios'
import { MOEDAS_CURSO, MOEDAS_ETAPAS, MOEDAS_IDS, montarProjetoMoedas } from './moedas-projeto'
import { moedasQuiz2d, moedasQuiz3d } from './moedas-quiz'
import { gerarPoder } from './poder-gerador'

const help = `# Passo a passo do projeto: Moedas no caminho\n\nPoder do Faísca. Aqui está o que investigar na experiência e cada montagem das duas aulas: o que a regra faz, o caminho na paleta, o bloco, onde encaixar, como testar e o que conferir. Você pode consultar quantas vezes quiser.\n\n## ${moedasExperiencia.title}\n\n**A ideia:** ${moedasExperiencia.idea}\n\n**O que investigar:**\n\n${moedasExperiencia.goals.map((g) => `- ${g}`).join('\n')}\n\n${moedasExperiencia.observe}\n\n${moedasAulas
  .map(
    (a) =>
      `## ${a.dimension === '2d' ? 'Aula 1 · Jogo 2D' : 'Aula 2 · Ilha 3D'}: ${a.title}\n\n${moedasAjuda(
        a.dimension,
      )
        .map(
          (h) =>
            `### ${h.title}\n\n**Relembre:** ${h.idea}\n\n${h.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n**Teste:** ${h.test}\n\n**Se não funcionar:** ${h.correction}`,
        )
        .join('\n\n')}`,
  )
  .join(
    '\n\n',
  )}\n\n## Entrega\n\nEm cada aula, o envio fecha a última montagem, a do baú. Antes de enviar, jogue uma partida inteira, toque na tecla R e confira que o número volta para 0 e o baú volta fechado. Clique em Verificar projeto e corrija o que faltar. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Próxima parte. Depois vem o quiz da aula: escolha uma resposta, observe a explicação e, quando terminar, clique em Concluir aula. O Poder conta quando as duas aulas estão concluídas.\n`

await gerarPoder({
  nome: 'Moedas no caminho',
  pasta: 'poder-moedas-no-caminho',
  prefixo: 'moedas',
  curso: MOEDAS_CURSO,
  etapas: MOEDAS_ETAPAS,
  idEtapas: MOEDAS_IDS,
  etapaFinal: 'bau',
  montarProjeto: montarProjetoMoedas,
  checks: moedasChecks,
  quiz: { '2d': moedasQuiz2d, '3d': moedasQuiz3d },
  aulas: moedasAulas,
  idBase: 'fa15ca01',
  jogoPronto: {
    title: 'Jogue Moedas no caminho',
    instrucoes: {
      '2d': 'Segure as setas no canto do jogo, ou clique no jogo e use as setas do teclado. Pegue moedas e tente o baú com poucas e com muitas. A tecla R começa outra partida. Você pode seguir sem terminar.',
      '3d': 'Clique no jogo e use as setas ou W, A, S e D. Pegue moedas e tente o baú com poucas e com muitas. A tecla R começa outra partida. Você pode seguir sem terminar.',
    },
  },
  experiencia: {
    kind: 'interactive',
    required: true,
    title: 'O contador de moedas',
    semPerguntaFinal: true,
    // ⭐ 08/11/2026 (proposta "Experiências do Faísca", aprovada): passar numa moeda é pegar,
    // sair de perto é se afastar e chegar ao baú é ele perguntar; o sumiço é um interruptor e o
    // que o baú pergunta é uma peça que se troca.
    instructions:
      'Pegue moedas pelo caminho, olhe o número que o jogo guarda e troque o que o baú pergunta. O Zappy te mostra o que testar, e você pode repetir quando quiser.',
    hints: [
      'Olhe o número de moedas antes e depois de cada moeda: quando ele muda e quando continua igual?',
      'Compare passar de novo onde já pegou uma moeda, com o sumiço ligado e desligado. Leve ao baú menos de 5 moedas e mais de 5, nas duas perguntas.',
      'Pegue duas moedas, afaste-se e passe de novo na primeira. Desligue o sumiço e passe duas vezes na mesma moeda. Leve menos de 5 moedas ao baú. Junte mais de 5, vá ao baú e troque "pelo menos" por "exatamente".',
    ],
    activity: {
      type: 'experimentation',
      scene: 'coin-counter',
      cenario: 'farol',
      setup: {
        freeExploration: true,
        goals: ['each-adds', 'no-double', 'counts-again', 'kept', 'below-goal', 'compare-rules'],
        // O "Ainda falta" e o relatório da equipe com os botões desta tela.
        goalCopy: {
          'each-adds': { pedido: 'Pegue duas moedas diferentes e olhe o número.' },
          'no-double': {
            pedido: 'Com o sumiço ligado, passe de novo onde já pegou uma moeda.',
          },
          'counts-again': { pedido: 'Desligue o sumiço e passe de novo na mesma moeda.' },
          kept: { pedido: 'Depois de pegar uma moeda, afaste-se e olhe o número.' },
          'below-goal': { pedido: 'Leve de uma a quatro moedas até o baú.' },
          'compare-rules': {
            label: 'Com mais de 5 moedas, "pelo menos 5" abriu e "exatamente 5" não',
            pedido: 'Com mais de 5 moedas no baú, troque "pelo menos 5" por "exatamente 5".',
          },
        },
      },
    },
  },
  cenaDoZappy: 'coin-counter',
  passoAPasso: help,
  modulos:
    '# Moedas no caminho: organização do curso\n\nPoder 1 do posto Faísca (`jornada-faisca-poder-1`). Módulo: **Moedas no caminho**. Preservar o ID do curso, do módulo reservado e da `aula-1`; a `aula-2` é criada no Admin, no mesmo curso, antes da importação.\n\n' +
    moedasAulas
      .map(
        (a, i) =>
          `## Aula ${i + 1}. ${a.title}\n\nIdentificador: ${a.slug}. Dimensão: ${a.dimension.toUpperCase()}.\n\n${a.trechos.map((t, n) => `${n + 1}. ${t.title}.`).join('\n')}\n\n[Manifesto](moedas-${a.slug}.manifesto.json) · [Roteiro](moedas-${a.slug}.roteiro.md).`,
      )
      .join('\n\n') +
    '\n\nUma entrega por aula, na última construção, e o quiz depois dela. O Poder conta com as duas aulas concluídas. Sem certificado nem publicação na comunidade. Produzir e anexar a mídia real antes de publicar; publicar o curso só depois da `aula-2`.\n',
  resumo:
    'Moedas: duas aulas, roteiros, voz, ajuda, inventário e quatro projetos portáteis gerados.',
})
